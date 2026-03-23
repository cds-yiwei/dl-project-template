import uuid as uuid_pkg
from collections.abc import Mapping
from typing import Any

from fastcrud import compute_offset, paginated_response
from sqlalchemy.ext.asyncio import AsyncSession

from ..core.exceptions.http_exceptions import DuplicateValueException, ForbiddenException, NotFoundException
from ..core.security import blacklist_token, get_password_hash
from ..crud.crud_roles import crud_roles
from ..crud.crud_rate_limit import crud_rate_limits
from ..crud.crud_tier import crud_tiers
from ..crud.crud_users import crud_users
from ..schemas.rate_limit import RateLimitRead
from ..schemas.role import RoleRead
from ..schemas.tier import TierRead
from ..schemas.user import UserCreate, UserCreateInternal, UserRead, UserReadInternal, UserRoleUpdate, UserTierUpdate, UserUpdate


class UserService:
    async def create_user(self, db: AsyncSession, user: UserCreate) -> dict[str, Any]:
        await self._ensure_email_available(db=db, email=user.email)
        await self._ensure_username_available(db=db, username=user.username)

        user_internal_dict = user.model_dump()
        password = user_internal_dict.pop("password")
        user_internal = UserCreateInternal(
            **user_internal_dict,
            hashed_password=get_password_hash(password=password),
        )
        created_user = await crud_users.create(db=db, object=user_internal, schema_to_select=UserReadInternal)
        if created_user is None:
            raise NotFoundException("Failed to create user")
        return await self._build_public_user(db=db, user=dict(created_user))

    async def list_users(self, db: AsyncSession, page: int, items_per_page: int) -> dict[str, Any]:
        users_data = await crud_users.get_multi(
            db=db,
            offset=compute_offset(page, items_per_page),
            limit=items_per_page,
            is_deleted=False,
            schema_to_select=UserReadInternal,
        )
        response = paginated_response(crud_data=users_data, page=page, items_per_page=items_per_page)
        response["data"] = [await self._build_public_user(db=db, user=dict(user)) for user in response["data"]]
        return response

    async def get_user_by_uuid(self, db: AsyncSession, user_uuid: uuid_pkg.UUID | str) -> dict[str, Any]:
        return await self._build_public_user(
            db=db,
            user=dict(await self._get_user(db=db, user_uuid=user_uuid, include_deleted=False)),
        )

    async def update_user(
        self,
        db: AsyncSession,
        user_uuid: uuid_pkg.UUID | str,
        current_user: Mapping[str, Any],
        values: UserUpdate,
    ) -> dict[str, str]:
        db_user = await self._get_user(db=db, user_uuid=user_uuid, include_deleted=True)
        self._ensure_self_only(current_user=current_user, db_user=db_user)

        current_email = db_user["email"]
        current_username = db_user["username"]
        if values.email is not None and values.email != current_email:
            await self._ensure_email_available(db=db, email=values.email)
        if values.username is not None and values.username != current_username:
            await self._ensure_username_available(db=db, username=values.username)

        await crud_users.update(db=db, object=values, uuid=user_uuid)
        return {"message": "User updated"}

    async def delete_user(
        self,
        db: AsyncSession,
        user_uuid: uuid_pkg.UUID | str,
        current_user: Mapping[str, Any],
        token: str,
    ) -> dict[str, str]:
        db_user = await self._get_user(db=db, user_uuid=user_uuid, include_deleted=False)
        self._ensure_self_only(current_user=current_user, db_user=db_user)

        await crud_users.delete(db=db, uuid=user_uuid)
        await blacklist_token(token=token, db=db)
        return {"message": "User deleted"}

    async def delete_user_from_db(self, db: AsyncSession, user_uuid: uuid_pkg.UUID | str, token: str) -> dict[str, str]:
        exists = await crud_users.exists(db=db, uuid=user_uuid)
        if not exists:
            raise NotFoundException("User not found")

        await crud_users.db_delete(db=db, uuid=user_uuid)
        await blacklist_token(token=token, db=db)
        return {"message": "User deleted from the database"}

    async def get_user_rate_limits(self, db: AsyncSession, user_uuid: uuid_pkg.UUID | str) -> dict[str, Any]:
        db_user = await self._get_user(db=db, user_uuid=user_uuid, include_deleted=True)
        user_dict = await self._build_public_user(db=db, user=dict(db_user))
        if db_user.get("tier_id") is None:
            user_dict["tier_rate_limits"] = []
            return user_dict

        db_tier = await crud_tiers.get(db=db, id=db_user["tier_id"])
        if db_tier is None:
            raise NotFoundException("Tier not found")

        db_rate_limits = await crud_rate_limits.get_multi(db=db, tier_id=db_tier["id"], schema_to_select=RateLimitRead)
        user_dict["tier_rate_limits"] = db_rate_limits["data"]
        return user_dict

    async def get_user_tier(self, db: AsyncSession, user_uuid: uuid_pkg.UUID | str) -> dict[str, Any] | None:
        db_user = await self._get_user(db=db, user_uuid=user_uuid, include_deleted=True)
        if db_user.get("tier_id") is None:
            return None

        db_tier = await crud_tiers.get(db=db, id=db_user["tier_id"], schema_to_select=TierRead)
        if db_tier is None:
            raise NotFoundException("Tier not found")

        user_dict = await self._build_public_user(db=db, user=dict(db_user))
        user_dict["tier_uuid"] = db_tier["uuid"]
        user_dict["tier_name"] = db_tier["name"]
        user_dict["tier_created_at"] = db_tier["created_at"]
        return user_dict

    async def get_user_role(self, db: AsyncSession, user_uuid: uuid_pkg.UUID | str) -> dict[str, Any] | None:
        db_user = await self._get_user(db=db, user_uuid=user_uuid, include_deleted=False)
        if db_user.get("role_id") is None:
            return None

        db_role = await crud_roles.get(db=db, id=db_user["role_id"], is_deleted=False, schema_to_select=RoleRead)
        if db_role is None:
            raise NotFoundException("Role not found")
        return dict(db_role)

    async def update_user_role(self, db: AsyncSession, user_uuid: uuid_pkg.UUID | str, values: UserRoleUpdate) -> dict[str, str]:
        await self._get_user(db=db, user_uuid=user_uuid, include_deleted=False)
        role_id: int | None = None
        if values.role_uuid is not None:
            db_role = await crud_roles.get(db=db, uuid=values.role_uuid, is_deleted=False, schema_to_select=RoleRead)
            if db_role is None:
                raise NotFoundException("Role not found")
            role_id = db_role["id"]

        await crud_users.update(db=db, object={"role_id": role_id}, uuid=user_uuid)
        return {"message": "User role updated"}

    async def update_user_tier(self, db: AsyncSession, user_uuid: uuid_pkg.UUID | str, values: UserTierUpdate) -> dict[str, str]:
        db_user = await self._get_user(db=db, user_uuid=user_uuid, include_deleted=True)
        db_tier = await crud_tiers.get(db=db, uuid=values.tier_uuid, schema_to_select=TierRead)
        if db_tier is None:
            raise NotFoundException("Tier not found")

        await crud_users.update(db=db, object={"tier_id": db_tier["id"]}, uuid=user_uuid)
        return {"message": f"User {db_user['name']} Tier updated"}

    async def _get_user(self, db: AsyncSession, user_uuid: uuid_pkg.UUID | str, include_deleted: bool) -> Mapping[str, Any]:
        query: dict[str, Any] = {"db": db, "uuid": user_uuid, "schema_to_select": UserReadInternal}
        if not include_deleted:
            query["is_deleted"] = False

        db_user = await crud_users.get(**query)
        if db_user is None:
            raise NotFoundException("User not found")
        return db_user

    async def _build_public_user(self, db: AsyncSession, user: dict[str, Any]) -> dict[str, Any]:
        public_user = {
            "auth_provider": user.get("auth_provider"),
            "auth_subject": user.get("auth_subject"),
            "email": user["email"],
            "name": user["name"],
            "profile_image_url": user["profile_image_url"],
            "role_uuid": None,
            "tier_uuid": None,
            "uuid": user["uuid"],
            "username": user["username"],
        }
        role_id = user.get("role_id")
        tier_id = user.get("tier_id")

        if role_id is None:
            public_user["role_uuid"] = None
        else:
            db_role = await crud_roles.get(db=db, id=role_id, is_deleted=False, schema_to_select=RoleRead)
            public_user["role_uuid"] = None if db_role is None else db_role["uuid"]

        if tier_id is None:
            public_user["tier_uuid"] = None
        else:
            db_tier = await crud_tiers.get(db=db, id=tier_id, schema_to_select=TierRead)
            public_user["tier_uuid"] = None if db_tier is None else db_tier["uuid"]

        return public_user

    async def _ensure_email_available(self, db: AsyncSession, email: str) -> None:
        if await crud_users.exists(db=db, email=email):
            raise DuplicateValueException("Email is already registered")

    async def _ensure_username_available(self, db: AsyncSession, username: str) -> None:
        if await crud_users.exists(db=db, username=username):
            raise DuplicateValueException("Username not available")

    def _ensure_self_only(self, current_user: Mapping[str, Any], db_user: Mapping[str, Any]) -> None:
        if db_user["username"] != current_user["username"]:
            raise ForbiddenException()
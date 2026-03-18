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
from ..schemas.role import RoleRead
from ..schemas.tier import TierRead
from ..schemas.user import UserCreate, UserCreateInternal, UserRead, UserRoleUpdate, UserTierUpdate, UserUpdate


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
        created_user = await crud_users.create(db=db, object=user_internal, schema_to_select=UserRead)
        if created_user is None:
            raise NotFoundException("Failed to create user")
        return created_user

    async def list_users(self, db: AsyncSession, page: int, items_per_page: int) -> dict[str, Any]:
        users_data = await crud_users.get_multi(
            db=db,
            offset=compute_offset(page, items_per_page),
            limit=items_per_page,
            is_deleted=False,
        )
        return paginated_response(crud_data=users_data, page=page, items_per_page=items_per_page)

    async def get_user_by_username(self, db: AsyncSession, username: str) -> dict[str, Any]:
        return dict(await self._get_user(db=db, username=username, include_deleted=False))

    async def update_user(
        self,
        db: AsyncSession,
        username: str,
        current_user: Mapping[str, Any],
        values: UserUpdate,
    ) -> dict[str, str]:
        db_user = await self._get_user(db=db, username=username, include_deleted=True)
        self._ensure_self_only(current_user=current_user, db_user=db_user)

        current_email = db_user["email"]
        current_username = db_user["username"]
        if values.email is not None and values.email != current_email:
            await self._ensure_email_available(db=db, email=values.email)
        if values.username is not None and values.username != current_username:
            await self._ensure_username_available(db=db, username=values.username)

        await crud_users.update(db=db, object=values, username=username)
        return {"message": "User updated"}

    async def delete_user(
        self,
        db: AsyncSession,
        username: str,
        current_user: Mapping[str, Any],
        token: str,
    ) -> dict[str, str]:
        await self._get_user(db=db, username=username, include_deleted=False)
        self._ensure_self_only(current_user=current_user, db_user={"username": username})

        await crud_users.delete(db=db, username=username)
        await blacklist_token(token=token, db=db)
        return {"message": "User deleted"}

    async def delete_user_from_db(self, db: AsyncSession, username: str, token: str) -> dict[str, str]:
        exists = await crud_users.exists(db=db, username=username)
        if not exists:
            raise NotFoundException("User not found")

        await crud_users.db_delete(db=db, username=username)
        await blacklist_token(token=token, db=db)
        return {"message": "User deleted from the database"}

    async def get_user_rate_limits(self, db: AsyncSession, username: str) -> dict[str, Any]:
        db_user = await self._get_user(db=db, username=username, include_deleted=True)
        user_dict = dict(db_user)
        if db_user.get("tier_id") is None:
            user_dict["tier_rate_limits"] = []
            return user_dict

        db_tier = await crud_tiers.get(db=db, id=db_user["tier_id"], schema_to_select=TierRead)
        if db_tier is None:
            raise NotFoundException("Tier not found")

        db_rate_limits = await crud_rate_limits.get_multi(db=db, tier_id=db_tier["id"])
        user_dict["tier_rate_limits"] = db_rate_limits["data"]
        return user_dict

    async def get_user_tier(self, db: AsyncSession, username: str) -> dict[str, Any] | None:
        db_user = await self._get_user(db=db, username=username, include_deleted=True)
        if db_user.get("tier_id") is None:
            return None

        db_tier = await crud_tiers.get(db=db, id=db_user["tier_id"], schema_to_select=TierRead)
        if db_tier is None:
            raise NotFoundException("Tier not found")

        user_dict = dict(db_user)
        for key, value in dict(db_tier).items():
            user_dict[f"tier_{key}"] = value
        return user_dict

    async def get_user_role(self, db: AsyncSession, username: str) -> dict[str, Any] | None:
        db_user = await self._get_user(db=db, username=username, include_deleted=False)
        if db_user.get("role_id") is None:
            return None

        db_role = await crud_roles.get(db=db, id=db_user["role_id"], is_deleted=False, schema_to_select=RoleRead)
        if db_role is None:
            raise NotFoundException("Role not found")
        return dict(db_role)

    async def update_user_role(self, db: AsyncSession, username: str, values: UserRoleUpdate) -> dict[str, str]:
        await self._get_user(db=db, username=username, include_deleted=False)
        if values.role_id is not None:
            db_role = await crud_roles.get(db=db, id=values.role_id, is_deleted=False, schema_to_select=RoleRead)
            if db_role is None:
                raise NotFoundException("Role not found")

        await crud_users.update(db=db, object={"role_id": values.role_id}, username=username)
        return {"message": "User role updated"}

    async def update_user_tier(self, db: AsyncSession, username: str, values: UserTierUpdate) -> dict[str, str]:
        db_user = await self._get_user(db=db, username=username, include_deleted=True)
        db_tier = await crud_tiers.get(db=db, id=values.tier_id, schema_to_select=TierRead)
        if db_tier is None:
            raise NotFoundException("Tier not found")

        await crud_users.update(db=db, object=values.model_dump(), username=username)
        return {"message": f"User {db_user['name']} Tier updated"}

    async def _get_user(self, db: AsyncSession, username: str, include_deleted: bool) -> Mapping[str, Any]:
        query: dict[str, Any] = {"db": db, "username": username, "schema_to_select": UserRead}
        if not include_deleted:
            query["is_deleted"] = False

        db_user = await crud_users.get(**query)
        if db_user is None:
            raise NotFoundException("User not found")
        return db_user

    async def _ensure_email_available(self, db: AsyncSession, email: str) -> None:
        if await crud_users.exists(db=db, email=email):
            raise DuplicateValueException("Email is already registered")

    async def _ensure_username_available(self, db: AsyncSession, username: str) -> None:
        if await crud_users.exists(db=db, username=username):
            raise DuplicateValueException("Username not available")

    def _ensure_self_only(self, current_user: Mapping[str, Any], db_user: Mapping[str, Any]) -> None:
        if db_user["username"] != current_user["username"]:
            raise ForbiddenException()
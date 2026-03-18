from typing import Any

from fastcrud import compute_offset, paginated_response
from sqlalchemy.ext.asyncio import AsyncSession

from ..core.exceptions.http_exceptions import DuplicateValueException, NotFoundException
from ..crud.crud_access_policies import crud_access_policies
from ..schemas.access_policy import AccessPolicyCreate, AccessPolicyOut, AccessPolicyUpdate


class PolicyService:
    async def create_policy(self, db: AsyncSession, policy: AccessPolicyCreate) -> dict[str, Any]:
        if await crud_access_policies.exists(
            db=db,
            subject=policy.subject,
            resource=policy.resource,
            action=policy.action,
            is_deleted=False,
        ):
            raise DuplicateValueException("Policy already exists")

        created_policy = await crud_access_policies.create(db=db, object=policy, schema_to_select=AccessPolicyOut)
        if created_policy is None:
            raise NotFoundException("Failed to create policy")
        return created_policy

    async def list_policies(self, db: AsyncSession, page: int, items_per_page: int) -> dict[str, Any]:
        policies_data = await crud_access_policies.get_multi(
            db=db,
            offset=compute_offset(page, items_per_page),
            limit=items_per_page,
            is_deleted=False,
        )
        return paginated_response(crud_data=policies_data, page=page, items_per_page=items_per_page)

    async def get_policy(self, db: AsyncSession, policy_id: int) -> dict[str, Any]:
        db_policy = await crud_access_policies.get(
            db=db,
            id=policy_id,
            is_deleted=False,
            schema_to_select=AccessPolicyOut,
        )
        if db_policy is None:
            raise NotFoundException("Policy not found")
        return db_policy

    async def update_policy(self, db: AsyncSession, policy_id: int, values: AccessPolicyUpdate) -> dict[str, str]:
        db_policy = await self.get_policy(db=db, policy_id=policy_id)

        next_subject = values.subject if values.subject is not None else db_policy["subject"]
        next_resource = values.resource if values.resource is not None else db_policy["resource"]
        next_action = values.action if values.action is not None else db_policy["action"]

        matching_policy = await crud_access_policies.exists(
            db=db,
            subject=next_subject,
            resource=next_resource,
            action=next_action,
            is_deleted=False,
        )
        if matching_policy and matching_policy["id"] != policy_id:
            raise DuplicateValueException("Policy already exists")

        await crud_access_policies.update(db=db, object=values, id=policy_id)
        return {"message": "Policy updated"}

    async def delete_policy(self, db: AsyncSession, policy_id: int) -> dict[str, str]:
        await self.get_policy(db=db, policy_id=policy_id)
        await crud_access_policies.delete(db=db, id=policy_id)
        return {"message": "Policy deleted"}
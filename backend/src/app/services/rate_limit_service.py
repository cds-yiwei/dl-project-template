from typing import Any

from fastcrud import compute_offset, paginated_response
from sqlalchemy.ext.asyncio import AsyncSession

from ..core.exceptions.http_exceptions import DuplicateValueException, NotFoundException
from ..crud.crud_rate_limit import crud_rate_limits
from ..crud.crud_tier import crud_tiers
from ..schemas.rate_limit import RateLimitCreate, RateLimitCreateInternal, RateLimitRead, RateLimitUpdate
from ..schemas.tier import TierRead


class RateLimitService:
    async def create_rate_limit(self, db: AsyncSession, tier_name: str, rate_limit: RateLimitCreate) -> dict[str, Any]:
        db_tier = await self._get_tier(db=db, tier_name=tier_name)
        payload = rate_limit.model_dump()
        payload["tier_id"] = db_tier["id"]

        if await crud_rate_limits.exists(db=db, name=payload["name"]):
            raise DuplicateValueException("Rate Limit Name not available")

        created_rate_limit = await crud_rate_limits.create(
            db=db,
            object=RateLimitCreateInternal(**payload),
            schema_to_select=RateLimitRead,
        )
        if created_rate_limit is None:
            raise NotFoundException("Failed to create rate limit")
        return created_rate_limit

    async def list_rate_limits(self, db: AsyncSession, tier_name: str, page: int, items_per_page: int) -> dict[str, Any]:
        db_tier = await self._get_tier(db=db, tier_name=tier_name)
        rate_limits_data = await crud_rate_limits.get_multi(
            db=db,
            offset=compute_offset(page, items_per_page),
            limit=items_per_page,
            tier_id=db_tier["id"],
        )
        return paginated_response(crud_data=rate_limits_data, page=page, items_per_page=items_per_page)

    async def get_rate_limit(self, db: AsyncSession, tier_name: str, rate_limit_id: int) -> dict[str, Any]:
        db_tier = await self._get_tier(db=db, tier_name=tier_name)
        db_rate_limit = await crud_rate_limits.get(
            db=db,
            tier_id=db_tier["id"],
            id=rate_limit_id,
            schema_to_select=RateLimitRead,
        )
        if db_rate_limit is None:
            raise NotFoundException("Rate Limit not found")
        return db_rate_limit

    async def update_rate_limit(
        self, db: AsyncSession, tier_name: str, rate_limit_id: int, values: RateLimitUpdate
    ) -> dict[str, str]:
        await self.get_rate_limit(db=db, tier_name=tier_name, rate_limit_id=rate_limit_id)
        await crud_rate_limits.update(db=db, object=values, id=rate_limit_id)
        return {"message": "Rate Limit updated"}

    async def delete_rate_limit(self, db: AsyncSession, tier_name: str, rate_limit_id: int) -> dict[str, str]:
        await self.get_rate_limit(db=db, tier_name=tier_name, rate_limit_id=rate_limit_id)
        await crud_rate_limits.delete(db=db, id=rate_limit_id)
        return {"message": "Rate Limit deleted"}

    async def _get_tier(self, db: AsyncSession, tier_name: str) -> dict[str, Any]:
        db_tier = await crud_tiers.get(db=db, name=tier_name, schema_to_select=TierRead)
        if not db_tier:
            raise NotFoundException("Tier not found")
        return db_tier
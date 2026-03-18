from typing import Any

from fastcrud import compute_offset, paginated_response
from sqlalchemy.ext.asyncio import AsyncSession

from ..core.exceptions.http_exceptions import DuplicateValueException, NotFoundException
from ..crud.crud_tier import crud_tiers
from ..schemas.tier import TierCreate, TierCreateInternal, TierRead, TierUpdate


class TierService:
    async def create_tier(self, db: AsyncSession, tier: TierCreate) -> dict[str, Any]:
        if await crud_tiers.exists(db=db, name=tier.name):
            raise DuplicateValueException("Tier Name not available")

        created_tier = await crud_tiers.create(
            db=db,
            object=TierCreateInternal(**tier.model_dump()),
            schema_to_select=TierRead,
        )
        if created_tier is None:
            raise NotFoundException("Failed to create tier")
        return created_tier

    async def list_tiers(self, db: AsyncSession, page: int, items_per_page: int) -> dict[str, Any]:
        tiers_data = await crud_tiers.get_multi(db=db, offset=compute_offset(page, items_per_page), limit=items_per_page)
        return paginated_response(crud_data=tiers_data, page=page, items_per_page=items_per_page)

    async def get_tier_by_name(self, db: AsyncSession, name: str) -> dict[str, Any]:
        db_tier = await crud_tiers.get(db=db, name=name, schema_to_select=TierRead)
        if db_tier is None:
            raise NotFoundException("Tier not found")
        return db_tier

    async def update_tier(self, db: AsyncSession, name: str, values: TierUpdate) -> dict[str, str]:
        await self.get_tier_by_name(db=db, name=name)
        await crud_tiers.update(db=db, object=values, name=name)
        return {"message": "Tier updated"}

    async def delete_tier(self, db: AsyncSession, name: str) -> dict[str, str]:
        await self.get_tier_by_name(db=db, name=name)
        await crud_tiers.delete(db=db, name=name)
        return {"message": "Tier deleted"}
from typing import Annotated, Any

from fastapi import APIRouter, Depends, Request
from fastcrud import PaginatedListResponse
from sqlalchemy.ext.asyncio import AsyncSession

from ...api.dependencies import get_tier_service
from ...core.access_control import casbin_guard
from ...core.db.database import async_get_db
from ...schemas.tier import TierCreate, TierRead, TierUpdate
from ...services.tier_service import TierService

router = APIRouter(tags=["tiers"])


@router.post("/tier", status_code=201)
@casbin_guard.require_permission("tiers", "write")
async def write_tier(
    request: Request,
    tier: TierCreate,
    db: Annotated[AsyncSession, Depends(async_get_db)],
    service: Annotated[TierService, Depends(get_tier_service)],
) -> dict[str, Any]:
    return await service.create_tier(db=db, tier=tier)


@router.get("/tiers", response_model=PaginatedListResponse[TierRead])
@casbin_guard.require_permission("tiers", "read")
async def read_tiers(
    request: Request,
    db: Annotated[AsyncSession, Depends(async_get_db)],
    service: Annotated[TierService, Depends(get_tier_service)],
    page: int = 1,
    items_per_page: int = 10,
) -> dict:
    return await service.list_tiers(db=db, page=page, items_per_page=items_per_page)


@router.get("/tier/{name}", response_model=TierRead)
@casbin_guard.require_permission("tiers", "read")
async def read_tier(
    request: Request,
    name: str,
    db: Annotated[AsyncSession, Depends(async_get_db)],
    service: Annotated[TierService, Depends(get_tier_service)],
) -> dict[str, Any]:
    return await service.get_tier_by_name(db=db, name=name)


@router.patch("/tier/{name}")
@casbin_guard.require_permission("tiers", "write")
async def patch_tier(
    request: Request,
    name: str,
    values: TierUpdate,
    db: Annotated[AsyncSession, Depends(async_get_db)],
    service: Annotated[TierService, Depends(get_tier_service)],
) -> dict[str, str]:
    return await service.update_tier(db=db, name=name, values=values)


@router.delete("/tier/{name}")
@casbin_guard.require_permission("tiers", "write")
async def erase_tier(
    request: Request,
    name: str,
    db: Annotated[AsyncSession, Depends(async_get_db)],
    service: Annotated[TierService, Depends(get_tier_service)],
) -> dict[str, str]:
    return await service.delete_tier(db=db, name=name)

import uuid as uuid_pkg
from typing import Annotated, Any

from fastapi import APIRouter, Depends, Request
from fastcrud import PaginatedListResponse
from sqlalchemy.ext.asyncio import AsyncSession

from ...api.dependencies import get_current_user, get_user_service
from ...core.access_control import casbin_guard
from ...core.db.database import async_get_db
from ...core.security import oauth2_scheme
from ...schemas.role import RoleRead
from ...schemas.user import UserCreate, UserRateLimitsRead, UserRead, UserRoleUpdate, UserTierRead, UserTierUpdate, UserUpdate
from ...services.user_service import UserService

router = APIRouter(tags=["users"])


@router.post("/user", response_model=UserRead, status_code=201)
async def write_user(
    request: Request,
    user: UserCreate,
    db: Annotated[AsyncSession, Depends(async_get_db)],
    service: Annotated[UserService, Depends(get_user_service)],
) -> dict[str, Any]:
    return await service.create_user(db=db, user=user)


@router.get("/users", response_model=PaginatedListResponse[UserRead])
async def read_users(
    request: Request,
    db: Annotated[AsyncSession, Depends(async_get_db)],
    service: Annotated[UserService, Depends(get_user_service)],
    page: int = 1,
    items_per_page: int = 10,
) -> dict:
    return await service.list_users(db=db, page=page, items_per_page=items_per_page)


@router.get("/user/me/", response_model=UserRead)
async def read_users_me(request: Request, current_user: Annotated[dict, Depends(get_current_user)]) -> dict:
    return current_user


@router.get("/user/{user_uuid}", response_model=UserRead)
async def read_user(
    request: Request,
    user_uuid: uuid_pkg.UUID,
    db: Annotated[AsyncSession, Depends(async_get_db)],
    service: Annotated[UserService, Depends(get_user_service)],
) -> dict[str, Any]:
    return await service.get_user_by_uuid(db=db, user_uuid=user_uuid)


@router.patch("/user/{user_uuid}")
@casbin_guard.require_permission("users_admin", "write")
async def patch_user(
    request: Request,
    values: UserUpdate,
    user_uuid: uuid_pkg.UUID,
    current_user: Annotated[dict, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(async_get_db)],
    service: Annotated[UserService, Depends(get_user_service)],
) -> dict[str, str]:
    return await service.update_user(db=db, user_uuid=user_uuid, current_user=current_user, values=values)


@router.delete("/user/{user_uuid}")
@casbin_guard.require_permission("users_admin", "write")
async def erase_user(
    request: Request,
    user_uuid: uuid_pkg.UUID,
    current_user: Annotated[dict, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(async_get_db)],
    service: Annotated[UserService, Depends(get_user_service)],
    token: str = Depends(oauth2_scheme),
) -> dict[str, str]:
    return await service.delete_user(db=db, user_uuid=user_uuid, current_user=current_user, token=token)


@router.delete("/db_user/{user_uuid}")
@casbin_guard.require_permission("users_admin", "write")
async def erase_db_user(
    request: Request,
    user_uuid: uuid_pkg.UUID,
    db: Annotated[AsyncSession, Depends(async_get_db)],
    service: Annotated[UserService, Depends(get_user_service)],
    token: str = Depends(oauth2_scheme),
) -> dict[str, str]:
    return await service.delete_user_from_db(db=db, user_uuid=user_uuid, token=token)


@router.get("/user/{user_uuid}/rate_limits", response_model=UserRateLimitsRead)
@casbin_guard.require_permission("users_admin", "read")
async def read_user_rate_limits(
    request: Request,
    user_uuid: uuid_pkg.UUID,
    db: Annotated[AsyncSession, Depends(async_get_db)],
    service: Annotated[UserService, Depends(get_user_service)],
) -> dict[str, Any]:
    return await service.get_user_rate_limits(db=db, user_uuid=user_uuid)


@router.get("/user/{user_uuid}/tier", response_model=UserTierRead | None)
async def read_user_tier(
    request: Request,
    user_uuid: uuid_pkg.UUID,
    db: Annotated[AsyncSession, Depends(async_get_db)],
    service: Annotated[UserService, Depends(get_user_service)],
) -> dict | None:
    return await service.get_user_tier(db=db, user_uuid=user_uuid)


@router.get("/user/{user_uuid}/role", response_model=RoleRead | None)
@casbin_guard.require_permission("users_admin", "read")
async def read_user_role(
    request: Request,
    user_uuid: uuid_pkg.UUID,
    db: Annotated[AsyncSession, Depends(async_get_db)],
    service: Annotated[UserService, Depends(get_user_service)],
) -> dict | None:
    return await service.get_user_role(db=db, user_uuid=user_uuid)


@router.patch("/user/{user_uuid}/role")
@casbin_guard.require_permission("users_admin", "write")
async def patch_user_role(
    request: Request,
    user_uuid: uuid_pkg.UUID,
    values: UserRoleUpdate,
    db: Annotated[AsyncSession, Depends(async_get_db)],
    service: Annotated[UserService, Depends(get_user_service)],
) -> dict[str, str]:
    return await service.update_user_role(db=db, user_uuid=user_uuid, values=values)


@router.patch("/user/{user_uuid}/tier")
@casbin_guard.require_permission("users_admin", "write")
async def patch_user_tier(
    request: Request,
    user_uuid: uuid_pkg.UUID,
    values: UserTierUpdate,
    db: Annotated[AsyncSession, Depends(async_get_db)],
    service: Annotated[UserService, Depends(get_user_service)],
) -> dict[str, str]:
    return await service.update_user_tier(db=db, user_uuid=user_uuid, values=values)

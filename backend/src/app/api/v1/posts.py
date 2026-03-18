from typing import Annotated, Any

from fastapi import APIRouter, Depends, Request
from fastcrud import PaginatedListResponse
from sqlalchemy.ext.asyncio import AsyncSession

from ...api.dependencies import get_current_superuser, get_current_user, get_post_service
from ...core.access_control import casbin_guard
from ...core.db.database import async_get_db
from ...core.utils.cache import cache
from ...schemas.post import PostApprove, PostCreate, PostRead, PostReject, PostUpdate
from ...services.post_service import PostService

router = APIRouter(tags=["posts"])


@router.post("/{username}/post", response_model=PostRead, status_code=201)
@cache("{username}_posts", resource_id_name="username", pattern_to_invalidate_extra=["{username}_posts:*"])
async def write_post(
    request: Request,
    username: str,
    post: PostCreate,
    current_user: Annotated[dict, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(async_get_db)],
    service: Annotated[PostService, Depends(get_post_service)],
) -> dict[str, Any]:
    return await service.create_post(db=db, username=username, current_user=current_user, post=post)


@router.get("/{username}/posts", response_model=PaginatedListResponse[PostRead])
@cache(
    key_prefix="{username}_posts:page_{page}:items_per_page:{items_per_page}",
    resource_id_name="username",
    expiration=60,
)
async def read_posts(
    request: Request,
    username: str,
    db: Annotated[AsyncSession, Depends(async_get_db)],
    service: Annotated[PostService, Depends(get_post_service)],
    page: int = 1,
    items_per_page: int = 10,
) -> dict:
    return await service.list_posts_by_username(db=db, username=username, page=page, items_per_page=items_per_page)


@router.get("/{username}/post/{id}", response_model=PostRead)
@cache(key_prefix="{username}_post_cache", resource_id_name="id")
async def read_post(
    request: Request,
    username: str,
    id: int,
    db: Annotated[AsyncSession, Depends(async_get_db)],
    service: Annotated[PostService, Depends(get_post_service)],
) -> dict[str, Any]:
    return await service.get_post_by_username(db=db, username=username, post_id=id)


@router.patch("/{username}/post/{id}")
@cache("{username}_post_cache", resource_id_name="id", pattern_to_invalidate_extra=["{username}_posts:*"])
async def patch_post(
    request: Request,
    username: str,
    id: int,
    values: PostUpdate,
    current_user: Annotated[dict, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(async_get_db)],
    service: Annotated[PostService, Depends(get_post_service)],
) -> dict[str, str]:
    return await service.update_post(db=db, username=username, post_id=id, current_user=current_user, values=values)


@router.delete("/{username}/post/{id}")
@cache("{username}_post_cache", resource_id_name="id", pattern_to_invalidate_extra=["{username}_posts:*"])
async def erase_post(
    request: Request,
    username: str,
    id: int,
    current_user: Annotated[dict, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(async_get_db)],
    service: Annotated[PostService, Depends(get_post_service)],
) -> dict[str, str]:
    return await service.delete_post(db=db, username=username, post_id=id, current_user=current_user)


@router.delete("/{username}/db_post/{id}", dependencies=[Depends(get_current_superuser)])
@cache("{username}_post_cache", resource_id_name="id", pattern_to_invalidate_extra=["{username}_posts:*"])
async def erase_db_post(
    request: Request,
    username: str,
    id: int,
    db: Annotated[AsyncSession, Depends(async_get_db)],
    service: Annotated[PostService, Depends(get_post_service)],
) -> dict[str, str]:
    return await service.delete_post_from_db(db=db, username=username, post_id=id)


@router.post("/{username}/post/{id}/submit-review")
@cache("{username}_post_cache", resource_id_name="id", pattern_to_invalidate_extra=["{username}_posts:*"])
async def submit_post_for_review(
    request: Request,
    username: str,
    id: int,
    current_user: Annotated[dict, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(async_get_db)],
    service: Annotated[PostService, Depends(get_post_service)],
) -> dict[str, str]:
    return await service.submit_for_review(db=db, username=username, post_id=id, current_user=current_user)


@router.post("/posts/{id}/approve")
@casbin_guard.require_permission("posts", "approve")
async def approve_post(
    request: Request,
    id: int,
    payload: PostApprove,
    current_user: Annotated[dict, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(async_get_db)],
    service: Annotated[PostService, Depends(get_post_service)],
) -> dict[str, str]:
    return await service.approve_post(db=db, post_id=id, current_user=current_user, payload=payload)


@router.post("/posts/{id}/reject")
@casbin_guard.require_permission("posts", "reject")
async def reject_post(
    request: Request,
    id: int,
    payload: PostReject,
    current_user: Annotated[dict, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(async_get_db)],
    service: Annotated[PostService, Depends(get_post_service)],
) -> dict[str, str]:
    return await service.reject_post(db=db, post_id=id, current_user=current_user, payload=payload)


@router.get("/posts/pending-review", response_model=PaginatedListResponse[PostRead])
@casbin_guard.require_permission("posts", "approve")
async def read_posts_pending_review(
    request: Request,
    db: Annotated[AsyncSession, Depends(async_get_db)],
    service: Annotated[PostService, Depends(get_post_service)],
    page: int = 1,
    items_per_page: int = 10,
) -> dict[str, Any]:
    return await service.list_posts_pending_review(db=db, page=page, items_per_page=items_per_page)

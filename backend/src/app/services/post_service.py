from collections.abc import Mapping
from typing import Any

from fastcrud import compute_offset, paginated_response
from sqlalchemy.ext.asyncio import AsyncSession

from ..core.exceptions.http_exceptions import BadRequestException, ForbiddenException, NotFoundException
from ..core.utils.cache import invalidate_post_cache
from ..crud.crud_post_approvals import crud_post_approvals
from ..crud.crud_posts import crud_posts
from ..crud.crud_users import crud_users
from ..schemas.post import PostApprove, PostCreate, PostCreateInternal, PostRead, PostReject, PostStatus, PostUpdate
from ..schemas.user import UserRead
from ..schemas.post_approval import PostApprovalCreateInternal
from ..workflows.post_workflow import PostWorkflow


class PostService:
    def __init__(self) -> None:
        self.workflow = PostWorkflow()

    async def create_post(
        self,
        db: AsyncSession,
        username: str,
        current_user: Mapping[str, Any],
        post: PostCreate,
    ) -> dict[str, Any]:
        db_user = await self._get_user_by_username(db=db, username=username)
        self._ensure_same_user(current_user=current_user, user=db_user)

        post_internal = PostCreateInternal(**post.model_dump(), created_by_user_id=int(db_user["id"]))
        created_post = await crud_posts.create(db=db, object=post_internal, schema_to_select=PostRead)
        if created_post is None:
            raise NotFoundException("Failed to create post")
        await invalidate_post_cache(username=username)
        return created_post

    async def list_posts_by_username(
        self, db: AsyncSession, username: str, page: int, items_per_page: int
    ) -> dict[str, Any]:
        db_user = await self._get_user_by_username(db=db, username=username)
        posts_data = await crud_posts.get_multi(
            db=db,
            offset=compute_offset(page, items_per_page),
            limit=items_per_page,
            created_by_user_id=db_user["id"],
            is_deleted=False,
        )
        return paginated_response(crud_data=posts_data, page=page, items_per_page=items_per_page)

    async def get_post_by_username(self, db: AsyncSession, username: str, post_id: int) -> dict[str, Any]:
        db_user = await self._get_user_by_username(db=db, username=username)
        db_post = await crud_posts.get(
            db=db,
            id=post_id,
            created_by_user_id=db_user["id"],
            is_deleted=False,
            schema_to_select=PostRead,
        )
        if db_post is None:
            raise NotFoundException("Post not found")
        return db_post

    async def update_post(
        self,
        db: AsyncSession,
        username: str,
        post_id: int,
        current_user: Mapping[str, Any],
        values: PostUpdate,
    ) -> dict[str, str]:
        await self._assert_user_matches(db=db, username=username, current_user=current_user)
        post = await self._get_post(db=db, post_id=post_id)
        self._ensure_owner(current_user=current_user, post=post)

        status = PostStatus(post.get("status", PostStatus.DRAFT))
        if not self.workflow.can_author_edit(status):
            raise BadRequestException(f"Posts in status '{status.value}' cannot be edited")

        await crud_posts.update(db=db, object=values, id=post_id)
        await invalidate_post_cache(username=username, post_id=post_id)
        return {"message": "Post updated"}

    async def delete_post(
        self, db: AsyncSession, username: str, post_id: int, current_user: Mapping[str, Any]
    ) -> dict[str, str]:
        await self._assert_user_matches(db=db, username=username, current_user=current_user)
        post = await self._get_post(db=db, post_id=post_id)
        self._ensure_owner(current_user=current_user, post=post)

        status = PostStatus(post.get("status", PostStatus.DRAFT))
        if not self.workflow.can_author_edit(status):
            raise BadRequestException(f"Posts in status '{status.value}' cannot be deleted")

        await crud_posts.delete(db=db, id=post_id)
        await invalidate_post_cache(username=username, post_id=post_id)
        return {"message": "Post deleted"}

    async def delete_post_from_db(self, db: AsyncSession, username: str, post_id: int) -> dict[str, str]:
        await self._get_user_by_username(db=db, username=username)
        db_post = await crud_posts.get(db=db, id=post_id, is_deleted=False, schema_to_select=PostRead)
        if db_post is None:
            raise NotFoundException("Post not found")

        await crud_posts.db_delete(db=db, id=post_id)
        await invalidate_post_cache(username=username, post_id=post_id)
        return {"message": "Post deleted from the database"}

    async def submit_for_review(
        self, db: AsyncSession, username: str, post_id: int, current_user: Mapping[str, Any]
    ) -> dict[str, str]:
        await self._assert_user_matches(db=db, username=username, current_user=current_user)
        post = await self._get_post(db=db, post_id=post_id)
        self._ensure_owner(current_user=current_user, post=post)

        current_status = PostStatus(post.get("status", PostStatus.DRAFT))
        next_status = self.workflow.get_next_status(current_status=current_status, action="submit_for_review")

        await crud_posts.update(db=db, object={"status": next_status.value}, id=post_id)
        await crud_post_approvals.create(
            db=db,
            object=PostApprovalCreateInternal(
                post_id=post_id,
                submitted_by_user_id=int(current_user["id"]),
                from_status=current_status.value,
                to_status=next_status.value,
                decision="submit_for_review",
                comment=None,
            ),
        )
        await invalidate_post_cache(username=username, post_id=post_id)
        return {"message": "Post submitted for review"}

    async def list_posts_pending_review(self, db: AsyncSession, page: int, items_per_page: int) -> dict[str, Any]:
        posts_data = await crud_posts.get_multi(
            db=db,
            offset=compute_offset(page, items_per_page),
            limit=items_per_page,
            status="in_review",
            is_deleted=False,
        )
        return paginated_response(crud_data=posts_data, page=page, items_per_page=items_per_page)

    async def approve_post(
        self, db: AsyncSession, post_id: int, current_user: Mapping[str, Any], payload: PostApprove | None = None
    ) -> dict[str, str]:
        return await self._review_post(db=db, post_id=post_id, current_user=current_user, action="approve", comment=(payload.comment if payload else None))

    async def reject_post(
        self, db: AsyncSession, post_id: int, current_user: Mapping[str, Any], payload: PostReject | None = None
    ) -> dict[str, str]:
        return await self._review_post(db=db, post_id=post_id, current_user=current_user, action="reject", comment=(payload.comment if payload else None))

    async def _review_post(
        self,
        db: AsyncSession,
        post_id: int,
        current_user: Mapping[str, Any],
        action: str,
        comment: str | None,
    ) -> dict[str, str]:
        post = await self._get_post(db=db, post_id=post_id)
        current_status = PostStatus(post.get("status", PostStatus.DRAFT))
        next_status = self.workflow.get_next_status(current_status=current_status, action=action)

        await crud_posts.update(db=db, object={"status": next_status.value}, id=post_id)
        await crud_post_approvals.create(
            db=db,
            object=PostApprovalCreateInternal(
                post_id=post_id,
                submitted_by_user_id=int(post["created_by_user_id"]),
                reviewed_by_user_id=int(current_user["id"]),
                from_status=current_status.value,
                to_status=next_status.value,
                decision=action,
                comment=comment,
            ),
        )
        post_owner = await self._get_user_by_id(db=db, user_id=int(post["created_by_user_id"]))
        await invalidate_post_cache(username=str(post_owner["username"]), post_id=post_id)
        message = "Post approved" if action == "approve" else "Post rejected"
        return {"message": message}

    async def _get_post(self, db: AsyncSession, post_id: int) -> Mapping[str, Any]:
        post = await crud_posts.get(db=db, id=post_id, is_deleted=False)
        if post is None:
            raise NotFoundException("Post not found")
        return post

    async def _get_user_by_username(self, db: AsyncSession, username: str) -> Mapping[str, Any]:
        user = await crud_users.get(db=db, username=username, is_deleted=False, schema_to_select=UserRead)
        if user is None:
            raise NotFoundException("User not found")
        return user

    async def _get_user_by_id(self, db: AsyncSession, user_id: int) -> Mapping[str, Any]:
        user = await crud_users.get(db=db, id=user_id, is_deleted=False, schema_to_select=UserRead)
        if user is None:
            raise NotFoundException("User not found")
        return user

    async def _assert_user_matches(self, db: AsyncSession, username: str, current_user: Mapping[str, Any]) -> None:
        db_user = await self._get_user_by_username(db=db, username=username)
        self._ensure_same_user(current_user=current_user, user=db_user)

    def _ensure_same_user(self, current_user: Mapping[str, Any], user: Mapping[str, Any]) -> None:
        if int(current_user["id"]) != int(user["id"]):
            raise ForbiddenException()

    def _ensure_owner(self, current_user: Mapping[str, Any], post: Mapping[str, Any]) -> None:
        if bool(current_user.get("is_superuser")):
            return
        if int(current_user["id"]) != int(post["created_by_user_id"]):
            raise ForbiddenException()
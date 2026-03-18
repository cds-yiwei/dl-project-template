from unittest.mock import AsyncMock, patch

import pytest

from src.app.core.exceptions.http_exceptions import BadRequestException, ForbiddenException
from src.app.schemas.post import PostStatus, PostUpdate
from src.app.services.post_service import PostService


class TestPostService:
    @pytest.mark.asyncio
    async def test_submit_for_review_creates_approval_history_and_updates_status(self) -> None:
        service = PostService()
        post = {"id": 11, "created_by_user_id": 7, "status": PostStatus.DRAFT}
        current_user = {"id": 7, "is_superuser": False}
        db_user = {"id": 7, "username": "author"}

        with patch("src.app.services.post_service.crud_users") as mock_users:
            with patch("src.app.services.post_service.crud_posts") as mock_posts:
                with patch("src.app.services.post_service.crud_post_approvals") as mock_approvals:
                    mock_users.get = AsyncMock(return_value=db_user)
                    mock_posts.get = AsyncMock(return_value=post)
                    mock_posts.update = AsyncMock(return_value=None)
                    mock_approvals.create = AsyncMock(return_value=None)

                    result = await service.submit_for_review(
                        db=AsyncMock(),
                        username="author",
                        post_id=11,
                        current_user=current_user,
                    )

        assert result == {"message": "Post submitted for review"}
        mock_posts.update.assert_awaited_once()
        mock_approvals.create.assert_awaited_once()

    @pytest.mark.asyncio
    async def test_update_post_rejects_author_changes_when_post_is_in_review(self) -> None:
        service = PostService()
        current_user = {"id": 7, "is_superuser": False}
        post = {"id": 11, "created_by_user_id": 7, "status": PostStatus.IN_REVIEW}
        db_user = {"id": 7, "username": "author"}

        with patch("src.app.services.post_service.crud_users") as mock_users:
            with patch("src.app.services.post_service.crud_posts") as mock_posts:
                mock_users.get = AsyncMock(return_value=db_user)
                mock_posts.get = AsyncMock(return_value=post)

                with pytest.raises(BadRequestException, match="Posts in status 'in_review' cannot be edited"):
                    await service.update_post(
                        db=AsyncMock(),
                        username="author",
                        post_id=11,
                        current_user=current_user,
                        values=PostUpdate(title="Updated title"),
                    )

    @pytest.mark.asyncio
    async def test_submit_for_review_rejects_non_owner(self) -> None:
        service = PostService()
        post = {"id": 11, "created_by_user_id": 7, "status": PostStatus.DRAFT}
        current_user = {"id": 9, "is_superuser": False}
        db_user = {"id": 9, "username": "author"}

        with patch("src.app.services.post_service.crud_users") as mock_users:
            with patch("src.app.services.post_service.crud_posts") as mock_posts:
                mock_users.get = AsyncMock(return_value=db_user)
                mock_posts.get = AsyncMock(return_value=post)

                with pytest.raises(ForbiddenException):
                    await service.submit_for_review(
                        db=AsyncMock(),
                        username="author",
                        post_id=11,
                        current_user=current_user,
                    )
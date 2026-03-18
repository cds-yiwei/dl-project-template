from unittest.mock import AsyncMock, Mock, patch

import pytest

from src.app.api.v1.posts import erase_post, patch_post, write_post
from src.app.core.exceptions.http_exceptions import NotFoundException
from src.app.schemas.post import PostApprove, PostCreate, PostReject, PostUpdate


def unwrap_endpoint(endpoint):
    current = endpoint
    while hasattr(current, "__wrapped__"):
        current = current.__wrapped__
    return current


class TestWritePost:
    @pytest.mark.asyncio
    async def test_write_post_delegates_creation_to_service(self, mock_db) -> None:
        current_user = {"id": 7, "username": "author", "is_superuser": False}
        payload = PostCreate(title="Hello", text="World")
        mock_service = Mock()
        mock_service.create_post = AsyncMock(return_value={"id": 1, "title": "Hello", "text": "World"})

        result = await unwrap_endpoint(write_post)(Mock(), "author", payload, current_user, mock_db, mock_service)

        assert result == {"id": 1, "title": "Hello", "text": "World"}
        mock_service.create_post.assert_awaited_once_with(
            db=mock_db,
            username="author",
            current_user=current_user,
            post=payload,
        )

    @pytest.mark.asyncio
    async def test_write_post_invalidates_paginated_post_cache(self, mock_db, mock_redis) -> None:
        current_user = {"id": 7, "username": "author", "is_superuser": False}
        payload = PostCreate(title="Hello", text="World")
        request = Mock(method="POST")
        mock_service = Mock()
        mock_service.create_post = AsyncMock(return_value={"id": 1, "title": "Hello", "text": "World"})
        mock_redis.scan = AsyncMock(return_value=(0, [b"author_posts:page_1:items_per_page:10:author"]))

        with patch("src.app.core.utils.cache.client", mock_redis):
            result = await write_post(
                request,
                username="author",
                post=payload,
                current_user=current_user,
                db=mock_db,
                service=mock_service,
            )

        assert result == {"id": 1, "title": "Hello", "text": "World"}
        mock_redis.scan.assert_awaited_once_with(0, match="author_posts:**", count=100)
        mock_redis.delete.assert_any_await("author_posts:author")
        mock_redis.delete.assert_any_await(b"author_posts:page_1:items_per_page:10:author")


class TestPatchPost:
    @pytest.mark.asyncio
    async def test_patch_post_delegates_to_service(self, mock_db) -> None:
        current_user = {"id": 7, "username": "author", "is_superuser": False}
        payload = PostUpdate(title="Updated")
        mock_service = Mock()
        mock_service.update_post = AsyncMock(return_value={"message": "Post updated"})

        result = await unwrap_endpoint(patch_post)(Mock(), "author", 1, payload, current_user, mock_db, mock_service)

        assert result == {"message": "Post updated"}
        mock_service.update_post.assert_awaited_once_with(
            db=mock_db,
            username="author",
            post_id=1,
            current_user=current_user,
            values=payload,
        )

    @pytest.mark.asyncio
    async def test_patch_post_invalidates_paginated_post_cache(self, mock_db, mock_redis) -> None:
        current_user = {"id": 7, "username": "author", "is_superuser": False}
        payload = PostUpdate(title="Updated")
        request = Mock(method="PATCH")
        mock_service = Mock()
        mock_service.update_post = AsyncMock(return_value={"message": "Post updated"})
        mock_redis.scan = AsyncMock(return_value=(0, [b"author_posts:page_1:items_per_page:10:author"]))

        with patch("src.app.core.utils.cache.client", mock_redis):
            result = await patch_post(
                request,
                username="author",
                id=1,
                values=payload,
                current_user=current_user,
                db=mock_db,
                service=mock_service,
            )

        assert result == {"message": "Post updated"}
        mock_redis.scan.assert_awaited_once_with(0, match="author_posts:**", count=100)
        mock_redis.delete.assert_any_await("author_post_cache:1")
        mock_redis.delete.assert_any_await(b"author_posts:page_1:items_per_page:10:author")


class TestErasePost:
    @pytest.mark.asyncio
    async def test_erase_post_invalidates_paginated_post_cache(self, mock_db, mock_redis) -> None:
        current_user = {"id": 7, "username": "author", "is_superuser": False}
        request = Mock(method="DELETE")
        mock_service = Mock()
        mock_service.delete_post = AsyncMock(return_value={"message": "Post deleted"})
        mock_redis.scan = AsyncMock(return_value=(0, [b"author_posts:page_1:items_per_page:10:author"]))

        with patch("src.app.core.utils.cache.client", mock_redis):
            result = await erase_post(
                request,
                username="author",
                id=1,
                current_user=current_user,
                db=mock_db,
                service=mock_service,
            )

        assert result == {"message": "Post deleted"}
        mock_redis.scan.assert_awaited_once_with(0, match="author_posts:**", count=100)
        mock_redis.delete.assert_any_await("author_post_cache:1")
        mock_redis.delete.assert_any_await(b"author_posts:page_1:items_per_page:10:author")


class TestWorkflowEndpoints:
    @pytest.mark.asyncio
    async def test_submit_for_review_endpoint_delegates_to_service(self, mock_db) -> None:
        from src.app.api.v1.posts import submit_post_for_review

        current_user = {"id": 7, "username": "author", "is_superuser": False}
        mock_service = Mock()
        mock_service.submit_for_review = AsyncMock(return_value={"message": "Post submitted for review"})

        result = await unwrap_endpoint(submit_post_for_review)(Mock(), "author", 3, current_user, mock_db, mock_service)

        assert result == {"message": "Post submitted for review"}
        mock_service.submit_for_review.assert_awaited_once_with(
            db=mock_db,
            username="author",
            post_id=3,
            current_user=current_user,
        )

    @pytest.mark.asyncio
    async def test_approve_post_endpoint_delegates_to_service(self, mock_db) -> None:
        from src.app.api.v1.posts import approve_post

        current_user = {"id": 21, "username": "reviewer", "is_superuser": False}
        payload = PostApprove(comment="Looks good")
        mock_service = Mock()
        mock_service.approve_post = AsyncMock(return_value={"message": "Post approved"})

        result = await unwrap_endpoint(approve_post)(Mock(), 3, payload, current_user, mock_db, mock_service)

        assert result == {"message": "Post approved"}
        mock_service.approve_post.assert_awaited_once_with(db=mock_db, post_id=3, current_user=current_user, payload=payload)

    @pytest.mark.asyncio
    async def test_reject_post_endpoint_delegates_to_service(self, mock_db) -> None:
        from src.app.api.v1.posts import reject_post

        current_user = {"id": 21, "username": "reviewer", "is_superuser": False}
        payload = PostReject(comment="Needs work")
        mock_service = Mock()
        mock_service.reject_post = AsyncMock(return_value={"message": "Post rejected"})

        result = await unwrap_endpoint(reject_post)(Mock(), 3, payload, current_user, mock_db, mock_service)

        assert result == {"message": "Post rejected"}
        mock_service.reject_post.assert_awaited_once_with(db=mock_db, post_id=3, current_user=current_user, payload=payload)
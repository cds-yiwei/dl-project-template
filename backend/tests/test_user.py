"""Unit tests for user API endpoints."""

from unittest.mock import AsyncMock, Mock

import pytest

from src.app.api.v1.users import erase_user, patch_user, patch_user_role, read_user, read_user_role, read_users, write_user
from src.app.schemas.user import UserCreate, UserRead, UserRoleUpdate, UserUpdate


def unwrap_endpoint(endpoint):
    current = endpoint
    while hasattr(current, "__wrapped__"):
        current = current.__wrapped__
    return current


class TestWriteUser:
    """Test user creation endpoint."""

    @pytest.mark.asyncio
    async def test_create_user_success(self, mock_db, sample_user_data, sample_user_read):
        """Test successful user creation."""
        user_create = UserCreate(**sample_user_data)
        mock_service = Mock()
        mock_service.create_user = AsyncMock(return_value=sample_user_read.model_dump())

        result = await write_user(Mock(), user_create, mock_db, mock_service)

        assert result == sample_user_read.model_dump()
        mock_service.create_user.assert_awaited_once_with(db=mock_db, user=user_create)


class TestReadUser:
    """Test user retrieval endpoint."""

    @pytest.mark.asyncio
    async def test_read_user_success(self, mock_db, sample_user_read):
        """Test successful user retrieval."""
        username = "test_user"
        mock_service = Mock()
        mock_service.get_user_by_username = AsyncMock(return_value=sample_user_read.model_dump())

        result = await read_user(Mock(), username, mock_db, mock_service)

        assert result == sample_user_read.model_dump()
        mock_service.get_user_by_username.assert_awaited_once_with(db=mock_db, username=username)


class TestReadUsers:
    """Test users list endpoint."""

    @pytest.mark.asyncio
    async def test_read_users_success(self, mock_db):
        """Test successful users list retrieval."""
        expected_response = {"data": [{"id": 1}, {"id": 2}], "pagination": {}}
        mock_service = Mock()
        mock_service.list_users = AsyncMock(return_value=expected_response)

        result = await read_users(Mock(), mock_db, mock_service, 1, 10)

        assert result == expected_response
        mock_service.list_users.assert_awaited_once_with(db=mock_db, page=1, items_per_page=10)


class TestPatchUser:
    """Test user update endpoint."""

    @pytest.mark.asyncio
    async def test_patch_user_success(self, mock_db, current_user_dict, sample_user_read):
        """Test successful user update."""
        username = current_user_dict["username"]
        user_update = UserUpdate(name="New Name")
        mock_service = Mock()
        mock_service.update_user = AsyncMock(return_value={"message": "User updated"})

        result = await unwrap_endpoint(patch_user)(Mock(), user_update, username, current_user_dict, mock_db, mock_service)

        assert result == {"message": "User updated"}
        mock_service.update_user.assert_awaited_once_with(
            db=mock_db,
            username=username,
            current_user=current_user_dict,
            values=user_update,
        )


class TestEraseUser:
    """Test user deletion endpoint."""

    @pytest.mark.asyncio
    async def test_erase_user_success(self, mock_db, current_user_dict, sample_user_read):
        """Test successful user deletion."""
        username = current_user_dict["username"]
        token = "mock_token"
        mock_service = Mock()
        mock_service.delete_user = AsyncMock(return_value={"message": "User deleted"})

        result = await unwrap_endpoint(erase_user)(Mock(), username, current_user_dict, mock_db, mock_service, token)

        assert result == {"message": "User deleted"}
        mock_service.delete_user.assert_awaited_once_with(
            db=mock_db,
            username=username,
            current_user=current_user_dict,
            token=token,
        )


class TestUserRoleEndpoints:
    @pytest.mark.asyncio
    async def test_read_user_role_returns_none_when_user_has_no_role(self, mock_db, sample_user_read):
        user_dict = sample_user_read.model_dump()
        user_dict["role_id"] = None
        mock_service = Mock()
        mock_service.get_user_role = AsyncMock(return_value=None)

        result = await unwrap_endpoint(read_user_role)(Mock(), user_dict["username"], mock_db, mock_service)

        assert result is None
        mock_service.get_user_role.assert_awaited_once_with(db=mock_db, username=user_dict["username"])

    @pytest.mark.asyncio
    async def test_patch_user_role_assigns_role(self, mock_db, sample_user_read):
        role_update = UserRoleUpdate(role_id=2)
        mock_service = Mock()
        mock_service.update_user_role = AsyncMock(return_value={"message": "User role updated"})

        result = await unwrap_endpoint(patch_user_role)(Mock(), "member", role_update, mock_db, mock_service)

        assert result == {"message": "User role updated"}
        mock_service.update_user_role.assert_awaited_once_with(db=mock_db, username="member", values=role_update)

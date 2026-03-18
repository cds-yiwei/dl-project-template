from unittest.mock import AsyncMock, patch

import pytest

from src.app.core.exceptions.http_exceptions import DuplicateValueException, ForbiddenException, NotFoundException
from src.app.schemas.user import UserCreate, UserRoleUpdate, UserUpdate
from src.app.services.user_service import UserService


class TestUserService:
    @pytest.mark.asyncio
    async def test_create_user_rejects_duplicate_email(self, mock_db, sample_user_data) -> None:
        service = UserService()
        user = UserCreate(**sample_user_data)

        with patch("src.app.services.user_service.crud_users") as mock_users:
            mock_users.exists = AsyncMock(return_value=True)

            with pytest.raises(DuplicateValueException, match="Email is already registered"):
                await service.create_user(db=mock_db, user=user)

    @pytest.mark.asyncio
    async def test_create_user_hashes_password_and_creates_user(self, mock_db, sample_user_data, sample_user_read) -> None:
        service = UserService()
        user = UserCreate(**sample_user_data)

        with patch("src.app.services.user_service.crud_users") as mock_users:
            mock_users.exists = AsyncMock(side_effect=[False, False])
            mock_users.create = AsyncMock(return_value=sample_user_read.model_dump())

            with patch("src.app.services.user_service.get_password_hash", return_value="hashed_password") as mock_hash:
                result = await service.create_user(db=mock_db, user=user)

        assert result == sample_user_read.model_dump()
        mock_hash.assert_called_once_with(password=user.password)
        mock_users.create.assert_awaited_once()

    @pytest.mark.asyncio
    async def test_update_user_rejects_non_owner(self, mock_db, sample_user_read) -> None:
        service = UserService()
        db_user = sample_user_read.model_dump()
        db_user["username"] = "different-user"

        with patch("src.app.services.user_service.crud_users") as mock_users:
            mock_users.get = AsyncMock(return_value=db_user)

            with pytest.raises(ForbiddenException):
                await service.update_user(
                    db=mock_db,
                    username="different-user",
                    current_user={"username": "owner", "id": 1, "is_superuser": False},
                    values=UserUpdate(name="Updated"),
                )

    @pytest.mark.asyncio
    async def test_delete_user_blacklists_token_after_delete(self, mock_db, sample_user_read) -> None:
        service = UserService()

        with patch("src.app.services.user_service.crud_users") as mock_users:
            mock_users.get = AsyncMock(return_value=sample_user_read.model_dump())
            mock_users.delete = AsyncMock(return_value=None)

            with patch("src.app.services.user_service.blacklist_token", new_callable=AsyncMock) as mock_blacklist:
                result = await service.delete_user(
                    db=mock_db,
                    username=sample_user_read.username,
                    current_user={"username": sample_user_read.username, "id": sample_user_read.id, "is_superuser": False},
                    token="token-value",
                )

        assert result == {"message": "User deleted"}
        mock_blacklist.assert_awaited_once_with(token="token-value", db=mock_db)

    @pytest.mark.asyncio
    async def test_get_user_role_returns_none_when_role_missing(self, mock_db, sample_user_read) -> None:
        service = UserService()
        db_user = sample_user_read.model_dump()
        db_user["role_id"] = None

        with patch("src.app.services.user_service.crud_users") as mock_users:
            mock_users.get = AsyncMock(return_value=db_user)

            result = await service.get_user_role(db=mock_db, username=db_user["username"])

        assert result is None

    @pytest.mark.asyncio
    async def test_update_user_role_rejects_missing_role(self, mock_db, sample_user_read) -> None:
        service = UserService()

        with patch("src.app.services.user_service.crud_users") as mock_users:
            mock_users.get = AsyncMock(return_value=sample_user_read.model_dump())

            with patch("src.app.services.user_service.crud_roles") as mock_roles:
                mock_roles.get = AsyncMock(return_value=None)

                with pytest.raises(NotFoundException, match="Role not found"):
                    await service.update_user_role(db=mock_db, username=sample_user_read.username, values=UserRoleUpdate(role_id=99))
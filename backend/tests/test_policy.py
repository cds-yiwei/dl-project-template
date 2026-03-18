from unittest.mock import AsyncMock, Mock

import pytest

from src.app.api.v1.policies import erase_policy, patch_policy, read_policies, read_policy, write_policy
from src.app.schemas.access_policy import AccessPolicyCreate, AccessPolicyUpdate


def unwrap_endpoint(endpoint):
    current = endpoint
    while hasattr(current, "__wrapped__"):
        current = current.__wrapped__
    return current


class TestPolicyRoutes:
    @pytest.mark.asyncio
    async def test_write_policy_delegates_to_service(self, mock_db):
        payload = AccessPolicyCreate(subject="member", resource="roles", action="read")
        mock_service = Mock()
        mock_service.create_policy = AsyncMock(return_value={"id": 1, "subject": "member", "resource": "roles", "action": "read"})

        result = await unwrap_endpoint(write_policy)(Mock(), payload, mock_db, mock_service)

        assert result["id"] == 1
        mock_service.create_policy.assert_awaited_once_with(db=mock_db, policy=payload)

    @pytest.mark.asyncio
    async def test_read_policies_delegates_to_service(self, mock_db):
        mock_service = Mock()
        mock_service.list_policies = AsyncMock(return_value={"data": []})

        result = await unwrap_endpoint(read_policies)(Mock(), mock_db, mock_service, page=1, items_per_page=10)

        assert result == {"data": []}
        mock_service.list_policies.assert_awaited_once_with(db=mock_db, page=1, items_per_page=10)

    @pytest.mark.asyncio
    async def test_read_patch_delete_policy_delegate_to_service(self, mock_db):
        mock_service = Mock()
        mock_service.get_policy = AsyncMock(return_value={"id": 1})
        mock_service.update_policy = AsyncMock(return_value={"message": "Policy updated"})
        mock_service.delete_policy = AsyncMock(return_value={"message": "Policy deleted"})

        read_result = await unwrap_endpoint(read_policy)(Mock(), 1, mock_db, mock_service)
        patch_result = await unwrap_endpoint(patch_policy)(Mock(), 1, AccessPolicyUpdate(action="write"), mock_db, mock_service)
        delete_result = await unwrap_endpoint(erase_policy)(Mock(), 1, mock_db, mock_service)

        assert read_result == {"id": 1}
        assert patch_result == {"message": "Policy updated"}
        assert delete_result == {"message": "Policy deleted"}

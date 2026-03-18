from fastcrud import FastCRUD

from ..models.post_approval import PostApproval
from ..schemas.post_approval import PostApprovalCreateInternal, PostApprovalRead, PostApprovalUpdate

CRUDPostApproval = FastCRUD[
    PostApproval,
    PostApprovalCreateInternal,
    PostApprovalUpdate,
    PostApprovalUpdate,
    PostApprovalUpdate,
    PostApprovalRead,
]
crud_post_approvals = CRUDPostApproval(PostApproval)
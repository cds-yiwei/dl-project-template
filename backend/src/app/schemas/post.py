import uuid as uuid_pkg
from datetime import datetime
from enum import Enum
from typing import Annotated

from pydantic import BaseModel, ConfigDict, Field

from ..core.schemas import PersistentDeletion, TimestampSchema, UUIDSchema


class PostStatus(str, Enum):
    DRAFT = "draft"
    IN_REVIEW = "in_review"
    APPROVED = "approved"
    REJECTED = "rejected"


class PostBase(BaseModel):
    title: Annotated[str, Field(min_length=2, max_length=30, examples=["This is my post"])]
    text: Annotated[str, Field(min_length=1, max_length=63206, examples=["This is the content of my post."])]


class Post(TimestampSchema, PostBase, UUIDSchema, PersistentDeletion):
    media_url: Annotated[
        str | None,
        Field(pattern=r"^(https?|ftp)://[^\s/$.?#].[^\s]*$", examples=["https://www.postimageurl.com"], default=None),
    ]
    created_by_user_id: int
    status: PostStatus = PostStatus.DRAFT


class PostRead(BaseModel):
    id: int
    uuid: uuid_pkg.UUID
    title: Annotated[str, Field(min_length=2, max_length=30, examples=["This is my post"])]
    text: Annotated[str, Field(min_length=1, max_length=63206, examples=["This is the content of my post."])]
    media_url: Annotated[
        str | None,
        Field(examples=["https://www.postimageurl.com"], default=None),
    ]
    created_by_user_id: int
    status: PostStatus = PostStatus.DRAFT
    created_at: datetime


class PostCreate(PostBase):
    model_config = ConfigDict(extra="forbid")

    media_url: Annotated[
        str | None,
        Field(pattern=r"^(https?|ftp)://[^\s/$.?#].[^\s]*$", examples=["https://www.postimageurl.com"], default=None),
    ]


class PostCreateInternal(PostCreate):
    created_by_user_id: int


class PostSubmitForReview(BaseModel):
    model_config = ConfigDict(extra="forbid")


class PostApprove(BaseModel):
    model_config = ConfigDict(extra="forbid")

    comment: Annotated[str | None, Field(max_length=500, default=None)]


class PostReject(BaseModel):
    model_config = ConfigDict(extra="forbid")

    comment: Annotated[str | None, Field(max_length=500, default=None)]


class PostUpdate(BaseModel):
    model_config = ConfigDict(extra="forbid")

    title: Annotated[str | None, Field(min_length=2, max_length=30, examples=["This is my updated post"], default=None)]
    text: Annotated[
        str | None,
        Field(min_length=1, max_length=63206, examples=["This is the updated content of my post."], default=None),
    ]
    media_url: Annotated[
        str | None,
        Field(pattern=r"^(https?|ftp)://[^\s/$.?#].[^\s]*$", examples=["https://www.postimageurl.com"], default=None),
    ]


class PostUpdateInternal(PostUpdate):
    updated_at: datetime


class PostDelete(BaseModel):
    model_config = ConfigDict(extra="forbid")

    is_deleted: bool
    deleted_at: datetime

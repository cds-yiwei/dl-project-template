import uuid as uuid_pkg
from datetime import datetime
from enum import Enum
from typing import Annotated

from pydantic import ConfigDict, Field, BaseModel
from pydantic.alias_generators import to_camel


from ..core.schemas import PersistentDeletion, TimestampSchema, UUIDSchema


class PostStatus(str, Enum):
    DRAFT = "draft"
    IN_REVIEW = "in_review"
    APPROVED = "approved"
    REJECTED = "rejected"


class PostBase(BaseModel):
    title: str = Field(..., min_length=2, max_length=30, examples=["This is my post"])
    text: str = Field(..., min_length=1, max_length=63206, examples=["This is the content of my post."])


class Post(TimestampSchema, PostBase, UUIDSchema, PersistentDeletion):
    media_url: str | None = Field(None, pattern=r"^(https?|ftp)://[^\s/$.?#].[^\s]*$", examples=["https://www.postimageurl.com"])
    created_by_user_id: int
    status: PostStatus = PostStatus.DRAFT


class PostRead(PostBase):
    model_config = ConfigDict(validate_by_name=True, validate_by_alias=True, alias_generator=to_camel)
    id: int
    uuid: uuid_pkg.UUID
    title: str = Field(..., min_length=2, max_length=30, examples=["This is my post"])
    text: str = Field(..., min_length=1, max_length=63206, examples=["This is the content of my post."])
    media_url: str | None = Field(None, examples=["https://www.postimageurl.com"], alias="mediaUrl")
    created_by_user_id: int = Field(alias="createdByUserId")
    status: PostStatus = PostStatus.DRAFT
    created_at: datetime = Field(alias="createdAt")


class PostCreate(PostBase):
    model_config = ConfigDict(extra="forbid", validate_by_name=True, validate_by_alias=True, alias_generator=to_camel)

    media_url: str | None = Field(None, pattern=r"^(https?|ftp)://[^\s/$.?#].[^\s]*$", examples=["https://www.postimageurl.com"], alias="mediaUrl")


class PostCreateInternal(PostCreate):
    created_by_user_id: int


class PostSubmitForReview(PostBase):
    model_config = ConfigDict(extra="forbid", validate_by_name=True, validate_by_alias=True, alias_generator=to_camel)


class PostApprove(BaseModel):
    model_config = ConfigDict(extra="forbid", validate_by_name=True, validate_by_alias=True, alias_generator=to_camel)

    comment: str | None = Field(None, max_length=500)


class PostReject(BaseModel):
    model_config = ConfigDict(extra="forbid", validate_by_name=True, validate_by_alias=True, alias_generator=to_camel)

    comment: str | None = Field(None, max_length=500)


class PostUpdate(PostBase):
    model_config = ConfigDict(extra="forbid", validate_by_name=True, validate_by_alias=True, alias_generator=to_camel)

    title: str | None = Field(None, min_length=2, max_length=30, examples=["This is my updated post"])
    text: str | None = Field(None, min_length=1, max_length=63206, examples=["This is the updated content of my post."])
    media_url: str | None = Field(None, pattern=r"^(https?|ftp)://[^\s/$.?#].[^\s]*$", examples=["https://www.postimageurl.com"], alias="mediaUrl")


class PostUpdateInternal(PostUpdate):
    updated_at: datetime


class PostDelete(BaseModel):
    model_config = ConfigDict(extra="forbid", validate_by_name=True, validate_by_alias=True, alias_generator=to_camel)

    is_deleted: bool
    deleted_at: datetime
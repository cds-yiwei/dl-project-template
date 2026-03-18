from src.app.models.post import Post


class TestPostModel:
    def test_status_column_uses_string_values_matching_migration(self) -> None:
        status_column = Post.__table__.c.status

        assert status_column.type.native_enum is False
        assert status_column.type.enums == ["draft", "in_review", "approved", "rejected"]
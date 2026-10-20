"""Storage service for uploaded insurance documents."""

import hashlib
import logging
import uuid
from pathlib import Path
from typing import Protocol

from app.core.config import get_settings

logger = logging.getLogger(__name__)


class StorageBackend(Protocol):
    """Protocol for document storage backends."""

    def save_file(
        self, lead_id: uuid.UUID, file_bytes: bytes, original_filename: str
    ) -> tuple[str, str]:
        """Save file bytes and return (stored_path, sha256)."""
        ...

    def get_file_path(self, stored_path: str) -> Path:
        """Resolve physical filesystem path for a stored document."""
        ...

    def file_exists(self, stored_path: str) -> bool:
        """Check if stored document exists."""
        ...

    def delete_file(self, stored_path: str) -> bool:
        """Remove file from storage."""
        ...


class LocalStorageBackend:
    """Local filesystem storage backend."""

    def __init__(self, base_dir: str | Path | None = None) -> None:
        if base_dir is None:
            settings = get_settings()
            base_dir = settings.storage_dir
        self.base_path = Path(base_dir).resolve()
        self.base_path.mkdir(parents=True, exist_ok=True)

    @staticmethod
    def compute_sha256(data: bytes) -> str:
        """Compute SHA-256 hash of byte sequence."""
        return hashlib.sha256(data).hexdigest()

    def save_file(
        self, lead_id: uuid.UUID, file_bytes: bytes, original_filename: str
    ) -> tuple[str, str]:
        """Save file bytes into isolated lead directory and return stored path + sha256."""
        sha256 = self.compute_sha256(file_bytes)
        lead_dir = self.base_path / str(lead_id)
        lead_dir.mkdir(parents=True, exist_ok=True)

        # Sanitize filename extension
        suffix = Path(original_filename).suffix.lower()
        if not suffix:
            suffix = ".pdf"
        file_id = uuid.uuid4().hex[:12]
        safe_name = f"{file_id}_{Path(original_filename).stem[:50]}{suffix}"
        target_path = lead_dir / safe_name

        target_path.write_bytes(file_bytes)
        relative_stored_path = str(Path(str(lead_id)) / safe_name)
        logger.info(
            "Saved file for lead %s to %s (sha256=%s, size=%d)",
            lead_id,
            relative_stored_path,
            sha256,
            len(file_bytes),
        )
        return relative_stored_path, sha256

    def get_file_path(self, stored_path: str) -> Path:
        """Return absolute path for stored relative path."""
        abs_path = (self.base_path / stored_path).resolve()
        # Security: protect against directory traversal
        if not str(abs_path).startswith(str(self.base_path)):
            raise ValueError("Invalid stored path: attempted directory traversal")
        return abs_path

    def file_exists(self, stored_path: str) -> bool:
        """Return True if stored file exists on disk."""
        try:
            return self.get_file_path(stored_path).is_file()
        except Exception:
            return False

    def delete_file(self, stored_path: str) -> bool:
        """Delete stored file if present."""
        try:
            target = self.get_file_path(stored_path)
            if target.is_file():
                target.unlink()
                return True
        except Exception as e:
            logger.warning("Could not delete stored file %s: %s", stored_path, e)
        return False


_default_storage: LocalStorageBackend | None = None


def get_storage_backend() -> LocalStorageBackend:
    """Return default storage backend singleton."""
    global _default_storage
    if _default_storage is None:
        _default_storage = LocalStorageBackend()
    return _default_storage

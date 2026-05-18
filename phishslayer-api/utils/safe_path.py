import logging
import uuid
from pathlib import Path
from typing import Literal

logger = logging.getLogger(__name__)

# All allowed directories — add new ones here as needed
ALLOWED_DIRS = {
    "uploads": Path("/home/mzain2004/Phish-Slayer/uploads").resolve(),
    "reports": Path("/home/mzain2004/Phish-Slayer/reports").resolve(),
    "rag_docs": Path("/home/mzain2004/Phish-Slayer/rag_docs").resolve(),
}

# Allowed file extensions per directory
ALLOWED_EXTENSIONS = {
    "uploads": {".pdf", ".txt", ".json", ".csv"},
    "reports": {".pdf", ".json", ".md"},
    "rag_docs": {".pdf", ".txt"},
}


def safe_path(
    user_input: str,
    directory: Literal["uploads", "reports", "rag_docs"] = "uploads",
) -> Path:
    """
    Safely resolve a user-provided filename/path to an absolute path.
    Raises ValueError on any path traversal attempt.
    Raises FileNotFoundError if file doesn't exist.
    Raises ValueError if extension not allowed.
    """
    if not user_input or not isinstance(user_input, str):
        raise ValueError("Path input must be a non-empty string")

    cleaned = user_input.strip()
    base_dir = ALLOWED_DIRS[directory]

    try:
        resolved = (base_dir / cleaned).resolve()
    except (OSError, RuntimeError) as e:
        raise ValueError(f"Invalid path: {e}")

    # THE CRITICAL CHECK: resolved path must start with allowed base directory.
    # Catches: ../../../etc/passwd, symlink attacks, absolute paths.
    try:
        resolved.relative_to(base_dir)
    except ValueError:
        logger.warning(
            "path_traversal_attempt",
            extra={"input": user_input, "resolved": str(resolved), "base": str(base_dir)},
        )
        raise ValueError(f"Path traversal detected: {user_input!r}")

    # Check extension
    allowed_exts = ALLOWED_EXTENSIONS.get(directory, set())
    if resolved.suffix.lower() not in allowed_exts:
        raise ValueError(f"File extension {resolved.suffix!r} not allowed in {directory}")

    # Check file exists
    if not resolved.is_file():
        raise FileNotFoundError(f"File not found: {resolved.name}")

    return resolved


def safe_upload_filename(original_name: str) -> str:
    """
    Generate a safe filename for uploads. Never use user-provided filename directly.
    Returns: UUID-based filename preserving only the extension.
    """
    original = Path(original_name)
    ext = original.suffix.lower()

    allowed_upload_exts = {".pdf", ".txt", ".json", ".csv"}
    if ext not in allowed_upload_exts:
        raise ValueError(f"Upload extension not allowed: {ext}")

    return f"{uuid.uuid4().hex}{ext}"

"""Unit tests for slot validation and normalization (FRD-01 §4.5)."""

from app.services.slot_validator import (
    map_age_to_bracket,
    normalize_insurance_interest,
    validate_and_normalize_slots,
    validate_email,
    validate_phone,
)


def test_email_validation() -> None:
    assert validate_email("user@example.com") == "user@example.com"
    assert validate_email("  TEST@Domain.COM  ") == "test@domain.com"
    assert validate_email("invalid-email") is None
    assert validate_email("@domain.com") is None


def test_phone_validation() -> None:
    # 10-digit standard Indian mobile
    assert validate_phone("9876543210") == "+919876543210"
    # International E.164
    assert validate_phone("+14155552671") == "+14155552671"
    # Invalid characters / too short
    assert validate_phone("12345") is None


def test_age_bracket_mapping() -> None:
    assert map_age_to_bracket(22) == "18-25"
    assert map_age_to_bracket("34") == "26-35"
    assert map_age_to_bracket(40) == "36-45"
    assert map_age_to_bracket(52) == "46-55"
    assert map_age_to_bracket(62) == "56-65"
    assert map_age_to_bracket(70) == "65+"
    assert map_age_to_bracket(15) is None


def test_synonym_normalization() -> None:
    interests = normalize_insurance_interest(["medical", "car", "term"])
    assert "health" in interests
    assert "motor" in interests
    assert "life" in interests


def test_validate_and_normalize_slots_confidence_filter() -> None:
    raw = {
        "full_name": {"value": "Ravi Kumar", "confidence": 0.95},
        "email": {"value": "ravi@example.com", "confidence": 0.9},
        "location": {"value": "Pune", "confidence": 0.4},  # Below 0.6
    }
    valid, invalid = validate_and_normalize_slots(raw)
    assert "full_name" in valid
    assert "email" in valid
    assert "location" not in valid
    assert "location" in invalid

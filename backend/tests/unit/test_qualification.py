"""Unit tests for qualification scoring engine (FRD-01 §4.7)."""

from app.services.qualification import calculate_qualification_score


def test_qualification_hot_lead() -> None:
    """A lead with both contacts, supported interest, policy, and urgency is hot."""
    slots = {
        "full_name": "Ravi Kumar",
        "email": "ravi@example.com",
        "phone": "+919876543210",
        "insurance_interest": ["health", "life"],
        "has_existing_policy": True,
        "renewal_timeframe": "<1m",
        "location": "Pune",
        "approx_annual_premium": 15000,
        "consent_given": True,
    }
    score, tier, breakdown = calculate_qualification_score(slots)
    assert score >= 75
    assert tier == "hot"
    assert breakdown["contact_completeness"]["points"] == 20
    assert breakdown["existing_policy"]["points"] == 20
    assert breakdown["renewal_urgency"]["points"] == 15


def test_qualification_cold_lead() -> None:
    """A lead with missing contact and no policy is categorized as cold."""
    slots = {
        "full_name": "Anonymous",
        "consent_given": True,
        "location": "declined",
    }
    score, tier, breakdown = calculate_qualification_score(slots)
    assert score < 50
    assert tier == "cold"
    assert breakdown["contact_completeness"]["points"] == 0


def test_qualification_warm_lead() -> None:
    """A lead with one contact method and standard line qualifies as warm."""
    slots = {
        "full_name": "Ananya Sen",
        "email": "ananya@example.com",
        "insurance_interest": ["health"],
        "has_existing_policy": False,
        "renewal_timeframe": "1-3m",
        "location": "Mumbai",
        "consent_given": True,
    }
    score, tier, breakdown = calculate_qualification_score(slots)
    assert 50 <= score < 75
    assert tier == "warm"
    assert breakdown["contact_completeness"]["points"] == 12
    assert breakdown["existing_policy"]["points"] == 8

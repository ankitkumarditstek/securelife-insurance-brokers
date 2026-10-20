"""Deterministic qualification scoring engine as specified in FRD-01 §4 (FR-1.7)."""

from typing import Any


def calculate_qualification_score(
    slots: dict[str, Any],
) -> tuple[int, str, dict[str, Any]]:
    """Compute 0-100 score, tier (hot/warm/cold), and breakdown dictionary."""
    breakdown: dict[str, Any] = {}
    total_score = 0

    # 1. Contact completeness (0-20 pts)
    email = slots.get("email")
    phone = slots.get("phone")
    if email and phone:
        pts = 20
        reason = "Both email and phone provided"
    elif email or phone:
        pts = 12
        reason = "One primary contact method provided"
    else:
        pts = 0
        reason = "No valid contact method provided"
    breakdown["contact_completeness"] = {"points": pts, "max": 20, "reason": reason}
    total_score += pts

    # 2. Insurance interest in supported lines (0-20 pts)
    interest = slots.get("insurance_interest")
    supported = {"life", "health", "motor", "home", "travel", "business"}
    if isinstance(interest, str):
        interest_set = {interest.lower()}
    elif isinstance(interest, list):
        interest_set = {str(item).lower() for item in interest}
    else:
        interest_set = set()

    if interest_set and interest_set.intersection(supported):
        pts = 20
        reason = f"Supported insurance line(s): {', '.join(interest_set)}"
    elif interest_set:
        pts = 5
        reason = "General or custom line requested"
    else:
        pts = 0
        reason = "No insurance line identified"
    breakdown["insurance_interest"] = {"points": pts, "max": 20, "reason": reason}
    total_score += pts

    # 3. Has existing policy (0-20 pts)
    has_policy = slots.get("has_existing_policy")
    if has_policy is True:
        pts = 20
        reason = "Has existing policy with documents ready for review"
    elif has_policy is False:
        pts = 8
        reason = "New policyholder without existing document review"
    else:
        pts = 0
        reason = "Existing policy status unknown"
    breakdown["existing_policy"] = {"points": pts, "max": 20, "reason": reason}
    total_score += pts

    # 4. Renewal urgency (0-15 pts)
    renewal = str(slots.get("renewal_timeframe", "")).lower()
    if renewal in ["<1m", "urgent", "immediate"]:
        pts = 15
        reason = "Urgent renewal within 1 month"
    elif renewal in ["1-3m"]:
        pts = 12
        reason = "Renewal within 1-3 months"
    elif renewal in ["3-6m"]:
        pts = 7
        reason = "Renewal within 3-6 months"
    elif renewal in ["6m+"]:
        pts = 3
        reason = "Renewal timeframe over 6 months away"
    else:
        pts = 4
        reason = "Renewal timeframe not specified or unknown"
    breakdown["renewal_urgency"] = {"points": pts, "max": 15, "reason": reason}
    total_score += pts

    # 5. Location in service area (0-10 pts)
    loc = slots.get("location")
    if loc and str(loc).strip().lower() not in ["declined", "unknown"]:
        pts = 10
        reason = f"Location identified ({loc})"
    else:
        pts = 0
        reason = "Location missing or out of area"
    breakdown["location_service_area"] = {"points": pts, "max": 10, "reason": reason}
    total_score += pts

    # 6. Budget / premium indicates meaningful size (0-10 pts)
    premium = slots.get("approx_annual_premium")
    budget = slots.get("budget_range")
    if premium is not None:
        try:
            val = float(premium)
            if val >= 10000:
                pts = 10
                reason = f"Significant annual premium (>= 10,000): {val}"
            elif val >= 5000:
                pts = 7
                reason = f"Moderate annual premium: {val}"
            else:
                pts = 5
                reason = f"Entry-level premium: {val}"
        except (ValueError, TypeError):
            pts = 4
            reason = "Premium indicated"
    elif budget and str(budget).lower() not in ["unknown", "declined"]:
        pts = 5
        reason = "Budget range provided"
    else:
        pts = 0
        reason = "Premium/budget not specified"
    breakdown["premium_potential"] = {"points": pts, "max": 10, "reason": reason}
    total_score += pts

    # 7. Engagement quality (0-5 pts)
    tracked_slots = [
        "full_name",
        "insurance_interest",
        "has_existing_policy",
        "age_range",
        "location",
        "consent_given",
    ]
    answered = sum(
        1
        for k in tracked_slots
        if slots.get(k) is not None
        and str(slots.get(k)).lower() not in ["unknown", "declined"]
    )
    engagement_ratio = answered / len(tracked_slots)
    pts = int(round(engagement_ratio * 5))
    breakdown["engagement_quality"] = {
        "points": pts,
        "max": 5,
        "reason": f"{answered}/{len(tracked_slots)} key qualification slots answered",
    }
    total_score += pts

    # Cap score
    total_score = min(max(total_score, 0), 100)

    # Determine tier
    if total_score >= 75:
        tier = "hot"
    elif total_score >= 50:
        tier = "warm"
    else:
        tier = "cold"

    return total_score, tier, breakdown

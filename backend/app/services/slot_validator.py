"""Slot validation and normalization engine (FRD-01 §4.5)."""

import re
from typing import Any

import phonenumbers

from app.schemas.slots import AgeRange, InsuranceType, RenewalTimeframe

# Synonym dictionaries
INSURANCE_SYNONYMS: dict[str, str] = {
    "health": InsuranceType.HEALTH.value,
    "medical": InsuranceType.HEALTH.value,
    "mediclaim": InsuranceType.HEALTH.value,
    "hospital": InsuranceType.HEALTH.value,
    "life": InsuranceType.LIFE.value,
    "term": InsuranceType.LIFE.value,
    "term life": InsuranceType.LIFE.value,
    "endowment": InsuranceType.LIFE.value,
    "motor": InsuranceType.MOTOR.value,
    "auto": InsuranceType.MOTOR.value,
    "car": InsuranceType.MOTOR.value,
    "vehicle": InsuranceType.MOTOR.value,
    "bike": InsuranceType.MOTOR.value,
    "two wheeler": InsuranceType.MOTOR.value,
    "home": InsuranceType.HOME.value,
    "house": InsuranceType.HOME.value,
    "property": InsuranceType.HOME.value,
    "travel": InsuranceType.TRAVEL.value,
    "overseas": InsuranceType.TRAVEL.value,
    "business": InsuranceType.BUSINESS.value,
    "commercial": InsuranceType.BUSINESS.value,
}

RENEWAL_SYNONYMS: dict[str, str] = {
    "urgent": RenewalTimeframe.LESS_THAN_1M.value,
    "immediate": RenewalTimeframe.LESS_THAN_1M.value,
    "this month": RenewalTimeframe.LESS_THAN_1M.value,
    "<1m": RenewalTimeframe.LESS_THAN_1M.value,
    "1-3m": RenewalTimeframe.ONE_TO_THREE_M.value,
    "next month": RenewalTimeframe.ONE_TO_THREE_M.value,
    "couple of months": RenewalTimeframe.ONE_TO_THREE_M.value,
    "3-6m": RenewalTimeframe.THREE_TO_SIX_M.value,
    "6m+": RenewalTimeframe.SIX_M_PLUS.value,
    "next year": RenewalTimeframe.SIX_M_PLUS.value,
    "unknown": RenewalTimeframe.UNKNOWN.value,
    "not sure": RenewalTimeframe.UNKNOWN.value,
}

EMAIL_REGEX = re.compile(r"^[a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+$")


def validate_email(email_str: str) -> str | None:
    """Validate email format and return lowercased string or None."""
    cleaned = email_str.strip().lower()
    if EMAIL_REGEX.match(cleaned):
        return cleaned
    return None


def validate_phone(phone_str: str, default_region: str = "IN") -> str | None:
    """Normalize phone number to E.164 format using phonenumbers library."""
    try:
        parsed = phonenumbers.parse(phone_str.strip(), default_region)
        if phonenumbers.is_valid_number(parsed):
            return str(
                phonenumbers.format_number(parsed, phonenumbers.PhoneNumberFormat.E164)
            )
    except phonenumbers.NumberParseException:
        pass
    # Fallback digit extraction for common 10-digit formats
    digits = re.sub(r"\D", "", phone_str)
    if len(digits) == 10:
        return f"+91{digits}"
    return None


def map_age_to_bracket(age_val: Any) -> str | None:
    """Map age numbers or text to AgeRange enum bracket."""
    if isinstance(age_val, int):
        age_num = age_val
    elif isinstance(age_val, str) and age_val.strip().isdigit():
        age_num = int(age_val.strip())
    else:
        # Check if already a valid bracket
        for bracket in AgeRange:
            if str(age_val).strip() == bracket.value:
                return bracket.value
        return None

    if age_num < 18:
        return None
    elif age_num <= 25:
        return AgeRange.R_18_25.value
    elif age_num <= 35:
        return AgeRange.R_26_35.value
    elif age_num <= 45:
        return AgeRange.R_36_45.value
    elif age_num <= 55:
        return AgeRange.R_46_55.value
    elif age_num <= 65:
        return AgeRange.R_56_65.value
    else:
        return AgeRange.R_65_PLUS.value


def normalize_insurance_interest(val: Any) -> list[str]:
    """Map insurance interest inputs to standard enum values."""
    results: list[str] = []
    items = val if isinstance(val, list) else [val]
    for item in items:
        if not item:
            continue
        cleaned = str(item).strip().lower()
        mapped = INSURANCE_SYNONYMS.get(cleaned, cleaned)
        if mapped not in results:
            results.append(mapped)
    return results if results else [InsuranceType.OTHER.value]


SLOT_KEY_ALIASES: dict[str, str] = {
    "name": "full_name",
    "user_name": "full_name",
    "customer_name": "full_name",
    "client_name": "full_name",
    "full_name": "full_name",
    "insurance_type": "insurance_interest",
    "insurance": "insurance_interest",
    "interest": "insurance_interest",
    "policy_type": "insurance_interest",
    "insurance_interest": "insurance_interest",
    "age": "age_range",
    "age_range": "age_range",
    "city": "location",
    "region": "location",
    "state": "location",
    "address": "location",
    "location": "location",
    "phone_number": "phone",
    "mobile": "phone",
    "phone": "phone",
    "email_address": "email",
    "email": "email",
    "existing_policy": "has_existing_policy",
    "has_policy": "has_existing_policy",
    "has_existing_policy": "has_existing_policy",
    "provider": "current_provider",
    "current_provider": "current_provider",
    "insurer": "current_provider",
    "company": "current_provider",
    "concern": "main_concern",
    "main_concern": "main_concern",
    "budget": "budget_range",
    "budget_range": "budget_range",
    "consent": "consent_given",
    "consent_given": "consent_given",
    "timeframe": "renewal_timeframe",
    "renewal_timeframe": "renewal_timeframe",
}


def validate_and_normalize_slots(
    raw_slots: dict[str, Any],
) -> tuple[dict[str, Any], dict[str, str]]:
    """Validate and normalize extracted slot values.

    Returns:
        (valid_slots, invalid_slots_with_reasons)
    """
    valid: dict[str, Any] = {}
    invalid: dict[str, str] = {}

    for raw_k, v in raw_slots.items():
        if v is None:
            continue

        # Canonicalize slot key
        cleaned_k = raw_k.strip().lower()
        k = SLOT_KEY_ALIASES.get(cleaned_k, raw_k)

        # Extract value if wrapped in ExtractedSlotValue or dict
        val = v.get("value") if isinstance(v, dict) and "value" in v else v
        conf = (
            v.get("confidence", 1.0)
            if isinstance(v, dict) and "confidence" in v
            else 1.0
        )

        # Handle generic 'contact' slot by inspecting value content
        if k == "contact" or cleaned_k == "contact":
            val_str = str(val).strip()
            if "@" in val_str:
                k = "email"
            elif any(c.isdigit() for c in val_str):
                k = "phone"

        # Discard low confidence extractions
        if conf < 0.6:
            invalid[k] = "Low confidence extraction (< 0.6)"
            continue

        # Declining/Refusing
        if str(val).lower() in ["declined", "refuse", "skip"]:
            valid[k] = "declined"
            continue

        if str(val).lower() in ["unknown", "not sure"]:
            valid[k] = "unknown"
            continue

        if k == "full_name":
            name = str(val).strip()
            if len(name) >= 2:
                valid[k] = name
            else:
                invalid[k] = "Name too short"

        elif k == "email":
            norm = validate_email(str(val))
            if norm:
                valid[k] = norm
            else:
                invalid[k] = "Invalid email format"

        elif k == "phone":
            norm_phone = validate_phone(str(val))
            if norm_phone:
                valid[k] = norm_phone
            else:
                invalid[k] = "Invalid phone format (expected 10 digits or E.164)"

        elif k == "consent_given":
            if isinstance(val, bool):
                valid[k] = val
            elif str(val).lower() in ["yes", "true", "sure", "ok", "i agree"]:
                valid[k] = True
            elif str(val).lower() in ["no", "false", "disagree"]:
                valid[k] = False
            else:
                invalid[k] = "Unclear consent response"

        elif k == "has_existing_policy":
            if isinstance(val, bool):
                valid[k] = val
            elif str(val).lower() in ["yes", "true", "yup", "yeah", "i do", "have"]:
                valid[k] = True
            elif str(val).lower() in ["no", "false", "nope", "don't have", "none"]:
                valid[k] = False
            else:
                valid[k] = str(val)

        elif k == "insurance_interest":
            valid[k] = normalize_insurance_interest(val)

        elif k == "age_range":
            mapped_age = map_age_to_bracket(val)
            if mapped_age:
                valid[k] = mapped_age
            else:
                invalid[k] = "Could not map age to standard bracket (18+)"

        elif k == "renewal_timeframe":
            raw_str = str(val).strip().lower()
            valid[k] = RENEWAL_SYNONYMS.get(raw_str, raw_str)

        elif k in ["location", "current_provider", "main_concern", "budget_range"]:
            valid[k] = str(val).strip()

        elif k == "approx_annual_premium":
            try:
                # Strip currency symbols and commas
                clean_num = re.sub(r"[^\d.]", "", str(val))
                if clean_num:
                    valid[k] = float(clean_num)
            except ValueError:
                invalid[k] = "Invalid numeric premium"
        else:
            valid[k] = val

    return valid, invalid

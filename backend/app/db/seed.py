"""Realistic CRM seed script according to FRD-02 §8."""

import random
import uuid
from datetime import UTC, datetime, timedelta

from sqlalchemy.orm import Session

from app.core.security import hash_password
from app.db.session import SessionLocal
from app.models.analysis import Analysis, AnalysisFinding
from app.models.conversation import Conversation, Message
from app.models.document import Document, DocumentExtraction, DocumentPage
from app.models.lead import Lead, LeadNote, LeadStatusHistory
from app.models.user import User

FIRST_NAMES = [
    "Aarav",
    "Neha",
    "Rohan",
    "Priya",
    "Vikram",
    "Ananya",
    "Rahul",
    "Pooja",
    "Amit",
    "Sneha",
    "Kunal",
    "Meera",
]
LAST_NAMES = [
    "Sharma",
    "Patel",
    "Verma",
    "Mehta",
    "Deshmukh",
    "Reddy",
    "Iyer",
    "Nair",
    "Kapoor",
    "Gupta",
    "Joshi",
    "Chopra",
]
CITIES = [
    "Mumbai",
    "Bengaluru",
    "Pune",
    "Delhi NCR",
    "Hyderabad",
    "Chennai",
    "Kolkata",
    "Ahmedabad",
]
INTERESTS = [
    ["health"],
    ["life"],
    ["health", "life"],
    ["motor"],
    ["health", "critical_illness"],
]
PROVIDERS = [
    "Star Health",
    "HDFC ERGO",
    "ICICI Lombard",
    "Care Insurance",
    "Max Life",
    "LIC",
]


def seed_database(db: Session) -> None:
    """Populate database with team users and realistic leads across all lifecycle stages."""
    print("[*] Seeding database...")

    # 1. Seed Team Users
    broker_user = db.query(User).filter(User.email == "broker@securelife.com").first()
    if not broker_user:
        broker_user = User(
            id=uuid.uuid4(),
            email="broker@securelife.com",
            full_name="Rajesh Sharma",
            password_hash=hash_password("broker123"),
            role="broker",
            is_active=True,
        )
        db.add(broker_user)

    agent_user = db.query(User).filter(User.email == "agent@securelife.com").first()
    if not agent_user:
        agent_user = User(
            id=uuid.uuid4(),
            email="agent@securelife.com",
            full_name="Pooja Verma",
            password_hash=hash_password("agent123"),
            role="agent",
            is_active=True,
        )
        db.add(agent_user)

    admin_user = db.query(User).filter(User.email == "admin@securelife.com").first()
    if not admin_user:
        admin_user = User(
            id=uuid.uuid4(),
            email="admin@securelife.com",
            full_name="Vikram Mehta",
            password_hash=hash_password("admin123"),
            role="admin",
            is_active=True,
        )
        db.add(admin_user)

    db.commit()
    db.refresh(broker_user)
    db.refresh(agent_user)
    db.refresh(admin_user)

    # 2. Seed ~30 realistic leads across lifecycle stages
    stages = [
        "new",
        "in_conversation",
        "qualified",
        "documents_pending",
        "documents_processing",
        "under_review",
        "analysis_complete",
        "closed_won",
        "closed_lost",
        "disqualified",
    ]

    existing_leads_count = db.query(Lead).count()
    if existing_leads_count >= 25:
        print(
            f"Database already contains {existing_leads_count} leads. Skipping lead generation."
        )
        return

    now = datetime.now(UTC)

    for i in range(5): # Generate 5 leads only for testing purposes.
        stage = stages[i % len(stages)]
        first_name = random.choice(FIRST_NAMES)
        last_name = random.choice(LAST_NAMES)
        full_name = f"{first_name} {last_name}"
        email = f"{first_name.lower()}.{last_name.lower()}{i + 1}@example.com"
        phone = f"+9198{random.randint(10000000, 99999999)}"
        city = random.choice(CITIES)
        interests = random.choice(INTERESTS)
        has_policy = random.choice([True, False])
        score = random.randint(35, 95)
        tier = "hot" if score >= 80 else ("warm" if score >= 50 else "cold")

        assigned = (
            broker_user.id
            if stage in ["under_review", "analysis_complete", "closed_won"]
            else None
        )

        created_days_ago = random.randint(1, 14)
        created_at = now - timedelta(days=created_days_ago, hours=random.randint(1, 12))

        lead = Lead(
            id=uuid.uuid4(),
            full_name=full_name,
            email=email,
            phone=phone,
            preferred_contact_channel="phone" if i % 2 == 0 else "email",
            source="web_chat",
            insurance_interest=interests,
            has_existing_policy=has_policy,
            current_provider=random.choice(PROVIDERS) if has_policy else None,
            age_range="26-35" if i % 3 == 0 else ("36-45" if i % 3 == 1 else "46-60"),
            location=city,
            household_size=random.randint(1, 5),
            employment_status="salaried",
            approx_annual_premium=random.randint(15000, 85000),
            premium_currency="INR",
            renewal_timeframe="within_30_days" if has_policy else None,
            main_concern="High premium and slow claim settlement with current provider",
            budget_range="INR 25,000 - 50,000",
            consent_given=True,
            consent_at=created_at,
            status=stage,
            qualification_score=score,
            qualification_tier=tier,
            qualification_breakdown={
                "interest": {"points": 25, "reason": "High intent coverage required"},
                "budget": {"points": 20, "reason": "Clear financial range"},
                "existing_policy": {
                    "points": 20 if has_policy else 10,
                    "reason": "Has renewal window",
                },
                "timeline": {"points": 20, "reason": "Urgent renewal within 30 days"},
            },
            summary=f"Prospective client looking for {', '.join(interests)} coverage in {city}. Budget ~INR 40,000/yr.",
            needs_human=tier == "hot",
            assigned_to=assigned,
            created_at=created_at,
            last_activity_at=created_at + timedelta(hours=2),
        )
        db.add(lead)
        db.flush()

        # Add Status History
        history = LeadStatusHistory(
            lead_id=lead.id,
            from_status="new",
            to_status=stage,
            changed_by_type="system",
            reason=f"Pipeline initialized to {stage}",
            created_at=created_at,
        )
        db.add(history)

        # Add Conversation and Sample Messages
        conv = Conversation(
            id=uuid.uuid4(),
            lead_id=lead.id,
            session_token=uuid.uuid4().hex,
            channel="web_chat",
            status="complete"
            if stage in ["qualified", "under_review", "closed_won"]
            else "active",
            state={"slots": {"full_name": full_name, "email": email, "phone": phone}},
            turn_count=4,
            started_at=created_at,
        )
        db.add(conv)
        db.flush()

        msg1 = Message(
            conversation_id=conv.id,
            role="assistant",
            content="Hi! I'm SecureLife's assistant. How can I help you today?",
            message_metadata={"intent": "greeting"},
            created_at=created_at,
        )
        msg2 = Message(
            conversation_id=conv.id,
            role="user",
            content=f"Hello, I am {full_name}. I want to explore {interests[0]} insurance options.",
            message_metadata={},
            created_at=created_at + timedelta(minutes=1),
        )
        msg3 = Message(
            conversation_id=conv.id,
            role="assistant",
            content="Great! Could you share your current provider or renewal date?",
            message_metadata={"intent": "ask_slot"},
            created_at=created_at + timedelta(minutes=2),
        )
        db.add_all([msg1, msg2, msg3])

        # Add Notes for qualified leads
        if stage in ["under_review", "analysis_complete", "closed_won"]:
            note = LeadNote(
                lead_id=lead.id,
                author_id=broker_user.id,
                body=f"Client expressed high interest in maternity and OPD riders. Preparing policy comparison with {random.choice(PROVIDERS)}.",
                created_at=created_at + timedelta(hours=1),
            )
            db.add(note)

        # Add Sample Documents, Extractions, and Analysis for stages past documents_processing
        if stage in ["under_review", "analysis_complete", "closed_won"] and i % 2 == 0:
            doc = Document(
                id=uuid.uuid4(),
                lead_id=lead.id,
                original_filename="Current_Health_Policy_Schedule.pdf",
                stored_path=f"documents/{lead.id}/policy.pdf",
                mime_type="application/pdf",
                size_bytes=1048576,
                sha256="e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
                page_count=3,
                doc_type="policy",
                is_scanned=False,
                processing_status="verified",
                created_at=created_at + timedelta(hours=2),
            )
            db.add(doc)
            db.flush()

            page = DocumentPage(
                document_id=doc.id,
                page_number=1,
                text="Policy Holder: "
                + full_name
                + "\nSum Insured: INR 10,00,000\nBase Premium: INR 28,450",
                extraction_method="text_layer",
            )
            db.add(page)

            extraction = DocumentExtraction(
                document_id=doc.id,
                lead_id=lead.id,
                schema_version="1.0",
                data={
                    "policy_number": f"POL-{random.randint(100000, 999999)}",
                    "insurer_name": random.choice(PROVIDERS),
                    "sum_insured": 1000000,
                    "copay_percentage": 10,
                    "room_rent_limit": "Single Private Room",
                },
                review_status="verified",
                overall_confidence=0.96,
                reviewed_by=broker_user.id,
                reviewed_at=created_at + timedelta(hours=3),
                created_at=created_at + timedelta(hours=2, minutes=30),
            )
            db.add(extraction)

            analysis = Analysis(
                lead_id=lead.id,
                version=1,
                status="complete",
                executive_summary="Current policy contains a 10% copay on senior treatments. SecureLife recommended HDFC Optima Secure with zero copay and restores 2X sum insured.",
                coverage_summary={
                    "current_sum_insured": 1000000,
                    "proposed_sum_insured": 1500000,
                },
                estimated_savings={"annual_saving": 4500, "currency": "INR"},
                risk_score=28,
                recommended_action="upgrade_coverage",
                recommendation_rationale="Significant coverage upgrade with zero copay for minimal premium increment.",
                confidence=0.94,
                model="llama-3.3-70b-versatile",
                generated_at=created_at + timedelta(hours=4),
                created_at=created_at + timedelta(hours=4),
            )
            db.add(analysis)
            db.flush()

            finding = AnalysisFinding(
                analysis_id=analysis.id,
                finding_type="gap",
                severity="high",
                title="10% Co-Payment on Critical Treatments",
                description="The existing policy obligates the insured to pay 10% out of pocket on hospitalization.",
                sort_order=1,
            )
            db.add(finding)

    db.commit()
    print(
        "[+] Seed script successfully populated users, realistic leads, notes, and analyses!"
    )


if __name__ == "__main__":
    db_session = SessionLocal()
    try:
        seed_database(db_session)
    finally:
        db_session.close()

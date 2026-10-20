"""Generate 5 test sample PDFs according to FRD-03 §8."""

import io
from pathlib import Path

import pymupdf
from PIL import Image, ImageDraw


def create_clean_text_pdf(output_path: Path) -> None:
    doc = pymupdf.open()
    page = doc.new_page(width=595, height=842)

    text = """STAR HEALTH AND ALLIED INSURANCE CO. LTD.
POLICY SCHEDULE / CERTIFICATE OF INSURANCE
IRDAI Reg. No: 129 | Contact: 1800-425-2255

POLICY DETAILS:
Policy Number: STAR-COMP-2026-98124
Policy Type: Health Insurance (Family Floater)
Plan Name: Star Comprehensive Health Insurance Policy
Status: Active
Period of Insurance: From 2026-02-01 to 2027-01-31
Renewal Date: 2027-01-31

PROPOSER & INSURED MEMBERS:
Policy Holder: Rajesh Verma (DOB: 1985-04-12)
Address: Flat 402, Green Glen Layout, Bellandur, Bangalore 560103
Insured 1: Rajesh Verma, Age: 41, Self
Insured 2: Priya Verma, Age: 38, Spouse
Insured 3: Aarav Verma, Age: 10, Son
Nominee: Priya Verma (Relationship: Spouse)

COVERAGE BENEFITS & SUM INSURED:
Basic Sum Insured: INR 1,000,000 (Ten Lakhs Only)
In-patient Hospitalisation: Up to Sum Insured (Single Private Room)
Pre-Hospitalisation: 60 Days
Post-Hospitalisation: 90 Days
Day Care Procedures: All Day Care covered
Deductible: Nil | Copay: 0%
Riders / Add-ons: Hospital Daily Cash Benefit (INR 2,500/day)

PREMIUM COMPUTATION & SCHEDULE:
Gross Premium: INR 22,500
GST @ 18%: INR 4,050
Total Premium Payable: INR 26,550
Payment Frequency: Annual
Payment Mode: Netbanking (Ref: TXN-998822)
Next Due Date: 2027-01-31

EXCLUSIONS & WAITING PERIODS:
1. Pre-existing diseases excluded for first 36 months of continuous coverage.
2. Initial waiting period of 30 days for any hospitalization except accidental injuries.
3. Specific illness waiting period: 24 months for hernia, cataracts, joint replacement.
4. Cosmetic surgery, obesity treatments, and routine dental care permanently excluded.
"""
    page.insert_text((40, 50), text, fontsize=10, fontname="helv", color=(0, 0, 0))
    doc.save(str(output_path))
    doc.close()


def create_scanned_image_pdf(output_path: Path) -> None:
    # Render an image with text, then embed the rasterized image only into PDF without text layer
    img = Image.new("RGB", (1240, 1754), color=(250, 250, 248))
    draw = ImageDraw.Draw(img)

    lines = [
        "HDFC ERGO GENERAL INSURANCE COMPANY LIMITED",
        "HEALTH SURAKSHA & OPTIMA RESTORE POLICY BOND",
        "Policy Number: HDFC-OPT-7740192",
        "Policy Type: Health Insurance",
        "Policy Holder: Sunita Nair",
        "Period: 2026-03-10 to 2027-03-09",
        "Renewal Date: 2027-03-09",
        "Sum Insured: INR 500,000",
        "Total Premium: INR 14,800 (Annual)",
        "Exclusions: 36 months waiting period for pre-existing ailments.",
        "Permanent Exclusions: Hazardous adventures, cosmetic treatments.",
    ]

    y = 80
    for line in lines:
        draw.text((80, y), line, fill=(20, 20, 20))
        y += 60

    img_byte_arr = io.BytesIO()
    img.save(img_byte_arr, format="PNG")
    img_bytes = img_byte_arr.getvalue()

    doc = pymupdf.open()
    page = doc.new_page(width=595, height=842)
    rect = pymupdf.Rect(0, 0, 595, 842)
    page.insert_image(rect, stream=img_bytes)
    doc.save(str(output_path))
    doc.close()


def create_multi_page_pdf(output_path: Path) -> None:
    doc = pymupdf.open()

    # Page 1: Schedule
    p1 = doc.new_page(width=595, height=842)
    p1.insert_text(
        (40, 50),
        """CARE HEALTH INSURANCE LIMITED
SCHEDULE OF INSURANCE - CARE SUPREME PLAN (PAGE 1 OF 3)
Policy No: CARE-SUP-550183
Provider: Care Health Insurance Limited, New Delhi
Policy Type: Health Insurance
Holder: Amit Patel (Age 44)
Address: B-201, Shanti Park, Ahmedabad, Gujarat 380015
Start Date: 2026-04-01 | Expiry Date: 2027-03-31 | Renewal Date: 2027-03-31
Sum Insured: INR 1,500,000
Annual Premium: INR 28,400 | GST: INR 5,112 | Total: INR 33,512
Frequency: Annual
""",
        fontsize=10,
        fontname="helv",
    )

    # Page 2: Benefits
    p2 = doc.new_page(width=595, height=842)
    p2.insert_text(
        (40, 50),
        """CARE HEALTH INSURANCE - SECTION B: BENEFITS & LIMITS (PAGE 2 OF 3)
1. In-patient treatment: Actual expense up to Sum Insured.
2. Unlimited automatic recharge of Sum Insured for unrelated illnesses.
3. Air ambulance coverage up to INR 250,000.
4. Annual Health Check-up voucher for all adult insured members.
5. No Claim Bonus: 50% cumulative bonus up to max 100% of sum insured.
""",
        fontsize=10,
        fontname="helv",
    )

    # Page 3: Exclusions
    p3 = doc.new_page(width=595, height=842)
    p3.insert_text(
        (40, 50),
        """CARE HEALTH INSURANCE - SECTION C: EXCLUSIONS & CONDITIONS (PAGE 3 OF 3)
Waiting Periods:
- Initial waiting period: 30 days
- 24 months for named ailments (cataract, sinus, hernia, stones)
- 36 months for pre-existing medical conditions
Exclusions:
- Self-inflicted injuries, mental disorder therapies outside psychiatric beds
- Rest cure, rehabilitation, and respite care
""",
        fontsize=10,
        fontname="helv",
    )

    doc.save(str(output_path))
    doc.close()


def create_missing_fields_pdf(output_path: Path) -> None:
    doc = pymupdf.open()
    page = doc.new_page(width=595, height=842)
    # Notice with missing policy holder address, taxes, deductible, and premium breakdown
    text = """RENEWAL REMINDER NOTICE
Insurer: Reliance General Insurance Co. Ltd.
Notice No: REL-REN-2026-11
Policy No: REL-HLTH-88201
Insurance Type: Health
Status: Active (Expiring Soon)
Expiration Date: 2026-12-15
Renewal Date: 2026-12-15

Dear Customer,
Your policy is expiring on 2026-12-15.
Sum Insured: INR 300,000
Approximate Renewal Premium: INR 8,900
Please login to your customer portal to complete the renewal before the expiration date.
"""
    page.insert_text((40, 50), text, fontsize=10, fontname="helv")
    doc.save(str(output_path))
    doc.close()


def create_non_insurance_pdf(output_path: Path) -> None:
    doc = pymupdf.open()
    page = doc.new_page(width=595, height=842)
    text = """TATA POWER ELECTRICITY CONSUMER BILL
Tax Invoice & Energy Consumption Statement
Consumer Number: 0988-2918-4421
Billing Period: 01-Jan-2026 to 31-Jan-2026
Meter Reading: 4522 kWh
Units Consumed: 340 kWh
Total Amount Payable: INR 3,120.00
Due Date: 15-Feb-2026

Customer Name: Vikas Deshmukh
Premise Address: 12 Shivaji Nagar, Pune 411005
Please make payment before the due date to avoid disconnection of power supply.
"""
    page.insert_text((40, 50), text, fontsize=10, fontname="helv")
    doc.save(str(output_path))
    doc.close()


def main() -> None:
    sample_dir = Path("sample_data")
    sample_dir.mkdir(parents=True, exist_ok=True)

    create_clean_text_pdf(sample_dir / "sample_1_clean_policy.pdf")
    create_scanned_image_pdf(sample_dir / "sample_2_scanned_policy.pdf")
    create_multi_page_pdf(sample_dir / "sample_3_multi_policy.pdf")
    create_missing_fields_pdf(sample_dir / "sample_4_missing_fields.pdf")
    create_non_insurance_pdf(sample_dir / "sample_5_non_insurance.pdf")
    print(f"Generated 5 sample PDFs in {sample_dir.resolve()}")


if __name__ == "__main__":
    main()

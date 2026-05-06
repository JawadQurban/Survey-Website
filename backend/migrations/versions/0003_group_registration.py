"""add group registration: permissions, survey_type, training_courses, group_registrations

Revision ID: 0003
Revises: 0002
Create Date: 2026-05-06 00:00:00.000000
"""

from alembic import op
import sqlalchemy as sa
from datetime import datetime, timezone

revision = "0003"
down_revision = "0002"
branch_labels = None
depends_on = None


def upgrade() -> None:
    # ── 1. Add permissions column to admin_roles ──────────────────────────────
    op.add_column(
        "admin_roles",
        sa.Column("permissions", sa.JSON(), nullable=True),
    )

    # ── 2. Add survey_type to surveys (default 'standard' — all existing rows get it) ──
    op.add_column(
        "surveys",
        sa.Column(
            "survey_type",
            sa.String(32),
            nullable=False,
            server_default="standard",
        ),
    )

    # ── 3. Create training_courses table ──────────────────────────────────────
    op.create_table(
        "training_courses",
        sa.Column("id",              sa.BigInteger(), primary_key=True, autoincrement=True),
        sa.Column("sector",          sa.String(64),  nullable=False),
        sa.Column("functional_area", sa.String(128), nullable=False),
        sa.Column("course_code",     sa.String(32),  nullable=False, unique=True),
        sa.Column("course_title",    sa.String(256), nullable=False),
        sa.Column("duration_days",   sa.Integer(),   nullable=True),
        sa.Column("capacity",        sa.Integer(),   nullable=False, server_default="25"),
        sa.Column("is_active",       sa.Boolean(),   nullable=False, server_default="1"),
        sa.Column("created_at",      sa.DateTime(timezone=True), nullable=False),
    )

    # ── 4. Create group_registrations table ───────────────────────────────────
    op.create_table(
        "group_registrations",
        sa.Column("id",                   sa.BigInteger(), primary_key=True, autoincrement=True),
        sa.Column("reference_number",     sa.String(32),  nullable=False, unique=True),
        sa.Column("organization_name",    sa.String(255), nullable=False),
        sa.Column("department",           sa.String(255), nullable=True),
        sa.Column("focal_point_name",     sa.String(255), nullable=False),
        sa.Column("focal_point_position", sa.String(255), nullable=True),
        sa.Column("email",                sa.String(255), nullable=False),
        sa.Column("mobile",               sa.String(32),  nullable=True),
        sa.Column("selected_sectors",         sa.JSON(), nullable=True),
        sa.Column("selected_functional_areas", sa.JSON(), nullable=True),
        sa.Column("nominations",          sa.JSON(), nullable=True),
        sa.Column("special_requests",     sa.Text(), nullable=True),
        sa.Column("submitted_by",         sa.String(255), nullable=True),
        sa.Column("pdpl_authorized",      sa.Boolean(), nullable=False, server_default="0"),
        sa.Column("language_used",        sa.String(8),  nullable=False, server_default="en"),
        sa.Column("status",               sa.String(32), nullable=False, server_default="submitted"),
        sa.Column("submitted_at",         sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_at",           sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at",           sa.DateTime(timezone=True), nullable=False),
    )

    # ── 5. Seed permission roles ──────────────────────────────────────────────
    op.execute(
        """
        INSERT INTO admin_roles (name, description, permissions, created_at)
        VALUES
          ('Standard Surveys Admin',   'Manage standard surveys and submissions',       '["surveys.standard.manage"]',        NOW()),
          ('Group Registration Admin', 'Manage group registration forms and catalog',   '["surveys.group_registration.manage"]', NOW())
        """
    )

    # ── 6. Seed training courses from Excel catalog ───────────────────────────
    now = "NOW()"
    courses = [
        # BUSINESS — Corporate Banking
        ("BUSINESS", "Corporate Banking",                    "FABTS261101", "Financial Analysis",                        3, 25),
        ("BUSINESS", "Corporate Banking",                    "FABTS261102", "Credit Risk Assessment",                    3, 25),
        ("BUSINESS", "Corporate Banking",                    "FABTS261103", "Negotiation Skills for Corporate Bankers",  3, 25),
        ("BUSINESS", "Corporate Banking",                    "FABTS261104", "Project Finance Development Program",       5, 25),
        # BUSINESS — Retail Banking
        ("BUSINESS", "Retail Banking",                       "FABTS261201", "Customer Service Excellence",               2, 25),
        ("BUSINESS", "Retail Banking",                       "FABTS261202", "Retail Banking Operations",                 3, 25),
        ("BUSINESS", "Retail Banking",                       "FABTS261203", "Advisory Selling Skills",                   3, 25),
        ("BUSINESS", "Retail Banking",                       "FABTS261204", "Consumer Credit Development Program",       4, 25),
        # BUSINESS — Investment Banking
        ("BUSINESS", "Investment Banking",                   "FABTS261301", "Valuation Techniques",                      4, 25),
        ("BUSINESS", "Investment Banking",                   "FABTS261302", "M&A Strategies",                            5, 25),
        ("BUSINESS", "Investment Banking",                   "FABTS261303", "Capital Markets Development Program",       5, 25),
        # BUSINESS — Treasury & Capital Markets
        ("BUSINESS", "Treasury & Capital Markets",           "FABTS261401", "Treasury Management",                       3, 25),
        ("BUSINESS", "Treasury & Capital Markets",           "FABTS261402", "Derivatives",                               3, 25),
        ("BUSINESS", "Treasury & Capital Markets",           "FABTS261403", "ALM Development Program",                   3, 25),
        # BUSINESS — Private Banking & Wealth Management
        ("BUSINESS", "Private Banking & Wealth Management",  "FABTS261501", "Wealth Management Development Program",     3, 25),
        ("BUSINESS", "Private Banking & Wealth Management",  "FABTS261502", "Investment Advisory",                       3, 25),
        ("BUSINESS", "Private Banking & Wealth Management",  "FABTS261503", "Financial Planning",                        3, 25),
        # BUSINESS — Digital Banking
        ("BUSINESS", "Digital Banking",                      "FABTS261601", "Digital Banking Strategy",                  3, 25),
        ("BUSINESS", "Digital Banking",                      "FABTS261602", "UX Design",                                 3, 25),
        ("BUSINESS", "Digital Banking",                      "FABTS261603", "Agile Development",                         3, 25),
        ("BUSINESS", "Digital Banking",                      "FABTS261604", "Fintech Innovations",                       3, 25),
        # BUSINESS — Fintech Partnerships & Open Banking
        ("BUSINESS", "Fintech Partnerships & Open Banking",  "FABTS261701", "Open Banking Regulations",                  3, 25),
        ("BUSINESS", "Fintech Partnerships & Open Banking",  "FABTS261702", "API Development",                           3, 25),
        ("BUSINESS", "Fintech Partnerships & Open Banking",  "FABTS261703", "Partnership Management",                    3, 25),
        # SUPPORT — Human Resources
        ("SUPPORT",  "Human Resources",                      "FABTS262101", "HR Management",                             3, 25),
        ("SUPPORT",  "Human Resources",                      "FABTS262102", "Labor Law",                                 3, 25),
        ("SUPPORT",  "Human Resources",                      "FABTS262103", "Talent Development",                        3, 25),
        # SUPPORT — Finance & Accounting
        ("SUPPORT",  "Finance & Accounting",                 "FABTS262201", "IFRS",                                      3, 25),
        ("SUPPORT",  "Finance & Accounting",                 "FABTS262202", "Budgeting & Forecasting",                   3, 25),
        ("SUPPORT",  "Finance & Accounting",                 "FABTS262203", "Tax Compliance",                            3, 25),
        # SUPPORT — Legal & Compliance Support
        ("SUPPORT",  "Legal & Compliance Support",           "FABTS262301", "Banking Law",                               3, 25),
        ("SUPPORT",  "Legal & Compliance Support",           "FABTS262302", "Compliance Development Program",            3, 25),
        ("SUPPORT",  "Legal & Compliance Support",           "FABTS262303", "AML/KYC",                                   3, 25),
        # SUPPORT — Procurement & Vendor Management
        ("SUPPORT",  "Procurement & Vendor Management",      "FABTS262401", "Procurement Strategies",                    3, 25),
        ("SUPPORT",  "Procurement & Vendor Management",      "FABTS262402", "Contract Law",                              3, 25),
        # SUPPORT — Marketing & Communications
        ("SUPPORT",  "Marketing & Communications",           "FABTS262501", "Marketing Strategy",                        3, 25),
        ("SUPPORT",  "Marketing & Communications",           "FABTS262502", "Digital Marketing",                         3, 25),
        ("SUPPORT",  "Marketing & Communications",           "FABTS262503", "PR Skills",                                 3, 25),
        # SUPPORT — Innovation & Product Development
        ("SUPPORT",  "Innovation & Product Development",     "FABTS262601", "Design Thinking",                           3, 25),
        ("SUPPORT",  "Innovation & Product Development",     "FABTS262602", "Product Management Development Program",    3, 25),
        # SUPPORT — Digital Transformation Office
        ("SUPPORT",  "Digital Transformation Office",        "FABTS262701", "Digital Transformation Strategy",           3, 25),
        ("SUPPORT",  "Digital Transformation Office",        "FABTS262702", "Change Management",                         3, 25),
        # OPERATIONS — Trade Finance Operations
        ("OPERATIONS", "Trade Finance Operations",           "FABTS263101", "UCP 600",                                   3, 25),
        ("OPERATIONS", "Trade Finance Operations",           "FABTS263102", "Trade Finance Development Program",         3, 25),
        # OPERATIONS — Payment Processing
        ("OPERATIONS", "Payment Processing",                 "FABTS263201", "Payments Systems",                          3, 25),
        ("OPERATIONS", "Payment Processing",                 "FABTS263202", "SWIFT Operations",                          3, 25),
        # OPERATIONS — Loan & Credit Administration
        ("OPERATIONS", "Loan & Credit Administration",       "FABTS263301", "Credit Administration",                     3, 25),
        ("OPERATIONS", "Loan & Credit Administration",       "FABTS263302", "Loan Processing",                           3, 25),
        # OPERATIONS — Branch Operations
        ("OPERATIONS", "Branch Operations",                  "FABTS263401", "Branch Management",                         3, 25),
        ("OPERATIONS", "Branch Operations",                  "FABTS263402", "Customer Service",                          3, 25),
        # OPERATIONS — Digital Channels Operations
        ("OPERATIONS", "Digital Channels Operations",        "FABTS263501", "Digital Banking Operations",                3, 25),
        ("OPERATIONS", "Digital Channels Operations",        "FABTS263502", "ITIL Foundation",                           3, 25),
        # OPERATIONS — Technology & IT Operations
        ("OPERATIONS", "Technology & IT Operations",         "FABTS263601", "Cybersecurity Essentials",                  3, 25),
        ("OPERATIONS", "Technology & IT Operations",         "FABTS263602", "Core Banking Systems",                      3, 25),
        ("OPERATIONS", "Technology & IT Operations",         "FABTS263603", "ITIL",                                      3, 25),
        # CONTROL — Risk Management
        ("CONTROL",  "Risk Management",                      "FABTS264101", "FRM Development Program",                   3, 25),
        ("CONTROL",  "Risk Management",                      "FABTS264102", "Risk Assessment Techniques",                3, 25),
        # CONTROL — Internal Audit
        ("CONTROL",  "Internal Audit",                       "FABTS264201", "CIA Development Program",                   3, 25),
        ("CONTROL",  "Internal Audit",                       "FABTS264202", "Audit Methodologies",                       3, 25),
        # CONTROL — Regulatory Compliance
        ("CONTROL",  "Regulatory Compliance",                "FABTS264301", "Compliance Development Program",            3, 25),
        ("CONTROL",  "Regulatory Compliance",                "FABTS264302", "AML Training",                              3, 25),
        # CONTROL — Fraud Prevention & Security
        ("CONTROL",  "Fraud Prevention & Security",          "FABTS264401", "Fraud Detection",                           3, 25),
        ("CONTROL",  "Fraud Prevention & Security",          "FABTS264402", "Cybersecurity Development Program",         3, 25),
    ]

    rows = ", ".join(
        f"('{s}', '{fa}', '{code}', '{title}', {days}, {cap}, 1, NOW())"
        for s, fa, code, title, days, cap in courses
    )
    op.execute(
        f"INSERT INTO training_courses (sector, functional_area, course_code, course_title, duration_days, capacity, is_active, created_at) VALUES {rows}"
    )


def downgrade() -> None:
    op.execute("DELETE FROM training_courses")
    op.execute("DELETE FROM admin_roles WHERE name IN ('Standard Surveys Admin', 'Group Registration Admin')")
    op.drop_table("group_registrations")
    op.drop_table("training_courses")
    op.drop_column("surveys", "survey_type")
    op.drop_column("admin_roles", "permissions")

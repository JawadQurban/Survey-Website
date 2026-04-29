"""
Migration: Convert submissions table to support anonymous self-service survey flow.
MySQL-compatible version.

Run once on the server:
    docker exec -it <backend_container> python scripts/migrate_anonymous_survey.py

Changes:
  - Adds session_key, org_name_input, sector, regulator, org_size, respondent_name columns
  - Makes organization_id nullable (anonymous respondents have no org FK)
  - Drops the uq_org_survey_role unique key
  - Adds unique key on session_key (MySQL allows multiple NULLs in a unique index)
"""
import sys
import os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.core.database import SessionLocal
from sqlalchemy import text


def column_exists(db, table, column):
    result = db.execute(text(
        "SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS "
        "WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = :t AND COLUMN_NAME = :c"
    ), {"t": table, "c": column})
    return result.scalar_one() > 0


def index_exists(db, table, index_name):
    result = db.execute(text(
        "SELECT COUNT(*) FROM INFORMATION_SCHEMA.STATISTICS "
        "WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = :t AND INDEX_NAME = :i"
    ), {"t": table, "i": index_name})
    return result.scalar_one() > 0


def run():
    db = SessionLocal()
    try:
        # Add new columns if they don't exist
        new_cols = [
            ("session_key",     "VARCHAR(64)"),
            ("org_name_input",  "VARCHAR(255)"),
            ("sector",          "VARCHAR(32)"),
            ("regulator",       "VARCHAR(64)"),
            ("org_size",        "VARCHAR(32)"),
            ("respondent_name", "VARCHAR(255)"),
        ]
        for col_name, col_type in new_cols:
            if not column_exists(db, "submissions", col_name):
                db.execute(text(f"ALTER TABLE submissions ADD COLUMN {col_name} {col_type} NULL"))
                print(f"[Migration] Added column: {col_name}")
            else:
                print(f"[Migration] Column already exists, skipping: {col_name}")

        # Make organization_id nullable
        db.execute(text(
            "ALTER TABLE submissions MODIFY COLUMN organization_id BIGINT NULL"
        ))
        print("[Migration] Made organization_id nullable")

        # Set default for respondent_email
        db.execute(text(
            "ALTER TABLE submissions ALTER COLUMN respondent_email SET DEFAULT ''"
        ))
        print("[Migration] Set respondent_email default to empty string")

        # Drop old unique constraint if it exists
        if index_exists(db, "submissions", "uq_org_survey_role"):
            db.execute(text("ALTER TABLE submissions DROP INDEX uq_org_survey_role"))
            print("[Migration] Dropped uq_org_survey_role unique key")
        else:
            print("[Migration] uq_org_survey_role not found, skipping drop")

        # Add unique key on session_key (MySQL allows multiple NULLs in a unique index)
        if not index_exists(db, "submissions", "ix_submissions_session_key"):
            db.execute(text(
                "ALTER TABLE submissions ADD UNIQUE KEY ix_submissions_session_key (session_key)"
            ))
            print("[Migration] Added unique key on session_key")
        else:
            print("[Migration] ix_submissions_session_key already exists, skipping")

        db.commit()
        print("[Migration] Done — anonymous survey migration complete")
    except Exception as e:
        db.rollback()
        print(f"[Migration] Failed: {e}")
        raise
    finally:
        db.close()


if __name__ == "__main__":
    run()

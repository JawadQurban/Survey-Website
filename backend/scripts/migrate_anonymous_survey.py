"""
Migration: Convert submissions table to support anonymous self-service survey flow.

Run once on the server:
    docker exec -it <backend_container> python scripts/migrate_anonymous_survey.py

Changes:
  - Adds session_key, org_name_input, sector, regulator, org_size, respondent_name columns
  - Makes organization_id nullable (anonymous respondents have no FK org)
  - Drops the uq_org_survey_role unique constraint (now deduped by session_key)
"""
import sys
import os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.core.database import SessionLocal
from sqlalchemy import text


def run():
    db = SessionLocal()
    try:
        db.execute(text("""
            ALTER TABLE submissions
              ADD COLUMN IF NOT EXISTS session_key     VARCHAR(64),
              ADD COLUMN IF NOT EXISTS org_name_input  VARCHAR(255),
              ADD COLUMN IF NOT EXISTS sector          VARCHAR(32),
              ADD COLUMN IF NOT EXISTS regulator       VARCHAR(64),
              ADD COLUMN IF NOT EXISTS org_size        VARCHAR(32),
              ADD COLUMN IF NOT EXISTS respondent_name VARCHAR(255)
        """))

        db.execute(text("""
            ALTER TABLE submissions
              ALTER COLUMN organization_id DROP NOT NULL
        """))

        db.execute(text("""
            ALTER TABLE submissions
              ALTER COLUMN respondent_email SET DEFAULT ''
        """))

        db.execute(text("""
            ALTER TABLE submissions
              DROP CONSTRAINT IF EXISTS uq_org_survey_role
        """))

        db.execute(text("""
            CREATE UNIQUE INDEX IF NOT EXISTS ix_submissions_session_key
              ON submissions (session_key)
              WHERE session_key IS NOT NULL
        """))

        db.commit()
        print("[Migration] Anonymous survey columns added to submissions")
    except Exception as e:
        db.rollback()
        print(f"[Migration] Failed: {e}")
        raise
    finally:
        db.close()


if __name__ == "__main__":
    run()

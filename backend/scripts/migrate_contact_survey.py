"""
Migration: add survey_id column to organization_contacts.

Run once on the server:
    docker exec -it <backend_container> python scripts/migrate_contact_survey.py
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
            ALTER TABLE organization_contacts
            ADD COLUMN IF NOT EXISTS survey_id BIGINT NULL,
            ADD CONSTRAINT fk_contact_survey
                FOREIGN KEY (survey_id) REFERENCES surveys(id) ON DELETE SET NULL
        """))
        db.commit()
        print("[Migration] survey_id column added to organization_contacts")
    except Exception as e:
        db.rollback()
        print(f"[Migration] Failed: {e}")
        raise
    finally:
        db.close()

if __name__ == "__main__":
    run()

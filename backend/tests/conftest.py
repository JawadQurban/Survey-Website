import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from app.core.database import Base, get_db
from app.main import app
from app.security.password import hash_password

TEST_DATABASE_URL = "sqlite:///:memory:"

engine = create_engine(TEST_DATABASE_URL, connect_args={"check_same_thread": False})
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


@pytest.fixture(scope="session", autouse=True)
def create_tables():
    Base.metadata.create_all(bind=engine)
    yield
    Base.metadata.drop_all(bind=engine)


@pytest.fixture
def db_session():
    db = TestingSessionLocal()
    try:
        yield db
    finally:
        db.rollback()
        db.close()


@pytest.fixture
def client(db_session):
    def override_get_db():
        try:
            yield db_session
        finally:
            pass

    app.dependency_overrides[get_db] = override_get_db
    with TestClient(app, raise_server_exceptions=True) as c:
        yield c
    app.dependency_overrides.clear()


@pytest.fixture
def admin_user(db_session):
    from app.models.admin import AdminUser
    user = AdminUser(
        email="testadmin@fa.gov.sa",
        password_hash=hash_password("SecurePass123!"),
        full_name="Test Admin",
        is_superadmin=True,
        is_active=True,
    )
    db_session.add(user)
    db_session.commit()
    db_session.refresh(user)
    return user


@pytest.fixture
def org_and_contact(db_session):
    from app.models.organization import Organization, OrganizationContact, RespondentRole
    org = Organization(name_en="Test Bank", slug="test-bank", is_active=True)
    db_session.add(org)
    db_session.flush()

    contact = OrganizationContact(
        organization_id=org.id,
        email="ceo@testbank.com",
        full_name="Test CEO",
        role=RespondentRole.CEO,
        is_active=True,
    )
    db_session.add(contact)
    db_session.commit()
    db_session.refresh(org)
    db_session.refresh(contact)
    return org, contact


@pytest.fixture
def seeded_survey(db_session):
    from app.models.survey import Survey, SurveyTranslation, SurveySection, SectionTranslation, Question, QuestionTranslation, QuestionOption, OptionTranslation, QuestionVisibilityRule, QuestionType, RespondentRole

    survey = Survey(slug="test-survey", is_active=True, is_fs_only=False)
    db_session.add(survey)
    db_session.flush()

    for lang, title in [("en", "Test Survey"), ("ar", "استطلاع تجريبي")]:
        db_session.add(SurveyTranslation(survey_id=survey.id, language_code=lang, title=title))

    section = SurveySection(survey_id=survey.id, section_key="section_0", display_order=0, is_active=True)
    db_session.add(section)
    db_session.flush()

    for lang, title in [("en", "Introduction"), ("ar", "مقدمة")]:
        db_session.add(SectionTranslation(section_id=section.id, language_code=lang, title=title))

    q = Question(
        section_id=section.id,
        question_key="q_1",
        question_type=QuestionType.SINGLE_CHOICE,
        display_order=0,
        is_required=True,
        is_active=True,
        has_open_text_option=True,
    )
    db_session.add(q)
    db_session.flush()

    db_session.add(QuestionTranslation(question_id=q.id, language_code="en", text="What is your role?"))

    for i, opt_text in enumerate(["Option A", "Option B"]):
        opt = QuestionOption(question_id=q.id, option_key=f"opt_{i+1}", display_order=i, is_active=True)
        db_session.add(opt)
        db_session.flush()
        db_session.add(OptionTranslation(option_id=opt.id, language_code="en", text=opt_text))

    for role in [RespondentRole.CEO, RespondentRole.CHRO, RespondentRole.LD]:
        db_session.add(QuestionVisibilityRule(question_id=q.id, role=role))

    db_session.commit()
    return survey

import re
import unicodedata


def slugify(text: str) -> str:
    text = unicodedata.normalize("NFKD", text)
    text = text.encode("ascii", "ignore").decode("ascii")
    text = re.sub(r"[^\w\s-]", "", text).strip().lower()
    return re.sub(r"[-\s]+", "-", text)


def normalize_role(raw: str) -> str | None:
    mapping = {
        "ceo": "ceo",
        "ceo/ex level": "ceo",
        "exec": "ceo",
        "chro": "chro",
        "head of hr": "chro",
        "l&d": "ld",
        "l&d leader": "ld",
        "head of l&d": "ld",
        "ld": "ld",
    }
    return mapping.get(raw.strip().lower())


def safe_str(value: object) -> str | None:
    if value is None:
        return None
    s = str(value).strip()
    return s if s else None

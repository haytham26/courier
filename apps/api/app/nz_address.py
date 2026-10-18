"""Deterministic NZ address normaliser. Runs before (and after) the LLM so the
LLM never has to be trusted for spelling of streets/suburbs it can't see."""
from __future__ import annotations

import difflib
import re
from dataclasses import dataclass

# Extend per run from LINZ address data; these seed common Christchurch speech errors.
CHCH_SUBURBS = [
    "Northwood", "Redwood", "Riccarton", "Upper Riccarton", "Papanui", "Bishopdale",
    "Burnside", "Casebrook", "Belfast", "Styx Mill", "Harewood", "Avonhead", "Ilam",
    "Fendalton", "Merivale", "St Albans", "Strowan", "Bryndwr", "Halswell", "Hornby",
    "Sockburn", "Wigram", "Addington", "Sydenham", "Linwood", "Woolston", "Shirley",
    "Mairehau", "Marshland", "Parklands", "Burwood", "Aranui", "Opawa", "Cashmere",
    "Sumner", "Redcliffs", "Halswell", "Yaldhurst", "Russley", "Waimairi Beach",
]
# Misheard-by-ASR -> canonical. Te reo names are the usual victims.
SPOKEN_FIXES = {
    "rick a ton": "Riccarton", "rickerton": "Riccarton", "ricardton": "Riccarton",
    "pap a new e": "Papanui", "papa newey": "Papanui", "why my ree": "Waimairi",
    "my ree howe": "Mairehau", "my rehau": "Mairehau", "far ken ham": "Fendalton",
    "pair a parker": "Paparoa", "a ran ui": "Aranui", "whaka": "Whaka",
}
STREET_TYPES = {
    "street": "St", "st": "St", "road": "Rd", "rd": "Rd", "avenue": "Ave", "ave": "Ave",
    "drive": "Dr", "dr": "Dr", "place": "Pl", "pl": "Pl", "crescent": "Cres", "cres": "Cres",
    "terrace": "Tce", "tce": "Tce", "lane": "Ln", "close": "Cl", "court": "Ct", "way": "Way",
    "grove": "Gr", "mews": "Mews", "quay": "Quay", "parade": "Pde", "highway": "Hwy",
}
NUM_WORDS = {w: str(i) for i, w in enumerate(
    "zero one two three four five six seven eight nine ten eleven twelve thirteen fourteen "
    "fifteen sixteen seventeen eighteen nineteen twenty".split())}
NUM_WORDS.update({"thirty": "30", "forty": "40", "fifty": "50", "sixty": "60",
                  "seventy": "70", "eighty": "80", "ninety": "90", "oh": "0"})


@dataclass
class ParsedAddress:
    unit: str | None
    number: str | None
    street: str | None
    suburb: str | None
    confidence: float

    @property
    def street_key(self) -> str:
        return f"{(self.suburb or '?').lower()}:{(self.street or '').lower()}"

    @property
    def address_key(self) -> str:
        unit = f"{self.unit}/" if self.unit else ""
        return f"{unit}{self.number or '?'} {self.street or '?'}, {self.suburb or '?'}".lower()

    @property
    def complete(self) -> bool:
        return bool(self.number and self.street and self.suburb)


def _words_to_digits(text: str) -> str:
    out, buf = [], []
    for tok in text.split():
        if tok in NUM_WORDS:
            buf.append(NUM_WORDS[tok])
            continue
        if buf:
            out.append(_join_spoken_number(buf)); buf = []
        out.append(tok)
    if buf:
        out.append(_join_spoken_number(buf))
    return " ".join(out)


def _join_spoken_number(parts: list[str]) -> str:
    # "forty two" -> 42 ; "one four two" -> 142 (couriers read digits)
    if len(parts) == 2 and parts[0].endswith("0") and len(parts[0]) == 2 and len(parts[1]) == 1:
        return str(int(parts[0]) + int(parts[1]))
    return "".join(parts)


def match_suburb(text: str, suburbs: list[str] = CHCH_SUBURBS) -> tuple[str | None, float]:
    lowered = {s.lower(): s for s in suburbs}
    best = difflib.get_close_matches(text.lower(), lowered.keys(), n=1, cutoff=0.75)
    if not best:
        return None, 0.0
    return lowered[best[0]], difflib.SequenceMatcher(None, text.lower(), best[0]).ratio()


def parse(raw: str, suburbs: list[str] = CHCH_SUBURBS) -> ParsedAddress:
    text = raw.lower().strip()
    for wrong, right in SPOKEN_FIXES.items():
        text = text.replace(wrong, right.lower())
    text = re.sub(r"[.,;]", " ", text)
    text = re.sub(r"\b(unit|flat|apartment|apt)\s+", "unit ", text)
    text = _words_to_digits(text)
    text = re.sub(r"\s+", " ", text).strip()
    text = re.sub(r"^(\d+) ([a-h])\b", r"\1\2", text)   # spoken "forty two B" -> 42b

    unit = None
    m = re.match(r"^(?:unit (\w+)\s+)?(\d+[a-z]?)(?:\s*/\s*(\d+[a-z]?))?\s+(.*)$", text)
    if m and m.group(3):          # "2/14 smith st" -> unit 2, number 14
        unit, number, rest = m.group(2), m.group(3), m.group(4)
    elif m:
        unit, number, rest = m.group(1), m.group(2), m.group(4)
    else:
        number, rest = None, text
    if number and len(number) > 1 and unit is None:
        m2 = re.match(r"^(\d+)([a-z])$", number)
        if m2:
            unit, number = m2.group(2).upper(), m2.group(1)

    tokens = rest.split()
    street, suburb, conf = None, None, 0.6
    for i, tok in enumerate(tokens):
        if tok in STREET_TYPES:
            street = " ".join(t.title() for t in tokens[:i]) + " " + STREET_TYPES[tok]
            tail = " ".join(tokens[i + 1:])
            if tail:
                suburb, conf = match_suburb(tail, suburbs)
            break
    else:
        # No street type spoken: try the last 1-2 words as suburb.
        for k in (2, 1):
            if len(tokens) > k:
                suburb, s_conf = match_suburb(" ".join(tokens[-k:]), suburbs)
                if suburb:
                    street, conf = " ".join(t.title() for t in tokens[:-k]), s_conf * 0.8
                    break
        else:
            street = " ".join(t.title() for t in tokens) or None
    if not number:
        conf *= 0.5
    return ParsedAddress(unit, number, street.strip() if street else None, suburb, round(conf, 2))

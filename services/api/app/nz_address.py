"""Deterministic NZ address normaliser. Runs before (and after) the LLM so the
LLM never has to be trusted for spelling of streets/suburbs it can't see."""

from __future__ import annotations

import difflib
import re
from dataclasses import dataclass

# Extend per run from LINZ address data; these seed common Christchurch speech errors.
CHCH_SUBURBS = [
    "Northwood",
    "Redwood",
    "Riccarton",
    "Upper Riccarton",
    "Papanui",
    "Bishopdale",
    "Burnside",
    "Casebrook",
    "Belfast",
    "Styx Mill",
    "Harewood",
    "Avonhead",
    "Ilam",
    "Fendalton",
    "Merivale",
    "St Albans",
    "Strowan",
    "Bryndwr",
    "Halswell",
    "Hornby",
    "Sockburn",
    "Wigram",
    "Addington",
    "Sydenham",
    "Linwood",
    "Woolston",
    "Shirley",
    "Mairehau",
    "Marshland",
    "Parklands",
    "Burwood",
    "Aranui",
    "Opawa",
    "Cashmere",
    "Sumner",
    "Redcliffs",
    "Halswell",
    "Yaldhurst",
    "Russley",
    "Waimairi Beach",
]
# Misheard-by-ASR -> canonical. Te reo names are the usual victims.
SPOKEN_FIXES = {
    "rick a ton": "Riccarton",
    "rickerton": "Riccarton",
    "ricardton": "Riccarton",
    "pap a new e": "Papanui",
    "papa newey": "Papanui",
    "why my ree": "Waimairi",
    "my ree howe": "Mairehau",
    "my rehau": "Mairehau",
    "far ken ham": "Fendalton",
    "pair a parker": "Paparoa",
    "a ran ui": "Aranui",
    "whaka": "Whaka",
}
# The directions a road carries after its type, as a driver says them
# ("Durham Street South"). They are not suburbs, and treating one as the tail of
# the suburb made `parse` answer with no suburb at all.
#
# "central" is deliberately absent: in NZ it is far more often a suburb's own name
# ("Central City", "Christchurch Central") than a road's direction, and stripping
# it there moved a suburb name onto the road.
ROAD_DIRECTIONS = {"north", "south", "east", "west", "northeast", "northwest", "southeast", "southwest"}

STREET_TYPES = {
    "street": "St",
    "st": "St",
    "road": "Rd",
    "rd": "Rd",
    "avenue": "Ave",
    "ave": "Ave",
    "drive": "Dr",
    "dr": "Dr",
    "place": "Pl",
    "pl": "Pl",
    "crescent": "Cres",
    "cres": "Cres",
    "terrace": "Tce",
    "tce": "Tce",
    "lane": "Ln",
    "close": "Cl",
    "court": "Ct",
    "way": "Way",
    "grove": "Gr",
    "mews": "Mews",
    "quay": "Quay",
    "parade": "Pde",
    "highway": "Hwy",
}
NUM_WORDS = {
    w: str(i)
    for i, w in enumerate(
        [
            "zero",
            "one",
            "two",
            "three",
            "four",
            "five",
            "six",
            "seven",
            "eight",
            "nine",
            "ten",
            "eleven",
            "twelve",
            "thirteen",
            "fourteen",
            "fifteen",
            "sixteen",
            "seventeen",
            "eighteen",
            "nineteen",
            "twenty",
        ]
    )
}
NUM_WORDS.update(
    {
        "thirty": "30",
        "forty": "40",
        "fifty": "50",
        "sixty": "60",
        "seventy": "70",
        "eighty": "80",
        "ninety": "90",
        "oh": "0",
        "hundred": "100",
        "thousand": "1000",
    }
)


@dataclass
class ParsedAddress:
    unit: str | None
    number: str | None
    suffix: str | None
    street: str | None
    suburb: str | None
    confidence: float
    # The raw text that should name the suburb (the tail after the street
    # type). The engine matches it against the suburbs the road really runs
    # through, so a rural suburb the hardcoded list does not know still works.
    suburb_hint: str | None = None

    @property
    def street_key(self) -> str:
        return f"{(self.suburb or '?').lower()}:{(self.street or '').lower()}"

    @property
    def address_key(self) -> str:
        unit = f"{self.unit}/" if self.unit else ""
        number = f"{self.number or '?'}{self.suffix or ''}"
        return f"{unit}{number} {self.street or '?'}, {self.suburb or '?'}".lower()

    @property
    def complete(self) -> bool:
        return bool(self.number and self.street and self.suburb)


def _words_to_digits(text: str) -> str:
    # Only the house number is spoken, and it comes first. The courier reads "928
    # Two Chain Road" for a road whose own name contains a number; converting the
    # whole string turned "Two Chain Road" into "2 Chain Road", so the parser
    # looked for a road that does not exist and answered with the road's own name
    # as the suburb (`docs/evidence/phase-2.3/linz-accuracy.md`).
    #
    # So the run of number words is converted only while it is *leading*: the
    # first token that is not a number word (and not "and" inside the run) ends
    # the number, and everything after it stays exactly as it was spoken. A road
    # called "Two Chain Road" is a road called "Two Chain Road".
    out: list[str] = []
    buf: list[str] = []
    for tok in text.split():
        if not out and not buf and tok == "and":
            # A leading "and" carries no number: it is the driver's hesitation.
            continue
        if not out and tok in NUM_WORDS:
            buf.append(NUM_WORDS[tok])
            continue
        if buf:
            out.append(_join_spoken_number(buf))
            buf = []
        out.append(tok)
    if buf:
        out.append(_join_spoken_number(buf))
    return " ".join(out)


def _join_spoken_number(parts: list[str]) -> str:
    # "one four two" -> 142 (couriers read digits) and "one hundred sixty" -> 160
    if len(parts) > 1 and all(len(part) == 1 and part.isdigit() for part in parts):
        return "".join(parts)
    value = _spoken_value(parts)
    return str(value) if value is not None else "".join(parts)


def _spoken_value(parts: list[str]) -> int | None:
    """Sums spoken number words, honouring 'hundred' and 'thousand'."""
    total = 0
    current = 0
    for part in parts:
        if part == "100":
            current = (current or 1) * 100
        elif part == "1000":
            total += (current or 1) * 1000
            current = 0
        elif part.isdigit():
            current += int(part)
        else:
            return None
    return total + current


def match_suburb(text: str, suburbs: list[str] = CHCH_SUBURBS) -> tuple[str | None, float]:
    lowered = {s.lower(): s for s in suburbs}
    best = difflib.get_close_matches(text.lower(), lowered.keys(), n=1, cutoff=0.75)
    if not best:
        return None, 0.0
    return lowered[best[0]], difflib.SequenceMatcher(None, text.lower(), best[0]).ratio()


def match_suburb_tail(tail: str, suburbs: list[str]) -> tuple[str | None, float]:
    """Matches the tail after the road against the suburb vocabulary, longest first.

    A courier says "24 Dublin Street, Christchurch Central, Christchurch" - the
    suburb and then the city again - so the whole tail is tried first, then the
    tail without its last word, then without its last two. The vocabulary is
    whatever the caller passes: the engine passes the register's own (see
    `AddressStore.suburbs()`), which is the only reason a suburb the hardcoded
    `CHCH_SUBURBS` list never heard of (`Prebbleton`, `Lyttelton`, `Rolleston`,
    `Diamond Harbour`) resolves at all.
    """
    words = tail.split()
    for size in range(len(words), 0, -1):
        suburb, score = match_suburb(" ".join(words[:size]), suburbs)
        if suburb is not None:
            return suburb, score
    return None, 0.0


def _spoken_number_after_unit(text: str) -> str:
    """Converts the spoken house number that follows a unit.

    A courier says "unit 1 seven Michelle Road" and "unit 6 fifty seven Matipo
    Street": the unit is spoken FIRST, so `_words_to_digits` (which converts a
    leading run only, because a road's own name may be a number word) never
    reaches the house number, and the engine is left looking for a house number
    called "seven". The run of number words that follows the unit is the house
    number, and it is converted here - "and" between the words is dropped, and
    nothing after the run is touched, so "Two Chain Road" stays a road name.
    """
    match = re.match(r"^(unit\s+)(\S+)(\s+)(.*)$", text)
    if not match:
        return text
    head, unit_word, _gap, rest = match.groups()
    tokens = rest.split()
    run: list[str] = []
    index = 0
    while index < len(tokens):
        token = tokens[index]
        if token == "and" and run and index + 1 < len(tokens) and tokens[index + 1] in NUM_WORDS:
            index += 1
            continue
        if token in NUM_WORDS:
            run.append(NUM_WORDS[token])
            index += 1
            continue
        break
    if not run:
        return text
    digits = _join_spoken_number(run)
    return " ".join([head.strip(), unit_word, digits, *tokens[index:]])


def parse(raw: str, suburbs: list[str] = CHCH_SUBURBS) -> ParsedAddress:
    text = raw.lower().strip()
    for wrong, right in SPOKEN_FIXES.items():
        text = text.replace(wrong, right.lower())
    text = re.sub(r"[.,;]", " ", text)
    text = re.sub(r"\b(unit|flat|apartment|apt)\s+", "unit ", text)
    text = _words_to_digits(text)
    text = _spoken_number_after_unit(text)
    text = re.sub(r"\s+", " ", text).strip()
    # The spoken suffix "forty two B" -> 42b. The letter must be a token of its
    # own: a road whose NAME starts with a letter ("19 O'Leary Street") used to
    # be glued to its number here ("19o'Leary St") and the house number was
    # lost, because a `\b` also holds between a letter and an apostrophe.
    text = re.sub(r"^(\d+) ([a-z])(?=\s|$)", r"\1\2", text)

    unit = None
    suffix = None
    # C3: the left of the slash is the unit, and a unit may carry letters with or
    # without digits - "255C/28", "4D/87" and "D/87" are all units. The pattern
    # used to be `(\d+[a-z]?)` on both sides, which read "4D/87" as unit 4 with a
    # suffix D and could not match "D/87" at all. `[a-z]*\d*[a-z]?` covers unit
    # names like "4d", "255c", "d" and "12a" while still refusing a bare "27" on
    # the left (that is a plain number, not a unit).
    m = re.match(r"^(?:unit (\w+)\s+)?([a-z]*\d+[a-z]?|[a-z]+\d*[a-z]?)(?:\s*/\s*(\d+[a-z]?))?\s+(.*)$", text)
    unit_is_a_slash_unit = bool(m and m.group(3) and m.group(2))
    if m and m.group(3):  # "2/14 smith st" -> unit 2, number 14
        unit, number, rest = m.group(2), m.group(3), m.group(4)
    elif m:
        unit, number, rest = m.group(1), m.group(2), m.group(4)
    else:
        number, rest = None, text
    if number and len(number) > 1 and unit is None:
        # R23: "42B" is number 42 with suffix B; a unit is always written "2/14".
        m2 = re.match(r"^(\d+)([a-z])$", number)
        if m2:
            suffix, number = m2.group(2).upper(), m2.group(1)
    if unit and suffix is None and re.match(r"^\d+[a-z]$", unit) and not unit_is_a_slash_unit:
        # "unit 255C" is unit 255 with suffix C.
        # A unit that came from the left of a slash keeps its letter: "4D/87" is
        # flat 4D at 87, and splitting it into unit 4 + suffix D answers "4/87",
        # which is the failure the LINZ accuracy report names.
        m_unit = re.match(r"^(\d+)([a-z])$", unit)
        if m_unit:
            unit, suffix = m_unit.group(1), m_unit.group(2).upper()
    if number and suffix is None:
        # "20 B McBratneys Road" -> number 20, suffix B. The letter must be a
        # token of its own: a `\b` also holds between a letter and an
        # apostrophe, so "19 O'Leary Street" lost its O and its number.
        m3 = re.match(r"^(\d+)\s+([a-z])(?=\s|$)", f"{number} {rest}")
        if m3:
            suffix, number = m3.group(2).upper(), m3.group(1)
            rest = rest[m3.end(2) - len(number) :].strip()

    tokens = rest.split()
    street, suburb, conf = None, None, 0.6
    hint = None
    for i, tok in enumerate(tokens):
        if tok in STREET_TYPES:
            # C3: the road's direction word comes after its type ("193 Durham
            # Street South Christchurch Central"), and the driver then repeats the
            # city's name. The whole tail was handed to the suburb matcher, so it
            # saw "south christchurch central christchurch", matched nothing, and
            # answered with no suburb at all. The direction is set aside for the
            # suburb match and kept on the road, because that is what the driver
            # said and what the register's road name carries.
            #
            # It is set aside only when a suburb matches after it: "South
            # Christchurch" is a suburb in its own right, and stripping it there
            # would answer with the direction moved onto the road and no suburb at
            # all. The direction is only a direction when the words after it name
            # somewhere.
            direction_tokens: list[str] = []
            tail_tokens = tokens[i + 1 :]
            while tail_tokens and tail_tokens[0] in ROAD_DIRECTIONS:
                direction_tokens.append(tail_tokens.pop(0))
            street = " ".join(t.title() for t in tokens[:i]) + " " + STREET_TYPES[tok]
            tail = " ".join(tail_tokens)
            matched = match_suburb_tail(tail, suburbs)[0] if tail else None
            if direction_tokens and matched is None:
                # The direction was not a direction: it belongs to the suburb.
                tail_tokens = tokens[i + 1 :]
                tail = " ".join(tail_tokens)
                matched = match_suburb_tail(tail, suburbs)[0] if tail else None
                if matched is not None:
                    direction_tokens.clear()
            if direction_tokens:
                street += " " + " ".join(token.title() for token in direction_tokens)
            if tail:
                # The tail is handed to the engine as a hint EVEN WHEN this
                # parser's own vocabulary does not know it. The engine matches
                # the hint against the suburbs the road really runs through, so
                # the register - not a hardcoded list of 45 Christchurch
                # suburbs - decides. Throwing the tail away made the engine ask
                # "which suburb?" about an address whose driver had just named
                # it (`docs/evidence/phase-2.3/linz-accuracy.md`).
                hint = tail
                if matched is not None:
                    suburb, conf = match_suburb_tail(tail, suburbs)
            break
    else:
        # No street type spoken: the tail that names the suburb is the SHORTEST
        # exact match first, and a fuzzy match is only tried when no exact one
        # exists. Longest-first let "brae prebbleton" fuzzy-match Prebbleton
        # (SequenceMatcher 0.83) and cut the road's own name in half:
        # "2 Skara Brae, Prebbleton" answered with the road "Skara".
        for exact_only in (True, False):
            for k in range(1, min(3, len(tokens)) + 1):
                if len(tokens) <= k:
                    continue
                candidate = " ".join(tokens[-k:])
                suburb, s_conf = match_suburb(candidate, suburbs)
                if suburb and (s_conf >= 1.0 or not exact_only):
                    street, conf = " ".join(t.title() for t in tokens[:-k]), s_conf * 0.8
                    hint = candidate
                    break
            else:
                continue
            break
        else:
            street = " ".join(t.title() for t in tokens) or None
    if not number:
        conf *= 0.5
    return ParsedAddress(
        unit, number, suffix, street.strip() if street else None, suburb, round(conf, 2), hint
    )

"""The address resolver: what the recognizer heard, as a street that EXISTS.

The founder's VOICE LEVER (b) - ADDRESS RESOLUTION ON STT OUTPUT. The
held-out measurement reports address extraction at 0/75, and the reason is
structural: the offline brain hands the address engine the raw words it was
given ("fifty seven poulson street addington"), and nothing turns that into a
road, a house number and a suburb that Canterbury actually has. A courier who
says "fifty seven Poulson Street" and gets "an address was not recognised" has
been failed by the resolver, not by the microphone.

This module is that turn:

1. **Normalise** exactly the way `packages/nz-address` does (lower-case, the
   spoken fixes for the Maori place names, punctuation folded) - the twin of
   the TS package's `normalizeInput` / `applySpokenFixes`, pinned against it
   by `tests/test_address_resolve.py`.
2. **Read the number** the way a courier says it: "fifty seven" (a tens word
   and its unit), "one eight five" (a number spelled digit by digit),
   "twelve thirteen" and "seven no sorry seventeen" (a correction - the LAST
   number the courier gave wins), "one twenty" (the hundreds digit).
3. **Find the street** in the committed Canterbury index
   (`packages/eval/voice/data/canterbury-streets.json`, built by
   `scripts/eval/build-street-index.mjs` from the LINZ address rows) with a
   fuzzy and phonetic fold, so a name the recognizer mis-heard still lands on
   the road it meant.
4. **Attach the suburb** from the road's OWN suburb list - the LINZ spelling,
   which is what the gold answer carries.

What is tuned here is the matcher: the thresholds, the phonetic fold, the
number-word rule. What is NOT tuned is the index - it is Canterbury's road
list, the product's data, and a held-out street is in it for the same reason
the backend's own tables carry it. No street name appears in this module's
vocabulary; `tests/test_address_resolve.py` proves it.

Where the index comes from is a packaging decision, recorded: the index is the
6 799 distinct ROADS (~0.6 MB of JSON, ~0.1 MB as a git blob), NOT the 656 044
address rows (90 MB, gitignored build-local). An ON-DEVICE index is a named
follow-up lever; the measurement below runs against this committed road index.
"""

from __future__ import annotations

import json
import re
from dataclasses import dataclass
from functools import lru_cache
from pathlib import Path

#: The repository root, resolved from this file the way `app/eval_audio.py`
#: resolves it (app -> courier-voice -> services -> the repo), so the index is
#: found from anywhere the service is run.
REPO_ROOT = Path(__file__).resolve().parents[3]

#: The committed Canterbury street index.
INDEX_PATH = REPO_ROOT / "packages/eval/voice/data/canterbury-streets.json"

# ----------------------------------------------------------------- the twins

#: The number words, the twin of `packages/nz-address`'s `NUMBER_WORDS`
#: (`src/constants.ts`), pinned against it by the suite.
NUMBER_WORDS: dict[str, str] = {
    "zero": "0",
    "one": "1",
    "two": "2",
    "three": "3",
    "four": "4",
    "five": "5",
    "six": "6",
    "seven": "7",
    "eight": "8",
    "nine": "9",
    "ten": "10",
    "eleven": "11",
    "twelve": "12",
    "thirteen": "13",
    "fourteen": "14",
    "fifteen": "15",
    "sixteen": "16",
    "seventeen": "17",
    "eighteen": "18",
    "nineteen": "19",
    "twenty": "20",
    "thirty": "30",
    "forty": "40",
    "fifty": "50",
    "sixty": "60",
    "seventy": "70",
    "eighty": "80",
    "ninety": "90",
    "hundred": "100",
    "thousand": "1000",
}

#: The spoken fixes for the Maori place names, the twin of
#: `packages/nz-address`'s `MAORI_SPOKEN_FIXES` (`src/constants.ts`).
SPOKEN_FIXES: dict[str, str] = {
    "rick a ton": "Riccarton",
    "rickerton": "Riccarton",
    "ricarton": "Riccarton",
    "pap a new e": "Papanui",
    "papa newey": "Papanui",
    "papanui": "Papanui",
    "why my ree": "Waimairi",
    "waimairi": "Waimairi",
    "my ree howe": "Mairehau",
    "mairehau": "Mairehau",
    "shir lee": "Shirley",
    "shirley": "Shirley",
    "adderley": "Addington",
    "addington": "Addington",
    "hoon hay": "Hoon Hay",
    "hun hay": "Hoon Hay",
    "sock burn": "Sockburn",
    "sockburn": "Sockburn",
    "fendalton": "Fendalton",
    "fen dalton": "Fendalton",
    "ilam": "Ilam",
    "eye lam": "Ilam",
    "hornby": "Hornby",
    "horn bee": "Hornby",
    "bishopdale": "Bishopdale",
    "bishop dale": "Bishopdale",
    "burnside": "Burnside",
    "burn side": "Burnside",
    "avonhead": "Avonhead",
    "avon head": "Avonhead",
    "uppa hutt": "Upper Hutt",
    "upper hut": "Upper Hutt",
    "porirua": "Porirua",
    "pouri ru a": "Porirua",
    "wellington": "Wellington",
    "well ing ton": "Wellington",
    "aukland": "Auckland",
    "oakland": "Auckland",
}

#: The single digits, as words.
SINGLE_DIGITS = {word for word, digit in NUMBER_WORDS.items() if len(digit) == 1}

#: The teen words (ten .. nineteen), as words.
TEENS = {word for word, digit in NUMBER_WORDS.items() if digit in map(str, range(10, 20))}

#: The tens words (twenty .. ninety), as words.
TENS = {word for word, digit in NUMBER_WORDS.items() if len(digit) == 2 and digit.endswith("0")}

#: The scale words.
SCALES = {word: int(digit) for word, digit in NUMBER_WORDS.items() if len(digit) > 2}


def normalise(text: str) -> str:
    """The normalisation the schema and the resolver share.

    The twin of `packages/nz-address`'s `normalizeInput` plus
    `applySpokenFixes`: lower-case, punctuation folded to spaces, whitespace
    collapsed, then the Maori place-name fixes applied word by word.
    """
    folded = re.sub(r"[,.]", " ", text.lower().strip())
    collapsed = " ".join(folded.split())
    fixed = collapsed
    for spoken, correct in SPOKEN_FIXES.items():
        fixed = re.sub(rf"\b{re.escape(spoken)}\b", correct.lower(), fixed)
    return " ".join(fixed.split())


# ------------------------------------------------------------- the number


def spoken_number(tokens: list[str], start: int) -> tuple[int | None, int]:
    """The house number a run of spoken number tokens spells, and where it ends.

    Four forms, and the rule each one follows:

    - "fifty seven"      a tens word and its unit                -> 57
    - "one eight five"   a number spelled digit by digit        -> 185
    - "twelve thirteen"  two numbers in one run: a correction   -> the LAST one
    - "seven no sorry seventeen"  the separator ends the run, and the caller
      tries the next number position, which is the corrected one -> 17
    - "one twenty"       a digit before a tens word is the hundreds digit -> 120

    The correction rule is what the set's own `numbers_corrections` slice is
    made of, and it is the shape the offline brain cannot parse at all (the
    named `PARSER_GAP` of `app/eval_audio.py`).
    """
    at = start
    total = 0
    current = 0
    digits = ""
    previous = ""
    while at < len(tokens):
        token = tokens[at]
        if token in SINGLE_DIGITS or token.isdigit():
            said = NUMBER_WORDS.get(token, token)
            if token.isdigit() and len(token) > 1:
                # A multi-digit number REPLACES what came before it: "4/65" is
                # spoken "four sixty five" and the house number is 65, and a
                # written "185" is 185 whatever preceded it.
                current = int(token)
                previous = "big"
                at += 1
                continue
            if previous in ("", "digit"):
                digits += said
                current = int(digits)
                previous = "digit"
                at += 1
                continue
            if previous == "tens":
                # "fifty seven": the unit is added, not appended as a digit.
                current += int(said)
                previous = "tens_unit"
                at += 1
                continue
            # A digit after a teen or a scale is the next addend ("one hundred
            # five" -> 105).
            current += int(said)
            previous = "tens_unit"
            at += 1
            continue
        if token in TENS:
            if previous == "digit" and len(digits) == 1 and digits != "0":
                # "one twenty" is 120: the leading digit is the hundreds digit.
                current = int(digits) * 100 + int(NUMBER_WORDS[token])
            elif previous in ("", "digit", "teen", "tens", "tens_unit"):
                # A big word after another number REPLACES it: "twelve
                # thirteen" is 13, the number the courier settled on.
                current = int(NUMBER_WORDS[token])
            else:
                current += int(NUMBER_WORDS[token])
            previous = "tens"
            at += 1
            continue
        if token in TEENS:
            if previous in ("", "digit", "teen", "tens", "tens_unit"):
                current = int(NUMBER_WORDS[token])
            else:
                current += int(NUMBER_WORDS[token])
            previous = "teen"
            at += 1
            continue
        if token in SCALES:
            if token == "thousand":
                total += (current or 1) * SCALES[token]
                current = 0
            else:
                current = (current or 1) * SCALES[token]
            previous = "scale"
            at += 1
            continue
        break
    value = total + current
    return (value if value else None), at


# ------------------------------------------------------------ the matcher

#: The minimum similarity a name token must reach to be the same word.
TOKEN_FLOOR = 0.6

#: The minimum mean similarity of a street name for it to be a match.
STREET_FLOOR = 0.75

#: The similarity a phonetic fold alone can claim. A Soundex-equal pair is a
#: strong signal ("Poulson" and "Poleson" fold alike), so it scores above the
#: street floor and the edit-distance ratio is only ever a floor under it.
PHONETIC_SCORE = 0.8

#: The similarity the suburb must reach to be the road's own.
SUBURB_FLOOR = 0.8

_SOUNDEX_CODES = {
    "b": "1",
    "f": "1",
    "p": "1",
    "v": "1",
    "c": "2",
    "g": "2",
    "j": "2",
    "k": "2",
    "q": "2",
    "s": "2",
    "x": "2",
    "z": "2",
    "d": "3",
    "t": "3",
    "l": "4",
    "m": "5",
    "n": "5",
    "r": "6",
}


def soundex(token: str) -> str:
    """The Soundex fold of a word: the first letter and the shape of the rest.

    "Poulson" and "Poleson" fold alike, which is the phonetic half of the
    matcher. It never carries a street name - it is the algorithm, applied to
    whatever word it is handed.
    """
    letters = [character for character in token.lower() if character.isalpha()]
    if not letters:
        return ""
    code = _SOUNDEX_CODES.get(letters[0], "")
    out = letters[0].upper()
    for character in letters[1:]:
        if character in "aeiouyhw":
            code = ""
            continue
        digit = _SOUNDEX_CODES.get(character, "")
        if digit and digit != code:
            out += digit
        code = digit
    return (out + "000")[:4]


def _edit_distance(left: str, right: str, cap: int = 4) -> int:
    """The Levenshtein distance, bounded: `cap + 1` when it is further apart.

    A bounded distance is what keeps a 6 799-road index affordable: a pair
    further than `cap` apart cannot be the same word at our lengths, so the
    row is abandoned rather than finished.
    """
    if left == right:
        return 0
    if abs(len(left) - len(right)) > cap:
        return cap + 1
    previous_row = list(range(len(right) + 1))
    for row, left_character in enumerate(left, start=1):
        current_row = [row]
        for column, right_character in enumerate(right, start=1):
            current_row.append(
                min(
                    previous_row[column] + 1,
                    current_row[column - 1] + 1,
                    previous_row[column - 1] + (left_character != right_character),
                )
            )
        if min(current_row) > cap:
            return cap + 1
        previous_row = current_row
    return previous_row[-1]


def token_similarity(said: str, road: str) -> float:
    """How much two words are the same word: 1.0 exact, 0.0 not at all.

    An edit distance first, a phonetic fold second, and nothing at all for a
    pair of short tokens that merely looks close - "St" and "Sd" are not the
    same street because they are near each other.
    """
    if said == road:
        return 1.0
    if not said or not road:
        return 0.0
    if min(len(said), len(road)) < 3:
        # Two letters cannot carry a phonetic fold: "St" and "Sd" are not the
        # same street because they are near each other.
        return 0.0
    distance = _edit_distance(said, road)
    ratio = 1.0 - distance / max(len(said), len(road))
    if min(len(said), len(road)) >= 4 and soundex(said) == soundex(road):
        return max(ratio, PHONETIC_SCORE)
    return ratio if ratio >= TOKEN_FLOOR else 0.0


@dataclass(frozen=True)
class Road:
    """One road of the index, in the backend's key."""

    key: str
    road: str
    suburbs: tuple[str, ...]
    addresses: int

    @property
    def name_tokens(self) -> tuple[str, ...]:
        """The name without its street type: "poulson st" -> ("poulson",)."""
        return tuple(self.key.split(" ")[:-1]) if self.type_token else tuple(self.key.split(" "))

    @property
    def type_token(self) -> str:
        """The street type the key ends with, when it has one."""
        return self.key.split(" ")[-1]


@dataclass(frozen=True)
class ResolvedAddress:
    """The answer: a house number, a suffix, a street that exists and a suburb."""

    number: str
    suffix: str
    street_key: str
    street: str
    suburb: str
    confidence: float
    method: str

    def as_text(self) -> str:
        """The address the way the gold answer spells it."""
        head = self.number
        if self.suffix:
            head = f"{head} {self.suffix}"
        street = f"{head} {self.street}" if head else self.street
        return f"{street}, {self.suburb}" if self.suburb else street

    def matches(self, number: str, suffix: str, street: str, suburb: str) -> bool:
        """The exact match: number AND suffix AND street key AND suburb."""
        return (
            self.number == number
            and self.suffix.upper() == suffix.strip().upper()
            and self.street_key == _key_of(street)
            and self.suburb.strip().lower() == suburb.strip().lower()
        )


class StreetIndex:
    """The committed Canterbury road list, with the lookups the resolver needs.

    `addresses` is the OPTIONAL second table: for the roads that run through
    more than one suburb, the house number itself says which suburb the
    address is in ("17 Highfield Road" is in Charing Cross, whatever the
    recognizer did to the word after it). It is read from the LINZ address
    rows at measurement time, never committed: the full table is 656 044 rows
    and the committed index is the 6 799 road names. See the packaging
    decision in the evidence.
    """

    def __init__(
        self,
        roads: list[Road],
        abbreviations: dict[str, str],
        addresses: dict[str, dict[str, str]] | None = None,
    ) -> None:
        self._roads = tuple(roads)
        self.abbreviations = abbreviations
        self._by_key = {road.key: road for road in self._roads}
        self._addresses = addresses or {}
        # The candidate pools: a spoken street type folds to one abbreviation,
        # so the pool for "street" is the pool for "st".
        self._by_type: dict[str, tuple[Road, ...]] = {}
        for road in self._roads:
            self._by_type.setdefault(road.type_token, ())
            self._by_type[road.type_token] += (road,)

    @property
    def roads(self) -> int:
        """How many roads the index carries."""
        return len(self._roads)

    def fold(self, said: str) -> str | None:
        """The street type a spoken word folds to ("street" -> "st").

        None when the word is not a street type at all, which is how the
        resolver knows where a street name ends.
        """
        return self.abbreviations.get(said, said if said in self._by_type else None)

    def has(self, road: str) -> bool:
        """Whether the index carries a road, by its key or its spelling."""
        return _key_of(road) in self._by_key

    def road_of(self, key: str) -> Road | None:
        """The road behind a key, when the index carries it."""
        return self._by_key.get(key)

    def roads_with_more_than_one_suburb(self) -> list[Road]:
        """The roads the speech alone cannot settle."""
        return [road for road in self._roads if len(road.suburbs) > 1]

    def with_addresses(self, table: dict[str, dict[str, str]]) -> None:
        """Carry the address table of the ambiguous roads."""
        self._addresses = table

    def addresses_of(self, key: str) -> dict[str, str]:
        """The house numbers of a road and the suburb each one is in."""
        return self._addresses.get(key, {})

    def suburb_of(self, key: str) -> str:
        """The first suburb of a road, when it has one (the test's helper)."""
        road = self._by_key.get(key)
        return road.suburbs[0] if road and road.suburbs else ""

    def candidates(self, name_tokens: list[str], said_type: str) -> list[Road]:
        """The roads whose name has the same shape as the one that was said."""
        if said_type:
            folded = self.fold(said_type)
            pool = self._by_type.get(folded, ()) if folded else ()
        else:
            pool = self._roads
        return [road for road in pool if len(road.name_tokens) == len(name_tokens)]

    def best(self, name_tokens: list[str], said_type: str) -> tuple[Road | None, float]:
        """The road a spoken street name means, and how well it means it.

        Every candidate is scored token by token; a token that does not match
        at all disqualifies the road, because "poulson terrace" is not
        "poulson street" with one wrong word - it is a different street.
        """
        best_road: Road | None = None
        best_score = 0.0
        for road in self.candidates(name_tokens, said_type):
            scores = [
                token_similarity(said, token)
                for said, token in zip(name_tokens, road.name_tokens, strict=True)
            ]
            if not scores or min(scores) <= 0.0:
                continue
            score = sum(scores) / len(scores)
            if score > best_score or (
                score == best_score
                and best_road is not None
                and (road.addresses, road.key) > (best_road.addresses, best_road.key)
            ):
                best_road = road
                best_score = score
        return best_road, best_score


def _key_of(road: str) -> str:
    """A road spelling or key, as the index keys it (the backend's road_key)."""
    text = re.sub(r"[^a-z0-9 ]+", " ", road.lower()).strip()
    tokens = text.split()
    if not tokens:
        return ""
    abbreviations = _abbreviations_from_disk()
    if tokens[-1] in abbreviations:
        tokens[-1] = abbreviations[tokens[-1]]
    return " ".join(tokens)


@lru_cache(maxsize=1)
def _abbreviations_from_disk() -> dict[str, str]:
    """The abbreviation map, from the committed index when it is on disk.

    Cached once: the map is the road_key table, it changes with the index and
    nothing else, and reading it per comparison would re-read 0.6 MB per
    address.
    """
    if INDEX_PATH.exists():
        document = json.loads(INDEX_PATH.read_text(encoding="utf-8"))
        return {str(key): str(value) for key, value in document["abbreviations"].items()}
    return {}


def load_index(path: Path | None = None, linz_dir: Path | None = None) -> StreetIndex:
    """The committed Canterbury street index, read from disk.

    `linz_dir` adds the address table of the roads the index cannot
    disambiguate on its own (see `read_address_table`).
    """
    target = Path(path) if path is not None else INDEX_PATH
    document = json.loads(target.read_text(encoding="utf-8"))
    roads = [
        Road(
            key=str(row["key"]),
            road=str(row["road"]),
            suburbs=tuple(str(suburb) for suburb in row["suburbs"]),
            addresses=int(row.get("addresses", 0)),
        )
        for row in document["roads"]
    ]
    index = StreetIndex(roads, {str(k): str(v) for k, v in document["abbreviations"].items()})
    if linz_dir is not None:
        index.with_addresses(read_address_table(index, linz_dir))
    return index


def read_address_table(index: StreetIndex, linz_dir: Path) -> dict[str, dict[str, str]]:
    """The house numbers of the multi-suburb roads, from the LINZ address rows.

    The LINZ files are gitignored build-local data (data/linz, read-only), so
    this is a MEASUREMENT-time table and never a committed one: the committed
    index carries the road names, and the packaging decision in the evidence
    records what an on-device index would have to carry instead.
    """
    ambiguous = {road.key for road in index.roads_with_more_than_one_suburb()}
    table: dict[str, dict[str, str]] = {}
    for path in sorted(Path(linz_dir).glob("addresses-*.jsonl")):
        with Path(path).open(encoding="utf-8") as handle:
            for line in handle:
                if not line.strip():
                    continue
                row = json.loads(line)
                key = _key_of(str(row.get("road") or ""))
                if key not in ambiguous:
                    continue
                number = f"{row.get('number') or ''}{row.get('suffix') or ''}"
                table.setdefault(key, {}).setdefault(number, str(row.get("suburb") or ""))
    return table


# ------------------------------------------------------------- the resolve

#: The most name tokens a street name can have before the search gives up.
MAX_NAME_TOKENS = 4

#: The confidence weights: the street, the suburb, and whether a house number
#: was read at all. An exact match of all three is 1.0.
STREET_WEIGHT = 0.6
SUBURB_WEIGHT = 0.25
NUMBER_WEIGHT = 0.15


def _suburb_answer(tail: list[str], road: Road) -> tuple[str, float]:
    """The suburb of a road, from the words that followed its street type.

    The tail is matched against the road's OWN suburbs, longest first, because
    the suburb is the last thing said and the words before it may be noise the
    recognizer added. A road that runs through one suburb answers that suburb
    even when nothing recognisable was said after it.
    """
    for size in range(len(tail), 0, -1):
        for start in range(len(tail) - size + 1):
            said = tail[start : start + size]
            for suburb in road.suburbs:
                if " ".join(said) == suburb.lower():
                    return suburb, 1.0
            for suburb in road.suburbs:
                words = suburb.lower().split()
                if len(words) != size:
                    continue
                scores = [token_similarity(a, b) for a, b in zip(said, words, strict=True)]
                if scores and min(scores) >= SUBURB_FLOOR:
                    return suburb, SUBURB_FLOOR
    if len(road.suburbs) == 1:
        return road.suburbs[0], 0.6
    return "", 0.0


def _suburb_from_the_number(road: Road, number: str, index: StreetIndex) -> tuple[str, float]:
    """The suburb the house number says, for a road with more than one.

    A road that runs through several suburbs is the one case the speech alone
    cannot settle, and the house number settles it: LINZ carries which
    suburb each address of the road is in. Asked for only when nothing was
    said after the street type, so it never overrides what was said.
    """
    table = index.addresses_of(road.key)
    if not table:
        return "", 0.0
    suburb = table.get(number)
    if suburb is None:
        return "", 0.0
    return suburb, 0.85


def _tokens_of(text: str, fixes: bool = True) -> list[str]:
    """The address text as tokens, with a number and its letter split apart.

    "57b" becomes ["57", "b"], because a spoken number and its unit suffix
    arrive as separate words, and a written separator ("4/65 Carlton Mill
    Road") folds to a space, because the voice reads it as a pause and the
    house number is the LAST number before the street.

    `fixes` chooses between the two token streams the resolver reads: with
    the Maori place-name fixes applied (so "rick a ton" reaches the suburb
    list as "riccarton") and without them (so "adderley tce" stays a street
    name instead of being rewritten into "addington"). The fixes are place
    names, never street names, and a street that happens to share a fix's
    spelling has to survive the rewrite.
    """
    folded = re.sub(r"[,./]", " ", text.lower().strip())
    collapsed = " ".join(folded.split())
    if fixes:
        fixed = collapsed
        for spoken, correct in SPOKEN_FIXES.items():
            fixed = re.sub(rf"\b{re.escape(spoken)}\b", correct.lower(), fixed)
        collapsed = " ".join(fixed.split())
    tokens = collapsed.split()
    pieces: list[str] = []
    for token in tokens:
        match = re.fullmatch(r"(\d+)([a-z])", token)
        if match:
            pieces.extend([match.group(1), match.group(2)])
            continue
        # A written road number ("SH1") is spelled out letter by letter, so it
        # is split into the letters and the number the voice would say.
        road_number = re.fullmatch(r"([a-z]{2,})(\d+)", token)
        if road_number:
            pieces.extend([*road_number.group(1), road_number.group(2)])
            continue
        # A slash is a word the voice says, and a word in the written form:
        # "two slash fourteen" and "4/65" are the same address.
        if token == "/":
            pieces.append("slash")
            continue
        pieces.append(token)
    return pieces


def resolve(text: str, index: StreetIndex) -> ResolvedAddress | None:
    """The address a hypothesis carries, or None when it carries none.

    Every number position in the text is tried, because a courier corrects
    himself mid-sentence ("seven no sorry seventeen alford forest road") and
    the corrected number is the second one. Every name length is tried,
    because a single letter after the number is usually the unit suffix ("76 a
    aitken street") and occasionally the first letter of the street name.
    """
    best: ResolvedAddress | None = None
    best_rank = (-1.0, -1.0, 0)
    for fixes in (True, False):
        answer = _resolve_tokens(_tokens_of(text, fixes), index)
        if answer is not None and _rank(answer, index) > best_rank:
            best = answer
            best_rank = _rank(answer, index)
    if best is not None:
        return best
    # Nothing matched with a street type spoken: the recognizer may have
    # dropped it, so the name has to stand on its own.
    for fixes in (True, False):
        answer = _resolve_without_a_street_type(_tokens_of(text, fixes), index)
        if answer is not None:
            return answer
    return None


def _rank(answer: ResolvedAddress, index: StreetIndex) -> tuple[float, float, int]:
    """The order two answers are read in: street, then suburb, then how
    common the road is (a tie-break, never a fit)."""
    road = index.road_of(answer.street_key)
    return (
        answer.confidence,
        1.0 if answer.method == "exact" else 0.0,
        road.addresses if road else 0,
    )


def _resolve_tokens(tokens: list[str], index: StreetIndex) -> ResolvedAddress | None:
    """One token stream, every number position, every name length."""
    if not tokens:
        return None
    best: ResolvedAddress | None = None
    best_rank = (-1.0, -1.0, 0)
    for at, token in enumerate(tokens):
        if not _starts_a_number(token):
            continue
        number, end = spoken_number(tokens, at)
        if number is None or number <= 0:
            continue
        said_number = _road_number_prefix(tokens, at) + str(number)
        cursor = end
        if _is_a_slash(tokens, end) and end + 1 < len(tokens):
            # "2/14 Thompsons Track" is said "two slash fourteen": one number
            # with a slash in it, the way LINZ spells it.
            unit, cursor = spoken_number(tokens, end + 1)
            if unit is not None:
                said_number = f"{said_number}/{unit}"
        for suffix, name_start in (
            ("", cursor),
            (tokens[cursor] if _is_a_letter(tokens, cursor) else "", cursor + 1),
        ):
            if not suffix and name_start != cursor:
                continue
            for length in range(1, MAX_NAME_TOKENS + 1):
                if name_start + length >= len(tokens):
                    break
                name = tokens[name_start : name_start + length]
                if any(_is_a_number_word(word) for word in name):
                    continue
                said_type = tokens[name_start + length]
                if not index.fold(said_type):
                    continue
                road, score = index.best(name, said_type)
                if road is None or score < STREET_FLOOR:
                    continue
                tail = tokens[name_start + length + 1 :]
                suburb, suburb_score = _suburb_answer(tail, road)
                if not suburb:
                    suburb, suburb_score = _suburb_from_the_number(road, said_number, index)
                confidence = round(
                    STREET_WEIGHT * score + SUBURB_WEIGHT * suburb_score + NUMBER_WEIGHT, 4
                )
                # The street, then the number (the earliest reading of a run
                # of number words is the number - "one eight five" is 185, not
                # the 5 a later position would re-read), then the suburb, then
                # how common the road is.
                rank = (score, -at, suburb_score, road.addresses)
                if rank <= best_rank:
                    continue
                best_rank = rank
                best = ResolvedAddress(
                    number=said_number,
                    suffix=suffix,
                    street_key=road.key,
                    street=road.road,
                    suburb=suburb,
                    confidence=confidence,
                    method="exact" if score == 1.0 else "fuzzy",
                )
    return best


def _is_a_slash(tokens: list[str], at: int) -> bool:
    """Whether a token is the slash between a unit and a house number."""
    return at < len(tokens) and tokens[at] == "slash"


def _road_number_prefix(tokens: list[str], at: int) -> str:
    """The letters a spoken road number is spelled with, when it is.

    A rural Canterbury address is "SH1 MacMillan Avenue", and a courier says
    it "S H one MacMillan Avenue". Two or more single letters before the
    number are that prefix, not a unit and not a street name.
    """
    letters: list[str] = []
    walk = at - 1
    while walk >= 0 and len(tokens[walk]) == 1 and tokens[walk].isalpha():
        letters.insert(0, tokens[walk].upper())
        walk -= 1
    return "".join(letters) if len(letters) >= 2 else ""


def _is_a_letter(tokens: list[str], at: int) -> bool:
    return at < len(tokens) and len(tokens[at]) == 1 and tokens[at].isalpha()


def _starts_a_number(token: str) -> bool:
    """Whether a token can begin a house number."""
    return token in NUMBER_WORDS or token.isdigit()


def _is_a_number_word(token: str) -> bool:
    return token in NUMBER_WORDS


def _resolve_without_a_street_type(tokens: list[str], index: StreetIndex) -> ResolvedAddress | None:
    """The fallback: a street type the recognizer dropped entirely.

    Weaker by design - the name has to stand on its own - so it asks for the
    name to be an exact match and a house number to have been read.
    """
    for at, token in enumerate(tokens):
        if not _starts_a_number(token):
            continue
        number, end = spoken_number(tokens, at)
        if number is None or number <= 0:
            continue
        for length in range(1, MAX_NAME_TOKENS + 1):
            if end + length > len(tokens):
                break
            name = tokens[end : end + length]
            if any(_is_a_number_word(word) for word in name):
                continue
            road, score = index.best(name, "")
            if road is None or score < 1.0 or not road.type_token:
                continue
            if road.type_token in index.abbreviations:
                # A key ending in a street type with no type word spoken is a
                # different street from the one said; the type is the evidence.
                continue
            tail = tokens[end + length :]
            suburb, suburb_score = _suburb_answer(tail, road)
            if not suburb:
                suburb, suburb_score = _suburb_from_the_number(road, str(number), index)
            return ResolvedAddress(
                number=str(number),
                suffix="",
                street_key=road.key,
                street=road.road,
                suburb=suburb,
                confidence=round(STREET_WEIGHT + SUBURB_WEIGHT * suburb_score + NUMBER_WEIGHT, 4),
                method="exact",
            )
    return None

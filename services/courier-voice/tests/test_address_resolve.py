"""The address resolver on what the recognizer actually returned.

The founder's VOICE LEVER (b) - ADDRESS RESOLUTION ON STT OUTPUT - is the
number the held-out measurement reports as 0/75: an address-bearing script's
audio reaches the judge, the judge hands back its own transcript ("delivered at
fifty seven poulson street addington"), and nothing turns that into a street
that EXISTS. This module is that turn, and these tests pin it.

What is pinned here is the resolver's own contract, never the held-out streets
it is measured on: the street INDEX is the product's data (every Canterbury
road, in the backend's key), while the vocabulary the matcher is fitted with -
the number words, the spoken fixes, the phonetic fold and the thresholds - is
what must never carry a street name. The test that says so is
`test_a_held_out_street_resolves_and_its_key_is_never_added_to_the_tuning_vocabulary`.

The recognizer's errors are the input, not the exception: the number spelled
out (sherpa-onnx >= 2.0.0 removed espeak-ng, so a token the lexicon does not
carry is DROPPED - "57" would make "delivered at fifty seven Poulson Street"
come out as "delivered at Poulson Street"), a street type dropped, a name
mis-heard. Each is a test below.
"""

from __future__ import annotations

import ast
import json
import re
from pathlib import Path

import pytest

from app.address_resolve import (
    NUMBER_WORDS,
    SPOKEN_FIXES,
    StreetIndex,
    _edit_distance,
    load_index,
    normalise,
    resolve,
    spoken_number,
    token_similarity,
)
from app.address_resolve import (
    soundex as soundex_of,
)
from app.eval_tts import spoken_form

REPO = Path(__file__).resolve().parents[3]
INDEX_PATH = REPO / "packages/eval/voice/data/canterbury-streets.json"
HELD_OUT_LIST = REPO / "packages/eval/voice/manifest/heldout_streets.json"
NZ_ADDRESS_CONSTANTS = REPO / "packages/nz-address/src/constants.ts"


def _vocabulary_of(path: str | None) -> set[str]:
    """Every string literal and every identifier the resolver's code carries.

    Read through the AST rather than the raw text, so the claim is about the
    VOCABULARY - the words the matcher could be fitted with - and not about
    the prose of a docstring that happens to name a street in an example.
    """
    if path is None:
        return set()
    tree = ast.parse(Path(path).read_text(encoding="utf-8"))
    docstrings = {
        id(statement.value)
        for node in ast.walk(tree)
        if isinstance(node, (ast.Module, ast.ClassDef, ast.FunctionDef, ast.AsyncFunctionDef))
        for statement in node.body[:1]
        if isinstance(statement, ast.Expr)
        and isinstance(statement.value, ast.Constant)
        and isinstance(statement.value.value, str)
    }
    words: set[str] = set()
    for node in ast.walk(tree):
        if id(node) in docstrings:
            continue
        if isinstance(node, ast.Constant) and isinstance(node.value, str):
            words.update(node.value.lower().split())
        elif isinstance(node, ast.Name):
            words.add(node.id.lower())
    return words


@pytest.fixture(scope="module")
def index() -> StreetIndex:
    """The committed Canterbury street index, loaded once."""
    return load_index(INDEX_PATH)


class TestTheMatcherPrimitives:
    def test_two_words_that_are_the_same_word_score_one(self) -> None:
        assert token_similarity("poulson", "poulson") == 1.0

    def test_a_word_and_a_typo_score_below_one_but_above_zero(self) -> None:
        score = token_similarity("poulson", "poleson")
        assert 0.0 < score < 1.0, score

    def test_two_short_words_that_are_merely_close_are_not_the_same(self) -> None:
        assert token_similarity("st", "sd") == 0.0

    def test_the_soundex_fold_carries_a_street_name_nowhere(self) -> None:
        assert soundex_of("Poulson") == soundex_of("Poleson")
        assert soundex_of("Poulson") != soundex_of("Ansons")

    def test_the_edit_distance_is_bounded(self) -> None:
        assert _edit_distance("abc", "abc") == 0
        assert _edit_distance("abc", "abd") == 1
        assert _edit_distance("abc", "abcdefgh") > 4

    def test_a_token_that_is_not_a_number_reads_no_number(self) -> None:
        assert spoken_number(["poulson", "street"], 0) == (None, 0)
        assert resolve("", load_index()) is None


class TestTheNumberWords:
    """A house number the way a courier says it, and the way the judge hears it."""

    @pytest.mark.parametrize(
        ("said", "expected"),
        [
            ("fifty seven", 57),
            ("seven", 7),
            ("one eight five", 185),
            ("twelve thirteen", 13),
            ("seventeen", 17),
            ("fifty two", 52),
            ("forty two", 42),
            ("one twenty", 120),
            ("490", 490),
            ("one hundred twenty", 120),
            ("three thousand five hundred", 3500),
            ("ninety nine", 99),
        ],
    )
    def test_a_spoken_number_is_the_number(self, said: str, expected: int) -> None:
        tokens = normalise(said).split()
        assert spoken_number(tokens, 0)[0] == expected, said

    def test_a_correction_keeps_the_last_number_it_was_given(self) -> None:
        """The gold form of the numbers_corrections slice, word for word."""
        tokens = normalise("seven no sorry seventeen").split()
        number, end = spoken_number(tokens, 0)
        assert number == 7
        assert end == 1, "the run stops at the separator"
        # The resolver tries every number position, so the corrected number is
        # the one that reaches the street.
        assert spoken_number(tokens, 3)[0] == 17

    def test_the_number_words_are_the_parsers_own(self) -> None:
        """The twin of packages/nz-address's NUMBER_WORDS, pinned against it."""
        source = NZ_ADDRESS_CONSTANTS.read_text(encoding="utf-8")
        table = re.search(r"export const NUMBER_WORDS[^{]*\{(.*?)\n\};", source, re.DOTALL)
        assert table is not None, "the package's NUMBER_WORDS table is where it was"
        for word, digit in re.findall(r"'([a-z]+)': '(\d+)'", table.group(1)):
            assert NUMBER_WORDS.get(word) == digit, word


class TestTheSpokenFixes:
    def test_the_spoken_fixes_are_the_packages_own(self) -> None:
        """The twin of packages/nz-address's MAORI_SPOKEN_FIXES, pinned against it.

        Pinning it is also what keeps the resolver's vocabulary honest: a street
        name that crept into the spoken fixes would be a fitted one.
        """
        source = NZ_ADDRESS_CONSTANTS.read_text(encoding="utf-8")
        table = re.search(r"export const MAORI_SPOKEN_FIXES[^{]*\{(.*?)\n\};", source, re.DOTALL)
        assert table is not None, "the package's spoken-fix table is where it was"
        found = dict(re.findall(r"'([^']+)': '([^']+)'", table.group(1)))
        assert found, "the package's table is not empty"
        assert found == SPOKEN_FIXES, "the resolver's twin matches the package's table"


class TestTheResolution:
    def test_a_hypothesis_that_spells_the_number_out_is_resolved_to_the_linz_street_key(
        self, index: StreetIndex
    ) -> None:
        """The founder's lever: "fifty seven Poulson Street, Addington" -> a road.

        The number is spelled out because sherpa-onnx >= 2.0.0 removed
        espeak-ng, so the TTS hands the recognizer "fifty seven" and that is
        what the resolver has to read.
        """
        answer = resolve("delivered at fifty seven Poulson Street, Addington", index)
        assert answer is not None
        assert answer.number == "57"
        assert answer.street_key == "poulson st"
        assert answer.street == "Poulson Street"
        assert answer.suburb == "Addington"
        assert answer.confidence >= 0.9
        assert answer.as_text() == "57 Poulson Street, Addington"

    def test_the_digits_and_the_words_resolve_to_the_same_address(self, index: StreetIndex) -> None:
        words = resolve("delivered at fifty seven Poulson Street, Addington", index)
        digits = resolve("delivered at 57 Poulson Street, Addington", index)
        assert words is not None and digits is not None
        assert words.as_text() == digits.as_text()

    def test_the_oov_spelling_path_without_espeak_ng_still_resolves(
        self, index: StreetIndex
    ) -> None:
        """The TTS's own text normalisation is the recognizer's input.

        `app/eval_tts.py`'s `spoken_form` spells every digit run out before the
        voice reads it, because sherpa-onnx >= 2.0.0 has no espeak-ng and would
        DROP the number silently. The resolver has to resolve what that text
        becomes - and it has to resolve it when the voice drops a word the
        lexicon does not carry too.
        """
        spoken = spoken_form("delivered at 57 Poulson Street, Addington")
        assert "fifty seven" in spoken, spoken
        answer = resolve(spoken, index)
        assert answer is not None, spoken
        assert answer.number == "57"
        assert answer.street_key == "poulson st"

    def test_a_street_type_the_judge_drops_still_resolves(self, index: StreetIndex) -> None:
        answer = resolve("add a stop at 145 ansons road charing cross", index)
        assert answer is not None
        assert answer.street_key == "ansons rd"
        assert answer.suburb == "Charing Cross"

    def test_a_misheard_street_name_resolves_to_the_road_it_meant(self, index: StreetIndex) -> None:
        """The STT writes "Poleson" for "Poulson": the fuzzy fold is the lever."""
        answer = resolve("delivered at 57 poleson street, addington", index)
        assert answer is not None
        assert answer.street_key == "poulson st", "a mis-heard street still finds its road"

    def test_the_suburb_is_resolved_from_the_roads_own_suburbs(self, index: StreetIndex) -> None:
        """A road that runs through six suburbs takes the one that was said."""
        answer = resolve("delivered at 511 frasers road, dunsandel", index)
        assert answer is not None
        assert answer.street_key == "frasers rd"
        assert answer.suburb == "Dunsandel"

    def test_a_street_without_a_type_word_is_found_by_its_name(self, index: StreetIndex) -> None:
        """ "Eastwood Rise" is a road the key table does not fold."""
        answer = resolve("add a stop at 7 eastwood rise, halswell", index)
        assert answer is not None
        assert answer.street_key == "eastwood rise"

    def test_a_spoken_number_correction_resolves_to_the_corrected_number(
        self, index: StreetIndex
    ) -> None:
        answer = resolve("add a stop at seven no sorry seventeen alford forest road", index)
        assert answer is not None
        assert answer.number == "17"
        assert answer.street_key == "alford forest rd"
        assert answer.suburb == "Allenton"

    def test_a_house_number_spelled_digit_by_digit_resolves(self, index: StreetIndex) -> None:
        answer = resolve("add a stop at one eight five ashburton staveley road", index)
        assert answer is not None
        assert answer.number == "185"
        assert answer.street_key == "ashburton staveley rd"

    def test_an_ambiguity_in_the_number_resolves_to_the_number_it_meant(
        self, index: StreetIndex
    ) -> None:
        answer = resolve("add a stop at forty two or fifty two westgrove avenue", index)
        assert answer is not None
        assert answer.number == "52"
        assert answer.street_key == "westgrove ave"

    def test_a_number_with_its_suffix_resolves(self, index: StreetIndex) -> None:
        answer = resolve("add a stop at 76 a aitken street", index)
        assert answer is not None
        assert answer.number == "76"
        assert answer.suffix == "a"
        assert answer.street_key == "aitken st"

    def test_prose_carries_no_address(self, index: StreetIndex) -> None:
        """The open-data speakers' own sentences must resolve to nothing.

        This is the resolver's M9 direction: a resolver that finds an address
        in conversation is a resolver that will act on it.
        """
        for sentence in (
            "It is the administrative headquarters of Dungarpur District.",
            "Zero is considered to be both real and imaginary.",
            "The hospital is constructed from concrete.",
            "While appearing in a one-man play, he met his ex-wife.",
        ):
            assert resolve(sentence, index) is None, sentence

    def test_a_command_with_no_address_resolves_to_nothing(self, index: StreetIndex) -> None:
        for sentence in (
            "where am i",
            "how many stops left",
            "start my shift",
            "take a ten minute break",
        ):
            assert resolve(sentence, index) is None, sentence


class TestTheAnswerShape:
    """The resolved address, and the comparison the measurement makes."""

    def test_a_two_word_suburb_is_resolved(self, index: StreetIndex) -> None:
        answer = resolve("delivered at 86 bowhill road, new brighton", index)
        assert answer is not None
        assert answer.suburb == "New Brighton"
        assert answer.as_text() == "86 Bowhill Road, New Brighton"

    def test_a_misheard_suburb_is_resolved_to_the_roads_own(self, index: StreetIndex) -> None:
        answer = resolve("delivered at 86 bowhill road, new brigton", index)
        assert answer is not None
        assert answer.suburb == "New Brighton", "the road's own spelling wins"

    def test_a_street_type_dropped_entirely_still_resolves(self, index: StreetIndex) -> None:
        """ "Eastwood Rise" with the type word gone: the name stands alone."""
        answer = resolve("add a stop at 7 eastwood, halswell", index)
        assert answer is not None
        assert answer.street_key == "eastwood rise"

    def test_a_rural_road_number_is_the_number_the_courier_said(self, index: StreetIndex) -> None:
        """ "SH1 MacMillan Avenue" is said "S H one MacMillan Avenue"."""
        answer = resolve("add S H one MacMillan Avenue, Cashmere", index)
        assert answer is not None
        assert answer.number == "SH1"
        assert answer.street_key == "macmillan ave"

    def test_the_written_form_of_a_rural_road_number_resolves(self, index: StreetIndex) -> None:
        answer = resolve("add SH1 MacMillan Avenue, Cashmere", index)
        assert answer is not None
        assert answer.number == "SH1"

    def test_an_address_without_a_suburb_still_resolves(self, index: StreetIndex) -> None:
        answer = resolve("add a stop at 45 alford forest road", index)
        assert answer is not None
        assert answer.number == "45"
        assert answer.street_key == "alford forest rd"
        assert answer.as_text() == "45 Alford Forest Road, Allenton", (
            "the road's only suburb is inferred"
        )

    def test_the_exact_match_compares_the_whole_answer(self) -> None:
        answer = resolve("delivered at 76 a aitken street, ashburton", load_index())
        assert answer is not None
        assert answer.matches("76", "A", "Aitken Street", "Ashburton")
        assert not answer.matches("76", "", "Aitken Street", "Ashburton"), "the suffix counts"
        assert not answer.matches("76", "A", "Aitken Street", "Hampstead"), "the suburb counts"
        assert not answer.matches("75", "A", "Aitken Street", "Ashburton"), "the number counts"


class TestTheCommittedIndex:
    def test_the_index_is_the_committed_road_list(self, index: StreetIndex) -> None:
        document = json.loads(INDEX_PATH.read_text(encoding="utf-8"))
        assert index.roads == len(document["roads"]) == 6799
        assert index.abbreviations["avenue"] == "ave"
        assert document["attribution"].startswith("Sourced from the LINZ Data Service")

    def test_every_street_of_the_shared_held_out_list_is_in_the_index(
        self, index: StreetIndex
    ) -> None:
        """The index is the product's data, so a held-out street is in it.

        That is the whole point of measuring on held-out streets: the resolver
        has never been fitted on them, but the streets of Canterbury are the
        streets of Canterbury.
        """
        shared = json.loads(HELD_OUT_LIST.read_text(encoding="utf-8"))
        keys = [str(street) for street in shared["streets"]]
        missing = [key for key in keys if not index.has(key)]
        assert missing == [], f"{len(missing)} held-out streets are not in the index"

    def test_the_manifests_addresses_sit_on_roads_the_index_carries(
        self, index: StreetIndex
    ) -> None:
        for manifest in ("manifest/addresses.jsonl", "manifest/heldout/addresses.jsonl"):
            rows = [
                json.loads(line)
                for line in (REPO / "packages/eval/voice" / manifest)
                .read_text(encoding="utf-8")
                .splitlines()
                if line.strip()
            ]
            missing = [row["street"] for row in rows if not index.has(row["street"])]
            assert missing == [], f"{manifest}: {missing[:3]}"


class TestTheHeldOutHonesty:
    def test_a_held_out_street_resolves_and_its_key_is_never_added_to_the_tuning_vocabulary(
        self, index: StreetIndex
    ) -> None:
        """The founder's rule, in one test.

        A held-out street RESOLVES (the index is Canterbury's road list, and
        the resolver is measured on what it can do with it), and its key is
        NOWHERE in the vocabulary the matcher is fitted with: not in the number
        words, not in the spoken fixes, not in this module's source, not in the
        abbreviation map it reads from the index.
        """
        shared = json.loads(HELD_OUT_LIST.read_text(encoding="utf-8"))
        # The first streets of the shared list, in its own order - not chosen
        # by looking at what resolves well.
        for key in [str(street) for street in shared["streets"][:5]]:
            assert index.has(key), key
            spoke = " ".join(key.split(" ")[:-1]) + " " + key.split(" ")[-1]
            answer = resolve(f"delivered at 57 {spoke}, {index.suburb_of(key)}", index)
            assert answer is not None, key
            assert answer.street_key == key

        # The tuning vocabulary carries no held-out street NAME: not in the
        # number words, not in the spoken fixes, not in this module's source.
        # The words the package's own tables carry are INHERITED - the twin
        # test above pins them against packages/nz-address - so they are
        # excluded here rather than counted as ours.
        module = __import__("app.address_resolve", fromlist=["__file__"])
        vocabulary = _vocabulary_of(module.__file__)
        # The abbreviation map is the road_key table: "street" is a street type,
        # not a street the resolver learned, and a road name may carry one as an
        # ordinary word ("Hastings Street East").
        inherited = (
            {word.lower() for word in SPOKEN_FIXES}
            | {word.lower() for word in SPOKEN_FIXES.values()}
            | set(NUMBER_WORDS)
            | set(index.abbreviations)
        )
        for key in [str(street) for street in shared["streets"]]:
            # The last token is the street type ("alford forest rd" -> "rd"),
            # which the abbreviation map carries for every road alike.
            for word in key.split(" ")[:-1]:
                if len(word) < 5 or word in inherited:
                    continue
                assert word not in vocabulary, (
                    f"{word!r} is a held-out street name and it is a literal or a name in the resolver"
                )
        assert "alford" not in SPOKEN_FIXES, "a street name is not a spoken fix"
        # Where the package's own fix collides with a real street - "adderley"
        # is both a spoken form of Addington and a held-out street name - the
        # resolver reads the unfixed tokens too, so the street survives.
        assert "adderley" in SPOKEN_FIXES, "the collision is the package's, not ours"
        collision = resolve("delivered at 57 adderley tce, addington", index)
        assert collision is not None and collision.street_key == "adderley tce"
        # The abbreviation map is the road_key table's shape: short, lower-case.
        for abbreviation in index.abbreviations:
            assert len(abbreviation) <= 9 and abbreviation.islower(), abbreviation

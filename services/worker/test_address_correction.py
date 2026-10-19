"""
Tests for LINZ Address Correction Engine
"""

import pytest
import tempfile
import shutil
from pathlib import Path
import sys
sys.path.insert(0, str(Path(__file__).parent.parent))

from services.worker.address_correction import (
    LINZAddressCorrector, 
    NZAddress, 
    build_from_data_dir,
    _create_sample_database
)


@pytest.fixture
def temp_dir():
    """Create temporary directory for test database"""
    tmp = Path(tempfile.mkdtemp())
    yield tmp
    shutil.rmtree(tmp)


@pytest.fixture
def sample_db(temp_dir):
    """Create a sample database for testing"""
    _create_sample_database(temp_dir)
    return temp_dir / "nz_addresses.sqlite"


@pytest.fixture
def corrector(sample_db):
    """Create corrector with sample database"""
    return LINZAddressCorrector(Path("."), sample_db.parent)


class TestAddressNormalization:
    """Test input normalization with spoken fixes"""
    
    def test_riccarton_variations(self, corrector):
        assert corrector._normalize_input("rick a ton road") == "riccarton rd"
        assert corrector._normalize_input("rickerton road") == "riccarton rd"
        assert corrector._normalize_input("ricardton road") == "riccarton rd"
    
    def test_papanui_variations(self, corrector):
        assert corrector._normalize_input("papa newey road") == "papanui rd"
        assert corrector._normalize_input("pap a new e road") == "papanui rd"
    
    def test_mairehau_variations(self, corrector):
        assert corrector._normalize_input("my ree howe road") == "mairehau rd"
        assert corrector._normalize_input("my rehau road") == "mairehau rd"
    
    def test_fendalton_variations(self, corrector):
        assert corrector._normalize_input("far ken ham road") == "fendalton rd"
    
    def test_number_words(self, corrector):
        assert corrector._normalize_input("forty two main north road") == "42 main north rd"
        assert corrector._normalize_input("one four two riccarton road") == "142 riccarton rd"
        assert corrector._normalize_input("twenty five memorial avenue") == "25 memorial ave"
    
    def test_street_types(self, corrector):
        assert corrector._normalize_input("42 main north street") == "42 main north st"
        assert corrector._normalize_input("42 main north road") == "42 main north rd"
        assert corrector._normalize_input("42 main north drive") == "42 main north dr"
        assert corrector._normalize_input("42 main north avenue") == "42 main north ave"


class TestAddressCorrection:
    """Test address correction with sample database"""
    
    def test_exact_match(self, corrector):
        result = corrector.correct_address("42 Main North Rd, Papanui")
        assert result['valid'] is True
        assert result['linz_address_id'] == "1"
        assert result['confidence'] > 0.8
    
    def test_spoken_input(self, corrector):
        result = corrector.correct_address("forty two main north road papa newey")
        assert result['valid'] is True
        assert result['linz_address_id'] == "1"
        assert result['suburb'] == "Papanui"
    
    def test_with_unit(self, corrector):
        result = corrector.correct_address("2/14 Harewood Rd, Bishopdale")
        assert result['valid'] is True
        assert result['linz_address_id'] == "2"
        assert result['unit'] == "2"
    
    def test_number_suffix(self, corrector):
        result = corrector.correct_address("100B High St, Christchurch Central")
        assert result['valid'] is True
        assert result['linz_address_id'] == "3"
        assert "B" in result['number']
    
    def test_low_confidence_rejected(self, corrector):
        result = corrector.correct_address("xyz nonexistent street")
        assert result['valid'] is False
        assert result['confidence'] < 0.7
    
    def test_partial_address(self, corrector):
        result = corrector.correct_address("Memorial Avenue Burnside")
        # Should match with reasonable confidence
        assert result['valid'] is True or result['confidence'] > 0.3


class TestDatabaseBuilding:
    """Test database building from sample data"""
    
    def test_sample_db_creation(self, temp_dir):
        _create_sample_database(temp_dir)
        db_path = temp_dir / "nz_addresses.sqlite"
        assert db_path.exists()
        
        # Verify tables exist
        import sqlite3
        conn = sqlite3.connect(db_path)
        tables = conn.execute("SELECT name FROM sqlite_master WHERE type='table'").fetchall()
        table_names = [t[0] for t in tables]
        assert 'addresses' in table_names
        assert 'addresses_fts' in table_names
        conn.close()
    
    def test_sample_data_count(self, temp_dir):
        _create_sample_database(temp_dir)
        db_path = temp_dir / "nz_addresses.sqlite"
        
        import sqlite3
        conn = sqlite3.connect(db_path)
        count = conn.execute("SELECT COUNT(*) FROM addresses").fetchone()[0]
        assert count == 10  # Our sample has 10 addresses
        conn.close()
    
    def test_fts_search(self, corrector):
        results = corrector.find_candidates("riccarton", limit=5)
        assert len(results) > 0
        assert any("Riccarton" in r['suburb'] for r in results)
    
    def test_json_export(self, temp_dir):
        _create_sample_database(temp_dir)
        json_path = temp_dir / "nz_addresses.json"
        assert json_path.exists()
        
        import json
        with open(json_path) as f:
            data = json.load(f)
        assert len(data) == 10
        assert all('linz_address_id' in d for d in data)
        assert all('street' in d for d in data)
        assert all('suburb' in d for d in data)


class TestEdgeCases:
    """Test edge cases and error handling"""
    
    def test_empty_input(self, corrector):
        result = corrector.correct_address("")
        assert result['valid'] is False
    
    def test_whitespace_only(self, corrector):
        result = corrector.correct_address("   ")
        assert result['valid'] is False
    
    def test_case_insensitive(self, corrector):
        result1 = corrector.correct_address("42 MAIN NORTH RD, PAPANUI")
        result2 = corrector.correct_address("42 main north rd, papanui")
        assert result1['linz_address_id'] == result2['linz_address_id']
    
    def test_comma_variations(self, corrector):
        result1 = corrector.correct_address("42 Main North Rd Papanui")
        result2 = corrector.correct_address("42 Main North Rd, Papanui")
        assert result1['linz_address_id'] == result2['linz_address_id']


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
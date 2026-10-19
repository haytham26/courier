"""
LINZ Address Correction Engine
Builds offline SQLite FTS5 database from LINZ NZ Addresses data.
Used by services/worker for weekly rebuild and by mobile app for offline correction.
"""

import sqlite3
import json
import csv
import os
from pathlib import Path
from typing import Optional, List, Dict, Any
from dataclasses import dataclass
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


@dataclass
class NZAddress:
    """LINZ NZ Address record"""
    linz_address_id: str
    unit_value: Optional[str]
    street_number: str
    street_number_suffix: Optional[str]
    street_name: str
    street_type: str
    suburb: str
    city: str
    region: str
    postcode: str
    latitude: float
    longitude: float
    full_address: str
    search_text: str  # Precomputed for FTS


class LINZAddressCorrector:
    """Loads LINZ data, builds FTS5 index, provides address correction"""
    
    def __init__(self, data_dir: Path, output_dir: Path):
        self.data_dir = Path(data_dir)
        self.output_dir = Path(output_dir)
        self.output_dir.mkdir(parents=True, exist_ok=True)
        self.db_path = self.output_dir / "nz_addresses.sqlite"
        
    def load_linz_csv(self, csv_path: Path) -> List[NZAddress]:
        """Load LINZ NZ Addresses CSV export"""
        addresses = []
        logger.info(f"Loading LINZ data from {csv_path}")
        
        with open(csv_path, 'r', encoding='utf-8-sig') as f:
            # Detect delimiter
            sample = f.read(1024)
            f.seek(0)
            sniffer = csv.Sniffer()
            delimiter = sniffer.sniff(sample).delimiter
            
            reader = csv.DictReader(f, delimiter=delimiter)
            for row in reader:
                # Map LINZ columns to our schema
                # Expected columns: address_id, unit_value, street_number, street_number_suffix,
                # street_name, street_type, suburb, city, region, postcode, latitude, longitude
                addr = NZAddress(
                    linz_address_id=row.get('address_id', '').strip(),
                    unit_value=row.get('unit_value') or None,
                    street_number=row.get('street_number', '').strip(),
                    street_number_suffix=row.get('street_number_suffix') or None,
                    street_name=row.get('street_name', '').strip(),
                    street_type=row.get('street_type', '').strip(),
                    suburb=row.get('suburb', '').strip(),
                    city=row.get('city', '').strip(),
                    region=row.get('region', '').strip(),
                    postcode=row.get('postcode', '').strip(),
                    latitude=float(row.get('latitude', 0) or 0),
                    longitude=float(row.get('longitude', 0) or 0),
                    full_address='',
                    search_text=''
                )
                addr.full_address = self._build_full_address(addr)
                addr.search_text = self._build_search_text(addr)
                addresses.append(addr)
                
        logger.info(f"Loaded {len(addresses)} addresses")
        return addresses
    
    def _build_full_address(self, addr: NZAddress) -> str:
        """Build standardized full address string"""
        parts = []
        if addr.unit_value:
            parts.append(f"{addr.unit_value}/{addr.street_number}")
        else:
            parts.append(addr.street_number)
        if addr.street_number_suffix:
            parts[-1] += addr.street_number_suffix
        parts.append(f"{addr.street_name} {addr.street_type}")
        parts.append(addr.suburb)
        parts.append(addr.city)
        parts.append(addr.postcode)
        return ", ".join(parts)
    
    def _build_search_text(self, addr: NZAddress) -> str:
        """Build searchable text for FTS (lowercase, normalized)"""
        parts = []
        if addr.unit_value:
            parts.append(addr.unit_value)
        parts.append(addr.street_number)
        if addr.street_number_suffix:
            parts.append(addr.street_number_suffix)
        parts.append(addr.street_name.lower())
        parts.append(addr.street_type.lower())
        parts.append(addr.suburb.lower())
        parts.append(addr.city.lower())
        return " ".join(parts)
    
    def build_database(self, addresses: List[NZAddress]) -> None:
        """Build SQLite database with FTS5 table"""
        logger.info(f"Building database at {self.db_path}")
        
        # Remove existing
        if self.db_path.exists():
            self.db_path.unlink()
            
        conn = sqlite3.connect(self.db_path)
        conn.execute("PRAGMA journal_mode=WAL")
        conn.execute("PRAGMA synchronous=NORMAL")
        conn.execute("PRAGMA page_size=4096")
        
        # Main table
        conn.execute("""
            CREATE TABLE addresses (
                linz_address_id TEXT PRIMARY KEY,
                unit_value TEXT,
                street_number TEXT NOT NULL,
                street_number_suffix TEXT,
                street_name TEXT NOT NULL,
                street_type TEXT NOT NULL,
                suburb TEXT NOT NULL,
                city TEXT NOT NULL,
                region TEXT NOT NULL,
                postcode TEXT NOT NULL,
                latitude REAL NOT NULL,
                longitude REAL NOT NULL,
                full_address TEXT NOT NULL,
                search_text TEXT NOT NULL
            )
        """)
        
        # FTS5 virtual table for fast prefix search
        conn.execute("""
            CREATE VIRTUAL TABLE addresses_fts USING fts5(
                search_text,
                linz_address_id UNINDEXED,
                tokenize='porter unicode61'
            )
        """)
        
        # Indexes for common queries
        conn.execute("CREATE INDEX idx_suburb ON addresses(suburb)")
        conn.execute("CREATE INDEX idx_street ON addresses(street_name)")
        conn.execute("CREATE INDEX idx_postcode ON addresses(postcode)")
        conn.execute("CREATE INDEX idx_city ON addresses(city)")
        
        # Insert data
        logger.info("Inserting addresses...")
        batch_size = 10000
        for i in range(0, len(addresses), batch_size):
            batch = addresses[i:i+batch_size]
            conn.executemany("""
                INSERT INTO addresses VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """, [(a.linz_address_id, a.unit_value, a.street_number, a.street_number_suffix,
                   a.street_name, a.street_type, a.suburb, a.city, a.region, a.postcode,
                   a.latitude, a.longitude, a.full_address, a.search_text) for a in batch])
            
            conn.executemany("""
                INSERT INTO addresses_fts (search_text, linz_address_id) VALUES (?, ?)
            """, [(a.search_text, a.linz_address_id) for a in batch])
            
            conn.commit()
            logger.info(f"Inserted {min(i+batch_size, len(addresses))}/{len(addresses)}")
        
        # Verify
        count = conn.execute("SELECT COUNT(*) FROM addresses").fetchone()[0]
        fts_count = conn.execute("SELECT COUNT(*) FROM addresses_fts").fetchone()[0]
        logger.info(f"Database built: {count} addresses, {fts_count} FTS entries")
        
        conn.close()
    
    def find_candidates(self, query: str, limit: int = 10) -> List[Dict[str, Any]]:
        """Find address candidates using FTS5 prefix search"""
        if not query or not query.strip():
            return []
        
        # Escape FTS5 special characters
        escaped = query.replace('"', '""').replace('/', ' ').replace('-', ' ')
        
        conn = sqlite3.connect(self.db_path)
        conn.row_factory = sqlite3.Row
        
        # FTS5 prefix search with ranking
        try:
            results = conn.execute("""
                SELECT a.*, bm25(addresses_fts) as rank
                FROM addresses_fts
                JOIN addresses a ON addresses_fts.linz_address_id = a.linz_address_id
                WHERE addresses_fts MATCH ?
                ORDER BY rank
                LIMIT ?
            """, (f"{escaped}*", limit)).fetchall()
        except sqlite3.OperationalError:
            # Fallback: try without prefix if FTS5 syntax error
            results = conn.execute("""
                SELECT a.*, bm25(addresses_fts) as rank
                FROM addresses_fts
                JOIN addresses a ON addresses_fts.linz_address_id = a.linz_address_id
                WHERE addresses_fts MATCH ?
                ORDER BY rank
                LIMIT ?
            """, (escaped, limit)).fetchall()
        
        conn.close()
        return [dict(r) for r in results]
    
    def correct_address(self, raw_input: str, threshold: float = 0.7) -> Dict[str, Any]:
        """
        Correct a raw spoken/typed address to LINZ canonical form.
        Returns best match with confidence score.
        """
        # Normalize input
        normalized = self._normalize_input(raw_input)
        
        # Handle empty input
        if not normalized or not normalized.strip():
            return {
                'valid': False,
                'confidence': 0.0,
                'reason': 'Empty input',
                'raw_input': raw_input
            }
        
        # Search
        candidates = self.find_candidates(normalized, limit=5)
        
        if not candidates:
            return {
                'valid': False,
                'confidence': 0.0,
                'reason': 'No candidates found',
                'raw_input': raw_input
            }
        
        # Score candidates
        best = candidates[0]
        confidence = self._calculate_confidence(normalized, best)
        
        if confidence >= threshold:
            return {
                'valid': True,
                'linz_address_id': best['linz_address_id'],
                'corrected_address': best['full_address'],
                'confidence': confidence,
                'raw_input': raw_input,
                'unit': best['unit_value'],
                'number': best['street_number'] + (best['street_number_suffix'] or ''),
                'street': f"{best['street_name']} {best['street_type']}",
                'suburb': best['suburb'],
                'city': best['city'],
                'postcode': best['postcode'],
                'latitude': best['latitude'],
                'longitude': best['longitude']
            }
        else:
            return {
                'valid': False,
                'confidence': confidence,
                'reason': 'Below confidence threshold',
                'candidates': candidates[:3],
                'raw_input': raw_input
            }
    
    def _normalize_input(self, text: str) -> str:
        """Normalize spoken/typed input for search"""
        # Apply spoken fixes from nz-address package
        spoken_fixes = {
            'rick a ton': 'riccarton', 'rickerton': 'riccarton', 'ricardton': 'riccarton',
            'pap a new e': 'papanui', 'papa newey': 'papanui',
            'why my ree': 'waimairi', 'my ree howe': 'mairehau', 'my rehau': 'mairehau',
            'far ken ham': 'fendalton', 'pair a parker': 'paparoa', 'a ran ui': 'aranui',
            'shir lee': 'shirley', 'adderley': 'addington', 'hoon hay': 'hoon hay',
            'sock burn': 'sockburn', 'fen dalton': 'fendalton', 'eye lam': 'ilam',
            'horn bee': 'hornby', 'bishop dale': 'bishopdale', 'burn side': 'burnside',
            'avon head': 'avonhead', 'uppa hutt': 'upper hutt', 'pouri ru a': 'porirua',
            'well ing ton': 'wellington', 'aukland': 'auckland', 'oakland': 'auckland',
        }
        
        text = text.lower().strip()
        for wrong, right in spoken_fixes.items():
            text = text.replace(wrong, right)
        
        # Normalize street types
        street_type_map = {
            'street': 'st', 'st': 'st', 'road': 'rd', 'rd': 'rd', 'avenue': 'ave', 'ave': 'ave',
            'drive': 'dr', 'dr': 'dr', 'place': 'pl', 'pl': 'pl', 'crescent': 'cres', 'cres': 'cres',
            'terrace': 'tce', 'tce': 'tce', 'lane': 'ln', 'close': 'cl', 'court': 'ct', 'way': 'way',
            'grove': 'gr', 'mews': 'mews', 'quay': 'quay', 'parade': 'pde', 'highway': 'hwy',
        }
        
        # Convert number words - handle compound numbers like "forty two" -> "42"
        num_words = {
            'zero': '0', 'one': '1', 'two': '2', 'three': '3', 'four': '4', 'five': '5',
            'six': '6', 'seven': '7', 'eight': '8', 'nine': '9', 'ten': '10', 'eleven': '11',
            'twelve': '12', 'thirteenth': '13', 'fourteen': '14', 'fifteen': '15', 'sixteen': '16',
            'seventeen': '17', 'eighteen': '18', 'nineteen': '19', 'twenty': '20', 'thirty': '30',
            'forty': '40', 'fifty': '50', 'sixty': '60', 'seventy': '70', 'eighty': '80', 'ninety': '90',
        }
        
        # Compound tens mapping for "forty two" -> "42"
        compound_tens = {
            'twenty': 20, 'thirty': 30, 'forty': 40, 'fifty': 50,
            'sixty': 60, 'seventy': 70, 'eighty': 80, 'ninety': 90,
        }
        
        words = text.replace(',', ' ').replace('.', ' ').split()
        normalized_words = []
        i = 0
        while i < len(words):
            w = words[i]
            # Check for compound number: "forty two", "twenty one", etc.
            if w in compound_tens and i + 1 < len(words):
                next_word = words[i + 1]
                if next_word in num_words and len(num_words[next_word]) == 1:  # single digit
                    combined = compound_tens[w] + int(num_words[next_word])
                    normalized_words.append(str(combined))
                    i += 2
                    continue
            if w in street_type_map:
                normalized_words.append(street_type_map[w])
            elif w in num_words:
                normalized_words.append(num_words[w])
            else:
                normalized_words.append(w)
            i += 1
        
        # Join consecutive digits (e.g., "1 4 2" -> "142", "1 0 0" -> "100")
        # BUT preserve space between number and single-letter suffix (e.g., "100 B" not "100B")
        result = " ".join(normalized_words)
        import re
        
        # First, handle number + single letter suffix: "100b" -> "100 b" (insert space)
        # This handles cases like "100B" where user says "one zero zero B" or types "100B"
        result = re.sub(r'\b(\d+)([a-z])\b', r'\1 \2', result)
        
        # Also handle "100 B" -> keep as "100 B" (don't join)
        # This is already handled by the regex below not matching letter+digit combos
        
        # Join any sequence of numbers separated by spaces
        # Pattern: one or more digits, followed by (space + one or more digits) repeated
        def join_numbers(match):
            return match.group(0).replace(' ', '')
        
        # Apply repeatedly until no more changes
        prev = ""
        while prev != result:
            prev = result
            result = re.sub(r'\b(\d+)(?:\s+(\d+))+\b', join_numbers, result)
        return result
    
    def _calculate_confidence(self, query: str, candidate: Dict[str, Any]) -> float:
        """Calculate confidence score for a candidate match"""
        from difflib import SequenceMatcher
        
        candidate_text = candidate['search_text']
        # Simple ratio-based confidence
        ratio = SequenceMatcher(None, query, candidate_text).ratio()
        
        # Boost if all major components match
        query_parts = set(query.split())
        candidate_parts = set(candidate_text.split())
        overlap = len(query_parts & candidate_parts) / max(len(query_parts), 1)
        
        # Weighted combination
        confidence = 0.6 * ratio + 0.4 * overlap
        return round(confidence, 2)


def build_from_data_dir(data_dir: str = "data/linz", output_dir: str = "packages/nz-address/data") -> None:
    """Entry point to build address database from LINZ data directory"""
    data_path = Path(data_dir)
    output_path = Path(output_dir)
    
    # Look for LINZ CSV files
    csv_files = list(data_path.glob("*.csv")) + list(data_path.glob("*/*.csv"))
    
    if not csv_files:
        logger.warning(f"No CSV files found in {data_path}. Creating sample database for testing.")
        _create_sample_database(output_path)
        return
    
    # Use the largest CSV (likely the main addresses file)
    main_csv = max(csv_files, key=lambda f: f.stat().st_size)
    logger.info(f"Using main CSV: {main_csv}")
    
    corrector = LINZAddressCorrector(data_path, output_path)
    addresses = corrector.load_linz_csv(main_csv)
    corrector.build_database(addresses)
    
    # Also export as JSON for mobile app bundling
    _export_json(addresses, output_path / "nz_addresses.json")


def _create_sample_database(output_dir: Path) -> None:
    """Create a sample database for testing when LINZ data not available"""
    logger.info("Creating sample database for testing")
    
    sample_addresses = [
        NZAddress("1", None, "42", None, "Main North", "Rd", "Papanui", "Christchurch", "Canterbury", "8053", -43.489, 172.618, "", ""),
        NZAddress("2", "2", "14", None, "Harewood", "Rd", "Bishopdale", "Christchurch", "Canterbury", "8053", -43.482, 172.603, "", ""),
        NZAddress("3", None, "100", "B", "High", "St", "Christchurch Central", "Christchurch", "Canterbury", "8011", -43.531, 172.637, "", ""),
        NZAddress("4", None, "50", None, "Memorial", "Ave", "Burnside", "Christchurch", "Canterbury", "8053", -43.515, 172.598, "", ""),
        NZAddress("5", None, "25", None, "Waimairi", "Dr", "Waimairi", "Christchurch", "Canterbury", "8052", -43.502, 172.585, "", ""),
        NZAddress("6", "1", "200", "A", "Riccarton", "Rd", "Riccarton", "Christchurch", "Canterbury", "8041", -43.538, 172.602, "", ""),
        NZAddress("7", None, "35", None, "Fendalton", "Rd", "Fendalton", "Christchurch", "Canterbury", "8041", -43.521, 172.595, "", ""),
        NZAddress("8", None, "12", None, "Mairehau", "Rd", "Mairehau", "Christchurch", "Canterbury", "8013", -43.508, 172.645, "", ""),
        NZAddress("9", None, "78", None, "Shirley", "Rd", "Shirley", "Christchurch", "Canterbury", "8013", -43.505, 172.652, "", ""),
        NZAddress("10", "3", "88", None, "Hoon Hay", "Rd", "Hoon Hay", "Christchurch", "Canterbury", "8025", -43.558, 172.598, "", ""),
    ]
    
    for addr in sample_addresses:
        addr.full_address = LINZAddressCorrector(Path("."), Path("."))._build_full_address(addr)
        addr.search_text = LINZAddressCorrector(Path("."), Path("."))._build_search_text(addr)
    
    corrector = LINZAddressCorrector(Path("."), output_dir)
    corrector.build_database(sample_addresses)
    _export_json(sample_addresses, output_dir / "nz_addresses.json")


def _export_json(addresses: List[NZAddress], output_path: Path) -> None:
    """Export addresses as JSON for mobile bundling"""
    data = [
        {
            'linz_address_id': a.linz_address_id,
            'unit': a.unit_value,
            'number': a.street_number + (a.street_number_suffix or ''),
            'street': f"{a.street_name} {a.street_type}",
            'suburb': a.suburb,
            'city': a.city,
            'region': a.region,
            'postcode': a.postcode,
            'latitude': a.latitude,
            'longitude': a.longitude,
        }
        for a in addresses
    ]
    with open(output_path, 'w') as f:
        json.dump(data, f, separators=(',', ':'))
    logger.info(f"Exported {len(data)} addresses to {output_path}")


if __name__ == "__main__":
    import sys
    data_dir = sys.argv[1] if len(sys.argv) > 1 else "data/linz"
    output_dir = sys.argv[2] if len(sys.argv) > 2 else "packages/nz-address/data"
    build_from_data_dir(data_dir, output_dir)
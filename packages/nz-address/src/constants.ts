/**
 * NZ Address Constants
 * Spoken fixes for Māori names, street type normalization, etc.
 * Ported from Python nz_address.py
 */

// Spoken fixes for Māori and NZ place names ONLY (not street types)
// Key: spoken form (lowercase, no punctuation) -> Value: correct spelling
export const MAORI_SPOKEN_FIXES: Record<string, string> = {
  // Christchurch suburbs
  'rick a ton': 'Riccarton',
  'rickerton': 'Riccarton',
  'ricarton': 'Riccarton',
  
  'pap a new e': 'Papanui',
  'papa newey': 'Papanui',
  'papanui': 'Papanui',
  
  'why my ree': 'Waimairi',
  'waimairi': 'Waimairi',
  'my ree howe': 'Mairehau',
  'mairehau': 'Mairehau',
  
  'shir lee': 'Shirley',
  'shirley': 'Shirley',
  
  'adderley': 'Addington',
  'addington': 'Addington',
  
  'hoon hay': 'Hoon Hay',
  'hun hay': 'Hoon Hay',
  
  'sock burn': 'Sockburn',
  'sockburn': 'Sockburn',
  
  'fendalton': 'Fendalton',
  'fen dalton': 'Fendalton',
  
  'ilam': 'Ilam',
  'eye lam': 'Ilam',
  
  'hornby': 'Hornby',
  'horn bee': 'Hornby',
  
  'bishopdale': 'Bishopdale',
  'bishop dale': 'Bishopdale',
  
  'burnside': 'Burnside',
  'burn side': 'Burnside',
  
  'avonhead': 'Avonhead',
  'avon head': 'Avonhead',
  
  'uppa hutt': 'Upper Hutt',
  'upper hut': 'Upper Hutt',
  
  'porirua': 'Porirua',
  'pouri ru a': 'Porirua',
  
  'wellington': 'Wellington',
  'well ing ton': 'Wellington',
  
  'aukland': 'Auckland',
  'oakland': 'Auckland',
};

// Deprecated alias for backward compatibility
export const SPOKEN_FIXES = MAORI_SPOKEN_FIXES;

// Number words to digits
export const NUMBER_WORDS: Record<string, string> = {
  'zero': '0',
  'one': '1',
  'two': '2',
  'three': '3',
  'four': '4',
  'five': '5',
  'six': '6',
  'seven': '7',
  'eight': '8',
  'nine': '9',
  'ten': '10',
  'eleven': '11',
  'twelve': '12',
  'thirteen': '13',
  'fourteen': '14',
  'fifteen': '15',
  'sixteen': '16',
  'seventeen': '17',
  'eighteen': '18',
  'nineteen': '19',
  'twenty': '20',
  'thirty': '30',
  'forty': '40',
  'fifty': '50',
  'sixty': '60',
  'seventy': '70',
  'eighty': '80',
  'ninety': '90',
  'hundred': '100',
  'thousand': '1000',
};

// Unit indicators
export const UNIT_INDICATORS = [
  'unit',
  'flat',
  'apartment',
  'apt',
  'suite',
  'room',
  'rm',
  'villa',
  'townhouse',
  'town house',
];

// Street suffixes (full -> abbreviated) - used by parser for normalization
export const STREET_SUFFIXES: Record<string, string> = {
  'road': 'Rd',
  'street': 'St',
  'avenue': 'Ave',
  'drive': 'Dr',
  'lane': 'Ln',
  'place': 'Pl',
  'crescent': 'Cres',
  'close': 'Cl',
  'court': 'Ct',
  'way': 'Way',
  'boulevard': 'Blvd',
  'highway': 'Hwy',
  'terrace': 'Tce',
  'parade': 'Pde',
  'square': 'Sq',
  'circle': 'Cir',
  'grove': 'Gr',
  'heights': 'Hts',
  'ridge': 'Rdg',
  'valley': 'Vly',
  'view': 'Vw',
  'esplanade': 'Esp',
  'promenade': 'Prom',
  'quay': 'Quy',
  'rise': 'Rise',
  'row': 'Row',
  'serviceway': 'Svwy',
  'track': 'Trk',
  'walk': 'Walk',
  'wharf': 'Whrf',
};

// Common NZ suburbs for validation (Canterbury focus)
export const CANTERBURY_SUBURBS = [
  // Christchurch City
  'Addington', 'Aidanfield', 'Aorangi', 'Aranui', 'Avondale', 'Avonhead', 'Avonside',
  'Barrington', 'Beckford', 'Belfast', 'Bexley', 'Bishopdale', 'Bottle Lake', 'Bromley', 'Brooklands', 'Bryndwr', 'Burnside', 'Burrside',
  'Casebrook', 'Cashmere', 'Central City', 'Charlestown', 'Chisnallwood', 'Christchurch Central', 'Clifton', 'Coronation', 'Cranford',
  'Dallington', 'Duvauchelle', 'Dyers Pass',
  'Eastgate', 'Edgewater', 'Elmwood', 'Ensign', 'Ensors',
  'Farrington', 'Fendalton', 'Ferrymead', 'Fitzgerald', 'Flaxmere',
  'Gardens', 'Glenlivet', 'Governors Bay', 'Grahams', 'Greenpark', 'Guildford',
  'Hagley Park', 'Halswell', 'Harewood', 'Harrington', 'Harwood', 'Heathcote', 'Hei Hei', 'Highfield', 'Hillmorton', 'Hoon Hay', 'Hornby', 'Horsham',
  'Ilam', 'Islington',
  'Jellicoe',
  'Kaiapoi', 'Kashmir', 'Kennedys Bush', 'Kilmore', 'Kirkwood',
  'Linwood', 'Little River', 'Loburn',
  'Mairehau', 'Marshland', 'Maryhill', 'McCormacks Bay', 'Merrivale', 'Midland Park', 'Moncks Bay', 'Monks Bay', 'Mornington', 'Mount Pleasant', 'Moyen',
  'New Brighton', 'North Beach', 'North New Brighton', 'Northcote', 'Northwood',
  'Oaklands', 'Opawa', 'Otutahua',
  'Papanui', 'Parklands', 'Phillipstown', 'Purau', 'Queenspark',
  'Rawhiti', 'Redcliffs', 'Redwood', 'Regents Park', 'Richmond', 'Riccarton', 'Rolleston', 'Rowley',
  'Sockburn', 'Somerfield', 'South Brighton', 'South New Brighton', 'Southshore', 'Spreydon', 'St Albans', 'St Martins', 'St Martins', 'Styx', 'Sunnynook', 'Sydenham',
  'Tai Tapu', 'Templeton', 'Travis', 'Tunnel',
  'Upper Riccarton',
  'Waimairi', 'Waimairi Beach', 'Wainoni', 'Wairakei', 'Wairarapa', 'Waltham', 'Westburn', 'Westlake', 'Westmorland', 'Wigram', 'Woolston', 'Worsleys',
  'Yaldhurst',
  
  // Selwyn District
  'Burnham', 'Dunsandel', 'Leeston', 'Lincoln', 'Prebbleton', 'Rolleston', 'Springston', 'Tai Tapu', 'West Melton',
  
  // Waimakariri District
  'Kaiapoi', 'Oxford', 'Rangiora', 'Woodend',
  
  // Ashburton District
  'Ashburton', 'Methven', 'Rakaia',
  
  // Timaru District
  'Timaru', 'Temuka', 'Geraldine', 'Pleasant Point',
  
  // Mackenzie District
  'Fairlie', 'Lake Tekapo', 'Twizel',
  
  // Waimate District
  'Waimate',
  
  // Hurunui District
  'Amberley', 'Cheviot', 'Hanmer Springs', 'Waiau',
  
  // Kaikoura District
  'Kaikoura',
];

export const NZ_CITIES = [
  'Auckland', 'Wellington', 'Christchurch', 'Hamilton', 'Tauranga', 'Napier', 'Hastings',
  'Dunedin', 'Palmerston North', 'Nelson', 'Rotorua', 'New Plymouth', 'Whangarei', 'Invercargill',
  'Whanganui', 'Gisborne', 'Porirua', 'Lower Hutt', 'Upper Hutt',
];

export const NZ_REGIONS = [
  'Northland', 'Auckland', 'Waikato', 'Bay of Plenty', 'Gisborne', 'Hawke\'s Bay',
  'Taranaki', 'Manawatu-Whanganui', 'Wellington', 'Tasman', 'Nelson', 'Marlborough',
  'West Coast', 'Canterbury', 'Otago', 'Southland',
];

// Postcode prefixes by region (first digit)
export const POSTCODE_PREFIXES: Record<string, string[]> = {
  'Northland': ['0'],
  'Auckland': ['0', '1', '2'],
  'Waikato': ['3'],
  'Bay of Plenty': ['3'],
  'Gisborne': ['4'],
  'Hawke\'s Bay': ['4'],
  'Taranaki': ['4'],
  'Manawatu-Whanganui': ['4', '5'],
  'Wellington': ['5', '6'],
  'Tasman': ['7'],
  'Nelson': ['7'],
  'Marlborough': ['7'],
  'West Coast': ['7'],
  'Canterbury': ['7', '8'],
  'Otago': ['9'],
  'Southland': ['9'],
};
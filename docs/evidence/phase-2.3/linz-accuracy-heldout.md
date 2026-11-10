# D8 accuracy on the HELD-OUT 20 % of Canterbury streets (directive 2026-11-08 item 2)

- Date: 2026-11-10
- Held-out list: `services/api/tests/fixtures/linz-holdout-streets.txt` (1360 streets, seed 20261108, split by street by `scripts/data/split-linz-holdout.py`).
- Addresses on held-out streets: 120,961; sampled 1200 (400/area, seed 20261108), 6000 checks (five ask-cases each).
- Store: the full register per area (production shape) — the hold-out is on street names, not on the register.
- **Overall: 99.65% (5979/6000)** — target >= 99.5%.

## Slices (floor 98 % each)

| Slice | Accuracy |
|-------|----------|
| case: canonical | 99.75% (1197/1200) |
| case: misspelled road | 100.00% (1200/1200) |
| case: road type omitted | 99.50% (1194/1200) |
| case: spoken number | 99.17% (1190/1200) |
| case: unknown number asked | 99.83% (1198/1200) |
| area: christchurch | 99.45% (1989/2000) |
| area: selwyn | 99.85% (1997/2000) |
| area: waimakariri | 99.65% (1993/2000) |
| christchurch x canonical | 99.75% (399/400) |
| christchurch x misspelled road | 100.00% (400/400) |
| christchurch x road type omitted | 98.75% (395/400) |
| christchurch x spoken number | 99.00% (396/400) |
| christchurch x unknown number asked | 99.75% (399/400) |
| selwyn x canonical | 100.00% (400/400) |
| selwyn x misspelled road | 100.00% (400/400) |
| selwyn x road type omitted | 100.00% (400/400) |
| selwyn x spoken number | 99.50% (398/400) |
| selwyn x unknown number asked | 99.75% (399/400) |
| waimakariri x canonical | 99.50% (398/400) |
| waimakariri x misspelled road | 100.00% (400/400) |
| waimakariri x road type omitted | 99.75% (399/400) |
| waimakariri x spoken number | 99.00% (396/400) |
| waimakariri x unknown number asked | 100.00% (400/400) |

## The failures (first 30)

- [christchurch] no type: '4 St Adela Place Woolston Christchurch' != '4 St Florian Place Woolston Christchurch' | reason=address matched in the address database
- [christchurch] no type: '20 St Adela Place Woolston Christchurch' != '7/20 St Johns Street Woolston Christchurch' | reason=address matched in the address database
- [christchurch] spoken: None != '6 Seven Mile Drive Belfast Christchurch' | reason=no known street called 'Mile Dr'
- [christchurch] no type: '6 St Adela Place Woolston Christchurch' != '60 St Davids Street Lyttelton Lyttelton' | reason=house number 60 does not exist on 'St Adela Place', corrected to 6
- [christchurch] unknown number: '1/80 Fairfield Avenue Addington Christchurch' | reason=house number 8000 does not exist on 'Fairfield Avenue', corrected to 80
- [christchurch] spoken: None != '740 Two Chain Road Swannanoa Swannanoa' | reason=house number 742 does not exist on 'Two Chain Road'
- [christchurch] canonical: '5 St Adela Place Woolston Christchurch' != '2/50 St Andrews Square Strowan Christchurch' | reason=house number 50 does not exist on 'St Adela Place', corrected to 5
- [christchurch] spoken: '5 St Adela Place Woolston Christchurch' != '2/50 St Andrews Square Strowan Christchurch' | reason=house number 50 does not exist on 'St Adela Place', corrected to 5
- [christchurch] no type: '5 St Adela Place Woolston Christchurch' != '2/50 St Andrews Square Strowan Christchurch' | reason=house number 50 does not exist on 'St Adela Place', corrected to 5
- [christchurch] spoken: None != '12/7 Seven Mile Drive Belfast Christchurch' | reason=no known street called 'Mile Dr'
- [christchurch] no type: '33 Mary Street Papanui Christchurch' != '33 Mays Road St Albans Christchurch' | reason=address matched in the address database
- [waimakariri] canonical: None != '101 St Andrews Square Strowan Christchurch' | reason=house number 101 does not exist on 'St Adela Place'
- [waimakariri] spoken: None != '101 St Andrews Square Strowan Christchurch' | reason=house number 101 does not exist on 'St Adela Place'
- [waimakariri] no type: '3 St Adela Place Woolston Christchurch' != '2/30 St Johns Street Woolston Christchurch' | reason=house number 30 does not exist on 'St Adela Place', corrected to 3
- [waimakariri] spoken: None != '36 Two Chain Road Rolleston Rolleston' | reason=house number 38 does not exist on 'Two Chain Road'
- [waimakariri] canonical: None != '115 St Andrews Square Strowan Christchurch' | reason=house number 115 does not exist on 'St Adela Place'
- [waimakariri] spoken: None != '115 St Andrews Square Strowan Christchurch' | reason=house number 115 does not exist on 'St Adela Place'
- [waimakariri] spoken: None != '342 Two Chain Road Burnham Burnham' | reason=house number 344 does not exist on 'Two Chain Road'
- [selwyn] spoken: '318 Two Chain Road Burnham Burnham' != '2/316 Two Chain Road Burnham Burnham' | reason=address matched in the address database
- [selwyn] unknown number: '1/80 Fairfield Avenue Addington Christchurch' | reason=house number 8000 does not exist on 'Fairfield Avenue', corrected to 80
- [selwyn] spoken: None != '118 Two Chain Road Rolleston Rolleston' | reason=house number 120 does not exist on 'Two Chain Road'

# D8 accuracy on the real LINZ data (Canterbury)

- Date: 2026-11-08
- Data: LINZ `NZ Addresses` (`data.linz.govt.nz:layer-123113`), the Christchurch, Waimakariri and Selwyn bounding boxes.
- **656,392 real addresses indexed** across 3 area(s).
- Sample: 120 real addresses per area (seed 20261020), 1800 checks in total.
- **Accuracy: 98.2% (1767/1800)** — target >= 95%.

| Case | Result |
|------|--------|
| canonical | 354 |
| misspelled road | 350 |
| road type omitted | 357 |
| spoken number | 353 |
| unknown number asked | 353 |

## The failures (first 20)

- [christchurch] misspelled: None != '85D Shands Road Hornby South Christchurch'
- [christchurch] misspelled: None != '69 Warrington Street Mairehau Christchurch'
- [christchurch] no type: '84 Oxford Street Lyttelton Lyttelton' != '84 Oxford Terrace Christchurch Central Christchurch'
- [christchurch] spoken: None != '928 Two Chain Road Swannanoa Swannanoa'
- [christchurch] misspelled: '14 Dale Street Kaiapoi Kaiapoi' != '14 Deal Street Wigram Christchurch'
- [christchurch] canonical: None != '15 Caspian Street South New Brighton Christchurch'
- [christchurch] spoken: None != '15 Caspian Street South New Brighton Christchurch'
- [christchurch] misspelled: None != '15 Caspian Street South New Brighton Christchurch'
- [christchurch] unknown number: None
- [christchurch] canonical: None != '648 No 10 Road Swannanoa Swannanoa'
- [christchurch] spoken: None != '648 No 10 Road Swannanoa Swannanoa'
- [christchurch] unknown number: None
- [waimakariri] unknown number: '80 Middleton Road Upper Riccarton Christchurch'
- [waimakariri] no type: '38 Harrison Drive Rolleston Rolleston' != '38 Harrison Street Mairehau Christchurch'
- [waimakariri] misspelled: '12 Arapawa Street Belfast Christchurch' != '2/12 Arawa Street Shirley Christchurch'
- [waimakariri] misspelled: None != '86A Rahera Street Spreydon Christchurch'
- [waimakariri] canonical: None != '23 Leaver Terrace North New Brighton Christchurch'
- [waimakariri] spoken: None != '23 Leaver Terrace North New Brighton Christchurch'
- [waimakariri] misspelled: None != '23 Leaver Terrace North New Brighton Christchurch'
- [waimakariri] unknown number: None
- ... and 13 more

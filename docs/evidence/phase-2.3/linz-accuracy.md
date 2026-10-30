# D8 accuracy on the real LINZ data (Canterbury)

- Date: 2026-10-20
- Data: LINZ `NZ Addresses` (`data.linz.govt.nz:layer-123113`), the Christchurch, Waimakariri and Selwyn bounding boxes.
- **656,392 real addresses indexed** across 3 area(s).
- Sample: 120 real addresses per area (seed 20261020), 1800 checks in total.
- **Accuracy: 96.9% (1744/1800)** — target >= 95%.

| Case | Result |
|------|--------|
| canonical | 348 |
| misspelled road | 344 |
| road type omitted | 352 |
| spoken number | 347 |
| unknown number asked | 353 |

## The failures (first 20)

- [christchurch] misspelled: None != '85D Shands Road Hornby South Christchurch'
- [christchurch] misspelled: None != '69 Warrington Street Mairehau Christchurch'
- [christchurch] canonical: '28C Cathedral Square Christchurch Central Christchurch' != '287C/28 Cathedral Square Christchurch Central Christchurch'
- [christchurch] spoken: '28C Cathedral Square Christchurch Central Christchurch' != '287C/28 Cathedral Square Christchurch Central Christchurch'
- [christchurch] misspelled: '28C Cathedral Square Christchurch Central Christchurch' != '287C/28 Cathedral Square Christchurch Central Christchurch'
- [christchurch] no type: '28C Cathedral Square Christchurch Central Christchurch' != '287C/28 Cathedral Square Christchurch Central Christchurch'
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
- [waimakariri] canonical: '87 Kilmore Street Christchurch Central Christchurch' != 'GB/87 Kilmore Street Christchurch Central Christchurch'
- [waimakariri] spoken: '87 Kilmore Street Christchurch Central Christchurch' != 'GB/87 Kilmore Street Christchurch Central Christchurch'
- [waimakariri] misspelled: '87 Kilmore Street Christchurch Central Christchurch' != 'GB/87 Kilmore Street Christchurch Central Christchurch'
- ... and 36 more

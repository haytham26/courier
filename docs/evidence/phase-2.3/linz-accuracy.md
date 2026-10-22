# D8 accuracy on the real LINZ data (Canterbury)

- Date: 2026-10-20
- Data: LINZ `NZ Addresses` (`data.linz.govt.nz:layer-123113`), the Christchurch, Waimakariri and Selwyn bounding boxes.
- **656,044 real addresses indexed** across 3 area(s).
- Sample: 120 real addresses per area (seed 20261020), 1800 checks in total.
- **Accuracy: 96.9% (1745/1800)** — target >= 95%.

| Case | Result |
|------|--------|
| canonical | 348 |
| misspelled road | 343 |
| road type omitted | 355 |
| spoken number | 347 |
| unknown number asked | 352 |

## The failures (first 20)

- [christchurch] canonical: None != '255C/28 Cathedral Square Christchurch Central Christchurch'
- [christchurch] spoken: None != '255C/28 Cathedral Square Christchurch Central Christchurch'
- [christchurch] misspelled: None != '255C/28 Cathedral Square Christchurch Central Christchurch'
- [christchurch] unknown number: None
- [christchurch] misspelled: '91 Hilton Street Kaiapoi Kaiapoi' != '91 Milton Street Somerfield Christchurch'
- [christchurch] canonical: None != '193 Durham Street South Christchurch Central Christchurch'
- [christchurch] spoken: None != '193 Durham Street South Christchurch Central Christchurch'
- [christchurch] misspelled: None != '193 Durham Street South Christchurch Central Christchurch'
- [christchurch] unknown number: None
- [christchurch] spoken: None != '928 Two Chain Road Swannanoa Swannanoa'
- [waimakariri] canonical: '87 Kilmore Street Christchurch Central Christchurch' != '4D/87 Kilmore Street Christchurch Central Christchurch'
- [waimakariri] spoken: '87 Kilmore Street Christchurch Central Christchurch' != '4D/87 Kilmore Street Christchurch Central Christchurch'
- [waimakariri] misspelled: '87 Kilmore Street Christchurch Central Christchurch' != '4D/87 Kilmore Street Christchurch Central Christchurch'
- [waimakariri] no type: '4 School Lane Kirwee Kirwee' != '4 School Road Halswell Christchurch'
- [waimakariri] canonical: None != '5 Creedon Glen Casebrook Christchurch'
- [waimakariri] spoken: None != '5 Creedon Glen Casebrook Christchurch'
- [waimakariri] misspelled: None != '5 Creedon Glen Casebrook Christchurch'
- [waimakariri] unknown number: None
- [waimakariri] misspelled: '3 Pyatt Place Redwood Christchurch' != '30 Wyatt Place Russley Christchurch'
- [waimakariri] misspelled: None != '23 Seascape Gardens Bromley Christchurch'
- ... and 35 more

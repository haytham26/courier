# D8 accuracy on the real LINZ data (Canterbury)

- Date: 2026-10-20
- Data: LINZ `NZ Addresses` (`data.linz.govt.nz:layer-123113`), Christchurch bounding box, 225,151 addresses indexed.
- Sample: 120 real addresses (seed 20261020), 600 checks in total.
- **Accuracy: 98.3% (590/600)** — target >= 95%.

| Case | Result |
|------|--------|
| canonical | 118 |
| misspelled road | 117 |
| road type omitted | 120 |
| spoken number | 117 |
| unknown number asked | 118 |

## The failures (first 20)

- canonical: None != '255C/28 Cathedral Square Christchurch Central Christchurch' (said 'unit 255C 28 Cathedral Square, Christchurch Central')
- spoken: None != '255C/28 Cathedral Square Christchurch Central Christchurch' (said 'unit 255C twenty eight Cathedral Square Christchurch Central')
- misspelled: None != '255C/28 Cathedral Square Christchurch Central Christchurch' (said 'unit 255C 28 aCthedral Square, Christchurch Central')
- unknown number: None (said '7947 Cathedral Square')
- misspelled: '91 Hilton Street Kaiapoi Kaiapoi' != '91 Milton Street Somerfield Christchurch' (said '91 iMlton Street, Somerfield')
- canonical: None != '193 Durham Street South Christchurch Central Christchurch' (said '193 Durham Street South, Christchurch Central')
- spoken: None != '193 Durham Street South Christchurch Central Christchurch' (said 'one hundred ninety three Durham Street South Christchurch Central')
- misspelled: None != '193 Durham Street South Christchurch Central Christchurch' (said '193 uDrham Street South, Christchurch Central')
- unknown number: None (said '8112 Durham Street South')
- spoken: None != '928 Two Chain Road Swannanoa Swannanoa' (said 'nine hundred twenty eight Two Chain Road Swannanoa')

# D8 accuracy on the real LINZ data (Canterbury)

- Date: 2026-11-08
- Data: LINZ `NZ Addresses` (`data.linz.govt.nz:layer-123113`), the Christchurch, Waimakariri and Selwyn bounding boxes.
- **656,392 real addresses indexed** across 3 area(s).
- Sample: 120 real addresses per area (seed 20261020), 1800 checks in total.
- **Accuracy: 99.5% (1791/1800)** — target >= 95%.

| Case | Result |
|------|--------|
| canonical | 358 |
| misspelled road | 359 |
| road type omitted | 359 |
| spoken number | 357 |
| unknown number asked | 358 |

## The failures (first 20)

- [christchurch] spoken: None != '928 Two Chain Road Swannanoa Swannanoa' | reason=house number 930 does not exist on 'Two Chain Road'
- [waimakariri] unknown number: '80 Middleton Road Upper Riccarton Christchurch' | reason=house number 8000 does not exist on 'Middleton Road', corrected to 80
- [selwyn] canonical: '1AE/109 Worcester Street Christchurch Central Christchurch' != '109BK Worcester Street Christchurch Central Christchurch' | reason=address matched in the address database
- [selwyn] spoken: '1AE/109 Worcester Street Christchurch Central Christchurch' != '109BK Worcester Street Christchurch Central Christchurch' | reason=address matched in the address database
- [selwyn] misspelled: '1AE/109 Worcester Street Christchurch Central Christchurch' != '109BK Worcester Street Christchurch Central Christchurch' | reason=address matched in the address database
- [selwyn] unknown number: '80 Elizabeth Street Allenton Ashburton' | reason=house number 8000 does not exist on 'Elizabeth Street', corrected to 80
- [selwyn] canonical: '71 St Albans Street St Albans Christchurch' != '71 St Andrews Square Strowan Christchurch' | reason=address matched in the address database
- [selwyn] spoken: '71 St Albans Street St Albans Christchurch' != '71 St Andrews Square Strowan Christchurch' | reason=address matched in the address database
- [selwyn] no type: '71 St Albans Street St Albans Christchurch' != '71 St Andrews Square Strowan Christchurch' | reason=address matched in the address database

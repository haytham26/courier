# D8 error analysis on the TUNE streets (the 80 % split; held-out streets excluded)

- Date: 2026-11-08
- Sample: 400 addresses per area (seed 20261108) on NON-held-out streets, 6000 checks; accuracy 99.97% (5998/6000).
- Held-out list: 1360 streets (`fixtures/linz-holdout-streets.txt`, seed 20261108).

## Misses by class (each class = one root fix)

| Class | Count |
|-------|-------|
| number-not-on-matched-road | 2 |

### number-not-on-matched-road (2)

- [waimakariri] misspelled: None != '55 Mills Road Marshland Christchurch' | reason=house number 55 does not exist on 'Hills Road' | input='55 iMlls Road, Marshland'
- [selwyn] unknown number: '80 Middle Road Allenton Ashburton' | reason=house number 8000 does not exist on 'Middle Road', corrected to 80 | input='8000 Middle Road, Allenton'

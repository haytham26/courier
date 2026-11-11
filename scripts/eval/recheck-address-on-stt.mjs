// The independent re-derivation of the address-extraction leg.
//
//   node scripts/eval/recheck-address-on-stt.mjs [--results <dir>]...
//
// The scorer is not its own witness. `app/eval_audio.py` writes
// `address_extraction_on_stt_by_slice` into every results directory it
// produces; this script reads the SAME per_utterance.csv with its own parser
// and its own arithmetic and prints what it finds, so the number the evidence
// quotes was checked by something that shares no code with the scorer.
//
// What it checks is the BEFORE leg only - the offline brain's `raw_address`
// compared to the utterance's gold address - because that is the number the
// held-out measurement publishes. The AFTER leg (the resolver) is a different
// question and is measured by `app/eval_address.py`; this script deliberately
// does not reimplement the resolver, because a second resolver would be a
// second opinion nobody asked for.
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

function readArgs(name, fallback) {
  const at = process.argv.indexOf(name);
  return at >= 0 && at + 1 < process.argv.length ? process.argv[at + 1] : fallback;
}

/** One CSV row, parsed by hand: the gold text and the hypotheses carry commas. */
function parseCsv(text) {
  const lines = text.split(/\r?\n/).filter(Boolean);
  const header = lines[0].split(',');
  return lines.slice(1).map((line) => {
    const values = [];
    let current = '';
    let quoted = false;
    for (let index = 0; index < line.length; index += 1) {
      const character = line[index];
      if (character === '"') {
        if (quoted && line[index + 1] === '"') {
          current += '"';
          index += 1;
        } else {
          quoted = !quoted;
        }
      } else if (character === ',' && !quoted) {
        values.push(current);
        current = '';
      } else {
        current += character;
      }
    }
    values.push(current);
    return Object.fromEntries(header.map((key, position) => [key, values[position] ?? '']));
  });
}

const directories = readArgs('--results', 'packages/eval/voice/results/heldout-utterances').split(';');
for (const directory of directories) {
  const csv = join(directory, 'per_utterance.csv');
  const rows = parseCsv(readFileSync(csv, 'utf8'));
  const bearing = rows.filter((row) => row.gold_address);
  const spoken = bearing.filter((row) => row.parsed_address);
  const exact = spoken.filter((row) => row.parsed_address === row.gold_address);
  const bySlice = {};
  for (const row of bearing) {
    const bucket = bySlice[row.slice] ?? { bearing: 0, exact: 0, with_an_address: 0 };
    bucket.bearing += 1;
    bucket.with_an_address += row.parsed_address ? 1 : 0;
    bucket.exact += row.parsed_address && row.parsed_address === row.gold_address ? 1 : 0;
    bySlice[row.slice] = bucket;
  }
  const summary = JSON.parse(readFileSync(join(directory, 'summary.json'), 'utf8'));
  const published = summary.address_extraction_on_stt_by_slice ?? {};
  const pooled = Object.values(published).reduce(
    (totals, slice) => ({
      bearing: totals.bearing + slice.address_bearing,
      exact: totals.exact + slice.exact,
      spoken: totals.spoken + slice.hypotheses_with_an_address,
    }),
    { bearing: 0, exact: 0, spoken: 0 },
  );
  console.log(`${directory}:`);
  console.log(`  re-derived from per_utterance.csv: ${exact.length}/${bearing.length} exact,`);
  console.log(`    ${spoken.length} of their hypotheses carried an address at all`);
  console.log(`  per slice: ${JSON.stringify(bySlice)}`);
  console.log(
    `  published in summary.json: ${pooled.exact}/${pooled.bearing} exact, ` +
      `${pooled.spoken} hypotheses carried an address`,
  );
  console.log(`  agrees: ${exact.length === pooled.exact && bearing.length === pooled.bearing}`);
}

// BUG-102: the extract URL is checked against the registry's own host before
// a single byte is fetched, and the workflow calls the check before it curls.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

import { checkExtractUrl } from '../build-pmtiles.mjs';

test('the registered extract host is accepted', () => {
  const answer = checkExtractUrl(
    'geofabrik-nz',
    'https://download.geofabrik.de/australia-oceania/new-zealand-latest.osm.pbf',
  );
  assert.equal(answer.ok, true);
  assert.equal(answer.host, 'download.geofabrik.de');
});

test('a foreign host is refused, by name', () => {
  const answer = checkExtractUrl('geofabrik-nz', 'https://example.com/new-zealand-latest.osm.pbf');
  assert.equal(answer.ok, false);
  assert.match(answer.reason, /not the registered host/);
  assert.match(answer.reason, /example\.com/);
  assert.match(answer.reason, /geofabrik-nz/);
});

test('a cleartext scheme is refused', () => {
  const answer = checkExtractUrl(
    'geofabrik-nz',
    'http://download.geofabrik.de/australia-oceania/new-zealand-latest.osm.pbf',
  );
  assert.equal(answer.ok, false);
  assert.match(answer.reason, /scheme/);
});

test('a URL that is not a URL is refused', () => {
  const answer = checkExtractUrl('geofabrik-nz', 'not a url');
  assert.equal(answer.ok, false);
  assert.match(answer.reason, /not a URL/i);
});

test('a source outside the registry has no checked terms', () => {
  const answer = checkExtractUrl('some-other-mirror', 'https://download.geofabrik.de/x.osm.pbf');
  assert.equal(answer.ok, false);
  assert.match(answer.reason, /not in the registry/);
});

test('the workflow checks the URL before it curls it', () => {
  const workflow = readFileSync('.github/workflows/map-pack.yml', 'utf8');
  const check = workflow.indexOf('--check-url');
  const curl = workflow.indexOf('curl -fsSL -o data/maps/newzealand-latest.osm.pbf');
  assert.notEqual(check, -1, 'the extract step must call the check');
  assert.notEqual(curl, -1, 'the extract step must still curl');
  assert.ok(check < curl, 'the check runs before the fetch');
});

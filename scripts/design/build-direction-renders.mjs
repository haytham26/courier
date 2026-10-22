/**
 * Builds the static render of every direction of the round.
 *
 *   node scripts/design/build-direction-renders.mjs
 *
 * The output is `docs/design/directions-2/<n>-<name>/render.html`: the four
 * screens of the direction, in the day and at night, drawn with the palette
 * of `packages/design-tokens/src/themes2a.ts` and the type scale of
 * `packages/design-tokens/src/directions2a.ts`. The values are read from the
 * built token package, so the render and the app cannot drift apart.
 *
 * The frames are addressable: `render.html#today-light` shows one screen at
 * a time, which is how `scripts/design/render-directions.mjs` shoots the
 * PNGs.
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const repo = join(here, '..', '..');
const tokenDist = join(repo, 'packages', 'design-tokens', 'dist');

const { themes } = await import(pathToFileURL(join(tokenDist, 'themes.js')).href);
const { directions2a } = await import(pathToFileURL(join(tokenDist, 'directions2a.js')).href);
const { mapPalettes2a } = await import(pathToFileURL(join(tokenDist, 'themes2a.js')).href);

/** The directions this team built, and the folders of the round. */
const DIRECTIONS = [
  { name: 'controlRoom', folder: '01-control-room' },
  { name: 'topo', folder: '02-topo' },
  { name: 'addressFirst', folder: '03-address-first' },
];

/** The screens of a direction and the two palettes they are drawn in. */
const SCREENS = ['today', 'driving', 'copilot', 'scanner'];
const THEMES = [
  { key: 'light', suffix: 'light', themeName: 'themeName' },
  { key: 'night', suffix: 'night', themeName: 'nightThemeName' },
];

/** The content of the run, the same content the app shows. */
const RUN = {
  runName: 'Northwood AM',
  date: 'Monday',
  clock: '10:38',
  driver: 'Tane Rua',
  remaining: 18,
  delivered: 42,
  failed: 2,
  kilometres: 6.4,
  queued: 4,
  next: {
    address: '14 Harewood Road',
    suburb: 'Papanui',
    eta: '10:42',
    km: 2.1,
    parcels: 3,
    note: 'Side gate, small box in the rear rack',
    rack: 'Rear rack, bay 2',
  },
  stops: [
    ['45', '14 Harewood Road', 'Papanui', '10:42', 'Next'],
    ['46', '22 Westminster Street', 'Merivale', '10:49', 'Pending'],
    ['47', '3/120 Blenheim Road', 'Upper Riccarton', '11:02', 'Pending'],
    ['48', '78 Main South Road', 'Sockburn', '11:14', 'Pending'],
    ['49', '234 Colombo Street', 'Sydenham', '11:26', 'Pending'],
    ['50', '9 Cashel Street', 'Addington', '11:41', 'Pending'],
    ['51', '41 Cranmer Street', 'Halswell', '11:55', 'Pending'],
    ['52', '7 Bexley Street', 'Halswell', '12:07', 'Pending'],
  ],
  voice: {
    said: 'Fourteen Harewood Road, Papanui. Side gate, small box in the rear rack.',
    heard: 'Delivered, left it in the side gate',
    intent: 'Stop 45 confirmed, delivered to the side gate',
  },
  scan: {
    address: '14 Harewood Road',
    suburb: 'Papanui',
    city: 'Christchurch',
    postcode: '8053',
    confidence: 'Clear read',
    parcel: 'CP-48155',
    note: 'Side gate, small box in the rear rack',
  },
};

/** Escapes the text of the render. */
function esc(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');
}

/** The CSS variables of one theme of one direction. */
function variables(theme, palette) {
  const c = theme.colors;
  return [
    `--bg:${c.background}`,
    `--surface:${c.surface}`,
    `--elev:${c.surfaceElevated}`,
    `--border:${c.border}`,
    `--ink:${c.textPrimary}`,
    `--ink2:${c.textSecondary}`,
    `--ink3:${c.textTertiary}`,
    `--accent:${c.brandPrimary}`,
    `--accent2:${c.brandSecondary}`,
    `--ok:${c.statusDelivered}`,
    `--bad:${c.statusFailed}`,
    `--warn:${c.statusSkipped}`,
    `--map-land:${palette.land}`,
    `--map-water:${palette.water}`,
    `--map-road:${palette.road}`,
    `--map-building:${palette.building}`,
    `--map-route:${palette.routeLine}`,
    `--map-highway:${palette.highway}`,
  ].join(';');
}

/** The type classes of a direction, from the scale of the token package. */
function typeCss(direction) {
  const t = direction.type;
  const step = (key) =>
    `.${key}{font-size:${t[key].fontSize}px;line-height:${t[key].lineHeight}px;letter-spacing:${t[key].letterSpacing}em;font-weight:${t[key].fontWeight};}`;

  return [
    step('metric'),
    step('address'),
    step('row'),
    step('label'),
    step('body'),
    step('caption'),
    step('title'),
    `.metric,.address,.title{font-family:'${direction.fonts.display}',${direction.fonts.displayFallback ?? 'sans-serif'};}`,
    `.row,.label,.body,.caption{font-family:'${direction.fonts.work}',${direction.fonts.workFallback ?? 'sans-serif'};}`,
    `.tab{font-variant-numeric:tabular-nums;}`,
  ].join('\n');
}

/** The Google Fonts link of a direction. */
function fontLink(direction) {
  const families = {
    'Roboto Flex': 'Roboto+Flex:opsz,wght@8..144,300..800',
    'IBM Plex Mono': 'IBM+Plex+Mono:wght@400;500;600;700',
    'Bricolage Grotesque': 'Bricolage+Grotesque:opsz,wght@12..96,400..800',
    'Source Sans 3': 'Source+Sans+3:wght@400;500;600;700',
    Fraunces: 'Fraunces:opsz,wght@9..144,400..700',
    Geist: 'Geist:wght@400;500;600;700',
  };
  const list = [direction.fonts.display, direction.fonts.work]
    .map((family) => families[family])
    .filter(Boolean);

  if (list.length === 0) {
    return '';
  }
  return `<link rel="preconnect" href="https://fonts.googleapis.com" />\n<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />\n<link href="https://fonts.googleapis.com/css2?family=${list.join('&family=')}&display=swap" rel="stylesheet" />`;
}

/* ------------------------------------------------------------------ *
 * The screens, one builder per direction.
 * ------------------------------------------------------------------ */

/** The map of the Control Room: a plan view with a hard route line. */
function controlRoomMap(palette) {
  return `<svg class="map" viewBox="0 0 390 470" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
  <rect width="390" height="470" fill="${palette.land}" />
  <g stroke="${palette.roadOutline}" stroke-width="1" fill="none">
    <path d="M-20 120 H410 M-20 260 H410 M-20 380 H410" />
    <path d="M70 -20 V490 M180 -20 V490 M300 -20 V490" />
  </g>
  <g stroke="${palette.road}" stroke-width="9" fill="none" stroke-linecap="square">
    <path d="M-20 120 H410 M-20 260 H410 M-20 380 H410" />
    <path d="M70 -20 V490 M180 -20 V490 M300 -20 V490" />
  </g>
  <g fill="${palette.building}" opacity="0.9">
    <rect x="86" y="136" width="80" height="108" />
    <rect x="196" y="276" width="88" height="88" />
    <rect x="316" y="136" width="60" height="108" />
    <rect x="86" y="396" width="80" height="60" />
  </g>
  <path d="M40 430 L120 330 L200 300 L300 250" stroke="${palette.routeLine}" stroke-width="7" fill="none" stroke-linecap="round" stroke-linejoin="round" />
  <circle cx="40" cy="430" r="7" fill="${palette.userLocation}" />
  <rect x="292" y="242" width="16" height="16" fill="${palette.stopPin}" />
</svg>`;
}

/** The map of Topo: contour hairlines over the land and a surveyed route. */
function topoMap(palette) {
  return `<svg class="map" viewBox="0 0 390 470" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
  <rect width="390" height="470" fill="${palette.land}" />
  <g fill="none" stroke="${palette.contour ?? palette.roadOutline}" stroke-width="1" opacity="0.9">
    <path d="M-40 420 C60 380 40 300 120 280 C210 258 250 330 330 300 C400 275 420 200 430 180" />
    <path d="M-40 460 C70 420 50 340 130 320 C220 298 260 370 340 340 C410 315 420 250 430 230" />
    <path d="M-40 380 C50 340 30 260 110 240 C200 218 240 290 320 260 C390 235 410 150 430 130" />
    <path d="M-40 340 C40 300 20 220 100 200 C190 178 230 250 310 220 C380 195 400 100 430 80" />
    <path d="M-40 300 C30 260 10 180 90 160 C180 138 220 210 300 180 C370 155 390 50 430 30" />
  </g>
  <g stroke="${palette.road}" stroke-width="6" fill="none" stroke-linecap="square" opacity="0.9">
    <path d="M-20 190 H410 M-20 330 H410" />
  </g>
  <path d="M40 430 L120 330 L200 300 L300 250" stroke="${palette.routeLine}" stroke-width="4" fill="none" stroke-dasharray="1 0" />
  <path d="M40 430 L120 330 L200 300 L300 250" stroke="${palette.routeLine}" stroke-width="2" fill="none" />
  <circle cx="40" cy="430" r="6" fill="${palette.userLocation}" />
  <path d="M300 236 l8 14 l-8 14 l-8 -14 z" fill="${palette.stopPin}" />
</svg>`;
}

/** The map of Address First: a quiet band under the page. */
function addressFirstMap(palette) {
  return `<svg class="map" viewBox="0 0 390 470" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
  <rect width="390" height="470" fill="${palette.land}" />
  <g stroke="${palette.road}" stroke-width="8" fill="none" stroke-linecap="round" opacity="0.95">
    <path d="M-20 140 H410 M-20 290 H410" />
    <path d="M120 -20 V490 M260 -20 V490" />
  </g>
  <g fill="${palette.building}" opacity="0.75">
    <rect x="140" y="160" width="100" height="110" />
    <rect x="280" y="160" width="70" height="110" />
    <rect x="140" y="310" width="100" height="90" />
  </g>
  <path d="M60 420 L150 320 L240 280 L320 250" stroke="${palette.routeLine}" stroke-width="5" fill="none" stroke-linecap="round" />
  <circle cx="60" cy="420" r="7" fill="${palette.userLocation}" />
  <circle cx="320" cy="250" r="9" fill="${palette.stopPin}" />
</svg>`;
}

/** The header of every screen, in the language of the direction. */
function header(direction, kind) {
  const c = direction.name;
  if (c === 'controlRoom') {
    return `<div class="header">
      <div class="header-left">
        <div class="label" style="color:var(--ink2)">${esc(RUN.date.toUpperCase())} · ${esc(RUN.runName.toUpperCase())}</div>
        <div class="caption" style="color:var(--ink3)">${esc(RUN.driver)}</div>
      </div>
      <div class="header-right">
        <div class="row tab" style="color:var(--ink)">${esc(RUN.clock)}</div>
        <div class="icon">${gear()}</div>
      </div>
    </div>`;
  }
  if (c === 'topo') {
    return `<div class="header">
      <div class="header-left">
        <div class="label" style="color:var(--ink2)">${esc(RUN.runName.toUpperCase())} · ${esc(RUN.date.toUpperCase())}</div>
        <div class="caption" style="color:var(--ink3)">${esc(RUN.driver)} · ${esc(RUN.clock)}</div>
      </div>
      <div class="north"><span class="caption" style="color:var(--ink2)">N</span>${needle()}</div>
      <div class="icon">${gear()}</div>
    </div>`;
  }
  return `<div class="masthead">
    <div class="masthead-text">
      <div class="title" style="color:var(--ink)">${esc(RUN.runName)}</div>
      <div class="caption" style="color:var(--ink3)">${esc(RUN.date)} · ${esc(RUN.driver)} · ${esc(RUN.clock)}</div>
    </div>
    <div class="folio">
      <div class="metric tab" style="color:var(--ink)">${RUN.remaining}</div>
      <div class="caption" style="color:var(--ink3)">stops left</div>
    </div>
    <div class="icon">${gear()}</div>
  </div>`;
}

function gear() {
  return `<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" style="color:inherit"><circle cx="12" cy="12" r="3"></circle><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"></path></svg>`;
}

function needle() {
  return `<svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" style="color:var(--ink2)"><path d="M12 2 L19 20 L12 16 L5 20 Z"></path></svg>`;
}

/** The stop rows of the run. */
function stopRows(direction, count) {
  const rows = RUN.stops.slice(0, count);
  if (direction.name === 'addressFirst') {
    return rows
      .map(
        ([sequence, address, suburb, eta, status], index) => `<div class="entry">
      <div class="caption tab" style="color:var(--ink3)">${String(index + 1).padStart(2, '0')}</div>
      <div class="entry-main">
        <div class="row" style="color:${index === 0 ? 'var(--accent)' : 'var(--ink)'};font-weight:${index === 0 ? '600' : '500'}">${esc(address)}</div>
        <div class="caption" style="color:var(--ink3)">${esc(suburb)} · ${esc(eta)} · ${esc(status)}</div>
      </div>
    </div>`,
      )
      .join('\n');
  }
  if (direction.name === 'topo') {
    return rows
      .map(
        ([sequence, address, suburb, eta, status]) => `<div class="row">
      <div class="row tab" style="color:var(--ink3);width:30px">${esc(sequence)}</div>
      <div class="row-main">
        <div class="row" style="color:var(--ink);font-weight:${status === 'Next' ? '700' : '500'}">${esc(address)}</div>
        <div class="caption" style="color:var(--ink3)">${esc(suburb)}</div>
      </div>
      <div class="row-right">
        <div class="row tab" style="color:var(--ink2)">${esc(eta)}</div>
        <div class="caption" style="color:var(--ink3)">${esc(status)}</div>
      </div>
    </div>`,
      )
      .join('\n');
  }
  return rows
    .map(
      ([sequence, address, suburb, eta, status]) => `<div class="row">
      <div class="row tab" style="color:var(--ink3);width:28px">${esc(sequence)}</div>
      <div class="row-main">
        <div class="row" style="color:var(--ink);font-weight:${status === 'Next' ? '700' : '500'}">${esc(address)}</div>
        <div class="caption" style="color:var(--ink3)">${esc(suburb)}</div>
      </div>
      <div class="row tab" style="color:var(--ink2)">${esc(eta)}</div>
      <div class="caption" style="color:${status === 'Next' ? 'var(--accent)' : 'var(--ink3)'};width:68px;text-align:right">${esc(status)}</div>
    </div>`,
    )
    .join('\n');
}

/** The screen of a direction. */
function screen(direction, name, palette) {
  if (name === 'today') {
    if (direction.name === 'controlRoom') {
      const cells = 20;
      const filled = Math.round((RUN.delivered / 60) * cells);
      const gauge = Array.from({ length: cells }, (_unused, index) =>
        `<i style="background:${index < filled ? 'var(--accent)' : 'var(--border)'};opacity:${index < filled ? 1 : 0.4}"></i>`,
      ).join('');
      return `${header(direction, 'today')}
    <div class="rule"></div>
    <div class="gauge-block">
      <div class="gauge-row">
        <div class="metric tab" style="color:var(--ink)">${RUN.remaining}</div>
        <div class="label" style="color:var(--ink2)">STOPS LEFT</div>
      </div>
      <div class="gauge">${gauge}<b></b></div>
    </div>
    <div class="rule"></div>
    <div class="readouts">
      <div class="readout"><div class="caption" style="color:var(--ink2)">Delivered</div><div class="row tab" style="color:var(--ok)">${RUN.delivered}</div></div>
      <div class="readout split"><div class="caption" style="color:var(--ink2)">Failed</div><div class="row tab" style="color:var(--bad)">${RUN.failed}</div></div>
      <div class="readout split"><div class="caption" style="color:var(--ink2)">To drive</div><div class="row tab" style="color:var(--ink)">${RUN.kilometres} km</div></div>
    </div>
    <div class="rule"></div>
    <div class="next-move">
      <div class="next-head"><div class="label" style="color:var(--accent)">NEXT MOVE</div><div class="caption tab" style="color:var(--ink3)">${RUN.next.km.toFixed(1)} km</div></div>
      <div class="address" style="color:var(--ink)">${esc(RUN.next.address)}</div>
      <div class="body" style="color:var(--ink2)">${esc(RUN.next.suburb)} · ${esc(RUN.next.eta)} · ${RUN.next.parcels} parcels</div>
      <div class="caption" style="color:var(--ink3)">${esc(RUN.next.note)}</div>
    </div>
    <div class="rule"></div>
    <div class="list-head"><div class="label" style="color:var(--ink2)">STOPS</div><div class="caption" style="color:var(--ink3)">${RUN.stops.length} shown</div></div>
    ${stopRows(direction, direction.stopsVisible)}
    <div class="spacer"></div>`;
    }
    if (direction.name === 'topo') {
      const profile = [3, 5, 4, 6, 5, 3, 4, 2]
        .map((height) => `<i style="height:${height * 6}px;background:var(--accent)"></i>`)
        .join('');
      return `${header(direction, 'today')}
    <div class="rule"></div>
    <div class="profile-block">
      <div class="profile-head">
        <div class="label" style="color:var(--ink2)">PROFILE OF THE RUN</div>
        <div class="metric-block">
          <div class="metric tab" style="color:var(--ink)">${RUN.remaining}</div>
          <div class="caption" style="color:var(--ink3)">stops to go</div>
        </div>
      </div>
      <div class="profile">${profile}</div>
    </div>
    <div class="rule"></div>
    <div class="next-block">
      <div class="contours"><i></i><i></i><i></i><i></i></div>
      <div class="label" style="color:var(--accent)">STOP ${RUN.next ? '45' : ''} · ${RUN.next.km.toFixed(1)} KM</div>
      <div class="address" style="color:var(--ink)">${esc(RUN.next.address)}</div>
      <div class="body" style="color:var(--ink2)">${esc(RUN.next.suburb)} · ${esc(RUN.next.eta)} · ${RUN.next.parcels} parcels</div>
      <div class="caption" style="color:var(--ink3)">${esc(RUN.next.note)}</div>
      <div class="caption tab" style="color:var(--ink3);margin-top:8px">43.5180 S · 172.6250 E</div>
    </div>
    <div class="rule"></div>
    <div class="list-head"><div class="label" style="color:var(--ink2)">STOPS</div><div class="caption" style="color:var(--ink3)">${RUN.stops.length} shown</div></div>
    ${stopRows(direction, direction.stopsVisible)}
    <div class="spacer"></div>`;
    }
    return `${header(direction, 'today')}
    <div class="rule"></div>
    <div class="headline">
      <div class="label" style="color:var(--accent)">NEXT STOP</div>
      <div class="address" style="color:var(--ink)">${esc(RUN.next.address)}</div>
      <div class="body" style="color:var(--ink2)">${esc(RUN.next.suburb)} · ${esc(RUN.next.eta)} · ${RUN.next.km.toFixed(1)} km</div>
      <div class="caption" style="color:var(--ink3)">${esc(RUN.next.note)}</div>
    </div>
    <div class="rule"></div>
    <div class="counts">
      <div class="body" style="color:var(--ink2)">${RUN.delivered} delivered</div>
      <div class="body" style="color:var(--ink2)">${RUN.failed} failed</div>
      <div class="body" style="color:var(--ink2)">${RUN.kilometres} km to drive</div>
    </div>
    <div class="rule"></div>
    ${stopRows(direction, direction.stopsVisible)}
    <div class="spacer"></div>`;
  }

  if (name === 'driving') {
    const map = controlRoomMap(palette);
    const topoMapSvg = topoMap(palette);
    const addressMap = addressFirstMap(palette);
    if (direction.name === 'controlRoom') {
      return `<div class="map-wrap">${map}<div class="plate">
        <div class="plate-head"><div class="label" style="color:var(--accent)">NEXT MOVE</div><div class="caption" style="color:var(--ink3)">STOP 45</div></div>
        <div class="address" style="color:var(--ink)">${esc(RUN.next.address)}</div>
        <div class="body" style="color:var(--ink2)">${esc(RUN.next.suburb)} · ${RUN.next.km.toFixed(1)} km · ${esc(RUN.next.eta)}</div>
        <div class="rule" style="margin:12px 0"></div>
        <div class="readouts">
          <div class="readout"><div class="caption" style="color:var(--ink2)">Door note</div><div class="row" style="color:var(--ink)">${esc(RUN.next.note)}</div></div>
          <div class="readout"><div class="caption" style="color:var(--ink2)">In the van</div><div class="row" style="color:var(--ink)">${esc(RUN.next.rack)}</div></div>
        </div>
      </div></div>`;
    }
    if (direction.name === 'topo') {
      return `<div class="map-wrap">${topoMapSvg}<div class="scale"><i></i><div class="caption" style="color:var(--ink)">200 m</div></div>
      <div class="margin">
        <div class="margin-grid">
          <div><div class="caption" style="color:var(--ink3)">DISTANCE</div><div class="row tab" style="color:var(--ink)">${RUN.next.km.toFixed(1)} km</div></div>
          <div><div class="caption" style="color:var(--ink3)">ARRIVAL</div><div class="row tab" style="color:var(--ink)">${esc(RUN.next.eta)}</div></div>
          <div><div class="caption" style="color:var(--ink3)">BEARING</div><div class="row tab" style="color:var(--ink)">024°</div></div>
        </div>
        <div class="address" style="color:var(--ink)">${esc(RUN.next.address)}</div>
        <div class="body" style="color:var(--ink2)">${esc(RUN.next.suburb)} · ${RUN.next.parcels} parcels</div>
        <div class="caption tab" style="color:var(--ink3)">43.5180 S · 172.6250 E · ${esc(RUN.next.note)}</div>
      </div></div>`;
    }
    return `<div class="map-wrap">${addressMap}<div class="page">
      <div class="label" style="color:var(--accent)">STOP 45</div>
      <div class="address" style="color:var(--ink)">${esc(RUN.next.address)}</div>
      <div class="body" style="color:var(--ink2)">${esc(RUN.next.suburb)} · ${RUN.next.km.toFixed(1)} km · ${esc(RUN.next.eta)}</div>
      <div class="caption" style="color:var(--ink3)">${esc(RUN.next.note)} · ${esc(RUN.next.rack)}</div>
    </div></div>`;
  }

  if (name === 'copilot') {
    if (direction.name === 'controlRoom') {
      const level = [4, 7, 10, 6, 3]
        .map((height) => `<i style="height:${height}px"></i>`)
        .join('');
      return `<div class="strip">
      <div class="strip-head"><i class="lamp"></i><div class="label" style="color:var(--ink)">Listening</div><div class="meter">${level}</div></div>
      <div class="body" style="color:var(--ink2)">${esc(RUN.voice.said)}</div>
    </div>
    <div class="note-body">
      <div class="label" style="color:var(--ink2)">WHAT IT HEARD</div>
      <div class="body" style="color:var(--ink)">${esc(RUN.voice.heard)}</div>
      <div class="rule"></div>
      <div class="label" style="color:var(--ink2)">WHAT IT DID</div>
      <div class="body" style="color:var(--ink)">${esc(RUN.voice.intent)}</div>
      <div class="confirmed"><div class="label" style="color:var(--ok)">CONFIRMED</div><div class="body" style="color:var(--ink)">Stop 45 delivered. ${RUN.remaining} stops left.</div></div>
      <div class="rule"></div>
      <div class="label" style="color:var(--ink2)">IT CAN</div>
      ${['Mark delivered', 'Skip this stop', 'Next stop', 'How many left']
        .map(
          (command) =>
            `<div class="command"><div class="row" style="color:var(--ink)">${esc(command)}</div><div class="caption" style="color:var(--ink3)">Say it</div></div>`,
        )
        .join('\n')}
    </div>`;
    }
    if (direction.name === 'topo') {
      return `<div class="chart">
      <div class="chart-head"><div class="label" style="color:var(--ink2)">RUNNING NOTE</div><div class="caption" style="color:var(--ink3)">${esc(RUN.runName.toUpperCase())}</div></div>
      <div class="contours"><i></i><i></i><i></i><i></i><i></i><i></i></div>
    </div>
    <div class="notes">
      <div class="note accent"><div class="caption" style="color:var(--accent)">LISTENING</div><div class="body" style="color:var(--ink)">${esc(RUN.voice.said)}</div></div>
      <div class="note"><div class="caption" style="color:var(--ink3)">HEARD</div><div class="body" style="color:var(--ink2)">${esc(RUN.voice.heard)}</div></div>
      <div class="note"><div class="caption" style="color:var(--ink3)">DONE</div><div class="body" style="color:var(--ink2)">${esc(RUN.voice.intent)}</div></div>
      <div class="note ok"><div class="caption" style="color:var(--ok)">CONFIRMED</div><div class="body" style="color:var(--ink)">Stop 45 delivered. ${RUN.remaining} stops left.</div></div>
    </div>`;
    }
    return `<div class="page-body">
      <div class="label" style="color:var(--ink3)">${esc(RUN.runName.toUpperCase())} · LISTENING</div>
      <div class="address" style="color:var(--ink);margin-top:8px">${esc(RUN.next.address)}</div>
      <div class="body" style="color:var(--ink2)">${esc(RUN.next.suburb)} · ${esc(RUN.next.eta)}</div>
      <div class="rule"></div>
      <div class="annotation"><div class="label" style="color:var(--ink3)">COPILOT</div><div class="body" style="color:var(--ink)">${esc(RUN.voice.said)}</div></div>
      <div class="annotation"><div class="label" style="color:var(--ink3)">HEARD</div><div class="body" style="color:var(--ink2)">${esc(RUN.voice.heard)}</div></div>
      <div class="annotation"><div class="label" style="color:var(--ink3)">DONE</div><div class="body" style="color:var(--ink2)">${esc(RUN.voice.intent)}</div></div>
      <div class="annotation ok"><div class="label" style="color:var(--ok)">CONFIRMED</div><div class="body" style="color:var(--ink)">Stop 45 delivered. ${RUN.remaining} stops left.</div></div>
      <div class="rule"></div>
      ${['Mark delivered', 'Skip this stop', 'Next stop', 'How many left']
        .map(
          (command) =>
            `<div class="command"><div class="row" style="color:var(--ink)">${esc(command)}</div><div class="caption" style="color:var(--ink3)">Say it</div></div>`,
        )
        .join('\n')}
    </div>`;
  }

  // The scanner.
  if (direction.name === 'controlRoom') {
    return `<div class="viewfinder">
    <div class="guide"><i></i><i></i><i></i><i></i></div>
    <div class="label-card"><div class="row" style="color:var(--ink)">${esc(RUN.scan.address)}</div><div class="caption" style="color:var(--ink2)">${esc(RUN.scan.suburb)} · ${esc(RUN.scan.city)} · ${esc(RUN.scan.postcode)}</div><div class="caption" style="color:var(--ink3)">${esc(RUN.scan.parcel)}</div></div>
  </div>
  <div class="scanner-panel">
    <div class="panel-head"><div class="label" style="color:var(--ink2)">READ</div><div class="confidence" style="border-color:var(--ok);color:var(--ok)">${esc(RUN.scan.confidence.toUpperCase())}</div></div>
    <div class="address" style="color:var(--ink)">${esc(RUN.scan.address)}</div>
    <div class="body" style="color:var(--ink2)">${esc(RUN.scan.suburb)} · ${esc(RUN.scan.city)} · ${esc(RUN.scan.postcode)}</div>
    <div class="caption" style="color:var(--ink3)">${esc(RUN.scan.note)}</div>
    <div class="offline-note">The scan works with no network.</div>
  </div>`;
  }
  if (direction.name === 'topo') {
    return `<div class="viewfinder">
    <div class="frame"><i></i><i></i></div>
    <div class="readout"><div class="caption" style="color:var(--ink3)">READ</div><div class="body" style="color:var(--ink)">${esc(RUN.scan.address)}</div><div class="caption" style="color:var(--ink2)">${esc(RUN.scan.suburb)} ${esc(RUN.scan.postcode)}</div></div>
  </div>
  <div class="scanner-panel">
    <div class="panel-head"><div class="label" style="color:var(--ink2)">FIX</div><div class="caption" style="color:var(--ok)">${esc(RUN.scan.confidence.toUpperCase())}</div></div>
    <div class="address" style="color:var(--ink)">${esc(RUN.scan.address)}</div>
    <div class="body" style="color:var(--ink2)">${esc(RUN.scan.suburb)} · ${esc(RUN.scan.city)} · ${esc(RUN.scan.postcode)}</div>
    <div class="caption" style="color:var(--ink3)">${esc(RUN.scan.parcel)} · ${esc(RUN.scan.note)}</div>
    <div class="offline-note">The scan works with no network.</div>
  </div>`;
  }
  return `<div class="viewfinder">
    <div class="crop"><i></i><div class="label-card"><div class="row" style="color:var(--ink)">${esc(RUN.scan.address)}</div><div class="caption" style="color:var(--ink2)">${esc(RUN.scan.suburb)} · ${esc(RUN.scan.city)}</div><div class="caption" style="color:var(--ink3)">${esc(RUN.scan.parcel)}</div></div></div>
  </div>
  <div class="scanner-panel">
    <div class="label" style="color:var(--accent)">READ FROM THE LABEL</div>
    <div class="address" style="color:var(--ink)">${esc(RUN.scan.address)}</div>
    <div class="body" style="color:var(--ink2)">${esc(RUN.scan.suburb)} · ${esc(RUN.scan.city)} · ${esc(RUN.scan.postcode)}</div>
    <div class="caption" style="color:var(--ink3)">${esc(RUN.scan.confidence)} · ${esc(RUN.scan.note)}</div>
    <div class="offline-note">The scan works with no network.</div>
  </div>`;
}

/** The action bar and the voice strip of a screen. */
function footer(direction, name) {
  if (name === 'driving') {
    return `<div class="action-bar"><div class="primary">Delivered</div></div>
    <div class="voice-strip" style="border-top:1px solid var(--border)">
      ${
        direction.name === 'controlRoom'
          ? '<i class="lamp"></i><div class="caption" style="color:var(--ink2)">Listening</div>'
          : direction.name === 'topo'
            ? '<div class="caption" style="color:var(--ink2)">LISTENING</div>'
            : '<div class="caption" style="color:var(--ink2)">Copilot is listening</div>'
      }
    </div>`;
  }
  if (name === 'copilot') {
    return `<div class="action-bar"><div class="primary">Talk to Copilot</div></div>`;
  }
  if (name === 'scanner') {
    return `<div class="action-bar"><div class="primary">Use this address</div><div class="secondary">Correct this address</div></div>`;
  }
  return `<div class="action-bar"><div class="primary">Next stop</div></div>
  <div class="voice-strip" style="border-top:1px solid var(--border)">
    ${
      direction.name === 'controlRoom'
        ? '<i class="lamp"></i><div class="caption" style="color:var(--ink2)">Listening</div><div class="caption" style="color:var(--ink3);margin-left:auto">' +
          RUN.queued +
          ' waiting</div>'
        : direction.name === 'topo'
          ? '<div class="caption" style="color:var(--ink2)">LISTENING · ' +
            RUN.queued +
            ' WAITING</div>'
          : '<div class="caption" style="color:var(--ink2)">Copilot is listening · ' +
            RUN.queued +
            ' actions waiting</div>'
    }
  </div>`;
}

/** The CSS of a direction, the part that is not the type scale. */
function directionCss(direction) {
  const shared = `
  *{box-sizing:border-box;}
  body{margin:0;padding:32px 16px 64px;background:#d8d9d6;display:flex;flex-direction:column;align-items:center;gap:28px;font-family:${direction.fonts.work},sans-serif;}
  .frame{display:none;width:390px;height:844px;overflow:hidden;flex-direction:column;background:var(--bg);color:var(--ink);position:relative;}
  body:not(:has(.frame:target)) .frame{display:flex;}
  .frame:target{display:flex;}
  .rule{height:1px;background:var(--border);margin:0 16px;flex:none;}
  .header{display:flex;align-items:center;justify-content:space-between;padding:12px 16px;flex:none;}
  .header-left{display:flex;flex-direction:column;gap:2px;}
  .header-right{display:flex;align-items:center;gap:4px;}
  .icon{width:56px;height:56px;display:flex;align-items:center;justify-content:center;color:var(--ink);}
  .row-main{flex:1;min-width:0;display:flex;flex-direction:column;gap:1px;}
  .row-right{display:flex;flex-direction:column;align-items:flex-end;}
  .spacer{flex:1;}
  .action-bar{padding:12px 16px 8px;flex:none;}
  .primary{height:72px;width:100%;border-radius:${direction.radii.control}px;background:var(--accent);color:var(--surface);display:flex;align-items:center;justify-content:center;font-size:22px;font-weight:600;}
  .secondary{height:56px;width:100%;margin-top:8px;border-radius:${direction.radii.control}px;border:1px solid var(--border);color:var(--ink);display:flex;align-items:center;justify-content:center;font-size:19px;font-weight:500;}
  .voice-strip{height:64px;display:flex;align-items:center;gap:8px;padding:0 16px 8px;flex:none;}
  .lamp{width:8px;height:8px;background:var(--accent);display:inline-block;}
  .map{position:absolute;inset:0;width:100%;height:100%;}
  .map-wrap{position:relative;flex:1;min-height:0;overflow:hidden;}
  .viewfinder{flex:1;background:var(--ink);display:flex;flex-direction:column;align-items:center;justify-content:center;gap:24px;position:relative;}
  .scanner-panel{padding:16px;flex:none;}
  .panel-head{display:flex;align-items:center;justify-content:space-between;}
  .confidence{border:1px solid;padding:4px 8px;font-size:17px;font-weight:600;letter-spacing:0.02em;}
  .offline-note{text-align:center;font-size:17px;color:var(--ink3);margin-top:12px;}
  .capture{max-width:760px;font-size:15px;line-height:22px;color:#2b2f31;}
  .capture h1{font-size:22px;margin:0 0 8px;}
  .capture code{font-family:ui-monospace,Menlo,Consolas,monospace;font-size:13px;}
  .swatches{display:flex;flex-wrap:wrap;gap:10px;margin-top:12px;}
  .swatch{display:flex;align-items:center;gap:6px;font-size:13px;}
  .chip{width:22px;height:22px;border-radius:4px;border:1px solid #00000022;}
  `;

  if (direction.name === 'controlRoom') {
    return `${shared}
  .gauge-block{padding:12px 16px;display:flex;flex-direction:column;gap:12px;flex:none;}
  .gauge-row{display:flex;align-items:baseline;gap:12px;}
  .gauge{display:flex;align-items:center;gap:3px;height:24px;position:relative;}
  .gauge i{width:12px;height:12px;display:block;}
  .gauge b{position:absolute;left:0;top:0;width:2px;height:24px;background:var(--ink);}
  .readouts{display:flex;padding:12px 16px;flex:none;}
  .readout{flex:1;display:flex;flex-direction:column;gap:2px;}
  .readout.split{border-left:1px solid var(--border);padding-left:12px;}
  .next-move{padding:12px 16px;display:flex;flex-direction:column;gap:2px;flex:none;}
  .next-head{display:flex;align-items:center;justify-content:space-between;}
  .list-head{display:flex;align-items:center;justify-content:space-between;padding:12px 16px 4px;flex:none;}
  .row{display:flex;align-items:center;gap:12px;min-height:56px;padding:8px 16px;border-bottom:1px solid var(--border);flex:none;}
  .plate{position:absolute;left:0;right:0;bottom:0;background:var(--surface);padding:12px 16px;}
  .plate-head{display:flex;align-items:center;justify-content:space-between;}
  .strip{padding:12px 16px;border-bottom:1px solid var(--border);display:flex;flex-direction:column;gap:8px;flex:none;}
  .strip-head{display:flex;align-items:center;gap:12px;}
  .meter{margin-left:auto;display:flex;align-items:flex-end;gap:3px;}
  .meter i{width:3px;background:var(--ink3);display:block;}
  .note-body{padding:16px;display:flex;flex-direction:column;gap:4px;flex:1;overflow:hidden;}
  .confirmed{border:1px solid var(--ok);border-radius:${direction.radii.control}px;padding:12px;margin-top:12px;display:flex;flex-direction:column;gap:4px;}
  .command{display:flex;align-items:center;justify-content:space-between;min-height:56px;border-bottom:1px solid var(--border);}
  .guide{width:280px;height:180px;position:relative;}
  .guide i{position:absolute;width:24px;height:24px;border:3px solid var(--accent);}
  .guide i:nth-child(1){top:0;left:0;border-right:0;border-bottom:0;}
  .guide i:nth-child(2){top:0;right:0;border-left:0;border-bottom:0;}
  .guide i:nth-child(3){bottom:0;left:0;border-right:0;border-top:0;}
  .guide i:nth-child(4){bottom:0;right:0;border-left:0;border-top:0;}
  .label-card{background:var(--surface);padding:12px 16px;display:flex;flex-direction:column;gap:2px;margin-top:24px;}`;
  }

  if (direction.name === 'topo') {
    return `${shared}
  .header{gap:12px;padding:12px 20px;}
  .north{display:flex;align-items:center;gap:4px;}
  .profile-block{padding:12px 20px;display:flex;flex-direction:column;gap:12px;flex:none;}
  .profile-head{display:flex;align-items:flex-start;justify-content:space-between;}
  .metric-block{display:flex;flex-direction:column;align-items:flex-end;}
  .profile{display:flex;align-items:flex-end;gap:6px;height:40px;}
  .profile i{width:18px;display:block;}
  .next-block{padding:16px 20px;display:flex;flex-direction:column;gap:2px;position:relative;overflow:hidden;flex:none;}
  .contours{position:absolute;inset:0;display:flex;flex-direction:column;justify-content:center;pointer-events:none;}
  .contours i{height:0;border-bottom:1px solid var(--border);margin:9px 0;}
  .list-head{display:flex;align-items:center;justify-content:space-between;padding:12px 20px 4px;flex:none;}
  .row{display:flex;align-items:center;gap:12px;min-height:56px;padding:8px 20px;border-bottom:1px solid var(--border);flex:none;}
  .margin{position:absolute;left:0;right:0;bottom:0;background:var(--bg);padding:12px 20px 0;}
  .margin-grid{display:flex;gap:20px;margin-bottom:12px;}
  .margin-grid>div{display:flex;flex-direction:column;gap:2px;}
  .scale{position:absolute;left:20px;bottom:12px;display:flex;flex-direction:column;align-items:flex-start;gap:2px;}
  .scale i{width:60px;height:2px;background:var(--ink);display:block;}
  .chart{height:120px;position:relative;overflow:hidden;flex:none;padding-top:16px;}
  .chart-head{display:flex;align-items:center;justify-content:space-between;padding:0 20px;}
  .notes{flex:1;padding:12px 20px;display:flex;flex-direction:column;gap:12px;overflow:hidden;}
  .note{border-left:2px solid var(--border);padding-left:12px;display:flex;flex-direction:column;gap:2px;}
  .note.accent{border-left-color:var(--accent);}
  .note.ok{border-left-color:var(--ok);}
  .frame{width:280px;height:170px;border:1px solid var(--ink2);position:relative;}
  .frame i{position:absolute;left:0;right:0;height:1px;background:var(--ink2);}
  .frame i:nth-child(1){top:0;}
  .frame i:nth-child(2){bottom:0;}
  .readout{display:flex;flex-direction:column;align-items:center;gap:2px;}`;
  }

  return `${shared}
  .masthead{display:flex;align-items:flex-start;gap:16px;padding:16px 24px 12px;flex:none;}
  .masthead-text{flex:1;display:flex;flex-direction:column;gap:2px;}
  .folio{display:flex;flex-direction:column;align-items:flex-end;}
  .headline{padding:16px 24px;display:flex;flex-direction:column;gap:2px;flex:none;}
  .counts{display:flex;gap:16px;padding:12px 24px;flex:none;}
  .entry{display:flex;gap:12px;min-height:64px;padding:10px 24px;flex:none;}
  .entry-main{flex:1;display:flex;flex-direction:column;gap:2px;}
  .page{position:absolute;left:0;right:0;bottom:0;background:var(--surface);padding:16px 24px 0;display:flex;flex-direction:column;gap:2px;}
  .page-body{flex:1;padding:24px;display:flex;flex-direction:column;gap:4px;overflow:hidden;}
  .annotation{border-left:2px solid transparent;padding-left:12px;padding:6px 0;display:flex;flex-direction:column;gap:2px;}
  .annotation.ok{border-left-color:var(--ok);}
  .command{display:flex;align-items:center;justify-content:space-between;min-height:56px;border-bottom:1px solid var(--border);}
  .crop{width:300px;display:flex;flex-direction:column;align-items:center;gap:16px;}
  .crop>i{height:1px;align-self:stretch;background:var(--surface);}
  .label-card{background:var(--surface);padding:12px 16px;display:flex;flex-direction:column;gap:2px;}`;
}

/** The whole HTML file of a direction. */
function renderFile(direction) {
  const frames = [];

  for (const theme of THEMES) {
    const themeName = direction[theme.themeName];
    const palette = mapPalettes2a[themeName];
    for (const name of SCREENS) {
      const id = `${name}-${theme.suffix}`;
      frames.push(
        `<div class="frame" id="${id}" style="${variables(themes[themeName], palette)}">
  ${screen(direction, name, palette)}
  ${footer(direction, name)}
</div>`,
      );
    }
  }

  return `<!doctype html>
<html lang="en-NZ">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>${esc(direction.displayName)} — ${esc(direction.idea)} — Courier Copilot</title>
${fontLink(direction)}
<style>
${directionCss(direction)}
${typeCss(direction)}
</style>
</head>
<body>
${frames.join('\n')}
<div class="capture">
  <h1>${esc(direction.displayName)} — ${esc(direction.idea)}</h1>
  <p>
    The four screens of the direction, in the day and at night, drawn with the palette of
    <code>packages/design-tokens/src/themes2a.ts</code> and the type scale of
    <code>packages/design-tokens/src/directions2a.ts</code>. The frames are addressable:
    <code>render.html#today-light</code> opens one screen at a time, which is how
    <code>scripts/design/render-directions.mjs</code> shoots the PNGs.
  </p>
  <div class="swatches">
    <div class="swatch"><span class="chip" style="background:${themes[direction.themeName].colors.background}"></span> background ${themes[direction.themeName].colors.background}</div>
    <div class="swatch"><span class="chip" style="background:${themes[direction.themeName].colors.textPrimary}"></span> textPrimary ${themes[direction.themeName].colors.textPrimary}</div>
    <div class="swatch"><span class="chip" style="background:${themes[direction.themeName].colors.brandPrimary}"></span> brandPrimary ${themes[direction.themeName].colors.brandPrimary}</div>
    <div class="swatch"><span class="chip" style="background:${themes[direction.themeName].colors.brandSecondary}"></span> brandSecondary ${themes[direction.themeName].colors.brandSecondary}</div>
    <div class="swatch"><span class="chip" style="background:${themes[direction.nightThemeName].colors.background}"></span> night background ${themes[direction.nightThemeName].colors.background}</div>
  </div>
</div>
</body>
</html>
`;
}

for (const entry of DIRECTIONS) {
  const direction = directions2a[entry.name];
  const folder = join(repo, 'docs', 'design', 'directions-2', entry.folder);
  mkdirSync(folder, { recursive: true });
  writeFileSync(join(folder, 'render.html'), renderFile(direction), 'utf8');
  console.log(`wrote ${entry.folder}/render.html`);
}

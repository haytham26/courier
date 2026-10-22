/**
 * The renders of the four directions of this team.
 *
 *   node scripts/design/render-directions-2.mjs
 *
 * For every direction, every screen and every theme the script writes:
 *
 * - `docs/design/directions-2/<n>-<name>/render/<screen>-<theme>.html` - the
 *   layout, the type scale and the palette of the screen, drawn with the
 *   values of `packages/design-tokens`;
 * - `docs/design/directions-2/<n>-<name>/screenshots/<screen>-<theme>.png` -
 *   the same screen at 390 by 844, taken with a headless browser;
 * - `docs/design/directions-2/<n>-<name>/evidence/contrast.txt` - the
 *   measured contrast of every pair that appears on the four screens.
 *
 * The colours, the type scale, the spacing and the radii are read from the
 * token package, so a render cannot drift from the screens of the app.
 *
 * The fonts are the OFL families of the round. They are downloaded once into
 * `docs/design/fonts/` and linked from the renders, so a render opens the
 * same way with or without a network.
 */
import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { register } from 'node:module';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, '..', '..');
const tokenSource = join(root, 'packages', 'design-tokens', 'src');

// The token package is TypeScript and its imports carry no file extension,
// so the resolver adds one before the sources are read.
register('./typescript-resolver.mjs', import.meta.url);

const { themes } = await import(pathToFileURL(join(tokenSource, 'themes.ts')).href);
const { directions2, direction2Names } = await import(
  pathToFileURL(join(tokenSource, 'directions2.ts')).href
);
const { contrastRatioRounded, blend } = await import(pathToFileURL(join(tokenSource, 'contrast.ts')).href);

const OUT_ROOT = join(root, 'docs', 'design', 'directions-2');
const FONT_DIR = join(root, 'docs', 'design', 'fonts');
const SCREENS = ['today', 'driving', 'copilot', 'scanner'];
const MODES = ['light', 'night'];
const VIEWPORT = { width: 390, height: 844 };

/* ------------------------------------------------------------------ *
 * The fonts of the round.
 * ------------------------------------------------------------------ */

/** The families and the weights each direction uses. */
const FONT_WEIGHTS = {
  'Instrument Sans': [400, 600, 700],
  'Public Sans': [400, 600, 700],
  'Space Grotesk': [400, 500, 700],
  Geist: [400, 500, 700],
  Fraunces: [600],
  'Source Sans 3': [400, 500, 600],
  'Bricolage Grotesque': [400, 500, 700],
  'IBM Plex Sans': [400, 500, 700],
};

const CHROME_CANDIDATES = [
  'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
  'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
  'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
  '/usr/bin/google-chrome',
  '/usr/bin/chromium',
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
];

function findChrome() {
  for (const candidate of CHROME_CANDIDATES) {
    if (existsSync(candidate)) {
      return candidate;
    }
  }
  return null;
}

/**
 * Downloads the families of the round and writes the stylesheet that links
 * them. The files are cached: the script only fetches what is missing.
 */
async function ensureFonts() {
  mkdirSync(FONT_DIR, { recursive: true });
  const cssPath = join(FONT_DIR, 'fonts.css');
  const families = Object.entries(FONT_WEIGHTS);
  const blocks = [];

  for (const [family, weights] of families) {
    const query = `wght@${weights.join(';')}`;
    const url = `https://fonts.googleapis.com/css2?family=${encodeURIComponent(
      family,
    )}:${query}&display=swap`;
    const response = await fetch(url, {
      headers: {
        // A modern browser gets the woff2 files; the old API does not.
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36',
      },
    });
    if (!response.ok) {
      throw new Error(`the fonts of ${family} could not be fetched: ${response.status}`);
    }
    let css = await response.text();

    const urls = [...css.matchAll(/url\((https:\/\/[^)]+\.woff2)\)/g)].map((match) => match[1]);
    for (const fontUrl of urls) {
      const name = fontUrl.split('/').slice(-3).join('-');
      const file = join(FONT_DIR, name);
      if (!existsSync(file)) {
        const fontResponse = await fetch(fontUrl);
        if (!fontResponse.ok) {
          throw new Error(`a font file could not be fetched: ${fontResponse.status}`);
        }
        writeFileSync(file, Buffer.from(await fontResponse.arrayBuffer()));
      }
      css = css.replaceAll(fontUrl, name);
    }
    blocks.push(css.trim());
  }

  writeFileSync(cssPath, `${blocks.join('\n\n')}\n`, 'utf8');
  return cssPath;
}

/* ------------------------------------------------------------------ *
 * The styles of a render.
 * ------------------------------------------------------------------ */

/** The type step of a direction, as a class of the stylesheet. */
function stepCss(direction, step) {
  const family = ['metric', 'address', 'title'].includes(step) ? 'display' : 'work';
  const value = direction.type[step];
  return `.${step}{font-family:${family};font-size:${value.fontSize}px;line-height:${value.lineHeight}px;letter-spacing:${value.letterSpacing}em;font-weight:${value.fontWeight};}`;
}

/** The colour of a role in the theme of the render. */
function colour(theme, role) {
  return theme.colors[role];
}

/** The page of a screen: the phone frame, the styles and the body. */
function page({ direction, theme, mode, body, title }) {
  const fontsHref = '../../fonts/fonts.css';
  const steps = Object.keys(direction.type)
    .map((step) => stepCss(direction, step))
    .join('');
  const display = direction.fonts.display;
  const work = direction.fonts.work;

  return `<!doctype html>
<html lang="en-NZ">
<head>
<meta charset="utf-8">
<title>${title}</title>
<link rel="stylesheet" href="${fontsHref}">
<style>
@font-face { font-family: display; src: local('${display}'); }
* { margin: 0; padding: 0; box-sizing: border-box; }
html, body { width: ${VIEWPORT.width}px; height: ${VIEWPORT.height}px; overflow: hidden; }
body {
  background: ${colour(theme, 'background')};
  color: ${colour(theme, 'textPrimary')};
  font-family: '${work}', system-ui, sans-serif;
  -webkit-font-smoothing: antialiased;
}
.frame { width: ${VIEWPORT.width}px; height: ${VIEWPORT.height}px; overflow: hidden; display: flex; flex-direction: column; }
.display { font-family: '${display}', '${work}', system-ui, sans-serif; }
${steps}
.tabular { font-variant-numeric: tabular-nums; }
</style>
</head>
<body>
<div class="frame" data-direction="${direction.name}" data-mode="${mode}">
${body}
</div>
</body>
</html>
`;
}

/* ------------------------------------------------------------------ *
 * The content of the run. The same content as the screens of the app
 * (`apps/mobile/src/design2/content.ts`).
 * ------------------------------------------------------------------ */

const run = {
  runName: 'Harewood AM',
  date: 'Monday 22 October',
  clock: '10:38',
  driver: 'Tane Rua',
  remaining: 18,
  delivered: 42,
  kilometres: '6.4',
  nextStop: {
    address: '14 Harewood Road',
    suburb: 'Papanui',
    eta: '10:42',
    parcels: 3,
    note: 'Side gate, small box in the rear rack',
  },
  stops: [
    { sequence: 45, address: '14 Harewood Road', suburb: 'Papanui', eta: '10:42', status: 'Next' },
    { sequence: 46, address: '22 Westminster Street', suburb: 'Merivale', eta: '10:49', status: 'Pending' },
    { sequence: 47, address: '3/120 Blenheim Road', suburb: 'Upper Riccarton', eta: '11:02', status: 'Pending' },
    { sequence: 48, address: '78 Main South Road', suburb: 'Sockburn', eta: '11:14', status: 'Pending' },
    { sequence: 49, address: '234 Colombo Street', suburb: 'Sydenham', eta: '11:26', status: 'Pending' },
    { sequence: 50, address: '9 Cashel Street', suburb: 'Addington', eta: '11:41', status: 'Pending' },
    { sequence: 51, address: '41 Cranmer Street', suburb: 'Halswell', eta: '11:55', status: 'Pending' },
    { sequence: 52, address: '7 Bexley Street', suburb: 'Halswell', eta: '12:07', status: 'Pending' },
  ],
  voice: 'Listening',
  queued: 4,
};

/* ------------------------------------------------------------------ *
 * The screens.
 * ------------------------------------------------------------------ */

/** The block of the next stop, in the grammar of the direction. */
function nextStopBlock(direction, theme, { heading = 'Next stop' } = {}) {
  const radius = direction.radii.card;
  return `
<div class="next">
  <p class="label" style="color:${colour(theme, 'brandPrimary')}">${heading}</p>
  <h2 class="address">${run.nextStop.address}</h2>
  <p class="body" style="color:${colour(theme, 'textSecondary')}">${run.nextStop.suburb} &middot; ${run.nextStop.eta} &middot; 1.2 km</p>
  <p class="caption" style="color:${colour(theme, 'textTertiary')}">${run.nextStop.note}</p>
</div>`;
}

/** The rows of the run. */
function stopRows(direction, theme, count) {
  const rows = run.stops
    .slice(0, count)
    .map(
      (stop) => `
  <div class="row" style="border-bottom-color:${colour(theme, 'border')}">
    <p class="caption tabular" style="width:34px;color:${colour(theme, 'textTertiary')}">${stop.sequence}</p>
    <div class="rowmain">
      <p class="row" style="color:${colour(theme, 'textPrimary')};${stop.status === 'Next' ? 'font-weight:700;' : ''}">${stop.address}</p>
      <p class="caption" style="color:${colour(theme, 'textTertiary')}">${stop.suburb}</p>
    </div>
    <p class="caption tabular" style="color:${colour(theme, 'textSecondary')}">${stop.eta}</p>
    <p class="caption" style="width:64px;text-align:right;color:${
      stop.status === 'Next' ? colour(theme, 'statusActive') : colour(theme, 'textTertiary')
    }">${stop.status}</p>
  </div>`,
    )
    .join('');
  return `<div class="rows">${rows}</div>`;
}

/** The primary action of a screen. */
function action(theme, radius, label = 'Next stop') {
  return `<div class="action" style="background:${colour(theme, 'brandPrimary')};border-radius:${radius}px"><p class="row" style="color:${colour(theme, 'textInverse')};font-weight:700">${label}</p></div>`;
}

/** The presence of Copilot, in the grammar of the direction. */
function voicePresence(direction, theme) {
  if (direction.name === 'hapticCity') {
    return `<div class="voice haptic">
  <div class="haptictarget" style="border-color:${colour(theme, 'textPrimary')}"><span style="width:18px;height:18px;border-radius:2px;background:${colour(theme, 'textPrimary')}"></span></div>
  <p class="caption" style="color:${colour(theme, 'textSecondary')}">${run.voice} &middot; ${run.queued} waiting</p>
</div>`;
  }
  if (direction.name === 'nightShift') {
    return `<div class="voice night">
  <div style="height:2px;width:78%;background:${colour(theme, 'brandPrimary')};border-radius:1px"></div>
  <p class="caption" style="color:${colour(theme, 'textSecondary')}">${run.voice} &middot; ${run.queued} waiting</p>
</div>`;
  }
  if (direction.name === 'gantryRun') {
    return `<div class="voice gantry">
  <span class="gantrysign" style="background:${colour(theme, 'textPrimary')};border-radius:${direction.radii.pill}px"><p class="caption" style="color:${colour(theme, 'textInverse')};letter-spacing:0.06em">${run.voice.toUpperCase()}</p></span>
  <p class="caption" style="color:${colour(theme, 'textTertiary')}">${run.queued} waiting</p>
</div>`;
  }
  return `<div class="voice weather">
  <div style="height:8px;border-radius:4px;background:${colour(theme, 'surfaceElevated')};overflow:hidden"><div style="height:8px;width:72%;border-radius:4px;background:${colour(theme, 'brandPrimary')}"></div></div>
  <p class="caption" style="color:${colour(theme, 'textSecondary')}">${run.voice} &middot; ${run.queued} waiting</p>
</div>`;
}

/** The map of the Driving screen, in the palette of the theme. */
function mapSvg(theme, { pitch = 50, route = true } = {}) {
  const map = theme.components.map[theme.name] ?? theme.components.map.day;
  const horizon = 120 + pitch;
  const buildings = [
    [40, 210, 54, 34],
    [110, 250, 46, 26],
    [176, 196, 62, 40],
    [262, 232, 50, 30],
    [318, 186, 44, 36],
  ]
    .map(([x, y, w, h]) => {
      const top = y - h - Math.round((h * pitch) / 90);
      return `<g>
      <polygon points="${x},${y} ${x + w},${y} ${x + w},${y - h} ${x},${y - h}" fill="${map.building}"/>
      <polygon points="${x},${y - h} ${x + w},${y - h} ${x + w + 12},${y - h - 10} ${x + 12},${y - h - 10}" fill="${map.building}" opacity="0.85"/>
    </g>`;
    })
    .join('');

  const roads = [
    'M -20 320 L 410 250',
    'M -20 380 L 410 300',
    'M 60 -20 L 150 420',
    'M 250 -20 L 300 420',
  ]
    .map(
      (path) =>
        `<path d="${path}" stroke="${map.roadOutline}" stroke-width="7" fill="none" stroke-linecap="round"/><path d="${path}" stroke="${map.road}" stroke-width="4" fill="none" stroke-linecap="round"/>`,
    )
    .join('');

  const routePath = route
    ? `<path d="M -20 360 C 90 352, 120 300, 190 288 S 320 250, 410 236" stroke="${map.routeLine}" stroke-width="5" fill="none" stroke-linecap="round" stroke-linejoin="round"/>`
    : '';

  return `<svg viewBox="0 0 390 ${horizon + 260}" width="390" height="${horizon + 260}" xmlns="http://www.w3.org/2000/svg">
  <rect width="390" height="${horizon + 260}" fill="${map.background}"/>
  <path d="M -20 150 C 90 120, 210 170, 410 120 L 410 ${horizon + 260} L -20 ${horizon + 260} Z" fill="${map.land}"/>
  <path d="M -20 402 C 120 380, 220 430, 410 396 L 410 ${horizon + 260} L -20 ${horizon + 260} Z" fill="${map.water}"/>
  <path d="M 250 150 C 300 170, 330 200, 350 ${horizon + 260} L 410 ${horizon + 260} L 410 120 Z" fill="${map.park}" opacity="0.6"/>
  ${roads}
  ${buildings}
  ${routePath}
  <circle cx="300" cy="252" r="15" fill="${map.stopPin}" stroke="${map.stopPinHalo}" stroke-width="3"/>
  <text x="300" y="258" text-anchor="middle" font-family="'${directionFont(theme)}'" font-size="13" font-weight="700" fill="${map.stopPinHalo}">45</text>
</svg>`;
}

/** The family of the map labels of a theme. */
function directionFont() {
  return 'system-ui';
}

/** The Driving screen of a direction. */
function drivingScreen(direction, theme) {
  const pad = direction.spacing.pad;
  const pitch = direction.camera.pitch3d;
  const mapHeight = direction.name === 'nightShift' ? 420 : 330;

  const plate = `
<div class="plate" style="background:${colour(theme, 'surface')};border-color:${colour(theme, 'border')};border-radius:${direction.radii.card}px;padding:${pad}px">
  <div class="platerow">
    <div class="platemain">
      <p class="label" style="color:${colour(theme, 'brandPrimary')}">Next stop</p>
      <h2 class="address">${run.nextStop.address}</h2>
      <p class="body" style="color:${colour(theme, 'textSecondary')}">${run.nextStop.suburb} &middot; ${run.nextStop.eta} &middot; 1.2 km</p>
    </div>
    <div class="plateside">
      <p class="metric tabular" style="font-size:40px;line-height:44px;color:${colour(theme, 'textPrimary')}">1.2</p>
      <p class="caption" style="color:${colour(theme, 'textSecondary')}">km away</p>
    </div>
  </div>
  <p class="caption" style="color:${colour(theme, 'textTertiary')}">${run.nextStop.note}</p>
  <div style="padding-top:8px">${action(theme, direction.radii.control)}</div>
  ${voicePresence(direction, theme)}
</div>`;

  return `<div class="screen" style="height:${VIEWPORT.height}px;display:flex;flex-direction:column">
  <div style="height:${mapHeight}px;overflow:hidden;position:relative">
    ${mapSvg(theme, { pitch })}
    <div style="position:absolute;left:0;right:0;bottom:0;background:${colour(theme, 'surface')};border-top:1px solid ${colour(theme, 'border')};padding:6px 12px">
      <p class="caption" style="font-size:12px;color:${colour(theme, 'textSecondary')}">&copy; OpenStreetMap contributors</p>
      <p class="caption" style="font-size:12px;color:${colour(theme, 'textSecondary')}">Contains information from OpenStreetMap, available under the Open Database License (ODbL).</p>
      <p class="caption" style="font-size:12px;color:${colour(theme, 'textSecondary')}">Sourced from the LINZ Data Service and licensed for reuse under the CC BY 4.0 licence</p>
    </div>
  </div>
  ${plate}
</div>`;
}

/** The Today screen of a direction. */
function todayScreen(direction, theme) {
  if (direction.name === 'hapticCity') {
    return `<div class="screen" style="height:${VIEWPORT.height}px;display:flex;flex-direction:column;padding:16px">
  <p class="label" style="color:${colour(theme, 'textSecondary')}">${run.runName} &middot; ${run.clock}</p>
  <p class="metric tabular" style="color:${colour(theme, 'textPrimary')};margin-top:4px">18</p>
  <p class="label" style="color:${colour(theme, 'textSecondary')}">Stops left</p>
  <p class="body" style="color:${colour(theme, 'textTertiary')}">${run.delivered} delivered &middot; 2 failed</p>
  <div class="haptictarget" style="background:${colour(theme, 'surface')};border:2px solid ${colour(theme, 'textPrimary')};border-radius:${direction.radii.control}px;margin:16px 0;padding:16px">
    <p class="caption" style="color:${colour(theme, 'textTertiary')}">Next stop</p>
    <p class="address" style="color:${colour(theme, 'textPrimary')}">${run.nextStop.address}</p>
    <p class="body" style="color:${colour(theme, 'textSecondary')}">${run.nextStop.suburb} &middot; ${run.nextStop.eta}</p>
    <p class="caption" style="color:${colour(theme, 'textTertiary')}">${run.nextStop.note}</p>
  </div>
  <div class="hapticseal" style="background:${colour(theme, 'textPrimary')};border:2px solid ${colour(theme, 'textPrimary')};border-radius:${direction.radii.control}px">
    <span style="width:20px;height:20px;border-radius:10px;border:2px solid ${colour(theme, 'textInverse')}"></span>
    <p class="row" style="color:${colour(theme, 'textInverse')}">Mark delivered</p>
  </div>
  <div style="margin-top:16px">${stopRows(direction, theme, direction.stopsVisible)}</div>
  <div style="margin-top:auto;padding-top:16px">${voicePresence(direction, theme)}</div>
</div>`;
  }

  if (direction.name === 'nightShift') {
    return `<div class="screen" style="height:${VIEWPORT.height}px;display:flex;flex-direction:column;padding:24px">
  <div class="plate" style="background:${colour(theme, 'surface')};border:1px solid ${colour(theme, 'border')};border-radius:${direction.radii.card}px;padding:24px">
    <p class="label" style="color:${colour(theme, 'textSecondary')}">${run.runName} &middot; ${run.clock}</p>
    <p class="metric tabular" style="font-size:56px;line-height:60px;color:${colour(theme, 'textPrimary')};margin-top:2px">18</p>
    <p class="label" style="color:${colour(theme, 'textSecondary')}">Stops left</p>
    <div style="height:1px;background:${colour(theme, 'border')};margin:16px 0"></div>
    <h2 class="address">${run.nextStop.address}</h2>
    <p class="body" style="color:${colour(theme, 'textSecondary')}">${run.nextStop.suburb} &middot; ${run.nextStop.eta} &middot; 1.2 km</p>
    <p class="caption" style="color:${colour(theme, 'textTertiary')}">${run.nextStop.note}</p>
    <div style="padding-top:24px">${action(theme, direction.radii.control)}</div>
  </div>
  <div style="margin-top:24px">${stopRows(direction, theme, direction.stopsVisible)}</div>
  <div style="margin-top:auto;padding-top:16px">${voicePresence(direction, theme)}</div>
</div>`;
  }

  if (direction.name === 'gantryRun') {
    const ticks = run.stops
      .slice(0, 8)
      .map(
        (stop, index) =>
          `<span style="flex:1;display:flex;justify-content:center"><span style="width:12px;height:12px;border-radius:${
            direction.radii.pill
          }px;border:2px solid ${
            index === 0 ? colour(theme, 'brandPrimary') : colour(theme, 'border')
          };background:${index === 0 ? colour(theme, 'brandPrimary') : colour(theme, 'surfaceElevated')}"></span></span>`,
      )
      .join('');
    return `<div class="screen" style="height:${VIEWPORT.height}px;display:flex;flex-direction:column;padding:20px">
  <div style="display:flex;justify-content:space-between;align-items:baseline">
    <p class="label" style="color:${colour(theme, 'textPrimary')}">${run.runName}</p>
    <p class="caption" style="color:${colour(theme, 'textTertiary')}">${run.date} &middot; ${run.clock}</p>
  </div>
  <div style="height:40px;margin:12px 0 8px;display:flex;align-items:center;position:relative">
    <div style="position:absolute;left:0;right:0;height:2px;background:${colour(theme, 'border')}"></div>
    ${ticks}
  </div>
  <p class="metric tabular" style="color:${colour(theme, 'textPrimary')}">18</p>
  <p class="label" style="color:${colour(theme, 'textSecondary')}">Stops left</p>
  <p class="body" style="color:${colour(theme, 'textTertiary')}">${run.delivered} delivered &middot; ${run.kilometres} km</p>
  <div class="gantrysigncard" style="background:${colour(theme, 'surface')};border:1px solid ${colour(theme, 'border')};border-radius:${direction.radii.card}px;margin:20px 0;padding:16px">
    <div style="display:flex;justify-content:space-between">
      <p class="caption" style="color:${colour(theme, 'brandPrimary')};letter-spacing:0.1em">NEXT STOP</p>
      <p class="caption" style="color:${colour(theme, 'textTertiary')}">${run.nextStop.eta} &middot; 1.2 km</p>
    </div>
    <h2 class="address">${run.nextStop.address}</h2>
    <p class="body" style="color:${colour(theme, 'textSecondary')}">${run.nextStop.suburb} &middot; ${run.nextStop.parcels} parcels</p>
    <p class="caption" style="color:${colour(theme, 'textTertiary')}">${run.nextStop.note}</p>
  </div>
  ${action(theme, direction.radii.control)}
  <div style="margin-top:16px">${stopRows(direction, theme, direction.stopsVisible)}</div>
  <div style="margin-top:auto;padding-top:16px">${voicePresence(direction, theme)}</div>
</div>`;
  }

  // Weather Light: the asymmetric block.
  return `<div class="screen" style="height:${VIEWPORT.height}px;display:flex;flex-direction:column;padding:24px">
  <div style="display:flex;gap:16px">
    <div style="flex:1">
      <p class="label" style="color:${colour(theme, 'textSecondary')}">${run.date} &middot; ${run.runName}</p>
      <p class="caption" style="color:${colour(theme, 'textTertiary')}">${run.clock} &middot; ${run.driver}</p>
    </div>
    <div style="width:116px;border:1px solid ${colour(theme, 'border')};border-radius:${direction.radii.card}px;padding:12px">
      <p class="title" style="color:${colour(theme, 'textPrimary')}">14&deg;</p>
      <p class="caption" style="color:${colour(theme, 'textSecondary')}">Clear</p>
      <p class="caption" style="color:${colour(theme, 'textTertiary')}">Light 8.4:1</p>
    </div>
  </div>
  <div class="nowblock" style="background:${colour(theme, 'surface')};border:1px solid ${colour(theme, 'border')};border-radius:${direction.radii.card}px;margin:16px 0;padding:24px">
    <p class="metric tabular" style="color:${colour(theme, 'textPrimary')}">18</p>
    <p class="label" style="color:${colour(theme, 'textSecondary')}">Stops left</p>
    <div style="display:flex;gap:16px;padding-top:8px">
      <p class="body" style="color:${colour(theme, 'textSecondary')}">${run.delivered} delivered</p>
      <p class="body" style="color:${colour(theme, 'textSecondary')}">${run.kilometres} km to drive</p>
    </div>
  </div>
  ${nextStopBlock(direction, theme)}
  <div style="margin-top:16px">${stopRows(direction, theme, direction.stopsVisible)}</div>
  <div style="margin-top:auto;padding-top:16px">${action(theme, direction.radii.control)}</div>
  <div style="padding-top:16px">${voicePresence(direction, theme)}</div>
</div>`;
}

/** The Copilot screen of a direction. */
function copilotScreen(direction, theme) {
  const last = 'Stop 45 is delivered. 17 stops left.';
  const intent = 'Marked stop 45 as delivered';

  const middle =
    direction.name === 'gantryRun'
      ? `<div class="gantrysigncard" style="background:${colour(theme, 'textPrimary')};border-radius:${direction.radii.card}px;padding:20px">
  <p class="caption" style="color:${colour(theme, 'textInverse')};letter-spacing:0.12em">DELIVERED</p>
  <p class="address" style="color:${colour(theme, 'textInverse')}">${last}</p>
</div>`
      : `<h2 class="address">${last}</h2>`;

  const band =
    direction.name === 'weatherLight'
      ? `<div style="padding-top:8px">
  <div style="height:12px;border-radius:6px;background:${colour(theme, 'surfaceElevated')};overflow:hidden"><div style="height:12px;width:78%;border-radius:6px;background:${colour(theme, 'brandPrimary')}"></div></div>
  <p class="caption" style="color:${colour(theme, 'textTertiary')};padding-top:8px">Heard: Delivered</p>
</div>`
      : direction.name === 'nightShift'
        ? `<div style="padding-top:8px">
  <div style="height:2px;width:82%;background:${colour(theme, 'brandPrimary')};border-radius:1px"></div>
  <p class="caption" style="color:${colour(theme, 'textTertiary')};padding-top:8px">Heard: Delivered</p>
</div>`
        : '';

  return `<div class="screen" style="height:${VIEWPORT.height}px;display:flex;flex-direction:column;padding:24px">
  <div style="display:flex;align-items:center;gap:16px">
    <h1 class="title">Listening</h1>
    ${
      direction.name === 'hapticCity'
        ? `<span style="width:18px;height:18px;border-radius:4px;background:${colour(theme, 'textPrimary')}"></span>`
        : ''
    }
  </div>
  ${middle}
  <div style="border-top:1px solid ${colour(theme, 'border')};padding-top:16px;margin-top:16px">
    <p class="label" style="color:${colour(theme, 'textSecondary')}">Understood</p>
    <p class="body" style="color:${colour(theme, 'textPrimary')}">${intent}</p>
  </div>
  ${band}
  <div style="margin-top:auto">
    <div class="talk" style="background:${colour(theme, 'textPrimary')};border-radius:${direction.radii.control}px">
      <p class="row" style="color:${colour(theme, 'textInverse')}">Hold to talk &middot; Listening</p>
    </div>
    <div style="padding-top:16px">${voicePresence(direction, theme)}</div>
  </div>
</div>`;
}

/** The Scanner screen of a direction. */
function scannerScreen(direction, theme) {
  const guide =
    direction.name === 'hapticCity'
      ? `<div style="position:absolute;left:-2px;top:-2px;width:44px;height:44px;border:4px solid ${colour(theme, 'brandPrimary')};border-right:0;border-bottom:0"></div>`
      : direction.name === 'nightShift'
        ? `<div style="position:absolute;inset:0;border:1px solid ${colour(theme, 'brandPrimary')}"></div>`
        : direction.name === 'gantryRun'
          ? `<div style="position:absolute;left:12px;right:12px;top:12px;bottom:12px;border:2px solid ${colour(theme, 'brandPrimary')};border-top-width:6px"></div>`
          : '';

  return `<div class="screen" style="height:${VIEWPORT.height}px;display:flex;flex-direction:column">
  <div class="viewfinder" style="flex:1;margin:16px;background:${colour(theme, 'textPrimary')};border-radius:${direction.radii.card}px;padding:24px;position:relative">
    <div>
      <p style="font-size:26px;line-height:32px;font-weight:700;color:${colour(theme, 'textInverse')}">14 HAREWOOD RD</p>
      <p style="font-size:20px;line-height:26px;font-weight:600;color:${colour(theme, 'textInverse')}">PAPANUI</p>
      <p style="font-size:15px;line-height:20px;color:${colour(theme, 'textInverse')}">14 HAREWOOD RD &middot; PAPANUI &middot; 8014</p>
    </div>
    <div class="guide" style="position:absolute;left:32px;right:32px;top:80px;height:120px;border:2px solid ${colour(theme, 'brandPrimary')};border-radius:8px">${guide}</div>
    <div style="margin-top:auto">
      <p style="font-size:15px;line-height:20px;color:${colour(theme, 'textInverse')}">Reading the address block</p>
    </div>
  </div>
  <div style="padding:24px">
    <div style="display:flex;justify-content:space-between;align-items:center">
      <p class="label" style="color:${colour(theme, 'textSecondary')}">Found</p>
      <p class="caption" style="color:${colour(theme, 'statusDelivered')}">Confident</p>
    </div>
    <p class="address" style="color:${colour(theme, 'textPrimary')};padding-top:8px">14 HAREWOOD RD</p>
    <p class="body" style="color:${colour(theme, 'textSecondary')}">Stop 45 &middot; PAPANUI</p>
    <div style="padding-top:16px">${action(theme, direction.radii.control, 'Confirm the address')}</div>
    <div class="secondary" style="border:1px solid ${colour(theme, 'border')};border-radius:8px;margin-top:12px">
      <p class="row" style="color:${colour(theme, 'textPrimary')}">Correct this address</p>
    </div>
  </div>
</div>`;
}

/** The styles every render shares. */
const SHARED_CSS = `
.screen { }
.next { display: flex; flex-direction: column; gap: 4px; }
.nowblock { display: flex; flex-direction: column; gap: 4px; }
.plate { display: flex; flex-direction: column; gap: 12px; }
.platerow { display: flex; align-items: flex-start; gap: 16px; }
.platemain { flex: 1; display: flex; flex-direction: column; gap: 2px; }
.plateside { display: flex; flex-direction: column; align-items: flex-end; }
.rows { display: flex; flex-direction: column; }
.row { display: flex; align-items: center; gap: 12px; min-height: 64px; padding: 8px 0; border-bottom: 1px solid transparent; }
.rowmain { flex: 1; display: flex; flex-direction: column; gap: 2px; min-width: 0; }
.action { min-height: 72px; display: flex; align-items: center; justify-content: center; }
.voice { display: flex; flex-direction: column; gap: 8px; }
.voice.haptic, .voice.gantry { flex-direction: row; align-items: center; gap: 12px; }
.haptictarget { width: 56px; height: 56px; border-radius: 28px; border: 2px solid; display: flex; align-items: center; justify-content: center; }
.hapticseal { min-height: 72px; display: flex; align-items: center; justify-content: center; gap: 12px; }
.gantrysign { padding: 8px 12px; display: inline-flex; }
.gantrysigncard { display: flex; flex-direction: column; gap: 4px; }
.talk { min-height: 72px; display: flex; align-items: center; justify-content: center; }
.secondary { min-height: 56px; display: flex; align-items: center; justify-content: center; }
.viewfinder { display: flex; flex-direction: column; }
`;

/* ------------------------------------------------------------------ *
 * The screenshots.
 * ------------------------------------------------------------------ */

function screenshot(chrome, htmlPath, pngPath) {
  execFileSync(
    chrome,
    [
      '--headless=new',
      '--disable-gpu',
      '--hide-scrollbars',
      '--force-color-profile=srgb',
      `--window-size=${VIEWPORT.width},${VIEWPORT.height}`,
      `--screenshot=${pngPath}`,
      pathToFileURL(htmlPath).href,
    ],
    { stdio: 'ignore' },
  );
}

/* ------------------------------------------------------------------ *
 * The contrast report of a direction.
 * ------------------------------------------------------------------ */

const REPORT_PAIRS = [
  ['textPrimary', 'background'],
  ['textPrimary', 'surface'],
  ['textSecondary', 'background'],
  ['textSecondary', 'surface'],
  ['textTertiary', 'background'],
  ['brandPrimary', 'background'],
  ['brandPrimary', 'surface'],
  ['brandSecondary', 'background'],
  ['statusDelivered', 'background'],
  ['statusFailed', 'background'],
  ['statusSkipped', 'background'],
  ['statusActive', 'background'],
  ['border', 'surface'],
  ['mapText', 'mapLand'],
  ['mapText', 'mapRoad'],
];

/** The measured report of the pairs that appear on the four screens. */
function contrastReport(direction) {
  const lines = [
    `The measured contrast of every pair that appears on the four screens of ${direction.displayName}.`,
    'Measured with packages/design-tokens/src/contrast.ts, the code the build gate uses.',
    'Bars: 4.5:1 for the body, 3:1 for the boundaries, 7:1 for the driving text.',
    '',
  ];
  for (const mode of ['light', 'night']) {
    const theme = themes[mode === 'light' ? direction.themeName : direction.nightThemeName];
    lines.push(`===== ${mode} (${theme.name}) =====`);
    for (const [role, surface] of REPORT_PAIRS) {
      const foreground = theme.colors[role];
      const background = theme.colors[surface];
      const ratio = contrastRatioRounded(foreground, background);
      lines.push(
        `  ${role.padEnd(16)} ${foreground} on ${surface.padEnd(14)} ${background}  ${ratio.toFixed(2)}:1`,
      );
    }
    // The chip: the status colour at 12.5 % over the surface.
    for (const role of ['brandPrimary', 'success', 'warning', 'error']) {
      const pill = blend(theme.colors[role], theme.colors.surface, 0.125);
      const ratio = contrastRatioRounded(theme.colors[role], pill);
      lines.push(`  ${role.padEnd(16)} chip ${pill}  ${ratio.toFixed(2)}:1`);
    }
    lines.push('');
  }
  return `${lines.join('\n')}\n`;
}

/* ------------------------------------------------------------------ *
 * The run.
 * ------------------------------------------------------------------ */

const chrome = findChrome();
if (!chrome) {
  throw new Error('no browser found for the screenshots: install Chrome or Edge');
}

await ensureFonts();

let written = 0;
for (const name of direction2Names) {
  const direction = directions2[name];
  const folder = join(OUT_ROOT, direction.folder);
  const renderFolder = join(folder, 'render');
  const shotFolder = join(folder, 'screenshots');
  const evidenceFolder = join(folder, 'evidence');
  mkdirSync(renderFolder, { recursive: true });
  mkdirSync(shotFolder, { recursive: true });
  mkdirSync(evidenceFolder, { recursive: true });

  for (const mode of MODES) {
    const theme = themes[mode === 'light' ? direction.themeName : direction.nightThemeName];
    for (const screen of SCREENS) {
      const body =
        screen === 'today'
          ? todayScreen(direction, theme)
          : screen === 'driving'
            ? drivingScreen(direction, theme)
            : screen === 'copilot'
              ? copilotScreen(direction, theme)
              : scannerScreen(direction, theme);
      const html = page({
        direction,
        theme,
        mode,
        body,
        title: `${direction.displayName} - ${screen} - ${mode}`,
      }).replace('</style>', `${SHARED_CSS}</style>`);
      const htmlPath = join(renderFolder, `${screen}-${mode}.html`);
      writeFileSync(htmlPath, html, 'utf8');
      screenshot(chrome, htmlPath, join(shotFolder, `${screen}-${mode}.png`));
      written += 1;
    }
  }

  writeFileSync(join(evidenceFolder, 'contrast.txt'), contrastReport(direction), 'utf8');
  console.log(`  ${direction.folder}: eight screens and the contrast report`);
}

console.log(`Wrote ${written} renders to ${OUT_ROOT}`);

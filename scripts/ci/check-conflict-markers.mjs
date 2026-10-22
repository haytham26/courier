// The conflict-marker gate: the whole tree must be free of git merge markers.
// (MASTER_EXECUTION section 16.3 pass 2: no broken reference survives the merge.)
//
// It scans every tracked file and fails on any line that carries a marker:
// - `<<<<<<<` at the start of a line
// - `=======` on its own line (the divider; pytest banners are longer strings and stay legal)
// - `>>>>>>>` at the start of a line
//
// Lockfiles and vendored code are excluded: markers there are upstream content,
// not a torn merge. Binary formats are skipped (no text to tear).
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import path from "node:path";

const MARKERS = [
  { re: /^<{7}/, label: "<<<<<<<" },
  { re: /^={7}$/, label: "=======" },
  { re: /^>{7}/, label: ">>>>>>>" },
];

const EXCLUDED_NAMES = new Set([
  "pnpm-lock.yaml",
  "package-lock.json",
  "yarn.lock",
  "bun.lockb",
  "bun.lock",
  "uv.lock",
  "Cargo.lock",
  "poetry.lock",
  "Gemfile.lock",
  "composer.lock",
]);

const EXCLUDED_EXTENSIONS = new Set([
  ".png", ".jpg", ".jpeg", ".gif", ".webp", ".ico", ".icns",
  ".woff", ".woff2", ".ttf", ".otf", ".eot",
  ".zip", ".gzip", ".gz", ".tgz", ".tar", ".br", ".7z", ".rar",
  ".mp4", ".mov", ".webm", ".mp3", ".wav", ".ogg", ".m4a",
  ".pdf", ".xlsx", ".docx", ".pptx",
  ".onnx", ".model", ".bin", ".framework", ".exe", ".dll", ".so", ".dylib", ".jar",
  ".pmtiles", ".mbtiles", ".tile", ".pbf",
]);

function isExcluded(file) {
  const name = path.basename(file);
  if (EXCLUDED_NAMES.has(name)) return true;
  const ext = path.extname(name).toLowerCase();
  if (EXCLUDED_EXTENSIONS.has(ext)) return true;
  // Vendored checkouts: a vendored directory keeps its upstream content.
  return /^(vendor|vendors?|third_party|third-party|checkouts|\.study)\//.test(file);
}

const tracked = execFileSync("git", ["ls-files"], { encoding: "utf8", maxBuffer: 32 * 1024 * 1024 })
  .split(/\r?\n/)
  .filter(Boolean);

const findings = [];
for (const file of tracked) {
  if (isExcluded(file)) continue;
  let content;
  try {
    content = readFileSync(file, "latin1"); // byte-safe: any line content is preserved
  } catch {
    findings.push({ file, line: 0, marker: "(unreadable)" });
    continue;
  }
  const lines = content.split(/\r?\n/);
  for (let index = 0; index < lines.length; index += 1) {
    for (const { re, label } of MARKERS) {
      if (re.test(lines[index])) {
        findings.push({ file, line: index + 1, marker: label });
      }
    }
  }
}

if (findings.length > 0) {
  console.error("A merge conflict marker is in the tree:");
  for (const { file, line, marker } of findings) {
    console.error(`  ${file}:${line}  ${marker}`);
  }
  console.error(`(${findings.length} marker line(s). Finish the merge - keep both sides or resolve, never commit a marker.)`);
  process.exit(1);
}

console.log(`No conflict markers in ${tracked.length} tracked files.`);

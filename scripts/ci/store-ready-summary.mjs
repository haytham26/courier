#!/usr/bin/env node
/**
 * The StoreReady report as a job summary.
 *
 *   node scripts/ci/store-ready-summary.mjs <report.json> [<report.json> ...]
 *
 * The workflow writes the report to the job summary so the founder reads the
 * findings without downloading anything. The report is what the tool said: the
 * renderer never turns a finding into a pass.
 */
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const SEVERITIES = [
  { key: 'critical', names: ['CRITICAL', 'BLOCK'], title: 'CRITICAL (the release is blocked)' },
  { key: 'warn', names: ['WARN', 'WARNING'], title: 'WARN (a task before the release)' },
  { key: 'info', names: ['INFO'], title: 'INFO (worth a look)' },
];

function countOf(report, key) {
  const summary = report?.summary ?? {};
  if (key === 'critical') return Number(summary.critical ?? summary.blocks ?? 0);
  if (key === 'warn') return Number(summary.warns ?? 0);
  return Number(summary.infos ?? 0);
}

function findingsOf(report, names) {
  const findings = Array.isArray(report?.findings) ? report.findings : [];
  return findings.filter((finding) => names.includes(severityName(finding)));
}

// The Play report writes the severity as a name, the App Store Connect report
// writes it as the number of the level (0 info, 1 warn, 2 block).
function severityName(finding) {
  const severity = finding?.severity;
  if (typeof severity === 'number') return ['INFO', 'WARN', 'BLOCK'][severity] ?? '';
  return String(severity ?? '').toUpperCase();
}

function renderReport(report) {
  const lines = [];
  const total = countOf(report, 'critical') + countOf(report, 'warn') + countOf(report, 'info');
  const critical = countOf(report, 'critical');

  lines.push('## StoreReady - the Google Play pre-submission check');
  lines.push('');
  if (report?.application_id) lines.push(`- App: ${report.application_id}`);
  if (report?.target_sdk) lines.push(`- Target SDK: ${report.target_sdk}`);
  if (report?.min_sdk) lines.push(`- Min SDK: ${report.min_sdk}`);
  if (report?.version_code) lines.push(`- Version code: ${report.version_code}`);
  if (report?.manifest_path) lines.push(`- Manifest: ${report.manifest_path}`);
  lines.push(`- Findings: ${total} (${critical} critical)`);
  lines.push('');

  if (critical === 0) {
    lines.push('The tool found no blocking finding. The warnings are tasks, not blockers.');
    lines.push('');
  } else {
    lines.push(`**${critical} blocking finding(s): the release is not ready to submit.**`);
    lines.push('');
  }

  for (const severity of SEVERITIES) {
    const findings = findingsOf(report, severity.names);
    if (findings.length === 0) continue;
    lines.push(`### ${severity.title}`);
    lines.push('');
    for (const finding of findings) {
      const where = finding.file ? ` (${finding.file})` : '';
      const guideline = finding.guideline ? ` [${finding.guideline}]` : '';
      lines.push(`- **${finding.title}**${guideline}${where}`);
      if (finding.detail) lines.push(`  ${finding.detail}`);
      if (finding.fix) lines.push(`  Fix: ${finding.fix}`);
    }
    lines.push('');
  }

  const checklist = Array.isArray(report?.checklist) ? report.checklist : [];
  const manual = checklist.filter(
    (item) =>
      item.status === 'fail' || item.status === 'warning' || item.status === 'needs_manual_review',
  );
  if (manual.length > 0) {
    lines.push('### The Play Console review the tool cannot do');
    lines.push('');
    for (const item of manual) {
      const status =
        item.status === 'fail' ? 'FAIL' : item.status === 'warning' ? 'WARN' : 'MANUAL';
      lines.push(`- [${status}] ${item.section} - ${item.title}`);
    }
    lines.push('');
  }

  return { markdown: lines.join('\n'), critical };
}

export function renderSummary(reports) {
  const parts = [];
  let critical = 0;
  for (const report of reports) {
    const rendered = renderReport(report);
    critical += rendered.critical;
    parts.push(rendered.markdown);
  }
  return { markdown: parts.join('\n'), critical };
}

function main(argv) {
  if (argv.length === 0) {
    console.error('Usage: node scripts/ci/store-ready-summary.mjs <report.json> [<report.json> ...]');
    return 2;
  }

  const reports = [];
  for (const path of argv) {
    let report;
    try {
      report = JSON.parse(readFileSync(path, 'utf8'));
    } catch (error) {
      console.error(`store-ready-summary: ${path} could not be read: ${error.message}`);
      return 2;
    }
    reports.push(report);
  }

  const { markdown, critical } = renderSummary(reports);
  console.log(markdown);
  return critical > 0 ? 1 : 0;
}

const invokedDirectly =
  process.argv[1] !== undefined && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (invokedDirectly) {
  process.exitCode = main(process.argv.slice(2));
}

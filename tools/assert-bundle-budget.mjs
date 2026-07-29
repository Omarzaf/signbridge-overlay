#!/usr/bin/env node
// Fails the build when the shipped PWA payload crosses its compressed size
// budget.
//
// docs/architecture.md holds the overlay to 200 KB compressed. The budget is
// not a tidiness rule: this viewer has to work on the low-resource phone
// profile in docs/accessibility-acceptance.md, over the connections the people
// it is for actually have. A budget that is only ever checked by hand is a
// budget that has already been exceeded, so it runs as a build step —
// docs/agent-orchestration.md §2.1 lists it as one of the two invariants a
// renderer agent is most likely to breach.
//
// Usage:
//   node tools/assert-bundle-budget.mjs [--dir dist/pwa] [--budget-kb 200]

import { readdir, readFile } from "node:fs/promises";
import { join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { gzipSync } from "node:zlib";
import process from "node:process";

const repositoryRoot = fileURLToPath(new URL("../", import.meta.url));

const DEFAULT_DIRECTORY = "dist/pwa";
const DEFAULT_BUDGET_KB = 200;
const BYTES_PER_KB = 1024;

/**
 * Only the bytes a browser has to fetch to run the shell. Source maps are
 * developer tooling and are not served on the critical path.
 */
const EXCLUDED_SUFFIXES = [".map"];

function readOption(argv, flag, fallback) {
  const index = argv.indexOf(flag);
  if (index === -1) {
    return fallback;
  }
  const value = argv[index + 1];
  if (value === undefined) {
    console.error(`${flag} requires a value`);
    process.exit(1);
  }
  return value;
}

async function collectFiles(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) {
      files.push(...(await collectFiles(path)));
    } else if (!EXCLUDED_SUFFIXES.some((suffix) => entry.name.endsWith(suffix))) {
      files.push(path);
    }
  }
  return files;
}

function formatKb(bytes) {
  return `${(bytes / BYTES_PER_KB).toFixed(2)} kB`;
}

const argv = process.argv.slice(2);
const directory = resolve(
  repositoryRoot,
  readOption(argv, "--dir", DEFAULT_DIRECTORY),
);
const budgetKb = Number(readOption(argv, "--budget-kb", String(DEFAULT_BUDGET_KB)));

if (!Number.isFinite(budgetKb) || budgetKb <= 0) {
  console.error("--budget-kb must be a positive number");
  process.exit(1);
}

const budgetBytes = budgetKb * BYTES_PER_KB;

let files;
try {
  files = await collectFiles(directory);
} catch {
  console.error(
    `No build output at ${relative(repositoryRoot, directory)}; run the build before asserting its size.`,
  );
  process.exit(1);
}

if (files.length === 0) {
  console.error(
    `${relative(repositoryRoot, directory)} is empty; the build produced nothing to measure.`,
  );
  process.exit(1);
}

const measured = [];
let totalCompressedBytes = 0;

for (const file of files) {
  const contents = await readFile(file);
  // Level 9 rather than the default: it is the closest cheap approximation of
  // what a CDN will serve, so the number here is not optimistic.
  const compressedBytes = gzipSync(contents, { level: 9 }).byteLength;
  totalCompressedBytes += compressedBytes;
  measured.push({
    name: relative(directory, file),
    rawBytes: contents.byteLength,
    compressedBytes,
  });
}

measured.sort((left, right) => right.compressedBytes - left.compressedBytes);

for (const entry of measured) {
  console.log(
    `  ${entry.name.padEnd(36)} ${formatKb(entry.rawBytes).padStart(10)} ` +
      `│ gzip: ${formatKb(entry.compressedBytes).padStart(10)}`,
  );
}

const share = ((totalCompressedBytes / budgetBytes) * 100).toFixed(1);

if (totalCompressedBytes > budgetBytes) {
  console.error(
    `\nBundle budget exceeded: ${formatKb(totalCompressedBytes)} compressed across ` +
      `${measured.length} file(s), over the ${budgetKb} kB budget (${share}%).`,
  );
  process.exit(1);
}

console.log(
  `\nBundle budget met: ${formatKb(totalCompressedBytes)} compressed across ` +
    `${measured.length} file(s), ${share}% of the ${budgetKb} kB budget.`,
);

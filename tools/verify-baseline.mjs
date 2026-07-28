import { readFile, readdir } from "node:fs/promises";
import { basename, extname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";
import process from "node:process";

const root = new URL("../", import.meta.url);
const rootPath = fileURLToPath(root);

const requiredFiles = [
  "AGENTS.md",
  "PROJECT_CONTEXT.md",
  "HANDOFF.md",
  "LICENSE",
  "README.md",
  "LICENSE_POLICY.md",
  "PREEXISTING_ASSETS.md",
  "THIRD_PARTY_NOTICES.md",
  "docs/architecture.md",
  "docs/accessibility-acceptance.md",
  "docs/data-provenance.md",
  "docs/linguistic-safety.md",
  "docs/language-scope.md",
  "docs/licensing-and-consent.md",
  "docs/private-evidence-system.md",
  "docs/privacy.md",
  "docs/release-certificate-template.md",
  "docs/reproducibility.md",
  "docs/review-protocol.md",
  "docs/security.md",
  "docs/claims-ledger.md",
  "docs/decisions/0003-structural-preflight-is-not-publication.md",
  "docs/decisions/0004-media-clock-is-authoritative.md",
  "contracts/README.md",
  "contracts/asset-ledger.schema.json",
  "contracts/contest-evidence.schema.json",
  "contracts/release-request.schema.json",
  "contracts/review-event.schema.json",
  "contracts/run-manifest.schema.json",
  "contracts/signpack.schema.json",
  "fixtures/SYNTHETIC_UNSUPPORTED_FIXTURES.md",
  "fixtures/synthetic-invalid-caption-pack.json",
  "packages/signpack-schema/README.md",
  "packages/signpack-schema/src/index.ts",
  "packages/signpack-schema/src/types.ts",
  "packages/signpack-schema/src/validator.test.ts",
  "packages/signpack-schema/src/validator.ts",
  "packages/signpack-publisher/README.md",
  "packages/sync-engine/README.md",
  "packages/sync-engine/src/index.ts",
  "packages/sync-engine/src/index.test.ts",
  "packages/runtime/README.md",
  "packages/runtime/src/index.ts",
  "packages/runtime/src/index.test.ts",
  "packages/video-adapters/README.md",
  "packages/video-adapters/src/index.ts",
  "packages/video-adapters/src/index.test.ts",
  "packages/pack-storage/README.md",
  "packages/pack-storage/src/index.ts",
  "packages/pack-storage/src/index.test.ts",
  "apps/pwa/index.html",
  "apps/pwa/src/accessibleFallbackOverlay.ts",
  "apps/pwa/src/captionPackImport.ts",
  "apps/pwa/src/main.ts",
  "apps/pwa/src/styles.css",
  "tests/unit/accessibleFallbackOverlay.test.ts",
  "tests/unit/captionPackImport.test.ts",
  "tests/e2e/pwa-synthetic-fallback.spec.ts",
];

const approvedRootDevDependencies = new Map([
  ["@playwright/test", "1.61.0"],
  ["typescript", "6.0.2"],
  ["vite", "8.0.10"],
  ["vitest", "4.1.6"],
]);

const productionDependencyFields = [
  "dependencies",
  "optionalDependencies",
  "peerDependencies",
  "bundledDependencies",
  "bundleDependencies",
];

const forbiddenTrackedExtensions = new Set([
  ".m4a",
  ".mov",
  ".mp4",
  ".wav",
  ".webm",
]);

async function collectFiles(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = [];

  for (const entry of entries) {
    if ([".git", "node_modules", "dist"].includes(entry.name)) {
      continue;
    }

    const path = join(directory, entry.name);
    if (entry.isDirectory()) {
      files.push(...(await collectFiles(path)));
    } else {
      files.push(path);
    }
  }

  return files;
}

const errors = [];

for (const file of requiredFiles) {
  try {
    const contents = await readFile(new URL(file, root), "utf8");
    if (!contents.trim()) {
      errors.push(`${file} is empty`);
    }
  } catch {
    errors.push(`${file} is missing`);
  }
}

const files = await collectFiles(rootPath);
const packageFiles = files.filter((file) => basename(file) === "package.json");

for (const packageFile of packageFiles) {
  const fileName = relative(rootPath, packageFile);
  const isRootManifest = packageFile === join(rootPath, "package.json");
  let manifest;

  try {
    manifest = JSON.parse(await readFile(packageFile, "utf8"));
  } catch {
    errors.push(`${fileName} is not valid JSON`);
    continue;
  }

  for (const dependencyField of productionDependencyFields) {
    const value = manifest[dependencyField];
    const entryCount = Array.isArray(value)
      ? value.length
      : Object.keys(value ?? {}).length;
    if (entryCount > 0) {
      errors.push(
        `${fileName} has unapproved production field ${dependencyField}`,
      );
    }
  }

  const devDependencies = manifest.devDependencies ?? {};
  if (
    typeof devDependencies !== "object" ||
    devDependencies === null ||
    Array.isArray(devDependencies)
  ) {
    errors.push(`${fileName} has malformed devDependencies`);
    continue;
  }

  const devDependencyEntries = Object.entries(devDependencies);
  if (!isRootManifest && devDependencyEntries.length > 0) {
    errors.push(`${fileName} has workspace-local devDependencies`);
    continue;
  }

  if (isRootManifest) {
    for (const [name, version] of devDependencyEntries) {
      const approvedVersion = approvedRootDevDependencies.get(name);
      if (approvedVersion === undefined) {
        errors.push(`${fileName} has unapproved development tool ${name}`);
      } else if (version !== approvedVersion) {
        errors.push(
          `${fileName} must pin ${name} to approved version ${approvedVersion}`,
        );
      }
    }

    for (const name of approvedRootDevDependencies.keys()) {
      if (!(name in devDependencies)) {
        errors.push(`${fileName} is missing approved development tool ${name}`);
      }
    }
  }
}

const rootPackageJson = JSON.parse(
  await readFile(new URL("package.json", root), "utf8"),
);

if (rootPackageJson.private !== true) {
  errors.push("package.json must remain private before the public-release gate");
}

if (!String(rootPackageJson.packageManager).startsWith("pnpm@")) {
  errors.push("package.json must pin pnpm");
}

const lockfile = await readFile(new URL("pnpm-lock.yaml", root), "utf8");

function escapeForPattern(value) {
  return value.replaceAll(/[.*+?^${}()|[\]\\]/gu, "\\$&");
}

for (const [name, version] of approvedRootDevDependencies) {
  // Tolerates the lockfile's indentation and optional quoting so a pnpm
  // formatting change cannot silently disable this check.
  const lockfileEntry = new RegExp(
    `(?:^|\\n)[ \\t]*'?${escapeForPattern(name)}'?:[ \\t]*\\n` +
      `[ \\t]*specifier:[ \\t]*${escapeForPattern(version)}[ \\t]*(?:\\n|$)`,
    "u",
  );
  if (!lockfileEntry.test(lockfile)) {
    errors.push(`pnpm-lock.yaml is missing approved ${name}@${version}`);
  }
}

for (const file of files) {
  const fileName = relative(rootPath, file);
  if (forbiddenTrackedExtensions.has(extname(file).toLowerCase())) {
    errors.push(`unreviewed media file present: ${fileName}`);
  }
  if (
    /(?:^|[/\\])\.env(?:\.|$)/u.test(fileName) &&
    !fileName.endsWith(".env.example")
  ) {
    errors.push(`private environment file present: ${fileName}`);
  }
}

if (errors.length > 0) {
  console.error("Baseline verification failed:");
  for (const error of errors) {
    console.error(`- ${error}`);
  }
  process.exitCode = 1;
} else {
  console.log(
    `Foundation verification passed: ${requiredFiles.length} required files, ${packageFiles.length} package manifest(s), ${approvedRootDevDependencies.size} approved development tools, and ${files.length} repository files checked; no production dependencies or media present.`,
  );
}

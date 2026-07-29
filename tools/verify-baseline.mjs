import { readFile, readdir } from "node:fs/promises";
import { basename, dirname, extname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";
import process from "node:process";

const root = new URL("../", import.meta.url);
const rootPath = fileURLToPath(root);

const requiredFiles = [
  "AGENTS.md",
  "CLAUDE.md",
  "GEMINI.md",
  "PROJECT_CONTEXT.md",
  "HANDOFF.md",
  "LICENSE",
  "README.md",
  "LICENSE_POLICY.md",
  "PREEXISTING_ASSETS.md",
  "THIRD_PARTY_NOTICES.md",
  "docs/architecture.md",
  "docs/accessibility-acceptance.md",
  "docs/agent-orchestration.md",
  "docs/data-provenance.md",
  "docs/execution-plan.md",
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

/**
 * The only manifests permitted to declare production dependencies, and the only
 * names each may declare. `services/authoring` is outside the playback path by
 * design; nothing else in this repository may take a runtime dependency.
 * Versions must be exactly pinned so an approved review cannot be widened by a
 * range operator after the fact.
 */
const approvedProductionDependencies = new Map([
  ["services/authoring/package.json", new Set(["@google/genai"])],
]);

const exactVersionPattern = /^(0|[1-9][0-9]*)\.(0|[1-9][0-9]*)\.(0|[1-9][0-9]*)$/u;

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

/**
 * Directories that make up the cloud-independent playback path. Source in these
 * directories must import nothing but relative paths and Node builtins, which
 * enforces both the dependency-free rule and the one-way dependency direction
 * recorded in docs/architecture.md.
 */
const playbackPathPrefixes = [
  "packages/signpack-schema/",
  "packages/sync-engine/",
  "packages/runtime/",
  "packages/video-adapters/",
  "packages/pack-storage/",
  "packages/sign-renderer/",
  "apps/pwa/",
  "apps/extension/",
];

const forbiddenPlaybackImportPrefixes = ["services/", "apps/reviewer/"];

const approvedTestSpecifiers = new Set(["vitest", "@playwright/test"]);

/**
 * Reserved non-linguistic markers required by docs/review-protocol.md. A
 * synthetic fixture must never carry a real signed-language code, and must
 * never present itself as reviewed, published, or production content.
 */
const RESERVED_FIXTURE_LANGUAGE = "zxx";
const RESERVED_FIXTURE_REGION = "ZZ";

const forbiddenFixtureFieldValues = new Map([
  ["linguisticReviewStatus", new Set(["human_reviewed"])],
  ["releaseStatus", new Set(["published"])],
  ["environment", new Set(["production"])],
  ["reviewStatus", new Set(["approved"])],
]);

function toPosix(value) {
  return value.replaceAll("\\", "/");
}

function stripComments(source) {
  return source
    .replaceAll(/\/\*[\s\S]*?\*\//gu, " ")
    .replaceAll(/(^|[^:])\/\/[^\n]*/gu, "$1");
}

function collectImportSpecifiers(source) {
  const text = stripComments(source);
  const patterns = [
    /\bfrom\s*["']([^"']+)["']/gu,
    /\bimport\s*\(\s*["']([^"']+)["']\s*\)/gu,
    /\bimport\s+["']([^"']+)["']/gu,
    /\brequire\s*\(\s*["']([^"']+)["']\s*\)/gu,
  ];

  const specifiers = new Set();
  for (const pattern of patterns) {
    for (const match of text.matchAll(pattern)) {
      specifiers.add(match[1]);
    }
  }

  return specifiers;
}

function isTestSource(fileName) {
  return (
    fileName.endsWith(".test.ts") ||
    fileName.endsWith(".spec.ts") ||
    fileName.startsWith("tests/")
  );
}

function* walkJsonFields(node, path) {
  if (Array.isArray(node)) {
    for (const [index, item] of node.entries()) {
      yield* walkJsonFields(item, `${path}[${index}]`);
    }
    return;
  }

  if (node === null || typeof node !== "object") {
    return;
  }

  for (const [key, value] of Object.entries(node)) {
    const childPath = `${path}.${key}`;
    yield { key, value, path: childPath };
    yield* walkJsonFields(value, childPath);
  }
}

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
  const fileName = toPosix(relative(rootPath, packageFile));
  const isRootManifest = packageFile === join(rootPath, "package.json");
  const allowedProductionNames =
    approvedProductionDependencies.get(fileName) ?? new Set();
  let manifest;

  try {
    manifest = JSON.parse(await readFile(packageFile, "utf8"));
  } catch {
    errors.push(`${fileName} is not valid JSON`);
    continue;
  }

  for (const dependencyField of productionDependencyFields) {
    const value = manifest[dependencyField];

    if (Array.isArray(value)) {
      if (value.length > 0) {
        errors.push(
          `${fileName} has unapproved production field ${dependencyField}`,
        );
      }
      continue;
    }

    const entries = Object.entries(value ?? {});
    if (entries.length === 0) {
      continue;
    }

    if (dependencyField !== "dependencies" || allowedProductionNames.size === 0) {
      errors.push(
        `${fileName} has unapproved production field ${dependencyField}`,
      );
      continue;
    }

    for (const [name, version] of entries) {
      if (!allowedProductionNames.has(name)) {
        errors.push(
          `${fileName} declares unapproved production dependency ${name}`,
        );
        continue;
      }

      if (!exactVersionPattern.test(String(version))) {
        errors.push(
          `${fileName} must pin ${name} to an exact version, not ${version}`,
        );
      }
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
  const fileName = toPosix(relative(rootPath, file));
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

// Playback-path import isolation. Prose in AGENTS.md binds one agent vendor at a
// time; this check binds every vendor equally.
let scannedPlaybackSources = 0;

for (const file of files) {
  if (extname(file) !== ".ts") {
    continue;
  }

  const fileName = toPosix(relative(rootPath, file));
  if (!playbackPathPrefixes.some((prefix) => fileName.startsWith(prefix))) {
    continue;
  }

  scannedPlaybackSources += 1;
  const source = await readFile(file, "utf8");

  for (const specifier of collectImportSpecifiers(source)) {
    if (specifier.startsWith("node:")) {
      continue;
    }

    if (!specifier.startsWith(".")) {
      if (isTestSource(fileName) && approvedTestSpecifiers.has(specifier)) {
        continue;
      }

      errors.push(
        `${fileName} imports non-relative specifier "${specifier}"; the playback path must stay dependency-free`,
      );
      continue;
    }

    const resolved = toPosix(
      relative(rootPath, join(dirname(file), specifier)),
    );

    if (resolved.startsWith("..")) {
      errors.push(
        `${fileName} imports "${specifier}" from outside the repository`,
      );
      continue;
    }

    for (const prefix of forbiddenPlaybackImportPrefixes) {
      if (resolved.startsWith(prefix)) {
        errors.push(
          `${fileName} imports "${specifier}" from ${prefix}; playback must never depend on authoring or reviewer code`,
        );
      }
    }
  }
}

// Synthetic fixtures must remain unmistakably non-linguistic, unreviewed, and
// unpublished. An agent adding plausible-looking ASL test data is the single
// most damaging thing that could land in this repository.
const fixtureFiles = files.filter((file) => {
  const fileName = toPosix(relative(rootPath, file));
  return fileName.startsWith("fixtures/") && extname(file) === ".json";
});

for (const file of fixtureFiles) {
  const fileName = toPosix(relative(rootPath, file));
  let fixture;

  try {
    fixture = JSON.parse(await readFile(file, "utf8"));
  } catch {
    errors.push(`${fileName} is not valid JSON`);
    continue;
  }

  for (const { key, value, path } of walkJsonFields(fixture, "$")) {
    if (typeof value !== "string") {
      continue;
    }

    if (key === "signedLanguage" && value !== RESERVED_FIXTURE_LANGUAGE) {
      errors.push(
        `${fileName} sets ${path} to "${value}"; synthetic fixtures must use the reserved marker "${RESERVED_FIXTURE_LANGUAGE}"`,
      );
    }

    if (key === "region" && value !== RESERVED_FIXTURE_REGION) {
      errors.push(
        `${fileName} sets ${path} to "${value}"; synthetic fixtures must use the reserved region "${RESERVED_FIXTURE_REGION}"`,
      );
    }

    const forbiddenValues = forbiddenFixtureFieldValues.get(key);
    if (forbiddenValues?.has(value)) {
      errors.push(
        `${fileName} sets ${path} to "${value}"; a synthetic fixture must never present itself as reviewed, published, or production content`,
      );
    }

    if (value === "ase") {
      errors.push(
        `${fileName} contains the real signed-language code "ase" at ${path}; synthetic fixtures must never carry a real language code`,
      );
    }
  }
}

// Extension permission contract. These become release tests once the extension
// toolchain lands; until then the manifest is checked whenever it exists.
const extensionManifestPath = join(rootPath, "apps/extension/manifest.json");

if (files.includes(extensionManifestPath)) {
  const rawManifest = await readFile(extensionManifestPath, "utf8");

  if (rawManifest.includes("<all_urls>")) {
    errors.push(
      "apps/extension/manifest.json requests <all_urls>; initial host access is YouTube only",
    );
  }

  let extensionManifest;
  try {
    extensionManifest = JSON.parse(rawManifest);
  } catch {
    errors.push("apps/extension/manifest.json is not valid JSON");
    extensionManifest = null;
  }

  if (extensionManifest !== null) {
    if (extensionManifest.manifest_version !== 3) {
      errors.push("apps/extension/manifest.json must declare manifest_version 3");
    }

    for (const permission of extensionManifest.host_permissions ?? []) {
      if (!/^https:\/\/(?:[a-z0-9-]+\.)*youtube\.com\//u.test(permission)) {
        errors.push(
          `apps/extension/manifest.json requires non-YouTube host access "${permission}"; use optional_host_permissions instead`,
        );
      }
    }

    const policy = JSON.stringify(
      extensionManifest.content_security_policy ?? {},
    );

    if (policy.includes("unsafe-eval") || policy.includes("unsafe-inline")) {
      errors.push(
        "apps/extension/manifest.json relaxes its content security policy; remotely executed code is forbidden",
      );
    }

    if (/https?:\/\//u.test(policy)) {
      errors.push(
        "apps/extension/manifest.json allows a remote script origin; all code must be bundled locally",
      );
    }
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
    `Foundation verification passed: ${requiredFiles.length} required files, ` +
      `${packageFiles.length} package manifest(s), ` +
      `${approvedRootDevDependencies.size} approved development tools, ` +
      `${scannedPlaybackSources} playback sources with no cross-boundary or external imports, ` +
      `${fixtureFiles.length} synthetic fixtures with reserved language markers, ` +
      `and ${files.length} repository files checked; no production dependencies or media present.`,
  );
}

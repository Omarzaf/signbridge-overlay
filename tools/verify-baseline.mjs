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
  "README.md",
  "LICENSE_POLICY.md",
  "PREEXISTING_ASSETS.md",
  "THIRD_PARTY_NOTICES.md",
  "docs/architecture.md",
  "docs/linguistic-safety.md",
  "docs/licensing-and-consent.md",
  "docs/privacy.md",
  "docs/security.md",
  "docs/claims-ledger.md",
  "contracts/README.md",
  "packages/signpack-publisher/README.md",
];

const dependencyFields = [
  "dependencies",
  "devDependencies",
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
  let manifest;

  try {
    manifest = JSON.parse(await readFile(packageFile, "utf8"));
  } catch {
    errors.push(`${fileName} is not valid JSON`);
    continue;
  }

  for (const dependencyField of dependencyFields) {
    const value = manifest[dependencyField];
    const entryCount = Array.isArray(value)
      ? value.length
      : Object.keys(value ?? {}).length;
    if (entryCount > 0) {
      errors.push(
        `${fileName} has ${dependencyField} before dependency approval`,
      );
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
if (/^(?:packages|snapshots):\s*$/mu.test(lockfile)) {
  errors.push("pnpm-lock.yaml contains external package records");
}

if (
  /^\s{4}(?:dependencies|devDependencies|optionalDependencies|peerDependencies):\s*$/mu.test(
    lockfile,
  )
) {
  errors.push("pnpm-lock.yaml contains importer dependencies");
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
    `Baseline verification passed: ${requiredFiles.length} contracts, ${packageFiles.length} package manifest(s), and ${files.length} repository files checked; no dependencies or media present.`,
  );
}

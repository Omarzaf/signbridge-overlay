import { readFile, readdir } from "node:fs/promises";
import { extname, join, relative } from "node:path";
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

const packageJson = JSON.parse(
  await readFile(new URL("package.json", root), "utf8"),
);

if (packageJson.private !== true) {
  errors.push("package.json must remain private before the public-release gate");
}

if (!String(packageJson.packageManager).startsWith("pnpm@")) {
  errors.push("package.json must pin pnpm");
}

for (const dependencyField of ["dependencies", "devDependencies"]) {
  if (Object.keys(packageJson[dependencyField] ?? {}).length > 0) {
    errors.push(
      `${dependencyField} must remain empty until dependency approval`,
    );
  }
}

const files = await collectFiles(rootPath);
for (const file of files) {
  const fileName = relative(rootPath, file);
  if (forbiddenTrackedExtensions.has(extname(file).toLowerCase())) {
    errors.push(`unreviewed media file present: ${fileName}`);
  }
  if (/^\.env(?:\.|$)/u.test(fileName) && fileName !== ".env.example") {
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
    `Baseline verification passed: ${requiredFiles.length} contracts and ${files.length} repository files checked; no dependencies or media present.`,
  );
}

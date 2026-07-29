import assert from "node:assert/strict";
import { afterEach, test } from "node:test";
import { execFile } from "node:child_process";
import { cp, mkdtemp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);
const repositoryRoot = fileURLToPath(new URL("../../", import.meta.url));
const temporaryRoots = [];

async function copyRepository() {
  const temporaryRoot = await mkdtemp(join(tmpdir(), "signbridge-baseline-"));
  temporaryRoots.push(temporaryRoot);
  await cp(repositoryRoot, temporaryRoot, {
    recursive: true,
    filter: (source) =>
      !source.split("/").some((part) => part === ".git" || part === "node_modules"),
  });
  return temporaryRoot;
}

async function runVerifier(cwd) {
  try {
    const result = await execFileAsync(
      process.execPath,
      ["tools/verify-baseline.mjs"],
      { cwd },
    );
    return { exitCode: 0, ...result };
  } catch (error) {
    return {
      exitCode: error.code,
      stderr: error.stderr,
      stdout: error.stdout,
    };
  }
}

afterEach(async () => {
  await Promise.all(
    temporaryRoots.splice(0).map((path) => rm(path, { recursive: true })),
  );
});

test("accepts the approved development-tool foundation", async () => {
  const result = await runVerifier(repositoryRoot);

  assert.equal(result.exitCode, 0, result.stderr);
  assert.match(result.stdout, /Foundation verification passed/u);
});

test("rejects production dependencies in a nested workspace manifest", async () => {
  const root = await copyRepository();
  const manifestPath = join(root, "apps", "test-surface", "package.json");
  await mkdir(dirname(manifestPath), { recursive: true });
  await writeFile(
    manifestPath,
    JSON.stringify({
      name: "@signbridge/test-surface",
      private: true,
      dependencies: { surprise: "1.0.0" },
    }),
  );

  const result = await runVerifier(root);

  assert.notEqual(result.exitCode, 0);
  assert.match(result.stderr, /unapproved production field dependencies/u);
});

test("rejects an unapproved root development tool", async () => {
  const root = await copyRepository();
  const manifestPath = join(root, "package.json");
  const manifest = JSON.parse(await readFile(manifestPath, "utf8"));
  manifest.devDependencies.surprise = "1.0.0";
  await writeFile(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);

  const result = await runVerifier(root);

  assert.notEqual(result.exitCode, 0);
  assert.match(result.stderr, /unapproved development tool surprise/u);
});

test("rejects a lockfile missing an approved tool version", async () => {
  const root = await copyRepository();
  const lockfilePath = join(root, "pnpm-lock.yaml");
  const lockfile = await readFile(lockfilePath, "utf8");
  await writeFile(
    lockfilePath,
    lockfile.replace("specifier: 6.0.2", "specifier: 0.0.0"),
  );

  const result = await runVerifier(root);

  assert.notEqual(result.exitCode, 0);
  assert.match(result.stderr, /missing approved typescript@6\.0\.2/u);
});

test("rejects nested private environment files", async () => {
  const root = await copyRepository();
  const environmentPath = join(root, "services", "authoring", ".env.local");
  await writeFile(environmentPath, "SECRET=not-a-real-secret\n");

  const result = await runVerifier(root);

  assert.notEqual(result.exitCode, 0);
  assert.match(result.stderr, /private environment file present/u);
});

test("rejects an external import in the playback path", async () => {
  const root = await copyRepository();
  const sourcePath = join(root, "packages", "runtime", "src", "index.ts");
  const source = await readFile(sourcePath, "utf8");
  await writeFile(sourcePath, `import lodash from "lodash";\n${source}`);

  const result = await runVerifier(root);

  assert.notEqual(result.exitCode, 0);
  assert.match(result.stderr, /must stay dependency-free/u);
});

test("rejects a playback import reaching into the authoring service", async () => {
  const root = await copyRepository();
  const sourcePath = join(root, "packages", "sync-engine", "src", "index.ts");
  const source = await readFile(sourcePath, "utf8");
  await writeFile(
    sourcePath,
    `import { propose } from "../../../services/authoring/src/index";\n${source}`,
  );

  const result = await runVerifier(root);

  assert.notEqual(result.exitCode, 0);
  assert.match(
    result.stderr,
    /playback must never depend on authoring or reviewer code/u,
  );
});

test("rejects a playback import reaching into the reviewer console", async () => {
  const root = await copyRepository();
  const sourcePath = join(root, "apps", "pwa", "src", "main.ts");
  const source = await readFile(sourcePath, "utf8");
  await writeFile(
    sourcePath,
    `import { decide } from "../../reviewer/src/index";\n${source}`,
  );

  const result = await runVerifier(root);

  assert.notEqual(result.exitCode, 0);
  assert.match(
    result.stderr,
    /playback must never depend on authoring or reviewer code/u,
  );
});

test("keeps approved test-runner imports allowed in playback test sources", async () => {
  const root = await copyRepository();
  const result = await runVerifier(root);

  assert.equal(result.exitCode, 0, result.stderr);
  assert.match(result.stdout, /playback sources with no cross-boundary/u);
});

test("rejects a real signed-language code in a synthetic fixture", async () => {
  const root = await copyRepository();
  const fixturePath = join(root, "fixtures", "synthetic-unsupported.signpack.json");
  const fixture = JSON.parse(await readFile(fixturePath, "utf8"));
  fixture.language.signedLanguage = "ase";
  await writeFile(fixturePath, `${JSON.stringify(fixture, null, 2)}\n`);

  const result = await runVerifier(root);

  assert.notEqual(result.exitCode, 0);
  assert.match(result.stderr, /must use the reserved marker "zxx"/u);
  assert.match(result.stderr, /must never carry a real language code/u);
});

test("rejects a synthetic fixture claiming human linguistic review", async () => {
  const root = await copyRepository();
  const fixturePath = join(root, "fixtures", "synthetic-unsupported.signpack.json");
  const fixture = JSON.parse(await readFile(fixturePath, "utf8"));
  fixture.linguisticReviewStatus = "human_reviewed";
  await writeFile(fixturePath, `${JSON.stringify(fixture, null, 2)}\n`);

  const result = await runVerifier(root);

  assert.notEqual(result.exitCode, 0);
  assert.match(
    result.stderr,
    /must never present itself as reviewed, published, or production content/u,
  );
});

test("rejects a synthetic fixture claiming published release status", async () => {
  const root = await copyRepository();
  const fixturePath = join(root, "fixtures", "synthetic-unsupported.signpack.json");
  const fixture = JSON.parse(await readFile(fixturePath, "utf8"));
  fixture.releaseStatus = "published";
  await writeFile(fixturePath, `${JSON.stringify(fixture, null, 2)}\n`);

  const result = await runVerifier(root);

  assert.notEqual(result.exitCode, 0);
  assert.match(
    result.stderr,
    /must never present itself as reviewed, published, or production content/u,
  );
});

test("rejects an extension manifest requesting all_urls", async () => {
  const root = await copyRepository();
  const manifestPath = join(root, "apps", "extension", "manifest.json");
  await mkdir(dirname(manifestPath), { recursive: true });
  await writeFile(
    manifestPath,
    JSON.stringify({
      manifest_version: 3,
      name: "SignBridge",
      version: "0.0.0",
      host_permissions: ["<all_urls>"],
    }),
  );

  const result = await runVerifier(root);

  assert.notEqual(result.exitCode, 0);
  assert.match(result.stderr, /initial host access is YouTube only/u);
});

test("rejects an extension manifest requiring non-YouTube host access", async () => {
  const root = await copyRepository();
  const manifestPath = join(root, "apps", "extension", "manifest.json");
  await mkdir(dirname(manifestPath), { recursive: true });
  await writeFile(
    manifestPath,
    JSON.stringify({
      manifest_version: 3,
      name: "SignBridge",
      version: "0.0.0",
      host_permissions: ["https://www.youtube.com/*", "https://example.com/*"],
    }),
  );

  const result = await runVerifier(root);

  assert.notEqual(result.exitCode, 0);
  assert.match(result.stderr, /use optional_host_permissions instead/u);
});

test("rejects an extension manifest allowing a remote script origin", async () => {
  const root = await copyRepository();
  const manifestPath = join(root, "apps", "extension", "manifest.json");
  await mkdir(dirname(manifestPath), { recursive: true });
  await writeFile(
    manifestPath,
    JSON.stringify({
      manifest_version: 3,
      name: "SignBridge",
      version: "0.0.0",
      host_permissions: ["https://www.youtube.com/*"],
      content_security_policy: {
        extension_pages: "script-src 'self' https://cdn.example.com",
      },
    }),
  );

  const result = await runVerifier(root);

  assert.notEqual(result.exitCode, 0);
  assert.match(result.stderr, /all code must be bundled locally/u);
});

test("accepts the approved authoring production dependency when exactly pinned", async () => {
  const root = await copyRepository();
  const manifestPath = join(root, "services", "authoring", "package.json");
  await mkdir(dirname(manifestPath), { recursive: true });
  await writeFile(
    manifestPath,
    JSON.stringify({
      name: "@signbridge/authoring",
      private: true,
      dependencies: { "@google/genai": "1.0.0" },
    }),
  );

  const result = await runVerifier(root);

  assert.equal(result.exitCode, 0, result.stderr);
});

test("rejects an unpinned authoring production dependency", async () => {
  const root = await copyRepository();
  const manifestPath = join(root, "services", "authoring", "package.json");
  await mkdir(dirname(manifestPath), { recursive: true });
  await writeFile(
    manifestPath,
    JSON.stringify({
      name: "@signbridge/authoring",
      private: true,
      dependencies: { "@google/genai": "^1.0.0" },
    }),
  );

  const result = await runVerifier(root);

  assert.notEqual(result.exitCode, 0);
  assert.match(result.stderr, /must pin @google\/genai to an exact version/u);
});

test("rejects an unapproved production dependency in the authoring service", async () => {
  const root = await copyRepository();
  const manifestPath = join(root, "services", "authoring", "package.json");
  await mkdir(dirname(manifestPath), { recursive: true });
  await writeFile(
    manifestPath,
    JSON.stringify({
      name: "@signbridge/authoring",
      private: true,
      dependencies: { "@google/genai": "1.0.0", express: "5.0.0" },
    }),
  );

  const result = await runVerifier(root);

  assert.notEqual(result.exitCode, 0);
  assert.match(result.stderr, /unapproved production dependency express/u);
});

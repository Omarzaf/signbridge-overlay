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

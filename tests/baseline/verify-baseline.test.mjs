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

test("accepts the committed dependency-free foundation", async () => {
  const result = await runVerifier(repositoryRoot);

  assert.equal(result.exitCode, 0, result.stderr);
  assert.match(result.stdout, /Baseline verification passed/u);
});

test("rejects dependencies in a nested workspace manifest", async () => {
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
  assert.match(result.stderr, /has dependencies before dependency approval/u);
});

test("rejects external package records in the lockfile", async () => {
  const root = await copyRepository();
  const lockfilePath = join(root, "pnpm-lock.yaml");
  const lockfile = await readFile(lockfilePath, "utf8");
  await writeFile(lockfilePath, `${lockfile}\npackages:\n  surprise: {}\n`);

  const result = await runVerifier(root);

  assert.notEqual(result.exitCode, 0);
  assert.match(
    result.stderr,
    /pnpm-lock\.yaml contains external package records/u,
  );
});

test("rejects nested private environment files", async () => {
  const root = await copyRepository();
  const environmentPath = join(root, "services", "authoring", ".env.local");
  await writeFile(environmentPath, "SECRET=not-a-real-secret\n");

  const result = await runVerifier(root);

  assert.notEqual(result.exitCode, 0);
  assert.match(result.stderr, /private environment file present/u);
});

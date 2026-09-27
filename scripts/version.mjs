import { readFileSync, writeFileSync } from "node:fs";

const versionPattern = /^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?$/;
const packagePath = new URL("../package.json", import.meta.url);
const lockPath = new URL("../package-lock.json", import.meta.url);
const tauriPath = new URL("../src-tauri/tauri.conf.json", import.meta.url);
const cargoPath = new URL("../src-tauri/Cargo.toml", import.meta.url);
const cargoLockPath = new URL("../src-tauri/Cargo.lock", import.meta.url);

const pkg = JSON.parse(readFileSync(packagePath, "utf8"));
const lock = JSON.parse(readFileSync(lockPath, "utf8"));
const tauri = JSON.parse(readFileSync(tauriPath, "utf8"));
const cargo = readFileSync(cargoPath, "utf8");
const cargoVersion = cargo.match(/^version = "([^"]+)"/m)?.[1];
const cargoLock = readFileSync(cargoLockPath, "utf8");
const cargoLockVersion = cargoLock.match(/\[\[package\]\]\r?\nname = "wallies"\r?\nversion = "([^"]+)"/)?.[1];

if (process.argv[2] === "--check") {
  const tag = process.argv[3];
  const expected = tag?.startsWith("v") ? tag.slice(1) : tag;
  const actual = [pkg.version, lock.version, lock.packages[""].version, tauri.version, cargoVersion, cargoLockVersion];
  if (!versionPattern.test(expected ?? "") || actual.some((value) => value !== expected)) {
    console.error(`Version mismatch: tag=${tag}, package=${pkg.version}, lock=${lock.version}/${lock.packages[""].version}, tauri=${tauri.version}, cargo=${cargoVersion}, cargo-lock=${cargoLockVersion}`);
    process.exit(1);
  }
  console.log(`Versions match ${tag}`);
} else {
  const next = process.argv[2];
  if (!versionPattern.test(next ?? "")) {
    console.error("Usage: npm run version:set -- 0.1.18");
    process.exit(1);
  }
  pkg.version = next;
  lock.version = next;
  lock.packages[""].version = next;
  tauri.version = next;
  if (!cargoVersion || !cargoLockVersion) throw new Error("Cargo package version not found");
  writeFileSync(packagePath, `${JSON.stringify(pkg, null, 2)}\n`);
  writeFileSync(lockPath, `${JSON.stringify(lock, null, 2)}\n`);
  writeFileSync(tauriPath, `${JSON.stringify(tauri, null, 2)}\n`);
  writeFileSync(cargoPath, cargo.replace(/^version = "[^"]+"/m, `version = "${next}"`));
  writeFileSync(cargoLockPath, cargoLock.replace(/(\[\[package\]\]\r?\nname = "wallies"\r?\nversion = ")[^"]+("\r?\n)/, (_, prefix, suffix) => `${prefix}${next}${suffix}`));
  console.log(`Set version to ${next}`);
}

import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const currentDir = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(currentDir, "..", "..");

function getStorageRoot(): string {
  const configuredRoot = process.env.PROJECT_STORAGE_ROOT;
  if (configuredRoot) {
    return path.resolve(projectRoot, configuredRoot);
  }

  return path.join(projectRoot, "storage");
}

export function ensureStorageDir(): string {
  const storageRoot = getStorageRoot();
  if (!existsSync(storageRoot)) {
    mkdirSync(storageRoot, { recursive: true });
  }

  return storageRoot;
}

export function resolveStoragePath(fileName: string): string {
  return path.join(ensureStorageDir(), fileName);
}

export function readJsonFile<T>(filePath: string, fallback: T): T {
  if (!existsSync(filePath)) {
    writeJsonFile(filePath, fallback);
    return fallback;
  }

  const raw = readFileSync(filePath, "utf8");

  if (!raw.trim()) {
    return fallback;
  }

  return JSON.parse(raw) as T;
}

export function writeJsonFile<T>(filePath: string, value: T): void {
  ensureStorageDir();
  writeFileSync(filePath, JSON.stringify(value, null, 2), "utf8");
}

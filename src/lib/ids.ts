import { randomUUID } from "node:crypto";

export function createId(prefix: string): string {
  return `${prefix}-${randomUUID().slice(0, 8)}`;
}

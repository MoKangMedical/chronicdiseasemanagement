import { createId } from "../lib/ids.js";
import { readJsonFile, resolveStoragePath, writeJsonFile } from "../lib/storage.js";
import type { AuditEvent } from "../types.js";

interface CreateAuditInput {
  patientId: string | null;
  category: AuditEvent["category"];
  actor: string;
  detail: string;
}

export class AuditStore {
  private readonly storagePath = resolveStoragePath("audit-events.json");
  private events: AuditEvent[];

  constructor() {
    this.events = readJsonFile<AuditEvent[]>(this.storagePath, []);
  }

  reset(): void {
    this.events = [];
    this.persist();
  }

  list(patientId?: string): AuditEvent[] {
    return patientId
      ? this.events.filter((event) => event.patientId === patientId)
      : [...this.events];
  }

  append(input: CreateAuditInput): AuditEvent {
    const event: AuditEvent = {
      id: createId("audit"),
      patientId: input.patientId,
      category: input.category,
      actor: input.actor,
      detail: input.detail,
      createdAt: new Date().toISOString()
    };
    this.events.unshift(event);
    this.persist();
    return event;
  }

  private persist(): void {
    writeJsonFile(this.storagePath, this.events);
  }
}

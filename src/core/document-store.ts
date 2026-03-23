import { createId } from "../lib/ids.js";
import { readJsonFile, resolveStoragePath, writeJsonFile } from "../lib/storage.js";
import type { DocumentType, SharedDocumentEntry } from "../types.js";

export interface AppendDocumentInput {
  workflowId: string;
  patientId: string;
  documentType: DocumentType;
  title: string;
  content: unknown;
  authorAgentId: string;
  authorRole: SharedDocumentEntry["authorRole"];
  namespace: string;
  tags?: string[];
}

export class DocumentStore {
  private readonly storagePath = resolveStoragePath("documents.json");
  private documents: SharedDocumentEntry[] = [];

  constructor() {
    this.documents = readJsonFile<SharedDocumentEntry[]>(this.storagePath, []);
  }

  reset(): void {
    this.documents = [];
    this.persist();
  }

  append(input: AppendDocumentInput): SharedDocumentEntry {
    const document: SharedDocumentEntry = {
      id: createId("doc"),
      workflowId: input.workflowId,
      patientId: input.patientId,
      documentType: input.documentType,
      title: input.title,
      content: input.content,
      authorAgentId: input.authorAgentId,
      authorRole: input.authorRole,
      namespace: input.namespace,
      tags: input.tags ?? [],
      createdAt: new Date().toISOString()
    };

    this.documents.push(document);
    this.persist();

    return document;
  }

  list(): SharedDocumentEntry[] {
    return [...this.documents];
  }

  listByPatient(patientId: string): SharedDocumentEntry[] {
    return this.documents.filter((document) => document.patientId === patientId);
  }

  listByWorkflow(workflowId: string): SharedDocumentEntry[] {
    return this.documents.filter((document) => document.workflowId === workflowId);
  }

  listByPatientAndWorkflow(patientId: string, workflowId: string): SharedDocumentEntry[] {
    return this.documents.filter(
      (document) => document.patientId === patientId && document.workflowId === workflowId
    );
  }

  findLatest(
    patientId: string,
    documentType: DocumentType,
    workflowId?: string
  ): SharedDocumentEntry | null {
    const documents = this.documents.filter(
      (document) =>
        document.patientId === patientId &&
        document.documentType === documentType &&
        (!workflowId || document.workflowId === workflowId)
    );

    return documents.at(-1) ?? null;
  }

  private persist(): void {
    writeJsonFile(this.storagePath, this.documents);
  }
}

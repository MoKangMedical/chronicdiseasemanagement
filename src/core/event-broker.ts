import type { DocumentType, SharedDocumentEntry } from "../types.js";

type EventHandler = (document: SharedDocumentEntry) => Promise<void> | void;

export class EventBroker {
  private readonly subscriptions = new Map<DocumentType | "*", EventHandler[]>();

  subscribe(documentType: DocumentType | "*", handler: EventHandler): void {
    const handlers = this.subscriptions.get(documentType) ?? [];
    handlers.push(handler);
    this.subscriptions.set(documentType, handlers);
  }

  async publish(document: SharedDocumentEntry): Promise<void> {
    const handlers = [
      ...(this.subscriptions.get(document.documentType) ?? []),
      ...(this.subscriptions.get("*") ?? [])
    ];

    for (const handler of handlers) {
      await handler(document);
    }
  }
}

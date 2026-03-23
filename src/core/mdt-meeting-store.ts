import { createId } from "../lib/ids.js";
import { readJsonFile, resolveStoragePath, writeJsonFile } from "../lib/storage.js";
import type { Clinician, MdtMeeting } from "../types.js";

interface CreateMeetingInput {
  patientId: string;
  workflowId: string | null;
  topic: string;
  participantIds: string[];
}

export class MdtMeetingStore {
  private readonly storagePath = resolveStoragePath("mdt-meetings.json");
  private meetings: MdtMeeting[];

  constructor() {
    this.meetings = readJsonFile<MdtMeeting[]>(this.storagePath, []);
  }

  reset(): void {
    this.meetings = [];
    this.persist();
  }

  list(patientId?: string): MdtMeeting[] {
    return patientId
      ? this.meetings.filter((meeting) => meeting.patientId === patientId)
      : [...this.meetings];
  }

  get(meetingId: string): MdtMeeting {
    const meeting = this.meetings.find((candidate) => candidate.id === meetingId);

    if (!meeting) {
      throw new Error(`MDT meeting not found: ${meetingId}`);
    }

    return meeting;
  }

  create(input: CreateMeetingInput): MdtMeeting {
    const now = new Date().toISOString();
    const meeting: MdtMeeting = {
      id: createId("mdt"),
      patientId: input.patientId,
      workflowId: input.workflowId,
      topic: input.topic,
      status: "open",
      participantIds: input.participantIds,
      messages: [],
      decision: null,
      followUpActions: [],
      createdAt: now,
      updatedAt: now
    };

    this.meetings.unshift(meeting);
    this.persist();
    return meeting;
  }

  addMessage(meetingId: string, clinician: Clinician, message: string): MdtMeeting {
    const meeting = this.get(meetingId);

    if (meeting.status === "closed") {
      throw new Error("Meeting is already closed");
    }

    meeting.messages.push({
      id: createId("msg"),
      clinicianId: clinician.id,
      clinicianName: clinician.name,
      role: clinician.role,
      message,
      createdAt: new Date().toISOString()
    });
    meeting.updatedAt = new Date().toISOString();
    this.persist();
    return meeting;
  }

  close(meetingId: string, decision: string, followUpActions: string[]): MdtMeeting {
    const meeting = this.get(meetingId);
    meeting.status = "closed";
    meeting.decision = decision;
    meeting.followUpActions = followUpActions;
    meeting.updatedAt = new Date().toISOString();
    this.persist();
    return meeting;
  }

  private persist(): void {
    writeJsonFile(this.storagePath, this.meetings);
  }
}

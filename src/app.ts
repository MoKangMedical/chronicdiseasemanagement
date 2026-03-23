import express from "express";
import cors from "cors";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { ChronicCarePlatform } from "./services/chronic-care-platform.js";
import { DataAdapterService } from "./services/data-adapter-service.js";
import { EcosystemService } from "./services/ecosystem-service.js";
import { GithubCapabilityService } from "./services/github-capability-service.js";
import { LocalPredictionService } from "./services/local-prediction-service.js";
import { MedClawService } from "./services/medclaw-service.js";
import { VirtualFhirService } from "./services/virtual-fhir-service.js";

export function createApp(platform: ChronicCarePlatform) {
  const app = express();
  const currentDir = path.dirname(fileURLToPath(import.meta.url));
  const publicDir = path.resolve(currentDir, "..", "public");
  const medclaw = new MedClawService();
  const adapters = new DataAdapterService();
  const ecosystem = new EcosystemService();
  const githubCapabilities = new GithubCapabilityService();
  const predictions = new LocalPredictionService();
  const virtualFhir = new VirtualFhirService();

  app.use(cors());
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));
  app.use(express.static(publicDir));

  app.get("/health", (_request, response) => {
    response.json({
      status: "ok",
      service: "chronicare-os"
    });
  });

  app.get("/.well-known/smart-configuration", (request, response) => {
    const baseUrl = `${request.protocol}://${request.get("host")}`;
    response.json(virtualFhir.getSmartConfiguration(baseUrl));
  });

  app.get("/fhir/metadata", (request, response) => {
    const baseUrl = `${request.protocol}://${request.get("host")}`;
    response.json(virtualFhir.getCapabilityStatement(baseUrl));
  });

  const extractBearer = (header: string | undefined) => {
    if (!header?.startsWith("Bearer ")) {
      throw new Error("missing bearer token");
    }
    return header.replace("Bearer ", "").trim();
  };

  app.get("/fhir/Patient/:id", (request, response, next) => {
    try {
      const token = extractBearer(request.headers.authorization);
      virtualFhir.authorizeAccessToken(token, "Patient", request.params.id);
      virtualFhir.syncPatient(request.params.id);
      const resource = virtualFhir.getResource("Patient", request.params.id);
      if (!resource) {
        response.status(404).json({ error: "Patient not found" });
        return;
      }
      response.json(resource);
    } catch (error) {
      next(error);
    }
  });

  app.get("/fhir/:resourceType", (request, response, next) => {
    try {
      const patientId = typeof request.query.patient === "string" ? request.query.patient : undefined;
      const token = extractBearer(request.headers.authorization);
      virtualFhir.authorizeAccessToken(token, request.params.resourceType, patientId);
      if (patientId) {
        virtualFhir.syncPatient(patientId);
      }
      response.json(virtualFhir.searchResources(request.params.resourceType, patientId));
    } catch (error) {
      next(error);
    }
  });

  app.post("/api/fhir/patients/:patientId/sync", (request, response) => {
    response.json(virtualFhir.syncPatient(request.params.patientId));
  });

  app.get("/smart/launch", (request, response) => {
    const baseUrl = `${request.protocol}://${request.get("host")}`;
    const redirectUri = typeof request.query.redirect_uri === "string" ? request.query.redirect_uri : undefined;
    const patientId = typeof request.query.patientId === "string" ? request.query.patientId : undefined;
    const state = typeof request.query.state === "string" ? request.query.state : undefined;
    const clientId = typeof request.query.client_id === "string" ? request.query.client_id : "demo-smart-app";

    if (!redirectUri || !patientId) {
      response.status(400).json({ error: "redirect_uri and patientId are required" });
      return;
    }

    const redirect = new URL(redirectUri);
    redirect.searchParams.set("iss", `${baseUrl}/fhir`);
    redirect.searchParams.set("launch", patientId);
    redirect.searchParams.set("client_id", clientId);
    if (state) redirect.searchParams.set("state", state);
    response.redirect(302, redirect.toString());
  });

  app.get("/oauth/authorize", (request, response) => {
    const patientId =
      typeof request.query.launch === "string"
        ? request.query.launch
        : typeof request.query.patient === "string"
          ? request.query.patient
          : undefined;
    const redirectUri = typeof request.query.redirect_uri === "string" ? request.query.redirect_uri : undefined;
    const clientId = typeof request.query.client_id === "string" ? request.query.client_id : "demo-smart-app";
    const scope =
      typeof request.query.scope === "string" ? request.query.scope : "launch patient/*.read patient/Observation.read";
    const state = typeof request.query.state === "string" ? request.query.state : undefined;

    if (!patientId || !redirectUri) {
      response.status(400).json({ error: "patient/launch and redirect_uri are required" });
      return;
    }

    const code = virtualFhir.createAuthorizationCode(patientId, clientId, redirectUri, scope);
    const redirect = new URL(redirectUri);
    redirect.searchParams.set("code", code);
    if (state) redirect.searchParams.set("state", state);
    response.redirect(302, redirect.toString());
  });

  app.post("/oauth/register", (request, response, next) => {
    try {
      response.status(201).json(
        virtualFhir.registerClient({
          clientName: typeof request.body.client_name === "string" ? request.body.client_name : undefined,
          redirectUris: Array.isArray(request.body.redirect_uris) ? request.body.redirect_uris : undefined,
          scope: typeof request.body.scope === "string" ? request.body.scope : undefined,
          tokenEndpointAuthMethod:
            request.body.token_endpoint_auth_method === "client_secret_post" ? "client_secret_post" : "none",
          grantTypes: Array.isArray(request.body.grant_types) ? request.body.grant_types : undefined
        })
      );
    } catch (error) {
      next(error);
    }
  });

  app.post("/oauth/token", (request, response, next) => {
    try {
      const clientId = typeof request.body.client_id === "string" ? request.body.client_id : "demo-smart-app";
      const grantType =
        typeof request.body.grant_type === "string" ? request.body.grant_type : "authorization_code";
      if (grantType === "authorization_code") {
        const code = typeof request.body.code === "string" ? request.body.code : undefined;
        if (!code) {
          response.status(400).json({ error: "code is required" });
          return;
        }
        response.json(
          virtualFhir.exchangeCode({
            code,
            clientId,
            clientSecret: typeof request.body.client_secret === "string" ? request.body.client_secret : undefined,
            redirectUri: typeof request.body.redirect_uri === "string" ? request.body.redirect_uri : undefined
          })
        );
        return;
      }
      if (grantType === "refresh_token") {
        const refreshToken =
          typeof request.body.refresh_token === "string" ? request.body.refresh_token : undefined;
        if (!refreshToken) {
          response.status(400).json({ error: "refresh_token is required" });
          return;
        }
        response.json(
          virtualFhir.refreshAccessToken({
            refreshToken,
            clientId,
            clientSecret: typeof request.body.client_secret === "string" ? request.body.client_secret : undefined,
            scope: typeof request.body.scope === "string" ? request.body.scope : undefined
          })
        );
        return;
      }
      response.status(400).json({ error: "unsupported grant_type" });
    } catch (error) {
      next(error);
    }
  });

  app.get("/", (_request, response) => {
    response.json({
      name: "慢康智枢 ChroniCare OS Demo",
      endpoints: {
        summary: "/api/demo/summary",
        dashboard: "/api/dashboard",
        patients: "/api/patients",
        clinicians: "/api/clinicians",
        agents: "/api/agents",
        medclaw: "/api/medclaw/overview",
        ecosystem: "/api/ecosystem/overview",
        openSourceCapabilities: "/api/github-capabilities/overview",
        adapters: "/api/integrations/patients/:patientId/adapted",
        predictions: "/api/predictions/patients/:patientId",
        runWorkflow: "POST /api/workflows/chronic-care/run/:patientId",
        workspace: "GET /api/patients/:patientId/workspace",
        meetings: "POST /api/patients/:patientId/mdt-meetings",
        reset: "POST /api/demo/reset"
      }
    });
  });

  app.get("/api/demo/summary", (_request, response) => {
    response.json(platform.getDemoSummary());
  });

  app.get("/api/medclaw/overview", (_request, response) => {
    response.json(medclaw.getPlatformOverview());
  });

  app.get("/api/medclaw/patients/:patientId/workspace", (request, response) => {
    const workbenchRole =
      typeof request.query.workbenchRole === "string" ? (request.query.workbenchRole as any) : undefined;
    response.json(medclaw.getPatientWorkspace(request.params.patientId, workbenchRole));
  });

  app.get("/api/medclaw/patients/:patientId/imaging", (request, response) => {
    response.json({
      reports: medclaw.getImagingReports(request.params.patientId),
      comparison: medclaw.compareImaging(request.params.patientId)
    });
  });

  app.get("/api/medclaw/patients/:patientId/record-draft", (request, response) => {
    response.json(medclaw.generateMedicalRecordDraft(request.params.patientId));
  });

  app.get("/api/medclaw/patients/:patientId/diagnosis-support", (request, response) => {
    const workspace = medclaw.getPatientWorkspace(request.params.patientId);
    response.json(workspace.diagnosisSupport);
  });

  app.get("/api/medclaw/patients/:patientId/kg-followup", (request, response) => {
    response.json(medclaw.generateKgFollowup(request.params.patientId));
  });

  app.get("/api/medclaw/patients/:patientId/data-pipeline", (request, response) => {
    response.json(medclaw.buildDataPipelineOutput(request.params.patientId));
  });

  app.get("/api/medclaw/audit", (request, response) => {
    const patientId = typeof request.query.patientId === "string" ? request.query.patientId : undefined;
    response.json(medclaw.listAuditEvents(patientId));
  });

  app.get("/api/ecosystem/overview", (_request, response) => {
    response.json(ecosystem.getOverview());
  });

  app.get("/api/ecosystem/partners", (_request, response) => {
    response.json(ecosystem.listPartners());
  });

  app.get("/api/ecosystem/patients/:patientId/journey", (request, response) => {
    response.json(ecosystem.getPatientJourney(request.params.patientId));
  });

  app.get("/api/github-capabilities/overview", (_request, response) => {
    response.json(githubCapabilities.getOverview());
  });

  app.get("/api/github-capabilities/catalog", (_request, response) => {
    response.json(githubCapabilities.listCapabilities());
  });

  app.get("/api/github-capabilities/patients/:patientId/plan", (request, response) => {
    response.json(githubCapabilities.getPatientPlan(request.params.patientId));
  });

  app.get("/api/integrations/patients/:patientId/adapted", (request, response) => {
    response.json(adapters.buildIntegratedOutput(request.params.patientId));
  });

  app.get("/api/integrations/healthchain/patients/:patientId/bundle", (request, response) => {
    response.json(adapters.buildHealthChainBundle(request.params.patientId));
  });

  app.get("/api/integrations/healthkit/patients/:patientId/feed", (request, response) => {
    response.json(adapters.buildHealthKitFeed(request.params.patientId));
  });

  app.get("/api/predictions/patients/:patientId", (request, response) => {
    predictions
      .predictPatient(request.params.patientId)
      .then((result) => response.json(result))
      .catch((error) => {
        response.status(500).json({
          error: error instanceof Error ? error.message : "prediction failed"
        });
      });
  });

  app.get("/api/dashboard", (request, response) => {
    const hospitalId =
      typeof request.query.hospitalId === "string" ? (request.query.hospitalId as any) : undefined;
    const workbenchRole =
      typeof request.query.workbenchRole === "string" ? (request.query.workbenchRole as any) : undefined;
    response.json(platform.getDashboardData({ hospitalId, workbenchRole }));
  });

  app.post("/api/demo/reset", (_request, response) => {
    platform.reset();
    medclaw.reset();
    adapters.reset();
    virtualFhir.reset();
    response.json({
      ok: true,
      message: "document store reset"
    });
  });

  app.get("/api/patients", (request, response) => {
    const hospitalId =
      typeof request.query.hospitalId === "string" ? (request.query.hospitalId as any) : undefined;
    response.json(platform.listPatients(hospitalId));
  });

  app.get("/api/patients/:patientId", (request, response) => {
    response.json(platform.getPatient(request.params.patientId));
  });

  app.get("/api/patients/:patientId/workspace", (request, response) => {
    const workbenchRole =
      typeof request.query.workbenchRole === "string" ? (request.query.workbenchRole as any) : undefined;
    response.json(platform.getPatientWorkspace(request.params.patientId, workbenchRole));
  });

  app.get("/api/patients/:patientId/his-record", (request, response) => {
    response.json(platform.getHospitalRecord(request.params.patientId));
  });

  app.get("/api/patients/:patientId/risk", (request, response) => {
    response.json(platform.evaluatePatientRisk(request.params.patientId));
  });

  app.get("/api/patients/:patientId/documents", (request, response) => {
    response.json(platform.getPatientTimeline(request.params.patientId));
  });

  app.get("/api/patients/:patientId/care-plan", (request, response) => {
    response.json(platform.getLatestCarePlan(request.params.patientId));
  });

  app.get("/api/hospitals", (_request, response) => {
    response.json(platform.listHospitals());
  });

  app.get("/api/his/mappings", (_request, response) => {
    response.json(platform.listHisMappings());
  });

  app.get("/api/clinicians", (request, response) => {
    const hospitalId =
      typeof request.query.hospitalId === "string" ? (request.query.hospitalId as any) : undefined;
    const workbenchRole =
      typeof request.query.workbenchRole === "string" ? (request.query.workbenchRole as any) : undefined;
    response.json(platform.listClinicians({ hospitalId, workbenchRole }));
  });

  app.get("/api/agents", (_request, response) => {
    response.json(platform.listAgents());
  });

  app.get("/api/mdt-meetings", (request, response) => {
    const patientId = typeof request.query.patientId === "string" ? request.query.patientId : undefined;
    response.json(platform.listMdtMeetings(patientId));
  });

  app.get("/api/mdt-meetings/:meetingId", (request, response) => {
    response.json(platform.getMdtMeeting(request.params.meetingId));
  });

  app.post("/api/patients/:patientId/mdt-meetings", (request, response, next) => {
    try {
      const result = platform.createMdtMeeting({
        patientId: request.params.patientId,
        workflowId: request.body.workflowId ?? null,
        topic: request.body.topic,
        participantIds: request.body.participantIds
      });
      response.json(result);
    } catch (error) {
      next(error);
    }
  });

  app.post("/api/mdt-meetings/:meetingId/messages", (request, response, next) => {
    try {
      const result = platform.addMdtMeetingMessage(request.params.meetingId, request.body);
      response.json(result);
    } catch (error) {
      next(error);
    }
  });

  app.post("/api/mdt-meetings/:meetingId/close", async (request, response, next) => {
    try {
      const result = await platform.closeMdtMeeting(request.params.meetingId, request.body);
      response.json(result);
    } catch (error) {
      next(error);
    }
  });

  app.post("/api/workflows/chronic-care/run/:patientId", async (request, response, next) => {
    try {
      const result = await platform.runWorkflow({
        patientId: request.params.patientId
      });

      response.json(result);
    } catch (error) {
      next(error);
    }
  });

  app.use((error: unknown, _request: express.Request, response: express.Response, _next: express.NextFunction) => {
    const message = error instanceof Error ? error.message : "unknown error";

    response.status(500).json({
      ok: false,
      error: message
    });
  });

  return app;
}

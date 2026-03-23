import { randomUUID } from "node:crypto";

import { DataAdapterService } from "./data-adapter-service.js";
import { readJsonFile, resolveStoragePath, writeJsonFile } from "../lib/storage.js";
import type { FhirResource } from "../types.js";

interface SmartAuthCode {
  code: string;
  patientId: string;
  clientId: string;
  scope: string;
  redirectUri: string;
  expiresAt: string;
}

interface SmartAccessToken {
  accessToken: string;
  refreshToken: string | null;
  refreshTokenExpiresAt: string | null;
  patientId: string;
  clientId: string;
  scope: string;
  expiresAt: string;
}

interface SmartClient {
  clientId: string;
  clientSecret: string | null;
  clientName: string;
  redirectUris: string[];
  scope: string;
  tokenEndpointAuthMethod: "none" | "client_secret_post";
  grantTypes: string[];
  createdAt: string;
}

interface VirtualFhirDatabase {
  resources: FhirResource[];
  clients: SmartClient[];
  authCodes: SmartAuthCode[];
  accessTokens: SmartAccessToken[];
}

interface RegisterClientInput {
  clientName?: string;
  redirectUris?: string[];
  scope?: string;
  tokenEndpointAuthMethod?: "none" | "client_secret_post";
  grantTypes?: string[];
}

export class VirtualFhirService {
  private readonly adapters = new DataAdapterService();
  private readonly storagePath = resolveStoragePath("virtual-fhir-db.json");
  private database: VirtualFhirDatabase;

  constructor() {
    this.database = this.hydrateDatabase(
      readJsonFile<Partial<VirtualFhirDatabase>>(this.storagePath, {
        resources: [],
        clients: [],
        authCodes: [],
        accessTokens: []
      })
    );
    this.ensureDefaultClient();
  }

  reset(): void {
    this.database = {
      resources: [],
      clients: [],
      authCodes: [],
      accessTokens: []
    };
    this.ensureDefaultClient();
    this.persist();
  }

  syncPatient(patientId: string): { patientId: string; resourceCount: number } {
    const adapted = this.adapters.buildIntegratedOutput(patientId);
    const patientScoped = this.database.resources.filter((resource) => this.getPatientId(resource) !== patientId);
    this.database.resources = [...patientScoped, ...adapted.healthChain.resources, ...adapted.healthKit.resources];
    this.persist();
    return { patientId, resourceCount: adapted.healthChain.resources.length + adapted.healthKit.resources.length };
  }

  getSmartConfiguration(baseUrl: string) {
    const fhirBase = `${baseUrl}/fhir`;
    return {
      authorization_endpoint: `${baseUrl}/oauth/authorize`,
      token_endpoint: `${baseUrl}/oauth/token`,
      registration_endpoint: `${baseUrl}/oauth/register`,
      capabilities: ["launch-ehr", "client-public", "patient-access"],
      scopes_supported: [
        "launch",
        "openid",
        "fhirUser",
        "online_access",
        "offline_access",
        "patient/*.read",
        "patient/Observation.read",
        "patient/Condition.read"
      ],
      response_types_supported: ["code"],
      grant_types_supported: ["authorization_code", "refresh_token"],
      token_endpoint_auth_methods_supported: ["none", "client_secret_post"],
      code_challenge_methods_supported: ["S256", "plain"],
      management_endpoint: `${fhirBase}/metadata`
    };
  }

  getCapabilityStatement(baseUrl: string) {
    return {
      resourceType: "CapabilityStatement",
      status: "active",
      date: new Date().toISOString(),
      kind: "instance",
      fhirVersion: "4.0.1",
      format: ["json"],
      rest: [
        {
          mode: "server",
          security: {
            service: [{ text: "SMART-on-FHIR" }],
            extension: [
              {
                url: "http://fhir-registry.smarthealthit.org/StructureDefinition/oauth-uris",
                extension: [
                  { url: "authorize", valueUri: `${baseUrl}/oauth/authorize` },
                  { url: "token", valueUri: `${baseUrl}/oauth/token` }
                ]
              }
            ]
          },
          resource: ["Patient", "Condition", "Observation", "Encounter", "MedicationRequest", "CareTeam"].map(
            (type) => ({
              type,
              interaction: [{ code: "read" }, { code: "search-type" }]
            })
          )
        }
      ]
    };
  }

  getResource(resourceType: string, id: string): FhirResource | null {
    return this.database.resources.find((resource) => resource.resourceType === resourceType && resource.id === id) ?? null;
  }

  searchResources(resourceType: string, patientId?: string) {
    const entries = this.database.resources.filter((resource) => {
      const matchesType = resource.resourceType === resourceType;
      const matchesPatient = patientId ? this.getPatientId(resource) === patientId : true;
      return matchesType && matchesPatient;
    });

    return {
      resourceType: "Bundle",
      type: "searchset",
      total: entries.length,
      entry: entries.map((resource) => ({ resource }))
    };
  }

  registerClient(input: RegisterClientInput) {
    if (!input.redirectUris?.length) {
      throw new Error("redirect_uris are required for SMART client registration");
    }

    const clientId = `client-${randomUUID()}`;
    const authMethod = input.tokenEndpointAuthMethod ?? "none";
    const clientSecret = authMethod === "client_secret_post" ? `secret-${randomUUID()}` : null;
    const client: SmartClient = {
      clientId,
      clientSecret,
      clientName: input.clientName ?? "SMART Demo Client",
      redirectUris: input.redirectUris ?? [],
      scope: input.scope ?? "launch patient/*.read patient/Observation.read offline_access",
      tokenEndpointAuthMethod: authMethod,
      grantTypes: input.grantTypes ?? ["authorization_code", "refresh_token"],
      createdAt: new Date().toISOString()
    };

    this.database.clients.push(client);
    this.persist();

    return {
      client_id: client.clientId,
      client_secret: client.clientSecret,
      client_name: client.clientName,
      redirect_uris: client.redirectUris,
      scope: client.scope,
      token_endpoint_auth_method: client.tokenEndpointAuthMethod,
      grant_types: client.grantTypes
    };
  }

  createAuthorizationCode(patientId: string, clientId: string, redirectUri: string, scope: string) {
    this.syncPatient(patientId);
    const client = this.requireClient(clientId);
    this.assertGrantType(client, "authorization_code");
    this.validateRedirectUri(client, redirectUri);
    this.validateRequestedScope(client.scope, scope);
    const code = randomUUID();
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000).toISOString();

    this.database.authCodes.push({
      code,
      patientId,
      clientId,
      scope,
      redirectUri,
      expiresAt
    });
    this.persist();

    return code;
  }

  exchangeCode(params: {
    code: string;
    clientId: string;
    clientSecret?: string;
    redirectUri?: string;
  }) {
    const client = this.requireClient(params.clientId);
    this.assertClientAuth(client, params.clientSecret);
    const match = this.database.authCodes.find(
      (item) =>
        item.code === params.code &&
        item.clientId === params.clientId &&
        (!params.redirectUri || item.redirectUri === params.redirectUri) &&
        new Date(item.expiresAt).getTime() > Date.now()
    );

    if (!match) {
      throw new Error("invalid or expired authorization code");
    }

    const accessToken = `smart-${randomUUID()}`;
    const refreshToken =
      match.scope.includes("offline_access") || match.scope.includes("online_access") ? `refresh-${randomUUID()}` : null;
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000).toISOString();
    const refreshTokenExpiresAt = refreshToken
      ? new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
      : null;
    this.database.accessTokens.push({
      accessToken,
      refreshToken,
      refreshTokenExpiresAt,
      patientId: match.patientId,
      clientId: match.clientId,
      scope: match.scope,
      expiresAt
    });
    this.database.authCodes = this.database.authCodes.filter((item) => item.code !== params.code);
    this.persist();

    return {
      access_token: accessToken,
      refresh_token: refreshToken,
      token_type: "Bearer",
      patient: match.patientId,
      scope: match.scope,
      expires_in: 3600
    };
  }

  refreshAccessToken(params: {
    refreshToken: string;
    clientId: string;
    clientSecret?: string;
    scope?: string;
  }) {
    const client = this.requireClient(params.clientId);
    this.assertClientAuth(client, params.clientSecret);
    this.assertGrantType(client, "refresh_token");
    const match = this.database.accessTokens.find(
      (item) =>
        item.refreshToken === params.refreshToken &&
        item.clientId === params.clientId &&
        !!item.refreshTokenExpiresAt &&
        new Date(item.refreshTokenExpiresAt).getTime() > Date.now()
    );

    if (!match) {
      throw new Error("invalid refresh token");
    }

    if (params.scope) {
      this.validateRequestedScope(match.scope, params.scope);
    }

    const scope = params.scope ?? match.scope;
    const accessToken = `smart-${randomUUID()}`;
    const refreshToken = match.refreshToken;
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000).toISOString();
    this.database.accessTokens.push({
      accessToken,
      refreshToken,
      refreshTokenExpiresAt: match.refreshTokenExpiresAt,
      patientId: match.patientId,
      clientId: match.clientId,
      scope,
      expiresAt
    });
    this.persist();

    return {
      access_token: accessToken,
      refresh_token: refreshToken,
      token_type: "Bearer",
      patient: match.patientId,
      scope,
      expires_in: 3600
    };
  }

  authorizeAccessToken(token: string, resourceType: string, patientId?: string) {
    const match = this.database.accessTokens.find(
      (item) => item.accessToken === token && new Date(item.expiresAt).getTime() > Date.now()
    );

    if (!match) {
      throw new Error("invalid access token");
    }

    if (patientId && match.patientId !== patientId) {
      throw new Error("token patient context mismatch");
    }

    const scopes = match.scope.split(/\s+/).filter(Boolean);
    const requiredScopes = [`patient/${resourceType}.read`, "patient/*.read"];
    if (!requiredScopes.some((required) => scopes.includes(required))) {
      throw new Error(`insufficient scope for ${resourceType}`);
    }

    return match;
  }

  private getPatientId(resource: FhirResource): string | null {
    if (resource.resourceType === "Patient") return String(resource.id);

    const subject = resource.subject as { reference?: string } | undefined;
    if (subject?.reference?.startsWith("Patient/")) {
      return subject.reference.replace("Patient/", "");
    }

    return null;
  }

  private persist(): void {
    writeJsonFile(this.storagePath, this.database);
  }

  private hydrateDatabase(database: Partial<VirtualFhirDatabase>): VirtualFhirDatabase {
    return {
      resources: Array.isArray(database.resources) ? database.resources : [],
      clients: Array.isArray(database.clients) ? database.clients : [],
      authCodes: Array.isArray(database.authCodes) ? database.authCodes : [],
      accessTokens: Array.isArray(database.accessTokens)
        ? database.accessTokens.map((item) => ({
            accessToken: item.accessToken,
            refreshToken: item.refreshToken ?? null,
            refreshTokenExpiresAt: item.refreshTokenExpiresAt ?? null,
            patientId: item.patientId,
            clientId: item.clientId,
            scope: item.scope,
            expiresAt: item.expiresAt
          }))
        : []
    };
  }

  private ensureDefaultClient(): void {
    if (this.database.clients.some((client) => client.clientId === "demo-smart-app")) {
      return;
    }

    this.database.clients.push({
      clientId: "demo-smart-app",
      clientSecret: null,
      clientName: "Demo SMART App",
      redirectUris: ["http://127.0.0.1:9999/callback", "http://localhost:9999/callback"],
      scope: "launch patient/*.read patient/Observation.read patient/Condition.read offline_access online_access",
      tokenEndpointAuthMethod: "none",
      grantTypes: ["authorization_code", "refresh_token"],
      createdAt: new Date().toISOString()
    });
  }

  private requireClient(clientId: string): SmartClient {
    const client = this.database.clients.find((item) => item.clientId === clientId);
    if (!client) {
      throw new Error("unregistered client");
    }
    return client;
  }

  private validateRedirectUri(client: SmartClient, redirectUri: string): void {
    if (!client.redirectUris.includes(redirectUri)) {
      throw new Error("redirect_uri not registered");
    }
  }

  private validateRequestedScope(allowedScope: string, requestedScope: string): void {
    const allowed = new Set(allowedScope.split(/\s+/).filter(Boolean));
    for (const scope of requestedScope.split(/\s+/).filter(Boolean)) {
      if (!allowed.has(scope)) {
        throw new Error(`scope not allowed: ${scope}`);
      }
    }
  }

  private assertClientAuth(client: SmartClient, clientSecret?: string): void {
    if (client.tokenEndpointAuthMethod === "none") {
      return;
    }

    if (!clientSecret || client.clientSecret !== clientSecret) {
      throw new Error("client authentication failed");
    }
  }

  private assertGrantType(client: SmartClient, grantType: string): void {
    if (!client.grantTypes.includes(grantType)) {
      throw new Error(`grant type not allowed for client: ${grantType}`);
    }
  }
}

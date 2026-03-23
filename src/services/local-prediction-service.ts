import { spawn, type ChildProcess } from "node:child_process";
import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { DataAdapterService } from "./data-adapter-service.js";
import { HISSimulator } from "../adapters/his-simulator.js";
import type { LocalPredictionSuite } from "../types.js";

export class LocalPredictionService {
  private readonly his = new HISSimulator();
  private readonly adapters = new DataAdapterService();
  private readonly port = Number(process.env.PREDICTION_SERVICE_PORT ?? 8011);
  private readonly baseUrl = process.env.PREDICTION_SERVICE_URL ?? `http://127.0.0.1:${this.port}`;
  private readonly pythonExecutable = this.resolvePythonExecutable();
  private process: ChildProcess | null = null;

  async predictPatient(patientId: string): Promise<LocalPredictionSuite> {
    await this.ensureService();
    const patient = this.his.getPatient(patientId);
    const adapted = this.adapters.buildIntegratedOutput(patientId);
    const cohort = this.his.listPatients().map((cohortPatient) => ({
      patient: cohortPatient,
      integratedData: this.adapters.buildIntegratedOutput(cohortPatient.id)
    }));

    const response = await fetch(`${this.baseUrl}/predict`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        patient,
        integratedData: adapted,
        cohort
      })
    });

    if (!response.ok) {
      throw new Error(`prediction service failed with status ${response.status}`);
    }

    return (await response.json()) as LocalPredictionSuite;
  }

  private async ensureService(): Promise<void> {
    if (await this.ping()) {
      return;
    }

    if (this.process && this.process.exitCode !== null) {
      this.process = null;
    }

    if (!this.process) {
      const currentDir = path.dirname(fileURLToPath(import.meta.url));
      const projectRoot = path.resolve(currentDir, "..", "..");
      const scriptPath = path.join(projectRoot, "scripts", "predict_service.py");

      this.process = spawn(this.pythonExecutable, [scriptPath, "--port", String(this.port)], {
        cwd: projectRoot,
        stdio: "ignore",
        env: {
          ...process.env,
          MPLBACKEND: "Agg"
        }
      });
      this.process.once("exit", () => {
        this.process = null;
      });
    }

    for (let attempt = 0; attempt < 60; attempt += 1) {
      if (await this.ping()) {
        return;
      }

      await new Promise((resolve) => setTimeout(resolve, 250));
    }

    throw new Error("prediction service unavailable");
  }

  private async ping(): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseUrl}/health`);
      return response.ok;
    } catch {
      return false;
    }
  }

  private resolvePythonExecutable(): string {
    const currentDir = path.dirname(fileURLToPath(import.meta.url));
    const projectRoot = path.resolve(currentDir, "..", "..");
    const venvPython = path.join(projectRoot, ".venv-predictor", "bin", "python");
    if (process.env.PREDICTION_SERVICE_PYTHON) {
      return process.env.PREDICTION_SERVICE_PYTHON;
    }

    return existsSync(venvPython) ? venvPython : "python3";
  }
}

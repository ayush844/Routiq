import fs from "node:fs";
import path from "node:path";
import os from "node:os";

export interface RoutiqConfig {
  apiKey: string;
  relay?: string;
  relayHttp?: string;
}

const CONFIG_DIR = path.join(os.homedir(), ".routiq");
const CONFIG_FILE = path.join(CONFIG_DIR, "config.json");

export function getConfigPath(): string {
  return CONFIG_FILE;
}

export function loadConfig(): RoutiqConfig | null {
  try {
    const raw = fs.readFileSync(CONFIG_FILE, "utf-8");
    const config = JSON.parse(raw) as RoutiqConfig;

    if (!config.apiKey) return null;

    return config;
  } catch {
    return null;
  }
}

export function saveConfig(config: RoutiqConfig): void {
  fs.mkdirSync(CONFIG_DIR, { recursive: true });
  fs.writeFileSync(CONFIG_FILE, JSON.stringify(config, null, 2) + "\n", {
    mode: 0o600,
  });
}

export function clearConfig(): void {
  try {
    fs.unlinkSync(CONFIG_FILE);
  } catch {
    // Already gone
  }
}

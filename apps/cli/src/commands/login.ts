import { createInterface } from "node:readline/promises";
import { exec } from "node:child_process";
import { stdin, stdout, platform } from "node:process";
import chalk from "chalk";
import { saveConfig, getConfigPath } from "../config/store.js";
import { getRelayHttpUrl, getRelayUrl } from "../config/env.js";
import { verifyApiKey } from "../utils/verify-api-key.js";
import { clearTerminal } from "../utils/terminal.js";

const DASHBOARD_URL =
  process.env.ROUTIQ_DASHBOARD_URL || "https://routiq.dev/dashboard";

function openBrowser(url: string) {
  const cmd =
    platform === "darwin"
      ? `open "${url}"`
      : platform === "win32"
        ? `start "${url}"`
        : `xdg-open "${url}"`;

  exec(cmd, () => {});
}

export async function loginCommand() {
  clearTerminal();
  console.log();
  console.log(chalk.bold("  Routiq Login"));
  console.log();
  console.log(
    `  Opening your dashboard to get an API key...`
  );
  console.log(chalk.dim(`  ${DASHBOARD_URL}`));
  console.log();

  openBrowser(DASHBOARD_URL);

  const rl = createInterface({ input: stdin, output: stdout });

  try {
    const key = await rl.question(
      chalk.cyan("  ? ") + "Paste your API key: "
    );

    const trimmed = key.trim();

    if (!trimmed.startsWith("rtq_")) {
      console.log();
      console.log(
        chalk.red("  Invalid key. API keys start with rtq_")
      );
      process.exit(1);
    }

    console.log();
    console.log(chalk.dim("  Verifying API key..."));

    const result = await verifyApiKey(trimmed);

    if (!result.ok) {
      console.log();
      if (result.reason === "invalid") {
        console.log(chalk.red("  Invalid API key."));
        console.log("  Generate a new key from your dashboard and try again.");
      } else {
        console.log(chalk.red("  Could not reach the relay."));
        console.log(chalk.dim(`  ${getRelayHttpUrl()}`));
      }
      console.log();
      process.exit(1);
    }

    saveConfig({
      apiKey: trimmed,
      relay: getRelayUrl(),
    });

    console.log();
    console.log(chalk.green("  Logged in successfully!"));
    console.log(chalk.dim(`  Key saved to ${getConfigPath()}`));
    console.log();
    console.log(
      `  Run ${chalk.cyan("routiq http <port>")} to start a tunnel.`
    );
    console.log();
  } finally {
    rl.close();
  }
}

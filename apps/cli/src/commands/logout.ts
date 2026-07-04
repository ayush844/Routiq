import chalk from "chalk";
import { clearConfig, loadConfig } from "../config/store.js";
import { clearTerminal } from "../utils/terminal.js";

export function logoutCommand() {
  clearTerminal();
  const config = loadConfig();

  if (!config) {
    console.log();
    console.log(chalk.dim("  Not logged in."));
    console.log();
    return;
  }

  clearConfig();

  console.log();
  console.log(chalk.green("  Logged out. Config removed."));
  console.log();
}

#!/usr/bin/env node

import { Command } from "commander";
import { httpCommand } from "./commands/http.js";
import { loginCommand } from "./commands/login.js";
import { logoutCommand } from "./commands/logout.js";
import pkg from "../package.json" with { type: "json" };

const program = new Command();

program
    .name("routiq")
    .description("Expose local servers to the internet.")
    .version(pkg.version);

program.command("http").argument("<port...>").action(httpCommand);
program.command("login").description("Authenticate with Routiq").action(loginCommand);
program.command("logout").description("Remove stored credentials").action(logoutCommand);

program.parse();

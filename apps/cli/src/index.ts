#!/usr/bin/env node

import { Command } from "commander";
import { httpCommand } from "./commands/http";

const program = new Command();

program
    .name("routiq")
    .description("Expose local servers to the internet.")
    .version("0.1.0");

program.command("http").argument("<port...>").action(httpCommand);

program.parse();
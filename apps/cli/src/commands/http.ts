import { startAgent } from "@routiq/agent";
import { RELAY_URL, AGENT_TOKEN } from "../config/env.js";

export function httpCommand(ports: string[]) {
    console.log(ports);

    const parsedPorts = ports.map(Number);

    for (const port of parsedPorts) {
        if (!Number.isInteger(port) || port < 1 || port > 65535) {
            console.error(`Invalid port: ${port}`);
            process.exit(1);
        }
    }

    startAgent({
        ports: parsedPorts,
        relayUrl: RELAY_URL!,
        token: AGENT_TOKEN!
    });
}
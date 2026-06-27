import { startAgent } from "@routiq/agent";
import { RELAY_URL, AGENT_TOKEN } from "../config/env.js";
import { validatePorts } from "../utils/validate-port.js";
import { spinner } from "../ui/spinner.js";
import { logger } from "../ui/logger.js";

export function httpCommand(ports: string[]) {

    spinner.start("Connecting to relay...");

    const parsedPorts = ports.map(Number);

    validatePorts(parsedPorts);

    const agent = startAgent({

        ports: parsedPorts,
        relayUrl: RELAY_URL!,
        token: AGENT_TOKEN!,

        onConnecting() {
            spinner.text = "Connecting to relay...";
        },

        onConnected() {
            spinner.text = "Authenticating...";
        },

        onAuthenticated() {
            spinner.succeed("Connected");
        },

        onTunnelCreated(tunnel) {
            logger.success(
                `${tunnel.url} → localhost:${tunnel.port}`
            );
        },

        onDisconnected() {
            logger.warn("Disconnected");
        },

        onReconnect(delay) {
            logger.warn(
                `Reconnecting in ${delay / 1000}s...`
            );
        },

        onError(error) {
            spinner.fail(error.message);
        },

        onStopping(){
            spinner.fail("\nStopping Routiq...");
        },

        onStopped() {
            spinner.stop();
            logger.success("Goodbye 👋");
            process.exit(0);
        }
    });

    process.on("SIGINT", () => {
        agent.stop();
    });
}
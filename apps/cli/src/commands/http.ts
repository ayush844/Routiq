import { startAgent } from "@routiq/agent";
import { RELAY_URL, AGENT_TOKEN } from "../config/env.js";
import { validatePorts } from "../utils/validate-port.js";
import { logger } from "../ui/logger.js";
import { Dashboard } from "../ui/dashboard.js";

export function httpCommand(ports: string[]) {

    const parsedPorts = ports.map(Number);

    validatePorts(parsedPorts);

    const dashboard = new Dashboard();

    dashboard.setRelay(RELAY_URL!);


    const agent = startAgent({

        ports: parsedPorts,
        relayUrl: RELAY_URL!,
        token: AGENT_TOKEN!,

        onConnecting() {
            dashboard.setStatus("Connecting...");
            dashboard.clearTunnels();
        },

        onConnected() {
            dashboard.setStatus("Authenticating...");
        },

        onAuthenticated(userId) {
            dashboard.setStatus("Connected");
            dashboard.setUser(userId);
        },

        onTunnelCreated(tunnel) {
            dashboard.addTunnel(
                tunnel.port,
                tunnel.url
            );
        },

        onDisconnected() {
            dashboard.setStatus("Disconnected");
        },

        onReconnect(delay) {
            dashboard.setStatus(
                `Reconnecting in ${delay / 1000}s`
            );
        },

        onError(error) {
            dashboard.setStatus(`Error: ${error.message}`);
        },

        onStopped() {
            console.clear();

            console.log();
            console.log("👋  Thanks for using Routiq.");
            console.log("Built with ❤️  by Ayush Sharma");
            console.log();

            process.exit(0);
        },

        onRequest(request) {
            dashboard.addRequest(request);
        }
    });

    process.on("SIGINT", () => {
        agent.stop();
    });
}
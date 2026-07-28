import { startAgent } from "@routiq/agent";
import { getRelayHttpUrl, getToken, getRelayUrl } from "../config/env.js";
import { validatePorts } from "../utils/validate-port.js";
import { verifyApiKey } from "../utils/verify-api-key.js";
import { Dashboard } from "../ui/dashboard.js";
import { clearTerminal } from "../utils/terminal.js";
import chalk from "chalk";

export async function httpCommand(ports: string[]) {

    const parsedPorts = ports.map(Number);

    validatePorts(parsedPorts);

    const token = getToken();

    if (!token) {
        clearTerminal();
        console.log();
        console.log(chalk.red("  No API key found."));
        console.log();
        console.log(`  Run ${chalk.cyan("routiq login")} to authenticate.`);
        console.log();
        process.exit(1);
    }

    const result = await verifyApiKey(token);

    if (!result.ok) {
        clearTerminal();
        console.log();
        if (result.reason === "invalid") {
            console.log(chalk.red("  Invalid API key."));
            console.log(`  Run ${chalk.cyan("routiq login")} to re-authenticate.`);
        } else {
            console.log(chalk.red("  Could not reach the relay."));
            console.log(chalk.dim(`  ${getRelayHttpUrl()}`));
        }
        console.log();
        process.exit(1);
    }

    const relayUrl = getRelayUrl();
    const dashboard = new Dashboard();
    dashboard.start();

    dashboard.setRelay(relayUrl);

    let bandwidthLimited = false;

    const agent = startAgent({

        ports: parsedPorts,
        relayUrl,
        token,

        onConnecting() {
            dashboard.setStatus("Connecting...");
            dashboard.clearTunnels();
        },

        onConnected() {
            dashboard.setStatus("Authenticating...");
        },

        onAuthenticated(userId) {
            dashboard.setUser(userId);
            dashboard.setStatus(
                bandwidthLimited
                    ? chalk.red("Bandwidth limit reached")
                    : "Connected"
            );
        },

        onTunnelCreated(tunnel) {
            dashboard.addTunnel(
                tunnel.port,
                tunnel.url
            );
            if (!bandwidthLimited) {
                dashboard.setStatus("Connected");
            }
        },

        onTunnelOffline(reason) {
            dashboard.setStatus("Tunnel offline — reconnecting...");
        },

        onTunnelExpired(info) {
            dashboard.dispose();
            clearTerminal();
            console.log();
            console.log(chalk.red("  Tunnel expired."));
            console.log(`  ${info.reason}`);
            console.log();
            process.exit(1);
        },

        onBandwidthExceeded(info) {
            bandwidthLimited = true;
            dashboard.setStatus(chalk.red("Bandwidth limit reached"));
            dashboard.addRequest({
                method: "LIMIT",
                path: info.reason,
                status: 429,
                duration: 0,
            });
        },

        onDisconnected() {
            dashboard.setStatus("Tunnel offline — reconnecting...");
        },

        onReconnect(delay) {
            dashboard.setStatus(
                `Reconnecting in ${delay / 1000}s`
            );
        },

        onError(error) {
            dashboard.setStatus(`Error: ${error.message}`);
        },

        onAuthFailed() {
            dashboard.dispose();
            clearTerminal();
            console.log();
            console.log(chalk.red("  Authentication failed."));
            console.log(`  Run ${chalk.cyan("routiq login")} to re-authenticate.`);
            console.log();
            process.exit(1);
        },

        onRateLimited(info) {
            dashboard.dispose();
            clearTerminal();
            console.log();
            console.log(chalk.red("  Rate limit reached."));
            console.log(`  ${info.reason}`);
            if (info.retryAfter) {
                console.log(chalk.dim(`  Try again in ${info.retryAfter}s.`));
            }
            console.log();
            process.exit(1);
        },

        onStopped() {
            dashboard.dispose();
            clearTerminal();

            console.log();
            console.log("👋  Thanks for using Routiq.");
            console.log("Built with ❤️  by Ayush Sharma");
            console.log();

            process.exit(0);
        },

        onRequest(request) {
            if (bandwidthLimited) {
                bandwidthLimited = false;
                dashboard.setStatus("Connected");
            }
            dashboard.addRequest(request);
        }
    });

    process.on("SIGINT", () => {
        agent.stop();
    });
}

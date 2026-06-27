import { showBanner } from "./banner";
import boxen from "boxen";
import chalk from "chalk";
import stringWidth from "string-width";
import stripAnsi from "strip-ansi";

type Tunnel = {
    port: number;
    url: string;
};

type RequestLog = {
    method: string;
    path: string;
    status: number;
    duration: number;
};


export class Dashboard {

    private status = "Connecting...";
    private relay = "";
    private user = "";

    private tunnels: Tunnel[] = [];

    private requests: RequestLog[] = [];

    private dirty = false;

    private requestRender() {
        if (this.dirty) return;

        this.dirty = true;

        setImmediate(() => {
            this.dirty = false;
            this.render();
        });
    }

    setStatus(status: string) {
        this.status = status;
        this.requestRender();
    }

    setRelay(relay: string) {
        this.relay = relay;
        this.render();
    }

    setUser(user: string) {
        this.user = user;
        this.render();
    }

    addTunnel(port: number, url: string) {
        this.tunnels.push({
            port,
            url
        });
        this.render();
    }

    addRequest(request: RequestLog) {
        this.requests.unshift(request);

        this.requests = this.requests.slice(0, 5);
        this.render();
    }

    private statusColor(status: number) {
        if (status >= 500)
            return chalk.red(status);

        if (status >= 400)
            return chalk.yellow(status);

        if (status >= 300)
            return chalk.cyan(status);

        return chalk.green(status);
    }

    private mergeBoxes(left: string, right: string) {
        const leftLines = left.split("\n");
        const rightLines = right.split("\n");

        const leftWidth = Math.max(
            ...leftLines.map(line =>
                stringWidth(stripAnsi(line))
            )
        );

        const maxLines = Math.max(
            leftLines.length,
            rightLines.length
        );

        const merged: string[] = [];

        for (let i = 0; i < maxLines; i++) {
            merged.push(
                (leftLines[i] ?? "").padEnd(leftWidth + stripAnsi(leftLines[i] ?? "").length - stringWidth(stripAnsi(leftLines[i] ?? ""))) +
                "  " +
                (rightLines[i] ?? "")
            );
        }

        return merged.join("\n");
    }

    private renderBanner() {
        showBanner();
    }

    private renderConnection() {
        const content = [
            `${chalk.bold.magenta("●")} Status    ${this.status}`,
            `${chalk.bold.cyan("●")} Relay     ${this.relay}`,
            `${chalk.bold.green("●")} User      ${this.user || "-"}`,
        ].join("\n");


        return boxen(content, {
                title: " Connection ",
                borderStyle: "round",
                borderColor: "magenta",
                padding: {
                    top: 0,
                    bottom: 0,
                    left: 1,
                    right: 1,
                },
            })
    }

    private renderTunnels() {

        const content =
            this.tunnels.length === 0
                ? chalk.dim("Waiting for tunnels...")
                : this.tunnels
                    .map(
                        tunnel =>
                            `${chalk.green("●")} localhost:${tunnel.port}\n   ${chalk.magenta(
                                tunnel.url
                            )}`
                    )
                    .join("\n\n");


        return boxen(content, {
                title: " Active Tunnels ",
                borderStyle: "round",
                borderColor: "magenta",
                padding: 1,
            })
    }

    private renderRequests() {

        const content =
            this.requests.length === 0
                ? chalk.dim("Waiting for traffic...")
                : this.requests
                    .map(
                        req =>
                            [
                                req.method.padEnd(6),
                                req.path.padEnd(30),
                                this.statusColor(req.status),
                                `${req.duration}ms`.padStart(7),
                            ].join(" ")
                    )
                    .join("\n");

        return boxen(content, {
                title: " Recent Requests ",
                borderStyle: "round",
                borderColor: "magenta",
                padding: 1,
            })
    }

    private renderFooter() {
        console.log();

        console.log(
            chalk.dim(
                "Press Ctrl+C to stop • Built with ❤️  by Ayush Sharma"
            )
        );

        console.log(
            chalk.magenta("https://x.com/ayushuprush")
        );
    }


    render() {
        console.clear();

        this.renderBanner();

        const top = this.mergeBoxes(
            this.renderConnection(),
            this.renderTunnels()
        );

        console.log(top);

        console.log();

        console.log(
            this.renderRequests()
        );


        this.renderFooter();
    }

}
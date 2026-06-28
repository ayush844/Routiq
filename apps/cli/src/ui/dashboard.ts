import { showBanner } from "./banner";
import boxen from "boxen";
import chalk from "chalk";
import stringWidth from "string-width";
import stripAnsi from "strip-ansi";
import Table from "cli-table3";
import { c, tableColors } from "./theme";

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

    // private mergeBoxes(left: string, right: string) {
    //     const leftLines = left.split("\n");
    //     const rightLines = right.split("\n");

    //     const leftWidth = Math.max(
    //         ...leftLines.map(line =>
    //             stringWidth(stripAnsi(line))
    //         )
    //     );

    //     const maxLines = Math.max(
    //         leftLines.length,
    //         rightLines.length
    //     );

    //     const merged: string[] = [];

    //     for (let i = 0; i < maxLines; i++) {
    //         merged.push(
    //             (leftLines[i] ?? "").padEnd(leftWidth + stripAnsi(leftLines[i] ?? "").length - stringWidth(stripAnsi(leftLines[i] ?? ""))) +
    //             "  " +
    //             (rightLines[i] ?? "")
    //         );
    //     }

    //     return merged.join("\n");
    // }

    private renderBanner() {
        showBanner();
    }

    // private renderConnection() {
    //     const content = [
    //         `${chalk.bold.magenta("●")} Status    ${this.status}`,
    //         `${chalk.bold.cyan("●")} Relay     ${this.relay}`,
    //         `${chalk.bold.green("●")} User      ${this.user || "-"}`,
    //     ].join("\n");


    //     return boxen(content, {
    //             title: " Connection ",
    //             borderStyle: "round",
    //             borderColor: "magenta",
    //             padding: {
    //                 top: 0,
    //                 bottom: 0,
    //                 left: 1,
    //                 right: 1,
    //             },
    //         })
    // }

    // private renderTunnels() {

    //     const content =
    //         this.tunnels.length === 0
    //             ? chalk.dim("Waiting for tunnels...")
    //             : this.tunnels
    //                 .map(
    //                     tunnel =>
    //                         `${chalk.green("●")} localhost:${tunnel.port}\n   ${chalk.magenta(
    //                             tunnel.url
    //                         )}`
    //                 )
    //                 .join("\n\n");


    //     return boxen(content, {
    //             title: " Active Tunnels ",
    //             borderStyle: "round",
    //             borderColor: "magenta",
    //             padding: 1,
    //         })
    // }

    private renderTopPanel() {

        const table = new Table({
            colWidths: [35, 55],
            wordWrap: true,

            style: {
                head: tableColors.head,
                border: tableColors.border
            },

            chars: {
                "top": "─",
                "top-mid": "┬",
                "top-left": "┌",
                "top-right": "┐",

                "bottom": "─",
                "bottom-mid": "┴",
                "bottom-left": "└",
                "bottom-right": "┘",

                "left": "│",
                "left-mid": "├",

                "mid": "─",
                "mid-mid": "┼",

                "right": "│",
                "right-mid": "┤",

                "middle": "│"
            }
        });

        const connection = [
            `${chalk.green("●")} Status`,
            `   ${this.status}`,
            "",
            `${chalk.cyan("●")} Relay`,
            `   ${this.relay}`,
            "",
            `${c.signalLight("●")} User`,
            `   ${this.user || "-"}`
        ].join("\n");

        const tunnels =
            this.tunnels.length === 0
                ? chalk.dim("Waiting for tunnels...")
                : this.tunnels
                    .map(
                        tunnel =>
                            `${chalk.bold(`localhost:${tunnel.port}`)}
    ${c.signalLight(tunnel.url)}`
                    )
                    .join("\n\n");

        table.push([
            {
                content: connection,
                hAlign: "left"
            },
            {
                content: tunnels,
                hAlign: "left"
            }
        ]);

        return table.toString();
    }

    private renderRequests() {

        const table = new Table({
            head: [
                "Method",
                "Path",
                "Status",
                "Time"
            ],

            colWidths: [
                10,
                45,
                10,
                10
            ],

            style: {
                head: tableColors.head,
                border: tableColors.border
            }
        });

        if (this.requests.length === 0) {

            table.push([
                "",
                chalk.dim("Waiting for traffic..."),
                "",
                ""
            ]);

        } else {

            for (const req of this.requests) {

                table.push([
                    chalk.cyan(req.method),
                    req.path,
                    this.statusColor(req.status),
                    `${req.duration} ms`
                ]);

            }

        }

        return table.toString();
    }

    private renderFooter() {
        console.log();

        console.log(
            chalk.dim(
                "Press Ctrl+C to stop • Built with ❤️  by Ayush Sharma"
            )
        );

        console.log(
            c.signalLight("https://x.com/ayushuprush")
        );
    }


    render() {
        console.clear();

        this.renderBanner();

        console.log();

        console.log(
            this.renderTopPanel()
        );

        console.log();

        console.log(
            this.renderRequests()
        );

        this.renderFooter();
    }

}
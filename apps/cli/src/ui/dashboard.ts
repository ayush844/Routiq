import { renderBanner } from "./banner.js";
import chalk from "chalk";
import Table from "cli-table3";
import { c, tableColors } from "./theme.js";
import {
  ALT_SCREEN_OFF,
  ALT_SCREEN_ON,
  CLEAR_SCREEN,
  getTerminalColumns,
  isCompactTerminal,
  onTerminalResize,
  truncate,
} from "../utils/terminal.js";

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

  private active = false;
  private dirty = false;
  private renderTimer: NodeJS.Timeout | null = null;
  private resizeTimer: NodeJS.Timeout | null = null;
  private readonly removeResizeListener: () => void;

  constructor() {
    this.removeResizeListener = onTerminalResize(() => {
      if (this.resizeTimer) clearTimeout(this.resizeTimer);
      this.resizeTimer = setTimeout(() => this.requestRender(), 150);
    });
  }

  start() {
    if (this.active) return;
    this.active = true;
    process.stdout.write(ALT_SCREEN_ON);

    if (process.stdin.isTTY) {
      process.stdin.setRawMode(true);
    }
    process.stdin.resume();
    process.stdin.on("data", this.handleStdin);

    this.requestRender();
  }

  dispose() {
    this.removeResizeListener();

    if (this.renderTimer) {
      clearTimeout(this.renderTimer);
      this.renderTimer = null;
    }

    if (this.resizeTimer) {
      clearTimeout(this.resizeTimer);
      this.resizeTimer = null;
    }

    process.stdin.off("data", this.handleStdin);
    if (process.stdin.isTTY) {
      process.stdin.setRawMode(false);
    }
    process.stdin.pause();

    if (this.active) {
      process.stdout.write(ALT_SCREEN_OFF);
      this.active = false;
    }
  }

  private handleStdin = (data: Buffer) => {
    // Ctrl+C (ETX) — raw mode disables the terminal's automatic
    // signal generation, so forward it manually.
    if (data.length === 1 && data[0] === 0x03) {
      process.emit("SIGINT");
      return;
    }
    // Swallow everything else (arrow-key sequences from mouse-wheel
    // scroll while in the alternate screen, stray keypresses, etc.)
    // so they don't get echoed onto the screen.
  };

  private requestRender() {
    if (!this.active) return;
    if (this.dirty) return;

    this.dirty = true;

    this.renderTimer = setTimeout(() => {
      this.renderTimer = null;
      this.dirty = false;
      this.render();
    }, 50);
  }

  setStatus(status: string) {
    this.status = status;
    this.requestRender();
  }

  setRelay(relay: string) {
    this.relay = relay;
    this.requestRender();
  }

  setUser(user: string) {
    this.user = user;
    this.requestRender();
  }

  addTunnel(port: number, url: string) {
    const index = this.tunnels.findIndex((t) => t.port === port);

    if (index >= 0) {
      this.tunnels[index] = { port, url };
    } else {
      this.tunnels.push({ port, url });
    }

    this.requestRender();
  }

  clearTunnels() {
    this.tunnels = [];
    this.requestRender();
  }

  addRequest(request: RequestLog) {
    this.requests.unshift(request);
    this.requests = this.requests.slice(0, isCompactTerminal() ? 4 : 5);
    this.requestRender();
  }

  private statusColor(status: number) {
    if (status >= 500) return chalk.red(String(status));
    if (status >= 400) return chalk.yellow(String(status));
    if (status >= 300) return chalk.cyan(String(status));
    return chalk.green(String(status));
  }

  private renderTopPanel() {
    const table = new Table({
      colWidths: [35, 55],
      wordWrap: true,
      style: {
        head: tableColors.head,
        border: tableColors.border,
      },
      chars: {
        top: "─",
        "top-mid": "┬",
        "top-left": "┌",
        "top-right": "┐",
        bottom: "─",
        "bottom-mid": "┴",
        "bottom-left": "└",
        "bottom-right": "┘",
        left: "│",
        "left-mid": "├",
        mid: "─",
        "mid-mid": "┼",
        right: "│",
        "right-mid": "┤",
        middle: "│",
      },
    });

    const connection = [
      `${chalk.green("●")} Status`,
      `   ${this.status}`,
      "",
      `${chalk.cyan("●")} Relay`,
      `   ${this.relay}`,
      "",
      `${c.signalLight("●")} User`,
      `   ${this.user || "-"}`,
    ].join("\n");

    const tunnels =
      this.tunnels.length === 0
        ? chalk.dim("Waiting for tunnels...")
        : this.tunnels
            .map(
              (tunnel) =>
                `${chalk.bold(`localhost:${tunnel.port}`)}
    ${c.signalLight(tunnel.url)}`
            )
            .join("\n\n");

    table.push([
      { content: connection, hAlign: "left" },
      { content: tunnels, hAlign: "left" },
    ]);

    return table.toString();
  }

  private renderRequests() {
    const table = new Table({
      head: ["Method", "Path", "Status", "Time"],
      colWidths: [10, 45, 10, 10],
      style: {
        head: tableColors.head,
        border: tableColors.border,
      },
    });

    if (this.requests.length === 0) {
      table.push(["", chalk.dim("Waiting for traffic..."), "", ""]);
    } else {
      for (const req of this.requests) {
        table.push([
          chalk.cyan(req.method),
          req.path,
          this.statusColor(req.status),
          `${req.duration} ms`,
        ]);
      }
    }

    return table.toString();
  }

  private renderCompactTunnels() {
    if (this.tunnels.length === 0) {
      return chalk.dim("  Waiting for tunnels...");
    }

    const cols = getTerminalColumns();

    return this.tunnels
      .map((tunnel) => {
        const url = truncate(tunnel.url, Math.max(cols - 4, 16));
        return `  ${chalk.green("●")} ${chalk.bold(`localhost:${tunnel.port}`)}\n     ${c.signalLight(url)}`;
      })
      .join("\n");
  }

  private renderCompactTraffic() {
    if (this.requests.length === 0) {
      return chalk.dim("  Waiting for traffic...");
    }

    const cols = getTerminalColumns();

    return this.requests
      .map((req) => {
        const method = truncate(req.method, 6).padEnd(6);
        const path = truncate(req.path, Math.max(cols - 22, 10));
        return `  ${chalk.cyan(method)} ${path}  ${this.statusColor(req.status)}  ${req.duration}ms`;
      })
      .join("\n");
  }

  private renderWideFooter() {
    return [
      "",
      chalk.dim("Press Ctrl+C to stop • Built with ❤️  by Ayush Sharma"),
      c.signalLight("https://x.com/ayushuprush"),
    ].join("\n");
  }

  private buildFrame(): string {
    if (isCompactTerminal()) {
      return [
        renderBanner(true),
        "",
        chalk.bold("Tunnels"),
        this.renderCompactTunnels(),
        "",
        chalk.bold("Traffic"),
        this.renderCompactTraffic(),
        "",
        chalk.dim("Press Ctrl+C to stop"),
      ].join("\n");
    }

    return [
      renderBanner(false),
      "",
      this.renderTopPanel(),
      "",
      this.renderRequests(),
      this.renderWideFooter(),
    ].join("\n");
  }

  render() {
    if (!this.active) return;
    process.stdout.write(CLEAR_SCREEN + this.buildFrame());
  }
}

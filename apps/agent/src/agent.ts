import WebSocket from "ws"
import {AuthMessage, AuthSuccessMessage, BandwidthExceededMessage, CreateTunnelMessage, HttpRequestMessage, HttpResponseMessage, PongMessage, RateLimitedMessage, TunnelCreatedMessage, TunnelExpiredMessage, TunnelOfflineMessage} from "@routiq/shared"
import { tunnels } from "./stores/tunnels.js"
import { handleHttpRequest } from "./services/local-request.service.js"
import {pong} from "./handlers/ping.handler.js"
import { createAuthMessage } from "./handlers/auth.handler.js"
import {createTunnel} from "./handlers/tunnel.handler.js"

export interface AgentConfig {
    ports: number[];
    relayUrl: string;
    token: string;

    onConnecting?(): void;
    onConnected?(): void;
    onAuthenticated?(userId: string): void;

    onTunnelCreated?(tunnel: TunnelCreatedMessage): void;

    onTunnelOffline?(reason: string): void;

    onTunnelExpired?(info: { reason: string; tunnelId?: string }): void;

    onBandwidthExceeded?(info: {
      reason: string;
      usedBytes: number;
      limitBytes: number;
    }): void;

    onDisconnected?(): void;

    onReconnect?(delay: number): void;

    onError?(error: Error): void;

    onAuthFailed?(): void;

    onRateLimited?(info: { scope: "auth" | "tunnel"; reason: string; retryAfter?: number }): void;

    onStopped?(): void;

    onRequest?(request: {
      method: string;
      path: string;
      status: number;
      duration: number;
    }): void;
}

export interface Agent {
    stop(): void;
}

export function startAgent(config: AgentConfig): Agent {

  let reconnectDelay = 2000;
  let shuttingDown = false;
  let authFailed = false;
  let rateLimited = false;
  let tunnelExpired = false;
  let bandwidthNotified = false;
  let reconnectTimer: NodeJS.Timeout | null = null;
  let ws: WebSocket | null = null;
  let connectionId = 0;

  if (!config.token) {
    throw new Error(
        "AGENT_TOKEN is missing"
    )
  }

  if (config.ports.some(port => port <= 0 || port > 65535)) {
    throw new Error("Invalid port");
  }

  function cleanupSocket(socket: WebSocket | null) {
    if (!socket) return;

    socket.removeAllListeners();

    if (
      socket.readyState === WebSocket.OPEN ||
      socket.readyState === WebSocket.CONNECTING
    ) {
      socket.terminate();
    }
  }

  function connect() {
    if (shuttingDown) return;

    if (reconnectTimer) {
      clearTimeout(reconnectTimer);
      reconnectTimer = null;
    }

    cleanupSocket(ws);

    const id = ++connectionId;
    config.onConnecting?.();

    const socket = new WebSocket(config.relayUrl);
    ws = socket;

    socket.on("open", () => {
      if (id !== connectionId) return;

      reconnectDelay = 2000;
      config.onConnected?.();

      socket.send(JSON.stringify(createAuthMessage(config.token!)));
    });

    socket.on("message", async (data) => {
      if (id !== connectionId) return;

      try {
        const message = JSON.parse(
          data.toString()
        )

        switch (message.type) {
          case "AUTH_SUCCESS": {
            const authSuccess = message as AuthSuccessMessage

            bandwidthNotified = false;
            config.onAuthenticated?.(authSuccess.userId);

            for (const port of config.ports) {
              createTunnel(socket, port)
            }

            break
          }

          case "AUTH_FAILED":
            authFailed = true;
            shuttingDown = true;
            config.onAuthFailed?.();
            socket.close();
            break;

          case "RATE_LIMITED": {
            const rl = message as RateLimitedMessage
            rateLimited = true;
            shuttingDown = true;
            config.onRateLimited?.({
              scope: rl.scope,
              reason: rl.reason,
              retryAfter: rl.retryAfter,
            });
            socket.close();
            break;
          }

          case "TUNNEL_CREATED": {
            const tunnel = message as TunnelCreatedMessage;
            tunnels.set(tunnel.tunnelId, tunnel.port);
            config.onTunnelCreated?.(tunnel);

            break;
          }

          case "TUNNEL_OFFLINE": {
            const offline = message as TunnelOfflineMessage;
            config.onTunnelOffline?.(offline.reason);
            break;
          }

          case "TUNNEL_EXPIRED": {
            const expired = message as TunnelExpiredMessage;
            tunnelExpired = true;
            shuttingDown = true;
            config.onTunnelExpired?.({
              reason: expired.reason,
              tunnelId: expired.tunnelId,
            });
            socket.close();
            break;
          }

          case "BANDWIDTH_EXCEEDED": {
            const bandwidth = message as BandwidthExceededMessage;

            if (!bandwidthNotified) {
              bandwidthNotified = true;
              config.onBandwidthExceeded?.({
                reason: bandwidth.reason,
                usedBytes: bandwidth.usedBytes,
                limitBytes: bandwidth.limitBytes,
              });
            }

            break;
          }

          case "HTTP_REQUEST": {
            try {

              const httpRequest = message as HttpRequestMessage
              const port = tunnels.get(httpRequest.tunnelId)

              if (!port) {

                const httpResponse: HttpResponseMessage = {
                  type: "HTTP_RESPONSE",
                  requestId: httpRequest.requestId,
                  status: 404,
                  headers: {},
                  body: "Tunnel not found"
                }

                socket.send(
                  JSON.stringify(httpResponse)
                )

                break
              }

              const result = await handleHttpRequest(
                httpRequest, port, socket
              )

              config.onRequest?.({
                method: httpRequest.method,
                path: httpRequest.path,
                status: result.status,
                duration: result.duration
              });

            } catch (error) {

              const errResponse: HttpResponseMessage = {
                type: "HTTP_RESPONSE",
                requestId: message.requestId,
                status: 502,
                headers: {},
                body: "Internal Server Error"
              }

              socket.send(JSON.stringify(errResponse))
            }

            break;
          }

          case "PING": {
            socket.send(JSON.stringify(pong));
            break;
          }

          default:
            break;
        }
      } catch (error) {
        config.onError?.(error as Error);
      }
    })

    socket.on("error", (err) => {
      if (id !== connectionId) return;
      config.onError?.(err);
    })

    socket.on("close", () => {
      if (id !== connectionId) return;

      tunnels.clear();

      if (shuttingDown) {
        if (!authFailed && !rateLimited && !tunnelExpired) {
          config.onStopped?.();
        }
        return;
      }

      config.onDisconnected?.();
      config.onReconnect?.(reconnectDelay);

      reconnectTimer = setTimeout(() => {
        reconnectTimer = null;
        connect();
      }, reconnectDelay);

      reconnectDelay = Math.min(reconnectDelay * 2, 30000);
    })
  }
  
  connect();


  return {
    stop() {
        shuttingDown = true;

        if (reconnectTimer) {
          clearTimeout(reconnectTimer);
          reconnectTimer = null;
        }

        connectionId++;

        const socket = ws;
        ws = null;

        if (socket) {
          socket.removeAllListeners();

          if (
            socket.readyState === WebSocket.OPEN ||
            socket.readyState === WebSocket.CONNECTING
          ) {
            socket.terminate();
          }
        }

        tunnels.clear();
        config.onStopped?.();
    }
  }

}
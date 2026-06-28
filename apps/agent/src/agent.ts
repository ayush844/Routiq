import WebSocket from "ws"
import {AuthMessage, AuthSuccessMessage, CreateTunnelMessage, HttpRequestMessage, HttpResponseMessage, PongMessage, TunnelCreatedMessage} from "@routiq/shared"
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

    onDisconnected?(): void;

    onReconnect?(delay: number): void;

    onError?(error: Error): void;

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
  let reconnectTimer: NodeJS.Timeout | null = null;
  let ws: WebSocket | null = null;

  if (!config.token) {
    throw new Error(
        "AGENT_TOKEN is missing"
    )
  }

  if (config.ports.some(port => port <= 0 || port > 65535)) {
    throw new Error("Invalid port");
  }

  function connect() {
    config.onConnecting?.();
  
    ws = new WebSocket(config.relayUrl)
  
    ws.on("open", () => {
      console.log("OPEN");
      reconnectDelay = 2000
      config.onConnected?.();
  
      ws!.send(JSON.stringify(createAuthMessage(config.token!)))
    })
  
    ws.on("message", async (data) => {
      try {
        const message = JSON.parse(
          data.toString()
        )
  
        switch (message.type) {
          case "AUTH_SUCCESS": {
            const authSuccess = message as AuthSuccessMessage

            config.onAuthenticated?.(authSuccess.userId);

            for (const port of config.ports) {
              createTunnel(ws!, port)
            }
  
            break
          }
  
          case "AUTH_FAILED":
            config.onError?.(
              new Error("Authentication failed")
            );

            ws!.close()
            break
  
          case "TUNNEL_CREATED": {
            const tunnel = message as TunnelCreatedMessage;
            tunnels.set(tunnel.tunnelId, tunnel.port);
            config.onTunnelCreated?.(tunnel);
  
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
  
                ws!.send(
                  JSON.stringify(httpResponse)
                )
  
                break
              }

              const result = await handleHttpRequest(
                httpRequest, port, ws!
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
  
              ws!.send(JSON.stringify(errResponse))
            }
  
            break;
          }
  
          case "PING": {
            ws!.send(JSON.stringify(pong));
            break;
          }
  
          default:
            break;
        }
      } catch (error) {
        config.onError?.(error as Error);
      }
    })
  
    ws.on("error", (err) => {
      config.onError?.(err);
    })
  
    ws.on("close", () => {
      console.log("CLOSE");
      tunnels.clear()
      if (shuttingDown) {
        config.onStopped?.();
        return;
      }
      config.onDisconnected?.();
      config.onReconnect?.(reconnectDelay);
      reconnectTimer = setTimeout(() => {
        connect()
      }, reconnectDelay);
  
      reconnectDelay = Math.min(reconnectDelay * 2, 30000);

    })
  }
  
  connect();


  return {
    stop() {
        shuttingDown = true;

        reconnectTimer && clearTimeout(reconnectTimer);

        ws?.terminate();
    }
  }

}
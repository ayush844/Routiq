import { CreateTunnelMessage } from "@routiq/shared";
import WebSocket from "ws";


export function createTunnel(ws: WebSocket, port: number){
    const message: CreateTunnelMessage = {
        type: "CREATE_TUNNEL",
        localPort: port,
        protocol: "http"
    }

    ws.send(JSON.stringify(message));
}
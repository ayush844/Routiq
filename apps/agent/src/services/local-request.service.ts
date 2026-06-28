import {
  HttpRequestMessage,
  HttpResponseChunkMessage,
  HttpResponseEndMessage,
  HttpResponseMessage,
  HttpResponseStartMessage
} from "@routiq/shared"
import WebSocket from "ws";

export async function handleHttpRequest(
  httpRequest: HttpRequestMessage,
  port: number,
  ws: WebSocket
): Promise<{status: number, duration: number}> {

    const headers = {
        ...httpRequest.headers
    }

    delete headers.host
    delete headers.connection
    delete headers["content-length"]

    const options: RequestInit = {
        method: httpRequest.method,
        headers
    }

    if (httpRequest.method !== "GET" && httpRequest.method !== "HEAD") {
        options.body = httpRequest.body
    }
    const startedAt = Date.now();
    const response = await fetch(`http://localhost:${port}${httpRequest.path}`,
        options
    )

    const responseStart: HttpResponseStartMessage = {
        type: "HTTP_RESPONSE_START",
        requestId: httpRequest.requestId,
        status: response.status,
        headers: Object.fromEntries(
            response.headers
        )
    }

    ws.send(JSON.stringify(responseStart));

    const reader = response.body?.getReader();

    if (!reader) {
        throw new Error(
            "Response body missing"
        )
    }

    while (true) {
        const {done, value} = await reader.read()

        if (done) {
            break
        }

        const responseChunk: HttpResponseChunkMessage = {
            type: "HTTP_RESPONSE_CHUNK",
            requestId: httpRequest.requestId,
            chunk: Buffer.from(value).toString("base64")
        }


        ws.send(
            JSON.stringify(responseChunk)
        )
    }

    const responseEnd: HttpResponseEndMessage = {
        type: "HTTP_RESPONSE_END",
        requestId: httpRequest.requestId
    }

    ws.send(
        JSON.stringify(responseEnd)
    )
    const duration = Date.now() - startedAt;
    return {
        status: response.status,
        duration
    }

}

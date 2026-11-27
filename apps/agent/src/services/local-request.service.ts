import {
  HttpRequestMessage,
  HttpResponseChunkMessage,
  HttpResponseEndMessage,
  HttpResponseStartMessage
} from "@routiq/shared"
import WebSocket from "ws";

// Connection-level headers that must not go to localhost.
const REQUEST_HEADERS_TO_DROP = [
    "host",
    "connection",
    "content-length",
    "keep-alive",
    "proxy-connection",
    "transfer-encoding",
    "upgrade",
    "te",
    "trailer",
]

function send(ws: WebSocket, message: unknown) {
    // Socket may close mid-stream.
    if (ws.readyState !== WebSocket.OPEN) return false
    ws.send(JSON.stringify(message))
    return true
}

function requestBody(httpRequest: HttpRequestMessage): BodyInit | undefined {
    if (httpRequest.method === "GET" || httpRequest.method === "HEAD") {
        return undefined
    }

    if (httpRequest.bodyBase64 !== undefined) {
        return Buffer.from(httpRequest.bodyBase64, "base64")
    }

    return httpRequest.body
}

// Headers to object, keeping every Set-Cookie.
function responseHeaders(headers: Headers): Record<string, string | string[]> {
    const result: Record<string, string | string[]> = {}

    headers.forEach((value, key) => {
        if (key !== "set-cookie") result[key] = value
    })

    const cookies =
        typeof headers.getSetCookie === "function"
            ? headers.getSetCookie()
            : headers.get("set-cookie")
              ? [headers.get("set-cookie") as string]
              : []

    if (cookies.length > 0) result["set-cookie"] = cookies

    return result
}

export async function handleHttpRequest(
  httpRequest: HttpRequestMessage,
  port: number,
  ws: WebSocket
): Promise<{status: number, duration: number}> {

    const headers: Record<string, string> = {
        ...httpRequest.headers
    }

    for (const name of REQUEST_HEADERS_TO_DROP) {
        delete headers[name]
    }

    const startedAt = Date.now();
    const response = await fetch(`http://localhost:${port}${httpRequest.path}`, {
        method: httpRequest.method,
        headers,
        body: requestBody(httpRequest),
        // Pass redirects to the browser instead of following them.
        redirect: "manual",
    })

    const responseStart: HttpResponseStartMessage = {
        type: "HTTP_RESPONSE_START",
        requestId: httpRequest.requestId,
        status: response.status,
        headers: responseHeaders(response.headers),
    }

    send(ws, responseStart)

    // 204, 304 and HEAD responses have no body.
    const reader = response.body?.getReader();

    if (reader) {
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

            if (!send(ws, responseChunk)) {
                // Relay gone: stop reading.
                await reader.cancel()
                break
            }
        }
    }

    const responseEnd: HttpResponseEndMessage = {
        type: "HTTP_RESPONSE_END",
        requestId: httpRequest.requestId
    }

    send(ws, responseEnd)

    return {
        status: response.status,
        duration: Date.now() - startedAt
    }
}

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
): Promise<void> {

    const headers = {
        ...httpRequest.headers
    }

    console.log("meow 1")

    delete headers.host
    delete headers.connection
    delete headers["content-length"]

    console.log("meow 2")

    const options: RequestInit = {
        method: httpRequest.method,
        headers
    }

    console.log("meow 3")

    if (httpRequest.method !== "GET" && httpRequest.method !== "HEAD") {
        options.body = httpRequest.body
    }

    const response = await fetch(`http://localhost:${port}${httpRequest.path}`,
        options
    )

    console.log("meow 4")

    const responseStart: HttpResponseStartMessage = {
        type: "HTTP_RESPONSE_START",
        requestId: httpRequest.requestId,
        status: response.status,
        headers: Object.fromEntries(
            response.headers
        )
    }

    console.log("meow 5")

    ws.send(JSON.stringify(responseStart));

    console.log("meow 6")

    const reader = response.body?.getReader();

    if (!reader) {
        console.log("bhauw bhauw")
        throw new Error(
            "Response body missing"
        )
    }

    console.log("meow 7")

    while (true) {
        const {done, value} = await reader.read()

        if (done) {
            break
        }

        console.log(`Chunk size: ${value.length}`);

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

}

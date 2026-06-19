import {
  HttpRequestMessage,
  HttpResponseMessage
} from "@routiq/shared"

export async function handleHttpRequest(
  httpRequest: HttpRequestMessage,
  port: number
): Promise<HttpResponseMessage> {

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

    const response = await fetch(`http://localhost:${port}${httpRequest.path}`,
        options
    )
    const body = await response.text()

    const httpResponse: HttpResponseMessage = {
        type: "HTTP_RESPONSE",

        requestId:
        httpRequest.requestId,

        status:
        response.status,

        headers:
        Object.fromEntries(
            response.headers
        ),

        body
    }

    return httpResponse

}

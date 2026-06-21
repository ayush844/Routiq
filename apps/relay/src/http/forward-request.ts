import { randomUUID } from "crypto"
import { Tunnel } from "../types/relay.js"
import { pendingRequests } from "../stores/requests.js"

export async function forwardRequest(
  tunnel: Tunnel,
  req: any,
  reply: any
) {
  const requestId = randomUUID()

  const timeout = setTimeout(() => {
    const pending = pendingRequests.get(requestId)

    if (!pending) return

    pending.reply.status(504).send("Tunnel timeout")

    pendingRequests.delete(requestId)
  }, 30000)

  pendingRequests.set(requestId, {
    reply,
    timeout,
    createdAt: Date.now()
  })

  // const path = req.url;
  const path = req.params?.tunnelId ? req.url.replace(`/test/${req.params.tunnelId}`,"") || "/" : req.url

  const ws = tunnel.ws;

  console.log("req body in relay is: ", req.body)
  const body = req.body ? JSON.stringify(req.body) : undefined;


  ws.send(
    JSON.stringify({
      type: "HTTP_REQUEST",

      requestId,

      tunnelId: tunnel.tunnelId,

      method: req.method,

      path: path,
      // path: req.url,

      headers: req.headers,

      body
    })
  )

  return reply;

}

import Redis from "ioredis"

let publisher: Redis | null = null
let subscriber: Redis | null = null

export function requestsChannel(relayId: string): string {
  return `relay:${relayId}:requests`
}

export function responsesChannel(relayId: string): string {
  return `relay:${relayId}:responses`
}

export async function connectPubSub(
  url: string,
  relayId: string,
  onMessage: (channel: string, payload: string) => void
): Promise<void> {
  publisher = new Redis(url)
  subscriber = new Redis(url)

  publisher.on("error", (err) => {
    console.error("Redis pub error:", err.message)
  })

  subscriber.on("error", (err) => {
    console.error("Redis sub error:", err.message)
  })

  const channels = [requestsChannel(relayId), responsesChannel(relayId)]

  subscriber.on("message", (channel, message) => {
    onMessage(channel, message)
  })

  await subscriber.subscribe(...channels)
  await publisher.ping()

  console.log(`Pub/sub subscribed to ${channels.join(", ")}`)
}

export function publish(channel: string, payload: string): void {
  if (!publisher) {
    throw new Error("Pub/sub not connected. Call connectPubSub() first.")
  }

  void publisher.publish(channel, payload)
}

export async function disconnectPubSub(): Promise<void> {
  if (subscriber) {
    await subscriber.quit()
    subscriber = null
  }

  if (publisher) {
    await publisher.quit()
    publisher = null
  }
}

/** Relay-to-relay messages (serialized JSON over Redis pub/sub). */

export interface RelayHttpRequestMessage {
  type: "RELAY_HTTP_REQUEST"
  requestId: string
  originRelayId: string
  tunnelId: string
  method: string
  path: string
  headers: Record<string, string>
  body?: string
  ownerId: string
}

export interface RelayHttpResponseMessage {
  type: "RELAY_HTTP_RESPONSE"
  requestId: string
  status: number
  headers: Record<string, string>
  body?: string
}

export interface RelayHttpResponseStartMessage {
  type: "RELAY_HTTP_RESPONSE_START"
  requestId: string
  status: number
  headers: Record<string, string>
}

export interface RelayHttpResponseChunkMessage {
  type: "RELAY_HTTP_RESPONSE_CHUNK"
  requestId: string
  chunk: string
}

export interface RelayHttpResponseEndMessage {
  type: "RELAY_HTTP_RESPONSE_END"
  requestId: string
}

export interface RelayHttpErrorMessage {
  type: "RELAY_HTTP_ERROR"
  requestId: string
  status: number
  body: string
}

export type RelayPubSubMessage =
  | RelayHttpRequestMessage
  | RelayHttpResponseMessage
  | RelayHttpResponseStartMessage
  | RelayHttpResponseChunkMessage
  | RelayHttpResponseEndMessage
  | RelayHttpErrorMessage

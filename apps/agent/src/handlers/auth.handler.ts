

import {AuthMessage} from "@routiq/shared"

export function createAuthMessage(
  token: string
): AuthMessage {
  return {
    type: "AUTH",
    token
  }
}
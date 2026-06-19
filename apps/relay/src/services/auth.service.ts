import jwt from "jsonwebtoken"
import { JwtPayload } from "../types/relay.js"

export function validateToken(token: string, secret: string): JwtPayload | null {
  try {
    const decoded = jwt.verify(token, secret)

    if (
      typeof decoded === "object" &&
      "userId" in decoded &&
      "role" in decoded
    ) {
      return decoded as JwtPayload
    }

    return null
  } catch (error) {
    console.error(
      "Token verification failed:",
      error
    )

    return null
  }
}

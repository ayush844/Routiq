import dotenv from "dotenv"

dotenv.config()

export const AGENT_TOKEN = process.env.AGENT_TOKEN

export const RELAY_URL = process.env.RELAY_URL || "ws://localhost:8080"
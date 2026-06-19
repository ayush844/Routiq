import dotenv from "dotenv"


dotenv.config()

export const RELAY_URL = process.env.RELAY_URL || "ws://localhost:8080"

export const TOKEN = process.env.AGENT_TOKEN

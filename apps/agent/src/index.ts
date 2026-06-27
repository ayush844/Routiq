import { startAgent } from "./agent.js";
import {RELAY_URL, TOKEN} from "./config/env.js"

startAgent({
    ports: [3000, 5173],
    relayUrl: RELAY_URL,
    token: TOKEN!
});
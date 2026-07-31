<div align="center">

<h1>
  <img src="https://raw.githubusercontent.com/ayush844/Routiq/main/apps/web/app/icon.png" width="32" height="32" alt="" valign="middle" />
  Routiq
</h1>

### Expose localhost to the internet — in one command.

[![npm version](https://img.shields.io/npm/v/routiq.svg?style=for-the-badge&color=f3743a&label=npm)](https://www.npmjs.com/package/routiq)
[![license](https://img.shields.io/npm/l/routiq.svg?style=for-the-badge&color=222222)](https://github.com/ayush844/Routiq/blob/main/LICENSE)
[![node](https://img.shields.io/node/v/routiq.svg?style=for-the-badge&color=339933)](https://www.npmjs.com/package/routiq)

</div>

---

Routiq gives your local dev server a public HTTPS URL in seconds — no config files, no dashboards to click through, no deploy pipeline. Just point it at a port and share the link.

Perfect for testing webhooks, showing off a work-in-progress to a client, or demoing something running on your laptop like it's already live.

```
$ routiq http 3000

  Status       Connected
  Relay        wss://relay.routiq.dev
  Tunnels      localhost:3000 → https://a1b2c3d4.routiq.dev

  Waiting for traffic...
```

## Quick start

```bash
npm install -g routiq

routiq login
routiq http 3000
```

That's the whole setup. `3000` is whatever local port you want to expose — share the printed URL with anyone, anywhere.

Need more than one port? Just list them:

```bash
routiq http 3000 4000 5173
```

Each one gets its own tunnel URL, all shown side by side in the same live dashboard.

> [!TIP]
> Stop and restart on the **same port** within 24 hours and you get the **same URL back** — no need to re-share a link every time you restart your server.

## What you get

- **A live terminal dashboard** — connection status, active tunnels, and every incoming request (method, path, status, timing) as it happens
- **Sticky URLs** — reconnect on the same port and keep the same link
- **Multiple ports in one command** — `routiq http 3000 4000` tunnels both at once
- **Zero config** — log in once, then just point it at a port

## Commands

| Command | What it does |
|---|---|
| `routiq login` | Authenticate with your Routiq account |
| `routiq logout` | Remove stored credentials from this machine |
| `routiq http <port...>` | Expose one or more local ports and open the live dashboard |

Press `Ctrl+C` at any time to stop a tunnel.

## Free, with sane limits

Routiq is free to use — no credit card required to start. Each account gets:

| | Free |
|---|:---:|
| Active tunnels | 3 |
| Requests / min per tunnel | 2,000 |
| Bandwidth / day | 5 GB |

> [!NOTE]
> These limits exist to keep the free tier sustainable for everyone — most local dev/testing workflows never come close to hitting them.

## Links

- [routiq.dev](https://routiq.dev) — sign up and manage your API key
- [GitHub](https://github.com/ayush844/Routiq) — source code, issues, and the relay/agent that power this CLI
- [@ayushuprush](https://x.com/ayushuprush) — follow along

## License

MIT © [Ayush Sharma](https://github.com/ayush844)

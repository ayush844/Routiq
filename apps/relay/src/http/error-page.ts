export function renderErrorPage(
  status: number,
  heading: string,
  message: string
): string {
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<title>${heading} · Routiq</title>
<meta name="viewport" content="width=device-width, initial-scale=1">
<style>
  * { box-sizing: border-box; }
  body {
    margin: 0;
    min-height: 100vh;
    display: flex;
    align-items: center;
    justify-content: center;
    background: #0b0b0c;
    color: #e8e6e3;
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Inter, sans-serif;
    text-align: center;
    padding: 24px;
  }
  .card { max-width: 440px; }
  .logo {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 48px;
    height: 48px;
    border-radius: 14px;
    background: #f3743a;
    color: white;
    font-weight: 700;
    font-size: 20px;
    margin-bottom: 24px;
  }
  h1 {
    font-size: 22px;
    font-weight: 600;
    margin: 0 0 8px;
    letter-spacing: -0.02em;
  }
  p {
    color: #9a9a9a;
    line-height: 1.6;
    margin: 0;
    font-size: 15px;
  }
  .status {
    display: inline-block;
    margin-top: 24px;
    font-size: 12px;
    font-family: ui-monospace, "SF Mono", Menlo, monospace;
    color: #6b6b6b;
    border: 1px solid #2a2a2a;
    border-radius: 999px;
    padding: 4px 12px;
  }
  a { color: inherit; }
</style>
</head>
<body>
  <div class="card">
    <div class="logo">R</div>
    <h1>${heading}</h1>
    <p>${message}</p>
    <div class="status">routiq.dev · ${status}</div>
  </div>
</body>
</html>`;
}

const http = require('http');

function startKeepAliveServer(client) {
  const port = process.env.PORT || 3000;

  const server = http.createServer((req, res) => {
    if (req.url === '/health' || req.url === '/ping') {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify({
        status: 'online',
        uptime: Math.floor(process.uptime()),
        servers: client.guilds?.cache?.size || 0,
        ping: client.ws?.ping || 0,
        timestamp: new Date().toISOString()
      }));
    }

    // Default status HTML page
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
    const uptimeSec = Math.floor(process.uptime());
    const hours = Math.floor(uptimeSec / 3600);
    const mins = Math.floor((uptimeSec % 3600) / 60);
    const secs = uptimeSec % 60;
    const memoryMB = (process.memoryUsage().heapUsed / 1024 / 1024).toFixed(1);

    const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>VibeX — Discord Music Bot Status</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Outfit:wght@400;600;700;800&family=JetBrains+Mono:wght@400;600&display=swap" rel="stylesheet">
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      background: radial-gradient(circle at 50% 20%, #1e153b 0%, #0d0b18 100%);
      color: #f1f1f5;
      font-family: 'Outfit', sans-serif;
      min-height: 100vh;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 24px;
    }
    .card {
      background: rgba(255, 255, 255, 0.04);
      border: 1px solid rgba(255, 255, 255, 0.1);
      backdrop-filter: blur(16px);
      border-radius: 20px;
      padding: 36px 32px;
      max-width: 480px;
      width: 100%;
      box-shadow: 0 20px 40px rgba(0,0,0,0.4);
      text-align: center;
    }
    .badge {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      background: rgba(87, 242, 135, 0.15);
      border: 1px solid rgba(87, 242, 135, 0.3);
      color: #57f287;
      padding: 6px 14px;
      border-radius: 999px;
      font-size: 13px;
      font-weight: 600;
      margin-bottom: 20px;
    }
    .badge-dot {
      width: 8px;
      height: 8px;
      border-radius: 50%;
      background: #57f287;
      animation: pulse 2s infinite;
    }
    @keyframes pulse {
      0%, 100% { opacity: 1; transform: scale(1); }
      50% { opacity: 0.4; transform: scale(0.85); }
    }
    h1 {
      font-size: 32px;
      font-weight: 800;
      letter-spacing: -0.5px;
      margin-bottom: 8px;
      background: linear-gradient(135deg, #fff 0%, #b8b1dc 100%);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
    }
    p.subtitle {
      color: #9d9bb0;
      font-size: 15px;
      margin-bottom: 28px;
    }
    .stats-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 12px;
      margin-bottom: 24px;
      text-align: left;
    }
    .stat-box {
      background: rgba(255, 255, 255, 0.03);
      border: 1px solid rgba(255, 255, 255, 0.06);
      border-radius: 12px;
      padding: 14px 16px;
    }
    .stat-label {
      color: #8c89a0;
      font-size: 12px;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      margin-bottom: 4px;
    }
    .stat-val {
      color: #fff;
      font-size: 18px;
      font-weight: 700;
      font-family: 'JetBrains Mono', monospace;
    }
    .footer {
      color: #6d6a80;
      font-size: 12px;
    }
    .footer a {
      color: #a78bfa;
      text-decoration: none;
    }
  </style>
</head>
<body>
  <div class="card">
    <div class="badge">
      <div class="badge-dot"></div>
      Online & 24/7 Active
    </div>
    <h1>🎵 VibeX Music</h1>
    <p class="subtitle">Rythm-style Discord Music Bot with 24/7 Support</p>
    <div class="stats-grid">
      <div class="stat-box">
        <div class="stat-label">Servers</div>
        <div class="stat-val">${client.guilds?.cache?.size || 0}</div>
      </div>
      <div class="stat-box">
        <div class="stat-label">Ping</div>
        <div class="stat-val">${client.ws?.ping || 0}ms</div>
      </div>
      <div class="stat-box">
        <div class="stat-label">Uptime</div>
        <div class="stat-val">${hours}h ${mins}m ${secs}s</div>
      </div>
      <div class="stat-box">
        <div class="stat-label">Memory</div>
        <div class="stat-val">${memoryMB} MB</div>
      </div>
    </div>
    <div class="footer">
      Powered by <a href="https://github.com/royalcraftgaming6-cell/VibeX" target="_blank">VibeX</a> • Ready for Render deployment
    </div>
  </div>
</body>
</html>`;
    res.end(html);
  });

  server.listen(port, '0.0.0.0', () => {
    console.log(`[HTTP Server] Health check server listening on port ${port} (ready for Render)`);
  });

  return server;
}

module.exports = { startKeepAliveServer };

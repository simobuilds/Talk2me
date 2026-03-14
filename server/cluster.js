const cluster = require("cluster");
const http = require("http");
const { setupMaster } = require("@socket.io/sticky");

const WORKERS_COUNT = 4;

if (cluster.isMaster) {
  console.log(`Master ${process.pid} is running`);

  for (let i = 0; i < WORKERS_COUNT; i++) {
    cluster.fork();
  }

  cluster.on("exit", (worker) => {
    console.log(`Worker ${worker.process.pid} died`);
    cluster.fork();
  });

  const httpServer = http.createServer();
  setupMaster(httpServer, {
    loadBalancingMethod: "least-connection", // either "random", "round-robin" or "least-connection"
  });
  const PORT = process.env.PORT || 3000;

  httpServer.listen(PORT, () =>
    console.log(`server listening at http://localhost:${PORT}`)
  );
  // start a lightweight health endpoint on a separate port
  try {
    const redisClient = require('./redisClient');
    const HEALTH_PORT = process.env.HEALTH_PORT || 3001;
    const healthServer = http.createServer(async (req, res) => {
      if (req.method === 'GET' && req.url === '/health') {
        let redisStatus = { ok: false };
        try {
          const p = redisClient.ping();
          const timeout = new Promise((_, rej) => setTimeout(() => rej(new Error('timeout')), 500));
          const pong = await Promise.race([p, timeout]);
          redisStatus = { ok: true, pong };
        } catch (e) {
          redisStatus = { ok: false, error: String(e && e.message ? e.message : e) };
        }
        const payload = { ok: true, pid: process.pid, redis: redisStatus };
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(payload));
        return;
      }
      res.writeHead(404);
      res.end();
    });
    healthServer.listen(HEALTH_PORT, () => console.log(`health listening at http://localhost:${HEALTH_PORT}/health`));
  } catch (e) {
    console.warn('Failed to start health endpoint', e);
  }
} else {
  console.log(`Worker ${process.pid} started`);
  require("./index");
}

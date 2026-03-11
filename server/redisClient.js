const Redis = require('ioredis');

const redisUrl = process.env.REDIS_URL && process.env.REDIS_URL.trim();

// Create an ioredis client. If REDIS_URL is provided, ioredis will parse it.
const client = redisUrl ? new Redis(redisUrl) : new Redis();

client.on('error', (err) => {
  console.error('Redis Client Error', err);
});

module.exports = client;

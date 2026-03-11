const Redis = require('ioredis');
const client = new Redis();

async function main() {
  console.log('Starting backfill of users ZSET...');
  try {
    const keys = new Set();
    let cursor = '0';
    do {
      const [next, results] = await client.scan(cursor, 'MATCH', 'user:*', 'COUNT', '100');
      cursor = next;
      results.forEach((k) => keys.add(k));
    } while (cursor !== '0');

    if (keys.size === 0) {
      console.log('No user:* keys found; nothing to backfill.');
      process.exit(0);
    }

    const normalizedToAdd = [];
    for (const key of keys) {
      try {
        const username = await client.hget(key, 'username');
        if (username) {
          const normalized = username.trim().toLowerCase();
          normalizedToAdd.push(normalized);
        }
      } catch (e) {
        console.warn('Failed to read', key, e);
      }
    }

    if (normalizedToAdd.length === 0) {
      console.log('No usernames found to index.');
      process.exit(0);
    }

    // Add in chunks to avoid huge command sizes
    const chunkSize = 500;
    let added = 0;
    for (let i = 0; i < normalizedToAdd.length; i += chunkSize) {
      const chunk = normalizedToAdd.slice(i, i + chunkSize);
      const args = [];
      for (const n of chunk) {
        args.push(0, n);
      }
      await client.zadd('users', ...args);
      added += chunk.length;
      console.log(`Added ${added}/${normalizedToAdd.length} to users ZSET...`);
    }

    console.log(`Backfill complete. Added ${added} usernames to 'users' ZSET.`);
    process.exit(0);
  } catch (err) {
    console.error('Backfill failed', err);
    process.exit(2);
  }
}

main();

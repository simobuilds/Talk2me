/* abstract */ class SessionStore {
  findSession(id) {}
  saveSession(id, session) {}
  findAllSessions() {}
  clearAllSessions() {}
  deleteSession(id) {}
}

class InMemorySessionStore extends SessionStore {
  constructor() {
    super();
    this.sessions = new Map();
  }

  findSession(id) {
    return this.sessions.get(id);
  }

  saveSession(id, session) {
    this.sessions.set(id, session);
  }

  deleteSession(id) {
    this.sessions.delete(id);
  }

  findAllSessions() {
    return [...this.sessions.values()];
  }

  clearAllSessions() {
    this.sessions.clear();
  }
}

const SESSION_TTL = process.env.SESSION_TTL
  ? parseInt(process.env.SESSION_TTL, 10)
  : 24 * 60 * 60;
const mapSession = ([userID, username, connected]) =>
  userID ? { userID, username, connected: connected === "true" } : undefined;

class RedisSessionStore extends SessionStore {
  constructor(redisClient) {
    super();
    this.redisClient = redisClient;
  }

  findSession(id) {
    return this.redisClient
      .hmget(`session:${id}`, "userID", "username", "connected")
      .then(mapSession);
  }

  saveSession(id, { userID, username, connected }) {
    // persist the session hash
    this.redisClient
      .multi()
      .hset(
        `session:${id}`,
        "userID",
        userID,
        "username",
        username,
        "connected",
        connected
      )
      .exec();
    // only set an expiry if SESSION_TTL is a positive number
    if (SESSION_TTL > 0) {
      this.redisClient.expire(`session:${id}`, SESSION_TTL);
    }
  }

  async findAllSessions() {
    const keys = new Set();
    let nextIndex = 0;
    do {
      const [nextIndexAsStr, results] = await this.redisClient.scan(
        nextIndex,
        "MATCH",
        "session:*",
        "COUNT",
        "100"
      );
      nextIndex = parseInt(nextIndexAsStr, 10);
      results.forEach((s) => keys.add(s));
    } while (nextIndex !== 0);
    const commands = [];
    keys.forEach((key) => {
      commands.push(["hmget", key, "userID", "username", "connected"]);
    });
    return this.redisClient
      .multi(commands)
      .exec()
      .then((results) => {
        return results
          .map(([err, session]) => (err ? undefined : mapSession(session)))
          .filter((v) => !!v);
      });
  }

  async clearAllSessions() {
    const keys = new Set();
    let nextIndex = 0;
    do {
      const [nextIndexAsStr, results] = await this.redisClient.scan(
        nextIndex,
        "MATCH",
        "session:*",
        "COUNT",
        "100"
      );
      nextIndex = parseInt(nextIndexAsStr, 10);
      results.forEach((key) => keys.add(key));
    } while (nextIndex !== 0);

    if (keys.size > 0) {
      await this.redisClient.del([...keys]);
    }
  }

  async deleteSession(id) {
    await this.redisClient.del(`session:${id}`);
  }
}
module.exports = {
  InMemorySessionStore,
  RedisSessionStore,
};

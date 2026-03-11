/* abstract */ class UserStore {
  findUser(username) {}
  saveUser(user) {}
}

function normalizeUsername(username) {
  return username.trim().toLowerCase();
}

class InMemoryUserStore extends UserStore {
  constructor() {
    super();
    this.users = new Map();
  }

  findUser(username) {
    return this.users.get(normalizeUsername(username));
  }

  saveUser(user) {
    this.users.set(normalizeUsername(user.username), user);
  }
}

class RedisUserStore extends UserStore {
  constructor(redisClient) {
    super();
    this.redisClient = redisClient;
  }

  async findUser(username) {
    const normalizedUsername = normalizeUsername(username);
    const [storedUsername, userID, passwordHash, email] = await this.redisClient.hmget(
      `user:${normalizedUsername}`,
      "username",
      "userID",
      "passwordHash",
      "email"
    );

    if (!storedUsername || !userID || !passwordHash) {
      return undefined;
    }

    return {
      username: storedUsername,
      userID,
      passwordHash,
      email: email || "",
    };
  }

  saveUser({ username, userID, passwordHash, email = "" }) {
    const normalizedUsername = normalizeUsername(username);
    // store user hash
    const p = this.redisClient.hset(
      `user:${normalizedUsername}`,
      "username",
      username,
      "userID",
      userID,
      "passwordHash",
      passwordHash,
      "email",
      email
    );
    // maintain a lexicographically sorted set of normalized usernames for prefix search
    // use score 0 so members are ordered by lexicographical member value
    this.redisClient.zadd("users", 0, normalizedUsername).catch(() => {});
    return p;
  }
}

module.exports = {
  InMemoryUserStore,
  RedisUserStore,
  normalizeUsername,
};
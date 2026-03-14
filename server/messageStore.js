/* abstract */ class MessageStore {
  saveMessage(message) {}
  findMessagesForUser(userID) {}
  clearAllMessages() {}
}

class InMemoryMessageStore extends MessageStore {
  constructor() {
    super();
    this.messages = [];
  }

  saveMessage(message) {
    this.messages.push(message);
  }

  findMessagesForUser(userID) {
    return this.messages.filter(
      ({ from, to }) => from === userID || to === userID
    );
  }

  clearAllMessages() {
    this.messages = [];
  }
}

const CONVERSATION_TTL = 0;

class RedisMessageStore extends MessageStore {
  constructor(redisClient) {
    super();
    this.redisClient = redisClient;
  }

  saveMessage(message) {
    const value = JSON.stringify(message);
    this.redisClient
      .multi()
      .rpush(`messages:${message.from}`, value)
      .rpush(`messages:${message.to}`, value)
      .exec();
    // only set expirations if CONVERSATION_TTL > 0
    if (CONVERSATION_TTL > 0) {
      this.redisClient.expire(`messages:${message.from}`, CONVERSATION_TTL);
      this.redisClient.expire(`messages:${message.to}`, CONVERSATION_TTL);
    }
  }

  findMessagesForUser(userID) {
    return this.redisClient
      .lrange(`messages:${userID}`, 0, -1)
      .then((results) => {
        return results.map((result) => JSON.parse(result));
      });
  }

  async clearAllMessages() {
    const keys = new Set();
    let nextIndex = 0;
    do {
      const [nextIndexAsStr, results] = await this.redisClient.scan(
        nextIndex,
        "MATCH",
        "messages:*",
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
}

module.exports = {
  InMemoryMessageStore,
  RedisMessageStore,
};

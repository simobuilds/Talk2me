const httpServer = require("http").createServer();
const bcrypt = require("bcryptjs");
const redisClient = require("./redisClient");
const io = require("socket.io")(httpServer, {
  cors: {
    origin: "http://localhost:8080",
  },
  adapter: require("socket.io-redis")({
    pubClient: redisClient,
    subClient: redisClient.duplicate(),
  }),
});

const { setupWorker } = require("@socket.io/sticky");
const crypto = require("crypto");
const randomId = () => crypto.randomBytes(8).toString("hex");

const { RedisSessionStore } = require("./sessionStore");
const sessionStore = new RedisSessionStore(redisClient);

const { RedisMessageStore } = require("./messageStore");
const messageStore = new RedisMessageStore(redisClient);
const { RedisUserStore } = require("./userStore");
const userStore = new RedisUserStore(redisClient);
const MAX_CREDENTIAL_LENGTH = 28;
const isDevEnvironment = process.env.NODE_ENV !== "production";
const passwordPattern = /^(?=.*[A-Za-z])(?=.*\d)[A-Za-z\d]{6,}$/;
const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
// rate limiting for login attempts
const MAX_LOGIN_ATTEMPTS = process.env.MAX_LOGIN_ATTEMPTS
  ? parseInt(process.env.MAX_LOGIN_ATTEMPTS, 10)
  : 5;
const LOGIN_ATTEMPT_WINDOW = process.env.LOGIN_ATTEMPT_WINDOW
  ? parseInt(process.env.LOGIN_ATTEMPT_WINDOW, 10)
  : 60; // seconds

function validateUsername(username) {
  return (
    typeof username === "string" &&
    username.trim().length >= 3 &&
    username.trim().length <= MAX_CREDENTIAL_LENGTH
  );
}

function validatePassword(password) {
  return (
    typeof password === "string" &&
    password.length <= MAX_CREDENTIAL_LENGTH &&
    passwordPattern.test(password)
  );
}

function validateEmail(email) {
  if (!email) {
    return true;
  }

  return (
    typeof email === "string" &&
    email.length <= MAX_CREDENTIAL_LENGTH &&
    emailPattern.test(email)
  );
}

function authError(message) {
  return new Error(message);
}

async function persistActiveSessions() {
  const sockets = await io.fetchSockets();
  await Promise.all(
    sockets
      .filter((connectedSocket) => connectedSocket.sessionID)
      .map((connectedSocket) =>
        sessionStore.saveSession(connectedSocket.sessionID, {
          userID: connectedSocket.userID,
          username: connectedSocket.username,
          connected: true,
        })
      )
  );
}

io.use(async (socket, next) => {
  const sessionID = socket.handshake.auth.sessionID;
  if (sessionID) {
    const session = await sessionStore.findSession(sessionID);
    if (session) {
      socket.sessionID = sessionID;
      socket.userID = session.userID;
      socket.username = session.username;
      return next();
    }
  }

  const username =
    typeof socket.handshake.auth.username === "string"
      ? socket.handshake.auth.username.trim()
      : "";
  const password = socket.handshake.auth.password;
  const email =
    typeof socket.handshake.auth.email === "string"
      ? socket.handshake.auth.email.trim()
      : "";
  const confirmPassword = socket.handshake.auth.confirmPassword;
  const authMode = socket.handshake.auth.authMode;

  if (!validateUsername(username)) {
    return next(
      authError("Username must be 3 to 28 characters long.")
    );
  }

  if (!validatePassword(password)) {
    return next(
      authError("Password must be 6 to 28 characters and contain letters and numbers.")
    );
  }

  if (!validateEmail(email)) {
    return next(authError("Email must be valid and at most 28 characters."));
  }

  if (authMode !== "login" && authMode !== "register") {
    return next(authError("Choose login or register before continuing."));
  }

  const existingUser = await userStore.findUser(username);

  if (authMode === "register") {
    // ensure confirm password matches when registering
    if (confirmPassword !== password) {
      return next(authError("Passwords do not match."));
    }
    if (existingUser) {
      return next(authError("That username is already registered."));
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const userID = randomId();

    await userStore.saveUser({
      username,
      userID,
      passwordHash,
      email,
    });

    socket.sessionID = randomId();
    socket.userID = userID;
    socket.username = username;
    return next();
  }

  if (!existingUser) {
    return next(authError("No account exists for that username."));
  }

  // rate limit login attempts by username
  if (authMode === "login") {
    try {
      const attemptKey = `login_attempts:${username}`;
      const attemptsStr = await redisClient.get(attemptKey);
      const attempts = attemptsStr ? parseInt(attemptsStr, 10) : 0;
      if (attempts >= MAX_LOGIN_ATTEMPTS) {
        return next(
          authError(
            "Too many login attempts. Try again later."
          )
        );
      }
    } catch (err) {
      console.warn("Login rate-limit check failed", err);
    }
  }

  const passwordMatches = await bcrypt.compare(
    password,
    existingUser.passwordHash
  );

  if (!passwordMatches) {
    // increment login attempt counter
    try {
      const attemptKey = `login_attempts:${username}`;
      const tx = redisClient.multi();
      tx.incr(attemptKey);
      tx.expire(attemptKey, LOGIN_ATTEMPT_WINDOW);
      tx.exec();
    } catch (err) {
      console.warn("Failed to increment login attempts", err);
    }
    return next(authError("Incorrect password."));
  }

  socket.sessionID = randomId();
  socket.userID = existingUser.userID;
  socket.username = existingUser.username;
  // reset login attempts on successful auth
  try {
    await redisClient.del(`login_attempts:${username}`);
  } catch (err) {
    console.warn("Failed to clear login attempts for user", username, err);
  }
  next();
});

io.on("connection", async (socket) => {
  console.log(`Client connected — sessionID:${socket.sessionID} userID:${socket.userID} username:${socket.username}`);
  // persist session
  sessionStore.saveSession(socket.sessionID, {
    userID: socket.userID,
    username: socket.username,
    connected: true,
  });

  // emit session details
  // include email when available so the client can show a profile
  let email = "";
  try {
    if (socket.username) {
      const u = await userStore.findUser(socket.username);
      if (u && u.email) email = u.email;
    }
  } catch (e) {
    console.warn("Failed to lookup user email for session emit", e);
  }

  socket.emit("session", {
    sessionID: socket.sessionID,
    userID: socket.userID,
    username: socket.username,
    email,
  });

  // join the "userID" room
  socket.join(socket.userID);

  // fetch existing users
  const users = [];
  const [messages, sessions] = await Promise.all([
    messageStore.findMessagesForUser(socket.userID),
    sessionStore.findAllSessions(),
  ]);
  const messagesPerUser = new Map();
  messages.forEach((message) => {
    const { from, to } = message;
    const otherUser = socket.userID === from ? to : from;
    if (messagesPerUser.has(otherUser)) {
      messagesPerUser.get(otherUser).push(message);
    } else {
      messagesPerUser.set(otherUser, [message]);
    }
  });

  sessions.forEach((session) => {
    users.push({
      userID: session.userID,
      username: session.username,
      connected: session.connected,
      messages: messagesPerUser.get(session.userID) || [],
    });
  });
  socket.emit("users", users);

  // notify existing users
  socket.broadcast.emit("user connected", {
    userID: socket.userID,
    username: socket.username,
    connected: true,
    messages: [],
  });

  // forward the private message to the right recipient (and to other tabs of the sender)
  socket.on("private message", ({ content, to }) => {
    const message = {
      content,
      from: socket.userID,
      fromUsername: socket.username,
      to,
      createdAt: new Date().toISOString(),
    };
    socket.to(to).to(socket.userID).emit("private message", message);
    messageStore.saveMessage(message);
  });

  // search for registered users (by username) - returns [{ username, userID, email }]
  socket.on("search users", async (query, callback) => {
    try {
      const q = String(query || "").trim().toLowerCase();
      if (!q) {
        if (typeof callback === "function") callback([]);
        return;
      }
      // Try lexicographical prefix search using a ZSET index for speed
      try {
        const start = `[${q}`;
        const end = `[${q}\xff`;
        const matches = await redisClient.zrangebylex("users", start, end, "LIMIT", 0, 50);
        if (matches && matches.length) {
          const commands = matches.map((normalized) => ["hmget", `user:${normalized}`, "username", "userID", "email"]);
          const res = await redisClient.multi(commands).exec();
          const users = res
            .map(([err, vals]) => {
              if (err) return null;
              const [username, userID, email] = vals;
              if (!username || !userID) return null;
              return { username, userID, email: email || "" };
            })
            .filter((v) => !!v);
          if (typeof callback === "function") callback(users);
          return;
        }
      } catch (e) {
        // if ZRANGEBYLEX is not available or fails, fall back to scanning
        console.warn("ZRANGEBYLEX search failed, falling back to SCAN", e);
      }

      // Fallback: scan all user keys and filter client-side
      const keys = new Set();
      let nextIndex = 0;
      do {
        const [nextIndexAsStr, results] = await redisClient.scan(
          nextIndex,
          "MATCH",
          "user:*",
          "COUNT",
          "100"
        );
        nextIndex = parseInt(nextIndexAsStr, 10);
        results.forEach((k) => keys.add(k));
      } while (nextIndex !== 0);

      if (keys.size === 0) {
        if (typeof callback === "function") callback([]);
        return;
      }

      const commands = [];
      keys.forEach((k) => commands.push(["hmget", k, "username", "userID", "email"]));
      const results = await redisClient.multi(commands).exec();
      const users = results
        .map(([err, vals]) => {
          if (err) return null;
          const [username, userID, email] = vals;
          if (!username || !userID) return null;
          return { username, userID, email: email || "" };
        })
        .filter((v) => !!v);

      const matched = users.filter((u) => u.username.toLowerCase().includes(q)).slice(0, 50);
      if (typeof callback === "function") callback(matched);
    } catch (e) {
      console.error("search users failed", e);
      if (typeof callback === "function") callback([]);
    }
  });

  socket.on("reset chat state", async (callback) => {
    if (!isDevEnvironment) {
      if (typeof callback === "function") {
        callback({ ok: false, message: "Reset is only available in development." });
      }
      return;
    }

    try {
      await Promise.all([
        sessionStore.clearAllSessions(),
        messageStore.clearAllMessages(),
      ]);
      await persistActiveSessions();
      io.emit("chat state reset");

      if (typeof callback === "function") {
        callback({ ok: true });
      }
    } catch (error) {
      console.error("Failed to reset chat state", error);
      if (typeof callback === "function") {
        callback({ ok: false, message: "Failed to reset chat state." });
      }
    }
  });

  socket.on("logout", async (callback) => {
    try {
      // remove the persisted session
      await sessionStore.deleteSession(socket.sessionID);
      // notify others that this user is disconnected
      socket.broadcast.emit("user disconnected", socket.userID);
      // disconnect the socket
      socket.disconnect(true);
      if (typeof callback === "function") {
        callback({ ok: true });
      }
    } catch (err) {
      console.error("Logout failed", err);
      if (typeof callback === "function") {
        callback({ ok: false });
      }
    }
  });

  socket.on("update profile", async (payload, callback) => {
    const email = payload && typeof payload.email === 'string' ? payload.email.trim() : '';
    // validate email
    if (!validateEmail(email)) {
      if (typeof callback === 'function') callback({ ok: false, message: 'Email must be valid and at most 28 characters.' });
      return;
    }

    try {
      const existingUser = await userStore.findUser(socket.username);
      if (!existingUser) {
        if (typeof callback === 'function') callback({ ok: false, message: 'User not found.' });
        return;
      }
      // save updated email while preserving other fields
      await userStore.saveUser({
        username: existingUser.username,
        userID: existingUser.userID,
        passwordHash: existingUser.passwordHash,
        email,
      });
      // notify the socket with updated session/profile info
      socket.emit('profile updated', { email });
      // acknowledge immediately to avoid blocking client on heavy work
      if (typeof callback === 'function') callback({ ok: true, email });
      // perform expensive refresh and broadcast asynchronously
      (async () => {
        try {
          await persistActiveSessions();
          const [messages, sessions] = await Promise.all([
            messageStore.findMessagesForUser(socket.userID),
            sessionStore.findAllSessions(),
          ]);
          const messagesPerUser = new Map();
          messages.forEach((message) => {
            const { from, to } = message;
            const otherUser = socket.userID === from ? to : from;
            if (messagesPerUser.has(otherUser)) {
              messagesPerUser.get(otherUser).push(message);
            } else {
              messagesPerUser.set(otherUser, [message]);
            }
          });
          const users = [];
          sessions.forEach((session) => {
            users.push({
              userID: session.userID,
              username: session.username,
              connected: session.connected,
              messages: messagesPerUser.get(session.userID) || [],
            });
          });
          io.emit('users', users);
        } catch (e) {
          console.warn('Failed to broadcast users after profile update', e);
        }
      })();
    } catch (err) {
      console.error('Failed to update profile', err);
      if (typeof callback === 'function') callback({ ok: false, message: 'Failed to update profile.' });
    }
  });

  // notify users upon disconnection
  socket.on("disconnect", async () => {
    const matchingSockets = await io.in(socket.userID).allSockets();
    const isDisconnected = matchingSockets.size === 0;
    if (isDisconnected) {
      // notify other users
      socket.broadcast.emit("user disconnected", socket.userID);
      // update the connection status of the session
      sessionStore.saveSession(socket.sessionID, {
        userID: socket.userID,
        username: socket.username,
        connected: false,
      });
    }
  });
});

setupWorker(io);

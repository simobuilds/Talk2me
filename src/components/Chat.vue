<template>
  <div>
    <div class="left-panel">
      <div class="user-search">
        <input
          class="search-input"
          placeholder="Search users..."
          v-model.trim="searchQuery"
          @input="onSearchUsers"
        />
        <div v-if="isSearching" class="search-loading">Searching...</div>
        <ul v-if="searchResults && searchResults.length" class="search-results">
          <li v-for="(r, index) in searchResults" :key="r.userID" :class="['search-result', { active: searchActiveIndex === index }]" ref="searchResult">
              <div class="search-left">
                <span :class="['presence', searchUserConnected(r.userID) ? 'online' : 'offline']"></span>
                <span class="search-username">{{ r.username }}</span>
              </div>
              <div class="search-actions">
                <button type="button" class="start-chat" @click="startChatWith(r)">Start Chat</button>
              </div>
            </li>
        </ul>
      </div>
      <div class="profile-card">
        <div class="profile-header">Your profile</div>
        <div class="profile-body">
          <div class="profile-username">{{ profile && profile.username ? profile.username : socket.username }}</div>
          <div v-if="profile && profile.email" class="profile-email">{{ profile.email }}</div>
        </div>
        <div class="profile-actions">
          <button class="logout-button" @click="onLogout">Logout</button>
        </div>
      </div>
      <div v-if="showDevResetControl" class="dev-tools">
        <button
          class="reset-button"
          :disabled="isResettingState"
          @click="onResetChatState"
        >
          {{ isResettingState ? "Resetting..." : "Reset chat state" }}
        </button>
      </div>
      <user
        v-for="user in users"
        :key="user.userID"
        :user="user"
        :selected="selectedUser === user"
        @select="onSelectUser(user)"
      />
    </div>
    <message-panel
      v-if="selectedUser"
      :user="selectedUser"
      @input="onMessage"
      class="right-panel"
    />
  </div>
</template>

<script>
import socket from "../socket";
import User from "./User";
import MessagePanel from "./MessagePanel";

export default {
  name: "Chat",
  components: { User, MessagePanel },
  props: {
    profile: {
      type: Object,
      default: () => ({}),
    },
  },
  data() {
    return {
      selectedUser: null,
      users: [],
      isResettingState: false,
      // user search
      searchQuery: "",
      searchResults: [],
      isSearching: false,
      searchTimer: null,
      searchActiveIndex: -1,
    };
  },
  methods: {
    createMessage(content, fromSelf, fromUsername) {
      return {
        content,
        fromSelf,
        fromUsername,
        createdAt: new Date().toISOString(),
      };
    },
    onMessage(content) {
      if (!this.selectedUser) return;
      // Prevent sending a private message to yourself
      if (this.selectedUser.userID === socket.userID) {
        console.log('Not sending message to yourself');
        return;
      }
      socket.emit("private message", {
        content,
        to: this.selectedUser.userID,
      });
      this.selectedUser.messages.push(
        this.createMessage(content, true, socket.username)
      );
    },
    onSelectUser(user) {
      this.selectedUser = user;
      user.hasNewMessages = false;
      user.unreadCount = 0;
    },
    onResetChatState() {
      if (this.isResettingState) {
        return;
      }

      const confirmed = window.confirm(
        "Reset all Redis-backed chat sessions and messages for development?"
      );

      if (!confirmed) {
        return;
      }

      this.isResettingState = true;
      socket.emit("reset chat state", (response) => {
        this.isResettingState = false;

        if (!response || !response.ok) {
          window.alert(
            (response && response.message) || "Failed to reset chat state."
          );
        }
      });
    },
    onSearchUsers() {
      // debounce user input to avoid hammering the server
      if (this.searchTimer) {
        clearTimeout(this.searchTimer);
      }
      this.searchTimer = setTimeout(() => {
        this.performUserSearch();
      }, 300);
    },
    onSearchKey(e) {
      if (!this.searchResults || this.searchResults.length === 0) return;
      const key = e.key;
      if (key === "ArrowDown") {
        e.preventDefault();
        if (this.searchActiveIndex < this.searchResults.length - 1) {
          this.searchActiveIndex++;
        } else {
          this.searchActiveIndex = 0;
        }
        this.scrollActiveIntoView();
      } else if (key === "ArrowUp") {
        e.preventDefault();
        if (this.searchActiveIndex > 0) {
          this.searchActiveIndex--;
        } else {
          this.searchActiveIndex = this.searchResults.length - 1;
        }
        this.scrollActiveIntoView();
      } else if (key === "Enter") {
        e.preventDefault();
        if (this.searchActiveIndex >= 0 && this.searchActiveIndex < this.searchResults.length) {
          this.startChatWith(this.searchResults[this.searchActiveIndex]);
        }
      } else if (key === "Escape") {
        this.searchResults = [];
        this.searchQuery = "";
        this.searchActiveIndex = -1;
      }
    },
    scrollActiveIntoView() {
      this.$nextTick(() => {
        const refs = this.$refs.searchResult;
        if (!refs) return;
        const el = Array.isArray(refs) ? refs[this.searchActiveIndex] : refs;
        if (el && el.scrollIntoView) {
          el.scrollIntoView({ block: "nearest" });
        }
      });
    },
    performUserSearch() {
      const q = (this.searchQuery || "").trim();
      if (!q) {
        this.searchResults = [];
        this.isSearching = false;
        return;
      }
      this.isSearching = true;
      try {
        socket.emit("search users", q, (results) => {
          this.isSearching = false;
          this.searchResults = Array.isArray(results) ? results : [];
        });
      } catch (e) {
        this.isSearching = false;
        this.searchResults = [];
      }
    },
    startChatWith(user) {
      if (!user || !user.userID) return;
      // find existing
      let existing = this.users.find((u) => u.userID === user.userID);
      if (!existing) {
        existing = {
          userID: user.userID,
          username: user.username,
          connected: false,
          messages: [],
          hasNewMessages: false,
          unreadCount: 0,
          self: user.userID === socket.userID,
        };
        this.users.push(existing);
        this.users.sort((a, b) => {
          if (a.self) return -1;
          if (b.self) return 1;
          if (a.username < b.username) return -1;
          return a.username > b.username ? 1 : 0;
        });
      }
      this.selectedUser = existing;
      this.searchResults = [];
      this.searchQuery = "";
    },
    searchUserConnected(userID) {
      const u = this.users.find((x) => x.userID === userID);
      return !!(u && u.connected);
    },
    onLogout() {
      try {
        socket.emit('logout', () => {
          // best-effort server logout
        });
      } catch (e) {
        console.warn('Logout request failed', e);
      }
      try {
        sessionStorage.removeItem('sessionID');
        sessionStorage.removeItem('username');
      } catch (e) {}
      socket.disconnect();
      this.$emit('logged-out');
    },
    // profile edit handlers removed temporarily
  },
  created() {
    socket.on("connect", () => {
      this.users.forEach((user) => {
        if (user.self) {
          user.connected = true;
        }
      });
    });

    socket.on("disconnect", () => {
      this.users.forEach((user) => {
        if (user.self) {
          user.connected = false;
        }
      });
    });

    const initReactiveProperties = (user) => {
      user.hasNewMessages = false;
      user.unreadCount = 0;
    };

    const normalizeMessage = (message) => {
      message.fromSelf = message.from === socket.userID;
      if (!message.createdAt) {
        message.createdAt = null;
      }
      return message;
    };

    socket.on("users", (users) => {
      users.forEach((user) => {
        user.messages = user.messages.map(normalizeMessage);
        for (let i = 0; i < this.users.length; i++) {
          const existingUser = this.users[i];
          if (existingUser.userID === user.userID) {
            existingUser.connected = user.connected;
            existingUser.messages = user.messages;
            existingUser.username = user.username;
            return;
          }
        }
        user.self = user.userID === socket.userID;
        initReactiveProperties(user);
        this.users.push(user);
      });
      // put the current user first, and sort by username
      this.users.sort((a, b) => {
        if (a.self) return -1;
        if (b.self) return 1;
        if (a.username < b.username) return -1;
        return a.username > b.username ? 1 : 0;
      });
    });

    socket.on("user connected", (user) => {
      for (let i = 0; i < this.users.length; i++) {
        const existingUser = this.users[i];
        if (existingUser.userID === user.userID) {
          existingUser.connected = true;
          return;
        }
      }
      initReactiveProperties(user);
      this.users.push(user);
    });

    socket.on("user disconnected", (id) => {
      for (let i = 0; i < this.users.length; i++) {
        const user = this.users[i];
        if (user.userID === id) {
          user.connected = false;
          break;
        }
      }
    });

    socket.on("private message", (payload) => {
      const { content, from, to, fromUsername } = payload || {};
      for (let i = 0; i < this.users.length; i++) {
        const user = this.users[i];
        const fromSelf = socket.userID === from;
        if (user.userID === (fromSelf ? to : from)) {
          // compute a robust sender name: prefer payload.fromUsername, else try to
          // look up the original sender in our users list, else fall back to the matched user's username
          let senderName = fromUsername;
          if (!senderName) {
            const senderUser = this.users.find((u) => u.userID === from);
            senderName = senderUser ? senderUser.username : user.username;
          }
          console.debug("private message received", payload, "matchedUser", user.userID, "senderName", senderName);
          user.messages.push({
            content,
            fromSelf,
            fromUsername: senderName,
            createdAt: payload && payload.createdAt ? payload.createdAt : new Date().toISOString(),
          });
          if (user !== this.selectedUser) {
            user.hasNewMessages = true;
            user.unreadCount += 1;
          }
          break;
        }
      }
    });
  },
  destroyed() {
    socket.off("connect");
    socket.off("disconnect");
    socket.off("users");
    socket.off("user connected");
    socket.off("user disconnected");
    socket.off("private message");
    if (this.searchTimer) {
      clearTimeout(this.searchTimer);
      this.searchTimer = null;
    }
    this.searchActiveIndex = -1;
  },
  computed: {
    showDevResetControl() {
      return process.env.NODE_ENV !== "production";
    },
  },
};
</script>

<style scoped>
.left-panel {
  position: fixed;
  left: 0;
  top: 0;
  bottom: 0;
  width: 260px;
  overflow-x: hidden;
  background-color: #3f0e40;
  color: white;
}

.dev-tools {
  padding: 12px 10px 4px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.12);
}

.profile-card {
  padding: 12px;
  border-bottom: 1px solid rgba(255,255,255,0.08);
}
.profile-header {
  font-size: 12px;
  font-weight: 700;
  color: rgba(255,255,255,0.9);
  margin-bottom: 8px;
}
.profile-body {
  margin-bottom: 10px;
}
.profile-username {
  font-size: 16px;
  font-weight: 800;
}
.profile-email {
  font-size: 13px;
  color: rgba(255,255,255,0.85);
}
.profile-actions {
  margin-top: 8px;
}
.logout-button {
  padding: 8px 10px;
  border-radius: 8px;
  border: 1px solid rgba(255,255,255,0.14);
  background: transparent;
  color: white;
  cursor: pointer;
}
.edit-button,
.save-button,
.cancel-button {
  padding: 8px 10px;
  border-radius: 8px;
  border: 1px solid rgba(255,255,255,0.14);
  background: transparent;
  color: white;
  cursor: pointer;
  margin-right: 6px;
}
.back-button {
  padding: 8px 10px;
  border-radius: 8px;
  border: 1px solid rgba(255,255,255,0.14);
  background: transparent;
  color: white;
  cursor: pointer;
}
.edit-row {
  display: flex;
  gap: 8px;
  align-items: center;
}
.profile-edit .field-label {
  display: block;
  margin-bottom: 6px;
  color: rgba(255,255,255,0.85);
}
.profile-edit .username-input {
  padding: 8px 10px;
  border-radius: 8px;
  border: 1px solid rgba(255,255,255,0.12);
  background: rgba(255,255,255,0.06);
  color: white;
  width: 100%;
  box-sizing: border-box;
}

.reset-button {
  width: 100%;
  padding: 10px 12px;
  border: 1px solid rgba(255, 255, 255, 0.25);
  border-radius: 8px;
  background-color: #6c2a6e;
  color: white;
  cursor: pointer;
}

.reset-button:disabled {
  opacity: 0.7;
  cursor: default;
}

.right-panel {
  margin-left: 260px;
}

.user-search {
  padding: 12px;
  border-bottom: 1px solid rgba(255,255,255,0.06);
}
.search-input {
  width: 100%;
  padding: 8px 10px;
  border-radius: 8px;
  border: 1px solid rgba(255,255,255,0.08);
  background: rgba(255,255,255,0.04);
  color: white;
  box-sizing: border-box;
}
.search-results {
  list-style: none;
  margin: 8px 0 0 0;
  padding: 0;
}
.search-result {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px 0;
  border-bottom: 1px solid rgba(255,255,255,0.03);
}
.presence {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  display: inline-block;
  margin-right: 8px;
}
.presence.online { background: #30d158; }
.presence.offline { background: rgba(255,255,255,0.18); }
.search-username { margin-right: 12px; color: white; }
.start-chat { padding: 6px 10px; border-radius: 6px; background: #1164a3; color: white; border: none; cursor: pointer; }
.search-result.active { background: rgba(255,255,255,0.04); }
</style>
</style>

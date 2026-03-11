<template>
  <div id="app">
    <select-username
      v-if="!usernameAlreadySelected"
      :cached-username="cachedUsername"
      :has-remembered-session="hasRememberedSession"
      :auth-error="authError"
      :is-authenticating="isAuthenticating"
      @submit-auth="onAuthSubmit"
      @resume="onResumeSession"
      @reset-session="onResetRememberedSession"
    />
      <chat v-else @logged-out="onLogout" :profile="{ username: cachedUsername, email: cachedEmail }" @profile-updated="onProfileUpdated" />
    <div v-if="toastMessage" :class="['app-toast', toastType]">{{ toastMessage }}</div>
  </div>
</template>

<script>
import SelectUsername from "./components/SelectUsername";
import Chat from "./components/Chat";
import socket from "./socket";

export default {
  name: "App",
  components: {
    Chat,
    SelectUsername,
  },
  data() {
    return {
      usernameAlreadySelected: false,
      cachedUsername: "",
        cachedEmail: "",
      rememberedSessionID: "",
      authError: "",
      isAuthenticating: false,
      toastMessage: "",
      toastType: "info",
      toastTimer: null,
    };
  },
  computed: {
    hasRememberedSession() {
      return !!this.rememberedSessionID;
    },
  },
  methods: {
    onAuthSubmit({ username, password, confirmPassword, email, authMode }) {
      this.onResetRememberedSession();
      this.authError = "";
      this.isAuthenticating = true;
      socket.auth = { username, password, confirmPassword, email, authMode };
      sessionStorage.setItem("username", username);
      socket.connect();
    },
    onResumeSession() {
      if (!this.rememberedSessionID) {
        return;
      }

      this.authError = "";
      this.isAuthenticating = true;
      socket.auth = { sessionID: this.rememberedSessionID };

      if (this.cachedUsername) {
        socket.username = this.cachedUsername;
      }

      socket.connect();
    },
    onResetRememberedSession() {
      this.authError = "";
      this.isAuthenticating = false;
      this.cachedUsername = "";
      this.rememberedSessionID = "";
      sessionStorage.removeItem("sessionID");
      sessionStorage.removeItem("username");
        this.cachedEmail = "";
        sessionStorage.removeItem("email");
      socket.auth = {};
      socket.username = undefined;
    },
    onProfileUpdated({ email }) {
      this.cachedEmail = email || '';
      if (this.cachedEmail) sessionStorage.setItem('email', this.cachedEmail);
      this.showToast('Profile updated.', 'info');
    },
    onLogout() {
      this.onResetRememberedSession();
      this.usernameAlreadySelected = false;
      this.showToast("You have been logged out.", "info");
    },
    onChatStateReset() {
      window.location.reload();
    },
    showToast(message, type = "info", timeout = 4000) {
      if (this.toastTimer) {
        clearTimeout(this.toastTimer);
        this.toastTimer = null;
      }
      this.toastMessage = message;
      this.toastType = type;
      this.toastTimer = setTimeout(() => {
        this.toastMessage = "";
        this.toastTimer = null;
      }, timeout);
    },
  },
  created() {
    // Use sessionStorage so each browser tab gets a separate session
    const sessionID = sessionStorage.getItem("sessionID");
    this.cachedUsername = sessionStorage.getItem("username") || "";
    this.rememberedSessionID = sessionID || "";

    socket.on("session", (payload) => {
      const { sessionID, userID, username, email } = payload || {};
      this.isAuthenticating = false;
      this.authError = "";
      this.usernameAlreadySelected = true;
      // attach the session ID to the next reconnection attempts
      socket.auth = { sessionID };
      // store it in sessionStorage so tabs don't share sessions
      sessionStorage.setItem("sessionID", sessionID);
      this.rememberedSessionID = sessionID;
      // save the ID of the user
      socket.userID = userID;
      // if server provided the username, persist it for this tab and set on socket
      if (username) {
        socket.username = username;
        sessionStorage.setItem("username", username);
        this.cachedUsername = username;
      }
      // persist optional email
      this.cachedEmail = email || sessionStorage.getItem("email") || "";
      if (this.cachedEmail) sessionStorage.setItem("email", this.cachedEmail);
    });

    socket.on("connect_error", (err) => {
      this.isAuthenticating = false;
      this.usernameAlreadySelected = false;
      this.authError = err.message || "Unable to connect.";
      // show a toast for rate-limit errors
      try {
        const msg = err && err.message ? String(err.message) : "";
        if (msg.includes("Too many login attempts")) {
          this.showToast(msg, "error");
        }
      } catch (e) {
        // ignore
      }
    });

    // listen for server push when profile is updated
    socket.on('profile updated', (payload) => {
      try {
        const email = payload && payload.email ? payload.email : '';
        this.cachedEmail = email || sessionStorage.getItem('email') || '';
        if (this.cachedEmail) sessionStorage.setItem('email', this.cachedEmail);
        this.showToast('Profile updated.', 'info');
      } catch (e) {
        // ignore
      }
    });

    socket.on("chat state reset", this.onChatStateReset);
  },
  destroyed() {
    socket.off("connect_error");
    socket.off("chat state reset", this.onChatStateReset);
    socket.off('profile updated');
  },
  
};
</script>

<style>
html,
body {
  margin: 0;
  min-height: 100%;
  background: #f1e6d6;
}

@font-face {
  font-family: Lato;
  src: "~/public/fonts/Lato-Regular.ttf";
}

* {
  box-sizing: border-box;
}
body,
button,
input,
textarea {
  font-family: Lato, "Trebuchet MS", sans-serif;
}

#app {
  font-size: 14px;
  min-height: 100vh;
}

.app-toast {
  position: fixed;
  right: 18px;
  bottom: 18px;
  max-width: 360px;
  padding: 12px 16px;
  border-radius: 10px;
  color: #fff;
  box-shadow: 0 8px 28px rgba(20, 30, 40, 0.18);
  font-weight: 700;
  z-index: 9999;
}
.app-toast.info {
  background: linear-gradient(135deg, #2b7a78 0%, #3fb1a1 100%);
}
.app-toast.error {
  background: linear-gradient(135deg, #b85c38 0%, #8f4123 100%);
}
</style>

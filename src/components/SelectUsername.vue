<template>
  <div class="select-username">
    <div class="ambient ambient-left"></div>
    <div class="ambient ambient-right"></div>

    <section class="hero-copy">
      <p class="eyebrow">Private Messaging V2</p>
      <h1>Start a conversation that feels intentional.</h1>
      <p class="lead">
        Pick a username for this tab and step into a cleaner local messaging
        workspace with persistent sessions and live delivery.
      </p>

      <div class="feature-list">
        <div class="feature-pill">Live Socket.IO delivery</div>
        <div class="feature-pill">Redis-backed sessions</div>
        <div class="feature-pill">Tab-specific identities</div>
      </div>
    </section>

    <form class="login-card" @submit.prevent="onSubmit">
      <div class="card-header">
        <p class="card-kicker">Join Chat</p>
        <h2>{{ authMode === "register" ? "Create your account" : "Sign in to continue" }}</h2>
        <p class="card-text">
          Use a username and an alphanumeric password between 6 and 28 characters.
          You can also save an optional email for development.
        </p>
      </div>

      <div class="mode-switch" role="tablist" aria-label="Authentication mode">
        <button
          type="button"
          class="mode-button"
          :class="{ active: authMode === 'login' }"
          @click="authMode = 'login'"
        >
          Login
        </button>
        <button
          type="button"
          class="mode-button"
          :class="{ active: authMode === 'register' }"
          @click="authMode = 'register'"
        >
          Register
        </button>
      </div>

      <div v-if="hasRememberedSession" class="remembered-session">
        <p class="remembered-label">Remembered session</p>
        <p class="remembered-identity">
          Continue as <strong>{{ cachedUsername || "previous user" }}</strong>
        </p>
        <p class="remembered-note">
          Resuming restores previous messages saved for this identity.
        </p>
        <div class="remembered-actions">
          <button type="button" class="resume-button" @click="$emit('resume')">
            Resume session
          </button>
          <button
            type="button"
            class="secondary-button"
            @click="$emit('reset-session')"
          >
            Use a different username
          </button>
        </div>
      </div>

      <label class="field-label" for="username">Username</label>
      <input
        id="username"
        v-model.trim="username"
        class="username-input"
        placeholder="Your username..."
        maxlength="28"
        autocomplete="username"
      />

      <template v-if="authMode === 'register'">
        <label class="field-label" for="email">Email (optional)</label>
        <input
          id="email"
          v-model.trim="email"
          class="username-input"
          type="email"
          placeholder="name@example.com"
          maxlength="28"
          autocomplete="email"
        />
      </template>

      <label class="field-label" for="password">Password</label>
      <input
        id="password"
        v-model.trim="password"
        class="username-input"
        type="password"
        placeholder="Letters and numbers, min 6 chars"
        maxlength="28"
        autocomplete="current-password"
      />

      <template v-if="authMode === 'register'">
        <label class="field-label" for="confirmPassword">Confirm password</label>
        <input
          id="confirmPassword"
          v-model.trim="confirmPassword"
          class="username-input"
          type="password"
          placeholder="Repeat password"
          maxlength="28"
          autocomplete="new-password"
        />
      </template>

      <p class="password-note">
        Password must contain at least one letter and one number.
      </p>

      <p v-if="authError" class="auth-error">{{ authError }}</p>

      <div class="card-footer">
        <p class="hint">Separate tabs can join as different users.</p>
        <button :disabled="!isValid || isAuthenticating" class="submit-button">
          {{ isAuthenticating ? "Connecting..." : (authMode === "register" ? "Create account" : "Enter chat") }}
        </button>
      </div>
    </form>
  </div>
</template>

<script>
const passwordPattern = /^(?=.*[A-Za-z])(?=.*\d)[A-Za-z\d]{6,}$/;
const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default {
  name: "SelectUsername",
  props: {
    cachedUsername: {
      type: String,
      default: "",
    },
    hasRememberedSession: {
      type: Boolean,
      default: false,
    },
    authError: {
      type: String,
      default: "",
    },
    isAuthenticating: {
      type: Boolean,
      default: false,
    },
  },
  data() {
    return {
      username: "",
      password: "",
      confirmPassword: "",
      email: "",
      authMode: "login",
    };
  },
  computed: {
    isValid() {
      return (
        this.username.length > 2 &&
        this.username.length <= 28 &&
        this.password.length <= 28 &&
        passwordPattern.test(this.password) &&
        (this.authMode !== 'register' || this.confirmPassword === this.password) &&
        this.hasValidEmail
      );
    },
    hasValidEmail() {
      if (this.authMode !== "register" || !this.email) {
        return true;
      }

      return this.email.length <= 28 && emailPattern.test(this.email);
    },
  },
  methods: {
    onSubmit() {
      this.$emit("submit-auth", {
        username: this.username,
        password: this.password,
        confirmPassword: this.authMode === "register" ? this.confirmPassword : "",
        email: this.authMode === "register" ? this.email : "",
        authMode: this.authMode,
      });
    },
  },
};
</script>

<style scoped>
.select-username {
  --sand: #f4efe4;
  --ink: #132238;
  --muted: #5e6d7f;
  --accent: #b85c38;
  --accent-dark: #8f4123;
  --panel: rgba(250, 246, 239, 0.86);
  --line: rgba(19, 34, 56, 0.12);
  min-height: 100vh;
  display: grid;
  grid-template-columns: minmax(280px, 1.15fr) minmax(320px, 460px);
  gap: 48px;
  align-items: center;
  padding: 56px clamp(24px, 5vw, 72px);
  box-sizing: border-box;
  position: relative;
  overflow: hidden;
  background:
    radial-gradient(circle at top left, rgba(184, 92, 56, 0.16), transparent 34%),
    radial-gradient(circle at bottom right, rgba(34, 88, 122, 0.18), transparent 30%),
    linear-gradient(135deg, #f5efe2 0%, #e9dcc9 46%, #dce8e4 100%);
}

.ambient {
  position: absolute;
  border-radius: 999px;
  filter: blur(10px);
  opacity: 0.8;
  pointer-events: none;
}

.ambient-left {
  width: 240px;
  height: 240px;
  top: 72px;
  left: -64px;
  background: rgba(184, 92, 56, 0.14);
  animation: driftInLeft 1.2s ease-out both;
}

.ambient-right {
  width: 280px;
  height: 280px;
  right: -80px;
  bottom: 42px;
  background: rgba(34, 88, 122, 0.18);
  animation: driftInRight 1.2s ease-out both;
}

.hero-copy {
  position: relative;
  z-index: 1;
  max-width: 620px;
  animation: fadeLiftIn 0.85s cubic-bezier(0.2, 0.8, 0.2, 1) both;
}

.eyebrow {
  margin: 0 0 14px;
  color: var(--accent-dark);
  font-size: 13px;
  font-weight: 700;
  letter-spacing: 0.18em;
  text-transform: uppercase;
}

.hero-copy h1 {
  margin: 0;
  color: var(--ink);
  font-size: clamp(40px, 7vw, 72px);
  line-height: 0.96;
  letter-spacing: -0.04em;
  max-width: 10ch;
}

.lead {
  margin: 24px 0 0;
  max-width: 34rem;
  color: var(--muted);
  font-size: clamp(16px, 2vw, 20px);
  line-height: 1.7;
}

.feature-list {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  margin-top: 28px;
}

.feature-pill {
  padding: 10px 14px;
  border: 1px solid rgba(19, 34, 56, 0.12);
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.45);
  color: var(--ink);
  font-size: 13px;
  font-weight: 600;
  backdrop-filter: blur(8px);
  opacity: 0;
  animation: fadeLiftIn 0.7s cubic-bezier(0.2, 0.8, 0.2, 1) forwards;
}

.feature-pill:nth-child(1) {
  animation-delay: 0.28s;
}

.feature-pill:nth-child(2) {
  animation-delay: 0.38s;
}

.feature-pill:nth-child(3) {
  animation-delay: 0.48s;
}

.login-card {
  position: relative;
  z-index: 1;
  display: grid;
  gap: 16px;
  padding: 30px;
  border: 1px solid var(--line);
  border-radius: 28px;
  background: var(--panel);
  box-shadow: 0 24px 80px rgba(45, 54, 68, 0.18);
  backdrop-filter: blur(18px);
  opacity: 0;
  animation: cardReveal 0.9s cubic-bezier(0.18, 0.9, 0.22, 1) 0.18s forwards;
}

.mode-switch {
  display: inline-grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 6px;
  padding: 4px;
  border: 1px solid rgba(19, 34, 56, 0.1);
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.55);
}

.mode-button {
  padding: 10px 14px;
  border: none;
  border-radius: 999px;
  background: transparent;
  color: var(--muted);
  font-size: 13px;
  font-weight: 700;
  cursor: pointer;
}

.mode-button.active {
  background: rgba(19, 34, 56, 0.95);
  color: #fffaf4;
}

.card-header h2 {
  margin: 6px 0 10px;
  color: var(--ink);
  font-size: 30px;
  line-height: 1.05;
}

.card-kicker {
  margin: 0;
  color: var(--accent-dark);
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 0.14em;
  text-transform: uppercase;
}

.card-text {
  margin: 0;
  color: var(--muted);
  font-size: 15px;
  line-height: 1.6;
}

.remembered-session {
  display: grid;
  gap: 10px;
  padding: 16px;
  border: 1px solid rgba(19, 34, 56, 0.1);
  border-radius: 18px;
  background: rgba(255, 255, 255, 0.55);
}

.remembered-label {
  margin: 0;
  color: var(--accent-dark);
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 0.14em;
  text-transform: uppercase;
}

.remembered-identity {
  margin: 0;
  color: var(--ink);
  font-size: 15px;
  line-height: 1.5;
}

.remembered-note {
  margin: 0;
  color: var(--muted);
  font-size: 13px;
  line-height: 1.5;
}

.remembered-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
}

.password-note {
  margin: -6px 0 0;
  color: var(--muted);
  font-size: 12px;
  line-height: 1.5;
}

.field-note {
  margin: -6px 0 0;
  color: var(--muted);
  font-size: 12px;
  line-height: 1.5;
}

.auth-error {
  margin: 0;
  padding: 12px 14px;
  border-radius: 14px;
  background: rgba(184, 92, 56, 0.12);
  color: #7a2f12;
  font-size: 13px;
  line-height: 1.5;
}

.field-label {
  color: var(--ink);
  font-size: 13px;
  font-weight: 700;
  letter-spacing: 0.06em;
  text-transform: uppercase;
}

.username-input {
  width: 100%;
  box-sizing: border-box;
  padding: 16px 18px;
  border: 1px solid rgba(19, 34, 56, 0.14);
  border-radius: 16px;
  background: rgba(255, 255, 255, 0.82);
  color: var(--ink);
  font-size: 18px;
  outline: none;
  transition: border-color 0.2s ease, box-shadow 0.2s ease, transform 0.2s ease;
}

.username-input:focus {
  border-color: rgba(184, 92, 56, 0.65);
  box-shadow: 0 0 0 4px rgba(184, 92, 56, 0.12);
  transform: translateY(-1px);
}

.username-input::placeholder {
  color: rgba(94, 109, 127, 0.8);
}

.card-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
}

.hint {
  margin: 0;
  color: var(--muted);
  font-size: 13px;
  line-height: 1.5;
}

.submit-button {
  min-width: 144px;
  padding: 14px 18px;
  border: none;
  border-radius: 999px;
  background: linear-gradient(135deg, var(--accent) 0%, #cd7b52 100%);
  color: #fffaf4;
  font-size: 15px;
  font-weight: 700;
  letter-spacing: 0.02em;
  cursor: pointer;
  box-shadow: 0 14px 32px rgba(184, 92, 56, 0.28);
  transition: transform 0.2s ease, box-shadow 0.2s ease, opacity 0.2s ease;
}

.resume-button,
.secondary-button {
  padding: 11px 14px;
  border-radius: 999px;
  font-size: 14px;
  font-weight: 700;
  cursor: pointer;
  transition: transform 0.2s ease, box-shadow 0.2s ease, opacity 0.2s ease;
}

.resume-button {
  border: none;
  background: rgba(19, 34, 56, 0.95);
  color: #fffaf4;
  box-shadow: 0 10px 24px rgba(19, 34, 56, 0.2);
}

.secondary-button {
  border: 1px solid rgba(19, 34, 56, 0.16);
  background: rgba(255, 255, 255, 0.7);
  color: var(--ink);
}

.resume-button:hover,
.secondary-button:hover,
.submit-button:hover:not(:disabled) {
  transform: translateY(-1px);
}

.resume-button:hover {
  box-shadow: 0 14px 28px rgba(19, 34, 56, 0.24);
}

.submit-button:hover:not(:disabled) {
  box-shadow: 0 18px 34px rgba(184, 92, 56, 0.32);
}

.submit-button:disabled {
  opacity: 0.45;
  cursor: not-allowed;
  box-shadow: none;
}

@keyframes fadeLiftIn {
  from {
    opacity: 0;
    transform: translateY(24px);
  }

  to {
    opacity: 1;
    transform: translateY(0);
  }
}

@keyframes cardReveal {
  from {
    opacity: 0;
    transform: translateY(28px) scale(0.985);
  }

  to {
    opacity: 1;
    transform: translateY(0) scale(1);
  }
}

@keyframes driftInLeft {
  from {
    opacity: 0;
    transform: translate3d(-28px, -12px, 0) scale(0.92);
  }

  to {
    opacity: 0.8;
    transform: translate3d(0, 0, 0) scale(1);
  }
}

@keyframes driftInRight {
  from {
    opacity: 0;
    transform: translate3d(28px, 16px, 0) scale(0.92);
  }

  to {
    opacity: 0.8;
    transform: translate3d(0, 0, 0) scale(1);
  }
}

@media (prefers-reduced-motion: reduce) {
  .ambient-left,
  .ambient-right,
  .hero-copy,
  .feature-pill,
  .login-card {
    animation: none;
    opacity: 1;
    transform: none;
  }

  .username-input,
  .submit-button {
    transition: none;
  }
}

@media (max-width: 980px) {
  .select-username {
    grid-template-columns: 1fr;
    gap: 28px;
    padding: 36px 18px 28px;
  }

  .hero-copy h1 {
    max-width: none;
  }
}

@media (max-width: 640px) {
  .login-card {
    padding: 22px;
    border-radius: 22px;
  }

  .card-footer {
    flex-direction: column;
    align-items: stretch;
  }

  .remembered-actions {
    flex-direction: column;
  }

  .mode-switch {
    width: 100%;
  }

  .resume-button,
  .secondary-button,
  .submit-button {
    width: 100%;
  }
}
</style>

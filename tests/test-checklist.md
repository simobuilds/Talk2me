# Private Messaging V2 Test Checklist

Date created: 2026-03-11

## Purpose

Repeatable manual checklist for verifying local development behavior of the private-messaging-v2 example.

## Preconditions

- Docker Desktop is running.
- Redis container can be started from `server/docker-compose.yml`.
- Server dependencies are installed in `server/`.
- Frontend dependencies are installed in the project root.

## Startup checklist

- [ ] From `server/`, run `docker compose up -d redis`.
- [ ] Confirm Redis is running with `docker compose ps`.
- [ ] From `server/`, run `npm start`.
- [ ] Confirm the backend listens on `http://localhost:3000`.
- [ ] From the project root, run `npm run serve`.
- [ ] Confirm the frontend loads on `http://localhost:8080`.

## Fresh session checklist

- [ ] Open the app in one browser tab.
- [ ] Open the app in a second browser tab.
- [ ] If the second tab reuses a previous session, clear `sessionStorage` and reload it.
- [ ] Log in with two distinct usernames, for example `Alice` and `Bob`.
- [ ] Confirm both users appear in each sidebar.

## Messaging flow checklist

- [ ] Select `Alice` in Bob's tab.
- [ ] Send a message from Bob to Alice.
- [ ] Confirm the message appears in Alice's active conversation.
- [ ] Confirm the sender label in Alice's conversation shows `Bob`.
- [ ] Reply from Alice to Bob.
- [ ] Confirm the reply appears in Bob's active conversation.
- [ ] Confirm the sender label in Bob's conversation shows `Alice`.
- [ ] Confirm self-authored messages render as `You (username)`.

## Message metadata checklist

- [ ] Confirm new messages display a timestamp.
- [ ] Confirm timestamps appear for both incoming and outgoing messages.
- [ ] Confirm pressing `Enter` sends a message.
- [ ] Confirm pressing `Shift+Enter` inserts a newline instead of sending.

## Sidebar state checklist

- [ ] Confirm unread badges increment when a message arrives in a non-selected conversation.
- [ ] Confirm opening that conversation clears the unread count.
- [ ] Confirm the current user appears at the top of the sidebar.

## Scroll behavior checklist

- [ ] Confirm the active conversation scrolls to the latest message when opened.
- [ ] Scroll upward in a conversation with existing history.
- [ ] Send an incoming message from the other tab.
- [ ] Confirm the view does not auto-jump to the bottom while scrolled up.
- [ ] Confirm the `new message` indicator appears for unseen incoming messages.
- [ ] Click the jump-to-latest control.
- [ ] Confirm the conversation scrolls to the newest message.
- [ ] Confirm outgoing messages force-scroll into view even if the user was previously scrolled up.

## Redis persistence checklist

- [ ] In `server/`, run `docker compose exec -T redis redis-cli --scan --pattern "session:*"`.
- [ ] Confirm at least one `session:*` key exists after login.
- [ ] In `server/`, run `docker compose exec -T redis redis-cli --scan --pattern "messages:*"`.
- [ ] Confirm `messages:*` keys exist after messages are exchanged.

## Dev reset control checklist

- [ ] Confirm the `Reset chat state` button is visible only in development.
- [ ] Trigger the reset control and accept the confirmation prompt.
- [ ] Confirm old conversation history disappears after reload.
- [ ] Confirm stale users are removed or reduced after reset.
- [ ] Run `docker compose exec -T redis redis-cli --scan --pattern "messages:*"`.
- [ ] Confirm no message keys remain after reset.
- [ ] Run `docker compose exec -T redis redis-cli --scan --pattern "session:*"`.
- [ ] Confirm only currently active session keys remain after reset.

## Regression notes

- [ ] Watch for duplicate usernames caused by old persisted sessions.
- [ ] Watch for sender-name regressions where received messages show the recipient's name instead of the sender's name.
- [ ] Watch for browser-tab session reuse when a fresh user is expected.
- [ ] Ignore a standalone `favicon.ico` 404 unless other asset failures appear.

## Optional cleanup

- [ ] Stop the frontend dev server.
- [ ] Stop the backend server.
- [ ] Stop Redis with `docker compose down` from `server/` if no longer needed.
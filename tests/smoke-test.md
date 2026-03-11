# Private Messaging V2 Smoke Test

Date created: 2026-03-11

## Goal

Fast manual regression pass for core local functionality.

## Startup

- [ ] Start Redis from `server/` with `docker compose up -d redis`.
- [ ] Start the backend from `server/` with `npm start`.
- [ ] Start the frontend from the project root with `npm run serve`.
- [ ] Confirm the app opens at `http://localhost:8080`.

## Core flow

- [ ] Open two browser tabs.
- [ ] Log in as two different users.
- [ ] Send one message from user A to user B.
- [ ] Confirm the message arrives in user B's chat.
- [ ] Reply from user B to user A.
- [ ] Confirm the reply arrives in user A's chat.

## UI checks

- [ ] Confirm incoming messages show the sender's username.
- [ ] Confirm outgoing messages show `You (username)`.
- [ ] Confirm messages show timestamps.
- [ ] Confirm unread badge behavior works for a non-selected conversation.

## Scroll checks

- [ ] Scroll up in an active conversation.
- [ ] Send a new incoming message from the other tab.
- [ ] Confirm the view does not jump to bottom automatically.
- [ ] Confirm the jump-to-latest indicator appears.
- [ ] Click it and confirm the latest message becomes visible.

## Reset check

- [ ] Click `Reset chat state` in development.
- [ ] Confirm message history is cleared after reload.
- [ ] Confirm Redis message keys are cleared if checked manually.

## Pass criteria

- [ ] Messaging works both directions.
- [ ] Sender labeling is correct.
- [ ] Scroll behavior is not disruptive.
- [ ] Reset control clears stale chat state.
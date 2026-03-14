# aka-chat-ai — Private messaging with Socket.IO

my redis and socket live chat app

Please read the related guide for background and design notes:

- [Part I](https://socket.io/get-started/private-messaging-part-1/): initial implementation
- [Part II](https://socket.io/get-started/private-messaging-part-2/): persistent user ID
- [Part III](https://socket.io/get-started/private-messaging-part-3/): persistent messages
- [Part IV](https://socket.io/get-started/private-messaging-part-4/): scaling up

## Running the frontend

```
npm install
npm run serve
```

### Running the server

```
cd server
npm install
npm start
```

## Deploying on Render

The repository now includes a root-level `render.yaml` blueprint that provisions:

- one Node web service for the app
- one internal Render Key Value instance for Redis

The web service builds the Vue frontend, serves the generated `dist` files from the Node server, and receives `REDIS_URL` automatically from the Redis service over Render's private network.

To deploy it:

1. Push this repo to GitHub.
2. In Render, create a new Blueprint and point it at the repo.
3. Render will create both services from `render.yaml` and wire `REDIS_URL` automatically.

Optional environment variables:

- `CORS_ORIGIN`: comma-separated origins if you later move the frontend to a separate domain
- `VUE_APP_SOCKET_URL`: only needed if the frontend should connect to a different Socket.IO URL at build time

## Local environment example

Use `.env.example` as the starting point for a local `.env` file if you want local configuration to mirror the Render variable names.

Typical flow:

1. Copy `.env.example` to `.env`.
2. Fill in the values you actually want to use locally.
3. Restart the frontend and server after changing environment variables.

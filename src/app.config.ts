import config from "@colyseus/tools";
import { WebSocketTransport } from "@colyseus/ws-transport";
import fs from "fs";
import { Server, RedisPresence } from "colyseus";
import https from "https";
import { createServer } from "http";
import express from "express";
import path from "path";
import { rooms } from "./rooms";
import { initializeExpress } from "./express";

const PORT =
  process.env.NODE_ENV !== "production"
    ? 2567
    : Number(process.env.PORT) + Number(process.env.NODE_APP_INSTANCE);

const app = express();

app.use(express.json());

initializeExpress(app);

function getServer() {
  if (process.env.NODE_ENV !== "production") {
    return createServer(app);
  } else {
    // Certificate
    const privateKey = fs.readFileSync(
      "/etc/letsencrypt/live/game-server-v2.oncyber.xyz/privkey.pem",
      "utf8"
    );
    const certificate = fs.readFileSync(
      "/etc/letsencrypt/live/game-server-v2.oncyber.xyz/cert.pem",
      "utf8"
    );
    const ca = fs.readFileSync(
      "/etc/letsencrypt/live/game-server-v2.oncyber.xyz/chain.pem",
      "utf8"
    );

    const credentials = {
      key: privateKey,
      cert: certificate,
      ca: ca,
    };

    return https.createServer(credentials, app);
  }
}

const gameServer = new Server({
  transport: new WebSocketTransport({
    server: getServer(),
  }),
});

Object.keys(rooms).forEach((key) => {
  gameServer.define(key, rooms[key]);
});

export function listen() {
  gameServer.listen(PORT).then(() => {
    console.log(`Listening on http://localhost:${PORT}`);
  });
}

/*
export default config({
  initializeGameServer: (gameServer) => {
   
    Object.keys(rooms).forEach((key) => {
      gameServer.define(key, rooms[key]);
    });
  },

  initializeTransport: (options) => {
    
    return new WebSocketTransport({
      server: getServer(),
    });
  },

  initializeExpress: (app) => {
    //
    initializeExpress(app);
  },

  beforeListen: () => {
    
  },
});
*/

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

const SSL = process.env.SSL == "true";

const PORT = SSL ? 443 : 2567;

const app = express();

app.use(express.json());

initializeExpress(app);

function getServer() {
  if (!SSL) {
    return createServer(app);
  } else {
    // Certificate
    const privateKey = fs.readFileSync(
      path.resolve(__dirname, "../certs/privkey.pem"),
      "utf8"
    );
    const certificate = fs.readFileSync(
      path.resolve(__dirname, "../certs/cert.pem"),
      "utf8"
    );
    const ca = fs.readFileSync(
      path.resolve(__dirname, "../certs/chain.pem"),
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
    console.log("SSL", process.env.SSL);
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

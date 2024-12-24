import config from "@colyseus/tools";
import { monitor } from "@colyseus/monitor";
import { playground } from "@colyseus/playground";
import { rooms } from "./rooms";
import { initializeExpress } from "./express";

const publicAddress = `${process.env.FLY_APP_NAME}.fly.dev`;

export default config({
  options: {
    publicAddress,
  },
  initializeGameServer: (gameServer) => {
    /**
     * Define your room handlers:
     */
    Object.keys(rooms).forEach((key) => {
      gameServer.define(key, rooms[key]);
    });
  },

  initializeExpress: (app) => {
    /**
     * Bind your custom express routes here:
     * Read more: https://expressjs.com/en/starter/basic-routing.html
     */
    initializeExpress(app);
  },

  beforeListen: () => {
    /**
     * Before before gameServer.listen() is called.
     */
    console.log(`Listening on https://${publicAddress}`);
  },
});

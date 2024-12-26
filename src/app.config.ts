import config from "@colyseus/tools";
import { monitor } from "@colyseus/monitor";
import { playground } from "@colyseus/playground";
import { rooms } from "./rooms";
import { initializeExpress } from "./express";

const flyApp = process.env.FLY_APP_NAME;
const flyMachine = process.env.FLY_MACHINE_ID;
const flyProxy = process.env.FLY_PROXY;

const publicAddress =
  flyProxy && flyMachine ? `${flyProxy}/${flyMachine}` : null;

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
    console.log("Fly app:", flyApp);
    console.log("Fly machine:", flyMachine);
    console.log("Fly proxy:", flyProxy);

    if (publicAddress) {
      console.log(`Public address is ${publicAddress}`);
    }
  },
});

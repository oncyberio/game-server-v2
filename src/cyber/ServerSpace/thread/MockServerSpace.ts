import type { RoomState } from "../../schema/RoomState";
import type { PlayerState } from "../../schema/PlayerState";
import * as ethers from "ethers";
import { loadGame } from "../loadGame";
import { ServerApi } from "./ServerApi";
import { Room } from "./RoomProxy";
import { RoomEvents, SpaceEvents } from "./types";

const USE_SERVER_REGEX = /^\s*"use server"/;

export interface ServerSpaceParams {
  gameData: any;
  debugPhysics?: boolean;
  isDraft?: boolean;
}

export class ServerSpace {
  //

  engine = null;
  playerManager = null;
  space = null;
  // avatar = null;
  // coins = null;
  // coinModel = null;

  state: RoomState = null;

  serverApi: ServerApi = null;

  dt = 1 / 60;
  iv = null;
  time = 0;

  static create() {
    //
    globalThis.$$serverSpace = new ServerSpace();
  }

  constructor() {
    //
    Room.once(RoomEvents.LOAD_SPACE, async (config: ServerSpaceParams) => {
      //
      try {
        await this.init(config);
        Room.postMessage(SpaceEvents.LOADED, {
          status: "ok",
          entities: this.serverApi._entitiesSchema,
        });
      } catch (err) {
        console.error("Error loading space", err);
        Room.postMessage(SpaceEvents.LOADED, {
          status: "error",
          message: err.message,
        });
      }
    });

    Room.on(RoomEvents.START_GAME, () => {
      //
      console.log("Starting game");
    });

    Room.on(RoomEvents.STOP_GAME, () => {
      //
      console.log("Stopping game");
    });

    Room.on(RoomEvents.JOIN, (player: PlayerState) => {
      //
      console.log("Player joined", player);
    });

    Room.on(RoomEvents.LEAVE, (player: PlayerState) => {
      //
      console.log("Player left", player);
    });

    Room.on(RoomEvents.BEFORE_PATCH, (state) => {
      //
      this.beforePatch();
    });

    Room.on(RoomEvents.DISPOSE, () => {
      //
      console.log("Disposing");
    });
  }

  async init(opts: ServerSpaceParams) {
    //
    const { gameData } = opts;

    this.serverApi = new ServerApi();

    console.log("Loading game", Object.keys(gameData.components));
  }

  beforePatch() {
    //
    Room.postMessage(SpaceEvents.ENTITY_STATE, {});
  }
}

import type { RoomState } from "../../schema/RoomState";
import type { PlayerState } from "../../schema/PlayerState";
import * as ethers from "ethers";
import { exitGame, loadGame } from "../loadGame";
import { ServerApi } from "./ServerApi";
import { Callback, Room } from "./RoomProxy";
import { RoomEvents, SpaceEvents } from "./types";
// @ts-ignore
import { Web3Api, LocalProvider } from "@oogg/server-engine";

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
    Room.once(
      RoomEvents.LOAD_SPACE,
      async (
        config: ServerSpaceParams,
        resolve: Callback,
        reject: Callback
      ) => {
        //
        try {
          await this.init(config);
          resolve({
            entities: this.serverApi._entitiesSchema,
          });
        } catch (err) {
          console.error("Error loading space", err);
          reject(err.message);
        }
      }
    );

    Room.on(RoomEvents.START_GAME, () => {
      //
      this.startGame();
    });

    Room.on(RoomEvents.STOP_GAME, () => {
      //
      this.stopGame();
    });

    Room.on(RoomEvents.JOIN, (player: PlayerState) => {
      //
      this.onJoin(player);
    });

    Room.on(RoomEvents.LEAVE, (player: PlayerState) => {
      //
      this.onLeave(player);
    });

    Room.on(RoomEvents.BEFORE_PATCH, (_, resolve, reject) => {
      //
      try {
        const state = this.onBeforePatch();
        resolve(state);
      } catch (err) {
        //
        reject(err.message);
      }
    });

    Room.on(RoomEvents.DISPOSE, () => {
      //
      this.dispose();
    });
  }

  private canLoadComponent(component: any) {
    // this is a little hacky, should be moved to the engine
    // But since this still can change often, keeping it here
    // so that we can make quick changes
    return (
      component.type === "prefab" ||
      component.type === "script" ||
      component.type === "model" ||
      component.type === "group" ||
      // This will be handled by the engine by checking
      // either (deprecate) "use server" or config.server == true
      component.type?.startsWith("script") ||
      component.collider?.enabled ||
      component.type === "spawn"
    );
  }

  async init(opts: ServerSpaceParams) {
    //
    const { gameData } = opts;

    this.serverApi = new ServerApi();

    const secrets = gameData.components.multiplayer?.secrets;

    secrets?.forEach((secret) => {
      process.env[secret.key] = secret.value;
    });

    const res = await loadGame(gameData, {
      debugPhysics: opts.debugPhysics ?? true,
      serverApi: {
        GameServer: this.serverApi,
        Web3: new Web3Api({
          web3provider: new LocalProvider({
            privateKey: process.env.PRIVATE_KEY,
            alchemyKey: process.env.ALCHEMY_KEY,
          }),
        }),
      },
      serverLibs: {
        ethers,
      },
      isDraft: opts.isDraft ?? true,
      filter: (component: any) => {
        // console.log("Component", component.id, component.name);
        return this.canLoadComponent(component);
      },
    });

    this.engine = res.engine;

    this.playerManager = res.players;

    this.space = this.engine.getCurrentSpace();

    // this.coins = coins;
    this.space.physics.active = true;
    this.space.physics.update(1 / 60);
    this.time = Date.now() / 1000;
    this.iv = setInterval(() => {
      const now = Date.now() / 1000;
      let dt = now - this.time;
      this.time = now;
      this.update(dt);
    }, 1000 / 60);

    Room.on(
      RoomEvents.RPC_REQUEST,
      async ({ request, sessionId }, resolve, reject) => {
        //
        try {
          const { id, method, args } = request;

          const instance = this._getRpcRecipient(id);

          if (instance == null) {
            throw new Error("Instance not found " + id);
          }

          if (typeof instance.$$dispatchRpc !== "function") {
            throw new Error("Rpc method not found");
          }
          const value = await instance.$$dispatchRpc(
            method,
            args.concat(sessionId)
          );

          resolve(value);

          //
        } catch (err) {
          //
          // console.error("Error", err);
          reject(err.message);
        }
      }
    );
  }

  private _getRpcRecipient(rpcId: string) {
    //
    return this.space.components.find((c) => {
      return c._rpcId === rpcId;
    });
  }

  startGame() {
    //
    this.space.start();
  }

  stopGame() {
    //
    this.space.stop();
  }

  async onJoin(player: PlayerState) {
    //
    if (this.space == null) {
      console.error("Space not loaded!");
      return;
    }

    const p = this.playerManager.addPlayer(player, {
      collision: true,
    });

    await p.avatarReady;

    console.log(
      "Remote Avatar created",
      // avatar.behaviors.map((b) => b.name),
      p.avatar.getDimensions()
    );
  }

  _netstateCache = new WeakMap<{ version: number; state: any }>();

  onBeforePatch() {
    //
    const entities = this.serverApi._entitiesSchema;

    let state = {
      players: {},
      entities: {},
    };

    Object.keys(entities).forEach((entity) => {
      //
      const cs = this.space.components.byType(entity);

      cs.forEach((c) => {
        //
        let current = c.data.netState;

        if (current) {
          //
          let cached = this._netstateCache.get(c);

          if (cached == null) {
            cached = {
              version: 0,
              state: undefined,
              rpcId: c._rpcId,
            };
            this._netstateCache.set(c, cached);
          }

          if (cached.state !== current) {
            cached.state = current;
            cached.version++;
          } else {
            return;
          }
          state.entities[entity] ??= [];
          state.entities[entity].push(cached);
        }
      });
    });

    Object.keys(this.playerManager.players).forEach((sessionId) => {
      //
      const player = this.playerManager.players[sessionId];

      state.players[sessionId] = player.data;
    });

    return state;
  }

  onLeave(player: PlayerState) {
    //
    this.playerManager.removePlayer(player.sessionId);
  }

  private _accumulatedTime = 0;

  update(dt: number) {
    //
    let now = Date.now() / 1000;

    this.engine.notify(this.engine.Events.PRE_UPDATE, this.dt, now);

    this._accumulatedTime += dt;

    while (this._accumulatedTime >= this.dt) {
      //
      this.engine.notify(this.engine.Events.FIXED_UPDATE, this.dt, now);

      this.space.physics.updateFixed(this.dt);

      this._accumulatedTime -= this.dt;

      now += this.dt;
    }
  }

  dispose() {
    //
    this.stopGame();

    clearInterval(this.iv);

    exitGame();
  }
}

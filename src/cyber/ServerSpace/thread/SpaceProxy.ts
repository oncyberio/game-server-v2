import { EventEmitter } from "events";
import type { Worker } from "worker_threads";
import { RoomEvent, RoomEvents, SpaceEvent, SpaceEvents } from "./types";
import { GameSession } from "../../abstract/GameSession";
import { PlayerData } from "../../abstract/types";

export class SpaceProxy {
  //

  private session: GameSession;

  private _emitter = new EventEmitter();

  constructor(public port: Worker) {
    //
    port.on("message", (message: any) => {
      this._emitter.emit(message.type, message.message);
    });
  }

  postMessage(type: RoomEvent, message: any, msgId?: string) {
    //
    this.port.postMessage({ type, message, msgId });
  }

  on(type: SpaceEvent, cb: (message: any) => void): () => void {
    //
    this._emitter.on(type, cb);

    return () => {
      this._emitter.off(type, cb);
    };
  }

  once(type: SpaceEvent, cb: (message: any) => void): () => void {
    //
    this._emitter.once(type, cb);

    return () => {
      this._emitter.off(type, cb);
    };
  }

  call(type: RoomEvent, message: any): Promise<any> {
    //
    return new Promise((resolve, reject) => {
      //
      const msgId = Math.random().toString();

      this._emitter.once(msgId, (message: any) => {
        if (message.success) {
          resolve(message.value);
        } else {
          reject(new Error(message.error));
        }
      });

      this.postMessage(type, message, msgId);
    });
  }

  _nbLogs = 0;

  log(...args: any[]) {
    //
    this._nbLogs++;
    if (this._nbLogs > 50) return;
    console.log(...args);
  }

  _versionedEntities: Record<string, boolean> = {};

  async init(opts: {
    session: GameSession;
    debugPhysics?: boolean;
    isDraft?: boolean;
  }) {
    //
    this.session = opts.session;

    const res = await this.call(RoomEvents.LOAD_SPACE, {
      gameData: this.session.gameData,
      debugPhysics: opts.debugPhysics,
      isDraft: opts.isDraft,
    });

    this._registerEntities(res.entities);

    this._initRpc();

    this.on(SpaceEvents.SEND, ({ type, data, sessionId }) => {
      //
      this.session.ctx.sendMsg(type, data, sessionId);
    });

    this.on(SpaceEvents.BROADCAST, ({ type, data, exclude }) => {
      //
      this.session.ctx.broadcastMsg(type, data, { except: exclude });
    });
  }

  private _initRpc() {
    //
    this.session.onRpc("@@engine", async (request, reply, sessionId) => {
      //
      try {
        //
        let value = await this.call(RoomEvents.RPC_REQUEST, {
          request,
          sessionId,
        });

        reply({ value });
        //
      } catch (err) {
        //
        // console.error("Error", err);

        reply({ error: err.message });
      }
    });
  }

  private _registerEntities(entities) {
    //
    Object.keys(entities).forEach((key) => {
      let schema = entities[key];
      this.session.Schema.$$registerEntity(key, schema);
      if (typeof schema === "object" && schema.type === "object") {
        this._versionedEntities[key] = true;
      }
    });
  }

  async sync({ state, params }) {
    //
    this.postMessage(RoomEvents.SYNC, { state, params });

    return new Promise<void>((resolve) => {
      this.once(SpaceEvents.READY, resolve);
    });
  }

  startGame() {
    //
    this.postMessage(RoomEvents.START_GAME, null);
  }

  stopGame() {
    //
    this.postMessage(RoomEvents.STOP_GAME, null);
  }

  onJoin(player: PlayerData) {
    //
    this.postMessage(RoomEvents.JOIN, player);
  }

  onLeave(player: PlayerData) {
    //
    this.postMessage(RoomEvents.LEAVE, player);
  }

  async onBeforePatch(state) {
    //
    const res = await this.call(RoomEvents.BEFORE_PATCH, state);
    this._patchEntities(res.entities);
    this._patchPlayers(res.players);
  }

  private _patchPlayers(players) {
    //
    const state = this.session.state;
    Object.keys(players).forEach((sessionId) => {
      let player = state.players[sessionId];
      if (player == null) return;
      player.update(players[sessionId]);
    });
  }

  private _patchEntities(entities) {
    //
    const state = this.session.state;

    Object.keys(entities).forEach((entity) => {
      //
      const isVersioned = this._versionedEntities[entity];

      const es = entities[entity];
      es.forEach((e) => {
        if (isVersioned) {
          e.state._netVersion = e.version;
        }
        state.$$setEntityData(entity, e.rpcId, e.state);
      });
    });
  }

  onPlayerState(player: PlayerData) {
    //
    this.postMessage(RoomEvents.PLAYER_STATE, player);
  }

  onMessage(type, message, playerId) {
    //
    this.postMessage(RoomEvents.MESSAGE, { type, message, playerId });
  }

  dispose() {
    //
    console.log("terminating process");
    this.port.terminate();
  }
}

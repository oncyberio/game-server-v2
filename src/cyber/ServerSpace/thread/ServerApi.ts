import { Room } from "./RoomProxy";
import { EventEmitter } from "events";
import type { PlayerData } from "../../abstract/types";
import type { RoomParams } from "../../abstract/GameSession";
import { RoomEvents, SpaceEvents } from "./types";

export class ServerApi {
  //
  _entitiesSchema: Record<string, any> = {};

  private _emitter = new EventEmitter();

  private _state: any;

  private _roomParams: RoomParams;

  constructor() {
    //
    // temporary hack to allow registering entities from server-side
    globalThis.$$registerEntity = (entity: string, schema: any) => {
      //
      this._entitiesSchema[entity] = schema;
    };

    Room.on(RoomEvents.SYNC, (config: { params: RoomParams; state: any }) => {
      //
      this._state = config.state;
      this._state.players = {};
      this._roomParams = config.params;

      Room.postMessage(SpaceEvents.READY, {});
    });

    Room.on(RoomEvents.MESSAGE, (payload: any) => {
      //
      this._emitter.emit(payload.type, payload.message, payload.playerId);
    });

    Room.on(RoomEvents.JOIN, (player: PlayerData) => {
      //
      this._state.players[player.sessionId] = player;
    });

    Room.on(RoomEvents.LEAVE, (player: PlayerData) => {
      //
      delete this._state.players[player.sessionId];
    });

    Room.on(RoomEvents.PLAYER_STATE, (player: PlayerData) => {
      //
      // console.log("PLAYER_STATE", player);

      if (this._roomParams.authoritativePosition) {
        //
        delete player.position;
        delete player.rotation;
      }

      Object.assign(this._state.players[player.sessionId], player);
    });
  }

  disconnectPlayer(playerId: string) {
    //
    Room.postMessage(SpaceEvents.DISCONNECT, playerId);
  }

  onJoin(cb: (player: PlayerData) => void) {
    //
    return Room.on(RoomEvents.JOIN, cb);
  }

  onLeave(cb: (player: PlayerData) => void) {
    //
    return Room.on(RoomEvents.LEAVE, cb);
  }

  get state() {
    return this._state;
  }

  send(type: string | number, message: any, playerId: string) {
    Room.send(type, message, playerId);
  }

  broadcast(type: string | number, message: any, exclude?: string[]) {
    Room.broadcast(type, message, exclude);
  }

  onMessage(
    type: string,
    cb: (message: any, playerId: string) => void
  ): () => void {
    //
    this._emitter.on(type, cb);

    return () => {
      this._emitter.off(type, cb);
    };
  }
}

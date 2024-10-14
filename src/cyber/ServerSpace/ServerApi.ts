import { loadGame } from "./loadGame";
import { Schema, Reflection, Iterator } from "@colyseus/schema";
import { SchemaSerializer } from "@colyseus/core";
import { GameSession, EVENTS } from "../abstract/GameSession";
import { PlayerData } from "../abstract/types";

export class ServerApi {
  //
  constructor(private _session: GameSession) {
    //

    // temporary hack to allow registering entities from server-side
    globalThis.$$registerEntity = (entity: string, state: any) => {
      //
      this._session.Schema.$$registerEntity(entity, state);
    };
  }

  disconnectPlayer(playerId: string) {
    //
    this._session.disconnectPlayer(playerId);
  }

  onJoin(cb: (player: PlayerData) => void) {
    //
    this._session.on(EVENTS.join, cb);
  }

  onLeave(cb: (player: PlayerData) => void) {
    //
    this._session.on(EVENTS.leave, cb);
  }

  get state() {
    return this._session.state;
  }

  send(type: string | number, message: any, playerId: string) {
    this._session.ctx.sendMsg(type, message, playerId);
  }

  broadcast(type: string | number, message: any, exclude?: string[]) {
    this._session.ctx.broadcastMsg(type, message, { except: exclude });
  }

  onMessage(
    type: string,
    cb: (message: any, playerId: string) => void
  ): () => void {
    return this._session.ctx.onMsg(type, cb);
  }
}

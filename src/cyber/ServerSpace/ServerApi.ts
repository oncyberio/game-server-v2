import { EventEmitter } from "events";
import { loadGame } from "./loadGame";
import { Schema, Reflection, Iterator } from "@colyseus/schema";
import { SchemaSerializer } from "@colyseus/core";
import { GameSession } from "../abstract/GameSession";

export class ServerApi {
  //
  private _emitter = new EventEmitter();

  constructor(private _session: GameSession) {
    globalThis.$server = this;
    //
    // const serializer = (this._session as any).ctx
    //   ._serializer as SchemaSerializer<any>;
    // const serverState = this._session.state.$$cInst;
    // const handshake = serializer.handshake();
    // this._cState = Reflection.decode(handshake);
    // const rawState = serverState.encodeAll(false);
    // this._cState.decode(rawState);
    // const origEncode = this._cState.encode;
    // this._cState.encode = (encodeAll, bytes, useFilters) => {
    //   //
    //   if (encodeAll) {
    //     //
    //     return origEncode.call(this._cState, encodeAll, bytes, useFilters);
    //   }
    //   if (this._session.state.snapshotId !== this._lastSnapshot) {
    //     this._lastSnapshot = this._session.state.snapshotId;
    //     this._lastPatch = origEncode.call(
    //       this._cState,
    //       true,
    //       bytes,
    //       useFilters
    //     );
    //   }
    //   return this._lastPatch;
    // };
  }

  on(event: string, cb: (...args: any[]) => void) {
    this._emitter.on(event, cb);

    return () => {
      this.off(event, cb);
    };
  }

  off(event: string, cb: (...args: any[]) => void) {
    this._emitter.off(event, cb);
  }

  get state() {
    return this._session.state;
  }

  send(message: any, playerId?: string) {
    this._session.send(message, playerId);
  }

  broadcast(message: any, exclude?: string[]) {
    this._session.broadcast(message, exclude);
  }

  $$register(entity: string, state: any) {
    //
    this._session.Schema.$$registerEntity(entity, state);
  }
}

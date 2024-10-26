import { GameSession } from "../../abstract/GameSession";
import { PlayerData } from "../../abstract/types";
import { ServerSpace } from "./ServerSpace";
import { ServerHandler } from "./ServerApi";

export class SpaceProxy {
  //
  private session: GameSession;

  private serverSpace = new ServerSpace();

  constructor() {}

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

    const serverHandler: ServerHandler = {
      broadcast: (type, message, exclude) => {
        this.session.ctx.broadcastMsg(type, message, { except: exclude });
      },
      disconnectPlayer: (playerId) => {
        this.session.ctx.disconnectPlayer(playerId);
      },
      send: (type, message, playerId) => {
        this.session.ctx.sendMsg(type, message, playerId);
      },
    };

    const res = await this.serverSpace.init({
      gameData: this.session.gameData,
      debugPhysics: opts.debugPhysics,
      isDraft: opts.isDraft,
      serverHandler,
    });

    this._registerEntities(res.entities);

    this._initRpc();
  }

  private _initRpc() {
    //
    this.session.onRpc("@@engine", async (request, reply, sessionId) => {
      //
      try {
        //
        let value = await this.serverSpace.handleRpcRequest(
          {
            request,
            sessionId,
          },
          (value) => {
            reply({ value });
          },
          (error) => {
            reply({ error });
          }
        );

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
    this.serverSpace.serverApi._roomSync({ state, params });
  }

  startGame() {
    //
    this.serverSpace.startGame();
  }

  stopGame() {
    //
    this.serverSpace.stopGame();
  }

  onJoin(player: PlayerData) {
    //
    this.serverSpace.onJoin(player);
  }

  onLeave(player: PlayerData) {
    //
    this.serverSpace.onLeave(player);
  }

  onBeforePatch() {
    //
    const res = this.serverSpace.onBeforePatch();
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
    this.serverSpace.serverApi._roomPlayerState(player);
  }

  onMessage(type, message, playerId) {
    //
    this.serverSpace.serverApi._roomMsg({ type, message, playerId });
  }

  dispose() {
    //
    this.serverSpace.dispose();
  }
}

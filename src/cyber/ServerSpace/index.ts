import { loadGame } from "./loadGame";
import { GameSession } from "../abstract/GameSession";
import { RoomState } from "../schema/RoomState";
import { PlayerState } from "../schema/PlayerState";
import { ServerApi } from "./ServerApi";

const USE_SERVER_REGEX = /^\s*"use server"/;
export class ServerSpace {
  //
  session: GameSession = null;
  engine = null;
  playerManager = null;
  space = null;
  // avatar = null;
  // coins = null;
  // coinModel = null;

  state: RoomState = null;

  serverApi = null;

  dt = 1 / 60;
  iv = null;
  time = 0;

  private getServerScripts(gameData: any) {
    const serverScripts = {};

    Object.values(gameData.components).forEach((c: any) => {
      //
      if (c.type.startsWith("script")) {
        serverScripts[c.id] = USE_SERVER_REGEX.test(c.emit?.code);
      }
    });
    return serverScripts;
  }

  private canLoadComponent(
    component: any,
    serverScripts: Record<string, boolean>
  ) {
    //
    if (component.type === "prefab") {
      return true;
    }

    if (component.type == "script") {
      return serverScripts[component.id];
    }

    if (component.type.startsWith("script")) {
      return serverScripts[component.type];
    }

    return (
      component.type === "group" ||
      component.collider?.enabled ||
      component.type === "spawn"
    );
  }

  async init(opts: {
    session: GameSession;
    debugPhysics?: boolean;
    isDraft?: boolean;
  }) {
    //
    this.session = opts.session;

    this.serverApi = new ServerApi(this.session);

    const gameData = this.session.gameData;

    const serverScripts = this.getServerScripts(gameData);

    const res = await loadGame(gameData, {
      debugPhysics: opts.debugPhysics ?? true,
      serverApi: {
        GameServer: this.serverApi,
      },
      isDraft: opts.isDraft ?? true,
      filter: (component: any) => {
        // console.log("Component", component.id, component.name);
        return this.canLoadComponent(component, serverScripts);
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

    this.session.onRpc("@@engine", async (request, reply, sessionId) => {
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
        const data = await instance.$$dispatchRpc(
          method,
          args.concat(sessionId)
        );

        reply({ value: data });
        //
      } catch (err) {
        //
        console.error("Error", err);

        reply({ error: err.message });
      }
    });
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

  onBeforePatch() {
    //
    const state = this.session.state;

    const entities = state.$$registeredEntities;

    if (!entities?.length) return;

    entities.forEach((entity) => {
      //
      const cs = this.space.components.byType(entity);

      cs.forEach((c) => {
        //
        if (c.data.netState) {
          //
          // console.log("Setting entity data", c.data.netState);
          state.$$setEntityData(entity, c._rpcId, c.data.netState);
        }
      });
    });
  }

  _onAfterPatch(bytes) {
    //
    this.serverApi._onAfterPatch(bytes);
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
  }
}

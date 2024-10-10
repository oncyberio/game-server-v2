import type { GameSession, PlayerState } from "../cyber";
import { PlayerStatePayload } from "../cyber/abstract/types";
import { CoinState, GameState } from "./GameState";
import { loadGame } from "./loadGame";

const USE_SERVER_REGEX = /^\s*"use server"/;
export class ServerSpace {
  //
  session: GameSession = null;
  engine = null;
  playerManager = null;
  space = null;
  // avatar = null;
  coins = null;
  coinModel = null;
  state: GameState = null;

  avatars: Record<string, any> = {};
  controls: Record<string, any> = {};

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

  private getServerApi() {
    return {
      addRpcHandler: (id: string, handler: (data: any) => any) => {
        return this.session.onRpc(id, handler);
      },
    };
  }

  async init(opts: { session: GameSession }) {
    //
    this.session = opts.session;

    this.state = opts.session.state as GameState;

    const gameData = this.session.gameData;

    const serverScripts = this.getServerScripts(gameData);

    const res = await loadGame(gameData, {
      debugPhysics: true,
      serverApi: this.getServerApi(),
      filter: (component: any) => {
        // console.log("Component", component.id, component.name);
        return this.canLoadComponent(component, serverScripts);
      },
    });

    this.engine = res.engine;

    this.playerManager = res.players;

    this.space = this.engine.getCurrentSpace();

    this.coinModel = this.space.components.byId("coin");

    // const playerModel = this.space.components.byId("playerModel");

    /*
    console.log("Coin model", this.coinModel.getDimensions());
    console.log(
      "Player model",
      playerModel.getDimensions(),
      playerModel.behaviors.map((b) => b.name)
    );
    */
    const coins = await this.spawnCoins(10);

    this.space = this.engine.getCurrentSpace();
    // this.avatar = playerModel;

    this.coins = coins;
    this.space.physics.active = true;
    this.space.physics.update(1 / 60);
    this.time = Date.now() / 1000;
    this.iv = setInterval(() => {
      const now = Date.now() / 1000;
      let dt = now - this.time;
      this.time = now;
      this.update(dt);
    }, 1000 / 60);

    this.session.onRpc("debugPhysics", (_, reply) => {
      reply(this.getPhysicsDebug());
    });

    this.session.onRpc("ccLogs", (request, reply) => {
      return reply(this.getLogs(request.sessionId));
    });

    this.session.onRpc("@@engine", async (request, reply) => {
      //
      try {
        const { id, method, args } = request;

        const instance = this._getRpcRecipient(id);

        if (instance == null) {
          throw new Error("Instance not found");
        }

        if (typeof instance.$$dispatchRpc !== "function") {
          throw new Error("Rpc method not found");
        }
        const data = await instance.$$dispatchRpc(method, args);

        console.log("Rpc", method, args, data);

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

  spawnCoins(nb: number) {
    let promises = [];
    for (let i = 0; i < nb; i++) {
      const coin = new CoinState();
      coin.id = Math.random().toString();
      coin.position.x = Math.random() * 100 - 5;
      coin.position.y = 0.5;
      coin.position.z = Math.random() * 100 - 5;
      this.state.coins.set(coin.id, coin);
      //
      promises.push(this._addCoin(coin.id, coin));
    }

    return Promise.all(promises);
  }

  async _addCoin(id, val) {
    const inst = await this.coinModel.duplicate();
    inst.position.copy(val.position);
    inst.rotation.y = val.rotation.y;
    inst.visible = true;
    inst.userData.coinId = id;
    return inst;
  }

  _startPos = { x: -107.53, y: 0.0, z: 225.37 };
  _startRot = { x: 0, y: (-53.28 * Math.PI) / 180, z: 0 };
  // _startPos = { x: 0, y: 0, z: 0 };
  // _startRot = { x: 0, y: 0, z: 0 };
  async onJoin(player: PlayerState) {
    //
    if (this.space == null) {
      console.error("Space not loaded!");
      return;
    }

    player.position.copy(this._startPos);

    player.rotation.copy(this._startRot);

    const p = this.playerManager.addPlayer(player, {
      collision: true,
    });

    await p.avatarReady;

    const avatar = p.avatar;

    console.log(
      "Remote Avatar created",
      // avatar.behaviors.map((b) => b.name),
      avatar.getDimensions()
    );

    if (player.connected === false) {
      console.log(
        "Player left before avatar creattion, disposing...",
        player.sessionId
      );

      this.playerManager.removePlayer(player.sessionId);
    }

    const control = avatar.behaviors[0];
    this.controls[player.sessionId] = control;

    console.log(
      "controls added",
      player.sessionId,
      avatar._rpcId,
      control._rpcId
    );

    this.avatars[player.sessionId] = avatar;
  }

  onLeave(player: PlayerState) {
    //
    const avatar = this.avatars[player.sessionId];

    if (avatar) {
      avatar.destroy();
      delete this.avatars[player.sessionId];
      delete this.controls[player.sessionId];
    }
  }

  nbLogs = 0;

  _logVec3(v) {
    return [v.x.toFixed(2), v.y.toFixed(2), v.z.toFixed(2)].join(",");
  }

  vec3Close(v1, v2, tolerance = 0.1) {
    const diffx = Math.abs(v1.x - v2.x);
    const diffy = Math.abs(v1.y - v2.y);
    const diffz = Math.abs(v1.z - v2.z);

    const isSmall = diffx < tolerance && diffy < tolerance && diffz < tolerance;

    if (!isSmall && this.nbLogs < 5) {
      //  console.log("Diff", tolerance, diffx, diffy, diffz);
    }

    return isSmall;
  }

  _inputs: Record<string, any[]> = {};

  private _accumulatedTime = 0;

  update(dt: number) {
    //
    let now = Date.now() / 1000;

    this._accumulatedTime += dt;

    while (this._accumulatedTime >= this.dt) {
      //
      this.engine.notify(this.engine.Events.FIXED_UPDATE, this.dt, now);

      this.space.physics.updateFixed(this.dt);

      this._accumulatedTime -= this.dt;

      now += this.dt;
    }
  }

  _frame = 0;

  /*
  setInputs() {
    //
    for (let sessionId in this.controls) {
      const playerControl = this.controls[sessionId];
      const avatar = this.avatars[sessionId];
      const player = this.state.players.get(sessionId);

      if (playerControl == null || avatar == null || player == null) {
        // console.error("Control not found", sessionId);
        continue;
      }

      const inputs = this._inputs[sessionId];

      if (inputs == null || inputs.length == 0) {
        continue;
      }
      const nextInput = inputs.shift();
      // simulate server mismatch
      let isMoving = nextInput[1];

      const seqId = nextInput[0];
      playerControl.setInput(nextInput);
      playerControl.step(this.dt);
      player.lastInputSeq = seqId;

      if (isMoving) {
        // console.log("Moving", seqId, inputs);
        // avatar.position.x += Math.random() * 0.01 - 0.005;
        // avatar.rigidBody.position = avatar.position;
      }
      // if (this._frame < 10) {
      //   this._frame++;
      //   console.log("Input processed", seqId);
      // }
    }

    this.updateServerPositions();
  }
  */

  /*
  updateServerPositions() {
    //
    for (let sessionId in this.avatars) {
      const avatar = this.avatars[sessionId];
      const player = this.state.players.get(sessionId);
      const controls = this.controls[sessionId];

      if (avatar == null || player == null) {
        console.error("Avatar not found", sessionId);
        continue;
      }

      player.serverPos.copy(avatar.position);
      player.serverRot.copy(avatar.rotation);
      player.lastInputSeq = controls._seqId;
    }
  }
    */

  /*
  onPlayerInput(player: PlayerState, input) {
    //
    const controls = this.controls[player.sessionId];

    if (controls == null) {
      console.error("Controls not found", player.sessionId);
      return;
    }

    controls.server_onInput(input);
  }
  */

  // playerInputs: Record<string, any[]> = {};

  onPlayerPayload(player: PlayerState, payload: PlayerStatePayload) {
    //
    player.update(payload);
  }

  /*
  processInputs(player, inputs: any[]) {
    // console.log("validatePosition", player.sessionId, inputs);
    const playerControl = this.controls[player.sessionId];
    const avatar = this.avatars[player.sessionId];

    if (playerControl == null) {
      console.error("Player control not found", player.sessionId);
      return;
    }

    for (let i = 0; i < inputs.length; i++) {
      const input = inputs[i];
      playerControl.setInput(input);
      playerControl.step(this.dt);
      this.space.physics.world.timestep = this.dt;
      this.space.physics.world.step();
    }

    // if diff between server and client pos is < 0.1, set server pos to client pos
    // let isSmall = this.vec3Close(
    //   avatar.rigidBody.position,
    //   player.position,
    //   0.1 * Math.max(inputs.length, 1)
    // );

    // if (true) {
    //   avatar.rigidBody.position.copy(player.position);
    //   avatar.position.copy(player.position);
    //   avatar.rotation.y = player.rotation.y;
    //   avatar.rigidBody.quaternion.copy(avatar.quaternion);
    // } else {
    //   if (this.nbLogs < 5) {
    //     this.nbLogs++;
    //     console.log(
    //       "Position diff",
    //       inputs.length,
    //       this._logVec3(avatar.rigidBody.position),
    //       this._logVec3(player.position)
    //     );
    //   }
    // }

    player.serverPos.copy(avatar.position);
    player.serverRot.copy(avatar.rotation);

    // same for rotation
    // isSmall = avatar.rotation.y - player.rotation.y < 0.1;
    // if (isSmall) {
    //   avatar.rotation.y = player.rotation.y;
    //   avatar.rigidBody.quaternion.copy(avatar.quaternion);
    // }
  }
    */

  getLogs(sessionId) {
    //
    const control = this.controls[sessionId];
    if (control == null) {
      return [];
    }

    return control._logs;
  }

  getPhysicsDebug() {
    this.space.physics.updateDebug();
    const data = this.space.physics.debugLines.toJSON();
    return data;
  }

  dispose() {
    //
    clearInterval(this.iv);
  }
}

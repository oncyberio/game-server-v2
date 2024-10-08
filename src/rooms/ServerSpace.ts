import { PlayerState } from "../cyber";
import { PlayerStatePayload } from "../cyber/abstract/types";
import { CoinState, GameState } from "./GameState";
import { loadGame } from "./loadGame";

export class ServerSpace {
  engine = null;
  space = null;
  avatar = null;
  coins = null;
  coinModel = null;
  state: GameState = null;
  avatars: Record<string, any> = {};
  controls: Record<string, any> = {};

  dt = 1 / 60;
  iv = null;
  time = 0;

  async init(gameId, state) {
    //
    this.state = state;

    await new Promise((resolve) => setTimeout(resolve, 1000));

    this.engine = await loadGame(gameId, {
      debugPhysics: true,
      filter: (component: any) => {
        // console.log("Component", component.id, component.name);
        return (
          component.collider?.enabled ||
          component.script?.identifier === "coin" ||
          component.name == "PlayerControls" ||
          component.name == "Controls"
        );
      },
    });

    this.engine.notify(this.engine.Events.GAME_READY);

    this.space = this.engine.getCurrentSpace();

    this.coinModel = this.space.components.byId("coin");

    const playerModel = this.space.components.byId("playerModel");

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
    this.avatar = playerModel;
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

    // player.position.x += Math.random() * 10;

    const data = {
      position: {
        x: player.position.x,
        y: player.position.y,
        z: player.position.z,
      },
      rotation: {
        x: player.rotation.x,
        y: player.rotation.y,
        z: player.rotation.z,
      },
    };

    const avatar = await this.avatar.duplicate({
      overrideOpts: data,
    });

    // avatar.collider.raw.setSensor(true);

    console.log(
      "Avatar created",
      avatar.behaviors.map((b) => b.name)
    );

    if (player.connected === false) {
      console.log(
        "Player left before avatar creattion, disposing...",
        player.sessionId
      );
      avatar.destroy();
      return;
    }

    console.log(
      "behs",
      avatar.behaviors.map((b) => b.tag)
    );
    const control = avatar.behaviors[0];

    this.controls[player.sessionId] = control;

    console.log(
      "controls added",
      player.sessionId,
      control._dirTarget.type,
      avatar.rigidBody.position
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
      this.setInputs();

      // this.space.physics.world.timestep = this.dt;
      // this.space.physics.world.step();
      this.engine.notify(this.engine.Events.FIXED_UPDATE, this.dt, now);

      this.space.physics.updateFixed(this.dt);

      this._accumulatedTime -= this.dt;

      now += this.dt;
    }
    // this.space.physics.update(dt, Date.now() / 1000);
  }

  _frame = 0;

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

    for (let sessionId in this.avatars) {
      const avatar = this.avatars[sessionId];
      const player = this.state.players.get(sessionId);

      if (avatar == null || player == null) {
        console.error("Avatar not found", sessionId);
        continue;
      }

      player.serverPos.copy(avatar.position);
      player.serverRot.copy(avatar.rotation);
    }
  }

  limit = 0;

  onPlayerInput(player: PlayerState, input) {
    //
    if (this.limit < 10) {
      // console.log("Input received", player.sessionId, input);
      this.limit++;
    }
    if (this._inputs[player.sessionId] == null) {
      this._inputs[player.sessionId] = [];
    }

    this._inputs[player.sessionId].push(input);
  }

  // playerInputs: Record<string, any[]> = {};

  onPlayerPayload(player: PlayerState, payload: PlayerStatePayload) {
    //
    player.update(payload);

    if (payload.input) {
      // this.processInputs(player, payload.input);
    }
  }

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

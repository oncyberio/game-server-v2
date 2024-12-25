import { Room, Client, logger, SchemaSerializer } from "@colyseus/core";
import { DefaultCyberGame } from "./DefaultCyberGame";
import { ScriptFactory } from "../cyber/scripting";

const defaults = {
  PATCH_RATE: 1000 / 20,
  TICK_RATE: 1000 / 30,
  MAX_PLAYERS: 200,
};

const isSingleton = process.env.SINGLE_ROOM === "true";
const EXIT_TIMEOUT = +process.env.ROOM_EXIT_TIMEOUT || 1000;

//
export class ColyseusGameRoom extends Room {
  //
  private _roomHandler: any;

  private _gameId: string;

  private _gameData: any;

  private _logger = logger;

  private _uroomid: string;

  // tickRate = this._room.tickRate ?? defaults.TICK_RATE;

  constructor(...args) {
    super(...args);

    // this.setSimulationInterval(() => {
    //     this._room._CALLBACKS_.tick();
    // }, this.tickRate);

    this._uroomid = Math.random().toString(36).substring(2, 7);
  }

  private _setRoomHandler(handler: any) {
    //
    this._roomHandler = handler;

    const patchRate = +this._roomHandler.patchRate || 20; // 20 fps

    this.setPatchRate(1000 / patchRate); // colyseus uses ms

    // const state = this._roomHandler.state;

    // if (!state?.$$cInst) {
    //   //
    //   throw new Error("Invalid state");
    // }

    this.maxClients = Math.min(
      +this._roomHandler.maxPlayers || defaults.MAX_PLAYERS,
      defaults.MAX_PLAYERS
    );
  }

  get gameId() {
    return this._gameId;
  }

  get gameData() {
    return this._gameData;
  }

  get nbConnected() {
    return this.clients.length;
  }

  getClient(sessionId: string) {
    const client = this.clients.getById(sessionId);

    if (!client) {
      throw new Error(`Client ${sessionId} not found`);
    }
    return client;
  }

  sendMsg(type: any, msg: any, sessionId: string) {
    try {
      this.getClient(sessionId)?.send(type, msg);
    } catch (err) {
      console.error("error sending message", this._uroomid, msg);
      throw err;
    }
  }

  broadcastMsg(type: any, msg: any, opts: { except?: string[] } = {}) {
    let except = opts?.except?.map((id) => this.getClient(id)).filter(Boolean);
    this.broadcast(type, msg, { except });
  }

  onMsg(type: any, callback: (msg: any, sessionId: string) => void) {
    //
    return this.onMessage(type, (client, message) => {
      callback(message, client.sessionId);
    });
  }

  disconnectPlayer(sessionId: string, reason = 4000) {
    const client = this.clients.getById(sessionId);

    if (!client) {
      console.error(`Connection ${sessionId} not found`);

      return;
    }

    client.leave(reason);
  }

  async onCreate(opts: any) {
    try {
      if (!opts.gameId) {
        //
        throw new Error("Invalid request");
      }

      this._gameId =
        opts.gameId ?? "anon-" + Math.random().toString(36).substr(2, 9);

      this._gameData = opts.gameData;

      let roomHandlerClass = ScriptFactory.instance.init(opts.gameData);

      let roomHandler;

      if (roomHandlerClass == null) {
        //
        console.log("No room handler found, using default");

        roomHandler = new DefaultCyberGame(this);
      } else {
        //
        console.log("Room handler found");

        roomHandler = new roomHandlerClass(this);
      }

      this._logger.info("Creating Room for game", this._gameId);

      process.on("unhandledRejection", (reason, promise) => {
        console.error("Unhandled Rejection at:", promise, "reason:", reason);
        // Application specific logging, throwing an error, or other logic here
      });

      process.on("uncaughtException", (err) => {
        console.error("Uncaught Exception thrown", err);
        // Application specific logging, throwing an error, or other logic here
      });

      await roomHandler._CALLBACKS_.create();

      if (this._disposed) return;

      this._setRoomHandler(roomHandler);

      this.setMetadata({
        gameId: this._gameId,
        name: opts.gameName ?? "-",
      });
      //
    } catch (err) {
      this._logger.error(err);
    }
  }

  /*
  static async onAuth(token: string, request: IncomingMessage) {
    try {
      return true;
    } catch (err) {
      //
      console.error(err);

      return false;
    }
  }
  */

  _nbLog = 0;

  log(...args: any[]) {
    if (this._nbLog++ < 50) {
      console.log(...args);
    }
  }

  onBeforePatch() {
    //
    this._roomHandler?._CALLBACKS_.beforePatch();
  }

  async onJoin(client: Client, options: any, auth: any) {
    // A websocket just connected!
    if (options?.userId == "debug") return;

    this._logger.info(
      "Connected:",
      `id: ${client.sessionId}`,
      `this.room: ${this._gameId}/${this.roomId}`
    );

    await this._roomHandler._CALLBACKS_.join({
      ...options,
      auth,
      id: client.sessionId,
    });
  }

  /*
  _serializerPatched = false;

  _patchSerializer() {
    //
    const fakeClient = {
      id: "fake",
      state: 1,
      raw: (bytes) => {
        //
        //console.log("raw", bytes, this._roomHandler?._CALLBACKS_);
        this._roomHandler?._CALLBACKS_.afterPatch(bytes.slice(1));
      },
    };

    const serializer = (this as any)._serializer as SchemaSerializer<any>;
    //
    serializer.applyPatches = function (clients: Client[]) {
      //
      return SchemaSerializer.prototype.applyPatches.call(
        this,
        clients.concat(fakeClient as any)
      );
    };

    this._serializerPatched = true;
  }

  _unpatchSerializer() {
    const serializer = (this as any)._serializer as SchemaSerializer<any>;
    delete serializer["applyPatches"];
    this._serializerPatched = false;
  }
    */

  async onLeave(client: Client, consented: boolean) {
    //
    try {
      //
      //
      this._logger.info("Disconnected: id", client.sessionId, consented);

      if (consented) {
        //
        throw new Error("Consented leave");
      }

      if (this.clients.length == 0) {
        throw new Error("No more clients");
      }

      const reconnectTimeout = this._roomHandler._CALLBACKS_.disconnect(
        client.sessionId
      );

      if (!reconnectTimeout) {
        console.error("No timeout, leaving");
        throw new Error("No timeout");
      }

      this._logger.info(
        "Client has disconnected, waiting for reconnection in ",
        reconnectTimeout / 1000,
        "seconds",
        client.sessionId
      );

      await this.allowReconnection(client, reconnectTimeout / 1000);

      if (this._disposed) return;

      this._logger.info("Client has reconnected", client.sessionId);

      this._roomHandler._CALLBACKS_.reconnect(client.sessionId);
    } catch (err) {
      //
      this._roomHandler._CALLBACKS_.leave(client.sessionId);

      if (this.clients.length === 0) {
        this._logger.info("No more connections, closing room");

        // this._room._CALLBACKS_.shutdown();
      }
    }
  }

  private _disposed = false;

  onDispose(): void | Promise<any> {
    //
    if (this._disposed) return;

    this._disposed = true;

    this._logger.info("Room disposed");

    this._roomHandler?._CALLBACKS_.shutdown();

    console.log(
      "Checking for idle room",
      this.clients.length,
      isSingleton,
      EXIT_TIMEOUT
    );

    // if no incoming connection in the next 1min, and this is
    // a single-room server, the exits the process, this will
    // automatically stop the machine
    setTimeout(() => {
      if (this.clients.length === 0 && isSingleton) {
        this._logger.info("Space is idle, exiting");
        process.exit(0);
      }
    }, EXIT_TIMEOUT);
  }
}

process.on("exit", (code) => {
  console.log(`About to exit with code: ${code}`);
});

import { Schema, type, MapSchema } from "@colyseus/schema";
import { PlayerState } from "./PlayerState";
import { GameTimer } from "./GameTimer";
import { EntityState, ExtSchema, register } from "./register";

export class ExtensibleSchema extends Schema {
  //
  static $$ext_entities: typeof ExtSchema;

  $$ext_entities: ExtSchema;

  constructor() {
    super();
    let extEntites = this.constructor["$$ext_entities"];
    if (extEntites) {
      this["$$ext_entities"] = new extEntites();
    }
  }

  static $$registerEntity(entityKey: string, state: EntityState) {
    //
    const self = this as any;

    if (self.$$ext_entities == null) {
      //
      self.$$ext_entities = class MyExtSchema extends ExtSchema {};

      type(self.$$ext_entities)(self.prototype, "$$ext_entities");
    }

    register(self.$$ext_entities, entityKey, state);
  }

  get $$registeredEntities() {
    return Object.keys(
      (this.constructor as any).$$ext_entities?.$$entities ?? {}
    );
  }

  $$setEntityData(entityKey: string, id: string, value: any) {
    //
    this["$$ext_entities"].$setEntityData(entityKey, id, value);
  }

  $$getEntity(entityKey: string, id: string) {
    //
    return this["$$ext_entities"].$getEntityData(entityKey, id);
  }
}

export class RoomSettings extends Schema {
  @type("number") reconnectTimeout = 0;
  @type("number") patchRate = 20;
  @type("number") tickRate = 20;
}

export class RoomState extends ExtensibleSchema {
  //
  @type("string") snapshotId: string = null;
  @type("number") timestamp: number = 0;
  @type("number") maxFrame: number = 0;
  @type({ map: PlayerState }) players = new MapSchema<PlayerState>();
  @type(RoomSettings) settings = new RoomSettings();

  addPlayer(data: any) {
    //
    const player = new PlayerState();
    player.sessionId = data.sessionId;
    player.userId = data.userId ?? "anon";
    player.name = data.name ?? "Anonymous";
    player.role = data.role ?? "player";
    player.position.assign(data.position ?? { x: 0, y: 0, z: 0 });
    player.rotation.assign(data.rotation ?? { x: 0, y: 0, z: 0 });
    player.animation = data.animation ?? "idle";
    player.text = data.text ?? "";

    player.connected = true;

    this.players.set(data.sessionId, player);
    // console.log("added player", player.toJSON());

    return player;
  }

  removePlayer(id: string) {
    const player = this.players.get(id);
    player.connected = false;
    this.players.delete(id);
  }
}

import { type, Schema, ArraySchema } from "@colyseus/schema";
import { PlayerRole, PlayerStatePayload } from "../abstract/types";
import { XYZState } from "./XYZ";

export class PlayerState extends Schema {
  //
  // synchronized
  @type("string") sessionId: string = "";
  @type("string") userId: string = "";
  @type("string") name: string = "";
  @type("string") role: PlayerRole = "player";
  @type("number") latency: number = 0;
  @type("number") jitter: number = 0;
  @type(XYZState) position: XYZState = new XYZState();
  @type(XYZState) rotation: XYZState = new XYZState();
  @type("string") animation: string = "idle";
  @type("string") vrmUrl: string = "";
  @type("number") scale: number = 1;
  @type("string") text: string = "";
  @type("string") plugins = "";
  @type("string") state: string = "";

  // transient
  connected: boolean = false;
  address: string = "";

  update(payload: PlayerStatePayload) {
    //
    this.position.assign(payload.position);
    this.rotation.assign(payload.rotation);
    this.animation = payload.animation;
    this.scale = payload.scale;
    this.vrmUrl = payload.vrmUrl;
    this.text = payload.text;
  }
}

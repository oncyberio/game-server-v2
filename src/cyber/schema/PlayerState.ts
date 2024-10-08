import { PlayerRole, PlayerStatePayload } from "../abstract/types";
import { State, P } from "./types";

export class PlayerState extends State {
  //
  // synchronized
  sessionId = P.String("");
  userId = P.String("");
  name: string = "";
  role: PlayerRole = P.String("player") as PlayerRole;
  latency = P.Number(0);
  jitter = P.Number(0);
  position = P.XYZ();
  rotation = P.XYZ();
  animation = P.String("idle");
  vrmUrl = P.String("");
  scale = P.Number(1);
  text = P.String("");
  plugins = P.Array(P.String());

  // transient
  connected: boolean = false;
  address: string = "";

  update(payload: PlayerStatePayload) {
    //
    this.position.copy(payload.position);
    this.rotation.copy(payload.rotation);
    this.animation = payload.animation;
    this.scale = payload.scale;
    this.vrmUrl = payload.vrmUrl;
    this.text = payload.text;
  }
}

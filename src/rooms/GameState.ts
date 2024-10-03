import { RoomState, P, State } from "../cyber";

export class CoinState extends State {
  id = P.String("");
  position = P.XYZ();
  rotation = P.XYZ();

  owner = P.String("");
}

export class GameState extends RoomState {
  coins = P.Map(CoinState);
  scores = P.Map(P.Number());

  addPlayer(data: any): void {
    const player = super.addPlayer(data);
    this.scores.set(player.sessionId, 0);
  }
}

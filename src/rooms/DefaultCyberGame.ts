import { GameSession } from "../cyber";
import { PlayerData, PlayerStatePayload } from "../cyber/abstract/types";
import { PlayerState } from "../cyber/schema/PlayerState";
import { RoomState } from "../cyber/schema/RoomState";
import { GameState } from "./GameState";
import { ServerSpace } from "./ServerSpace";

export class DefaultCyberGame extends GameSession<RoomState> {
  //
  maxPlayers = 500;

  // fps
  tickRate = 20;
  patchRate = 20;

  reconnectTimeout = 0;

  state = new GameState();

  serverSpace = new ServerSpace();

  iv: any;

  async onPreload() {
    console.log("Preloading...");
    await this.serverSpace.init({
      session: this,
    });
  }

  static onAuth(token: any, request: any): Promise<void> {
    console.log("Authenticating...", token);
    return Promise.resolve();
  }

  async onJoin(player) {
    console.log(player.sessionId, player.userId, "joined!");
    this.serverSpace.onJoin(player);
  }

  onLeave(player) {
    console.log(player.sessionId, player.userId, "left!");
    this.serverSpace.onLeave(player);
  }

  onMessage(message: any, player: PlayerState): void {
    // if (message.type === "input") {
    //   // console.log("Input received from", player.sessionId, message.input);
    //   this.serverSpace.onPlayerInput(player, message.input);
    // }
    //
    // console.log("Message received from", player.sessionId, message);
    // if (message.type === "collect") {
    //   //
    //   const coin = this.state.coins.get(message.coinId);
    //   if (coin.owner) {
    //     //
    //     console.error("Coin already collected by", coin.owner);
    //     return;
    //   }
    //   coin.owner = player.sessionId;
    //   // this.sendMint(player);
    // } else if (message.type == "declare-address") {
    //   // UNTRUSTED
    //   if (!message.address) return;
    //   player.address = message.address;
    // }
  }

  // async sendMint(player: PlayerState) {
  //   if (!player.address) return;

  //   const word = solidityPackedKeccak256(["string"], [crypto.randomUUID()]);

  //   const hashedMessage = solidityPackedKeccak256(
  //     ["address", "bytes32"],
  //     [player.address, word]
  //   );

  //   const { v, r, s } = Signature.from(
  //     await wallet.signMessage(getBytes(hashedMessage))
  //   );

  //   this.send(
  //     {
  //       type: "mint-opportunity",
  //       payload: {
  //         word,
  //         signature: { v, r, s },
  //       },
  //     },
  //     player.sessionId
  //   );
  // }

  onPlayerStateMsg(payload: PlayerStatePayload, player: PlayerState) {
    //
    this.serverSpace.onPlayerPayload(player, payload);
  }

  async startGame(countdown: number) {
    //
    await super.startGame(countdown);

    this.serverSpace.startGame();
  }

  stopGame() {
    //
    super.stopGame();

    this.serverSpace.stopGame();
  }

  // onUpdate(dt: number): void {
  //   console.log("updating...");
  //   this.state.players.forEach((player) => {
  //     //
  //     player.position.x += 0.01;
  //   });
  // }

  onDispose() {
    console.log("disposing...");
    this.serverSpace.dispose();
    console.log("disposed");
  }
}

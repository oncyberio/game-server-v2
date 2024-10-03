import { GameSession } from "../cyber";
import { PlayerState } from "../cyber/schema/PlayerState";
import { RoomState } from "../cyber/schema/RoomState";
import { CoinState, GameState } from "./GameState";
import { loadGame } from "./loadGame";
import { Signature, Wallet, getBytes, solidityPackedKeccak256 } from "ethers";
import crypto from "crypto";
const wallet = new Wallet(process.env.PRIVATE_KEY!);

export class DefaultCyberGame extends GameSession<RoomState> {
  //
  maxPlayers = 500;

  // fps
  tickRate = 20;
  patchRate = 20;

  reconnectTimeout = 0;

  state = new GameState();

  engine = null;
  space = null;
  coinModel = null;
  playerModel = null;

  avatars: Record<string, any> = {};

  async onPreload() {
    console.log("Preloading...");
    this.engine = await loadGame(this.gameId, {
      filter: (component: any) => {
        return (
          component.collider?.enabled || component.script?.identifier === "coin"
        );
      },
    });
    this.space = this.engine.getCurrentSpace();
    this.coinModel = this.space.components.byId("coin");
    this.playerModel = this.space.components.byId("playerModel");
    console.log("Coin model", this.coinModel.getDimensions());
    console.log("Player model", this.playerModel.getDimensions());
    this.spawnCoins(10);
  }

  spawnCoins(nb: number) {
    for (let i = 0; i < nb; i++) {
      const coin = new CoinState();
      coin.id = Math.random().toString();
      coin.position.x = Math.random() * 100 - 5;
      coin.position.y = 0.5;
      coin.position.z = Math.random() * 100 - 5;
      this.state.coins.set(coin.id, coin);
    }
  }

  static onAuth(token: any, request: any): Promise<void> {
    console.log("Authenticating...", token);
    return Promise.resolve();
  }

  async onJoin(player) {
    console.log(player.sessionId, player.userId, "joined!");
    if (this.space == null) {
      console.error("Space not loaded!");
      return;
    }

    // const avatar = await this.playerModel.duplicate();
    // //
    // if (!this.state.players.has(player.sessionId)) {
    //   // player left
    //   console.log(
    //     "Player left before avatar creattion, disposing...",
    //     player.sessionId
    //   );
    //   avatar.destroy();

    //   return;
    // }

    // avatar.position.copy(player.position);
    // avatar.rotation.y = player.rotation.y;

    // console.log("Avatar created", avatar.getDimensions());
  }

  onLeave(player) {
    console.log(player.sessionId, player.userId, "left!");
    // const avatar = this.avatars[player.sessionId];
    // delete this.avatars[player.sessionId];
    // avatar?.destroy();
  }

  onMessage(message: any, player: PlayerState): void {
    //
    // console.log("Message received from", player.sessionId, message);

    if (message.type === "collect") {
      //
      const coin = this.state.coins.get(message.coinId);

      if (coin.owner) {
        //
        console.error("Coin already collected by", coin.owner);

        return;
      }

      coin.owner = player.sessionId;
      this.sendMint(player);

    } else if(message.type == "declare-address") {
      // UNTRUSTED
      if(!message.address) return;
      player.address = message.address;
    }
  }

  async sendMint(player: PlayerState) {

    if(!player.address) return;

    const word = solidityPackedKeccak256(
      ['string'],
      [ crypto.randomUUID()]
    )

    const hashedMessage = solidityPackedKeccak256(
      ['address', 'bytes32' ],
      [ player.address, word ]
    );

    const { v, r, s } = Signature.from(await wallet.signMessage(getBytes(hashedMessage)));

    this.send({
      type: "mint-opportunity",
      payload: {
        word,
        signature: { v,r,s }
      }
    }, player.sessionId)
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
  }
}

import { GameLoader } from "@oogg/game-server";

const builtinExcludes = {
  fog: true,
  background: true,
  envmap: true,
  lighting: true,
  postpro: true,
  rain: true,
  spawn: true,
  //
};
//

interface ServerApi {
  addRpcHandler: (id: string, handler: (data: any) => any) => void;
}
export interface LoadGameOptions {
  isDraft: boolean;
  serverApi: ServerApi;
  debugPhysics: boolean;
  filter: (component: any) => boolean;
}

const defOptions = {
  isDraft: true,
  debugPhysics: false,
  serverApi: null,
  filter: (component: any) => {
    return component.collider?.enabled;
  },
};

export async function loadGame(gameData, opts: Partial<LoadGameOptions> = {}) {
  //
  console.log(
    "Loading game space",
    gameData.id,
    Object.keys(gameData.components)
  );

  opts = Object.assign({}, defOptions, opts);

  const loader = new GameLoader();

  const result = await loader.loadGameData(gameData, opts);

  console.log("Game space created");

  return result;
}

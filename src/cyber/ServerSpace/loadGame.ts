import { GameLoader } from "@oogg/server-engine";

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

export interface LoadGameOptions {
  isDraft: boolean;
  serverApi: any;
  serverLibs: any;
  debugPhysics: boolean;
  filter: (component: any) => boolean;
}

const defOptions = {
  isDraft: true,
  debugPhysics: false,
  serverApi: null,
  serverLibs: null,
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

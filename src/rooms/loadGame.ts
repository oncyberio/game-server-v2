import { GameLoader } from "@oogg/game-server";
// import * as RAPIER from "@dimforge/rapier3d-compat";

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
  debugPhysics: boolean;
  filter: (component: any) => boolean;
}

const defOptions = {
  isDraft: true,
  debugPhysics: false,
  filter: (component: any) => {
    return component.collider?.enabled;
  },
};

export async function loadGame(gameId, opts: Partial<LoadGameOptions> = {}) {
  //
  console.log("Loading game space");

  opts = Object.assign({}, defOptions, opts);

  const loader = new GameLoader();

  const engine = await loader.loadGame(gameId, opts);

  console.log("Game space created");

  return engine;
}

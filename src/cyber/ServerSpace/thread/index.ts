import {
  // @ts-ignore
  Worker,
  isMainThread,
  threadId,
  parentPort,
  workerData,
} from "worker_threads";

import { SpaceProxy } from "./SpaceProxy";
import { ServerSpace } from "./ServerSpace";

export type { SpaceProxy } from "./SpaceProxy";

export function createServerSpace() {
  //
  const worker = new Worker(__filename, {});

  return new SpaceProxy(worker);
}

if (!isMainThread) {
  //
  const space = ServerSpace.create();
}

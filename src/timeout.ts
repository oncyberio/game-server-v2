//
export const isSingletonRoom = process.env.SINGLE_ROOM === "true";

const IDLE_TIMEOUT = (+process.env.ROOM_IDLE_TIMEOUT_SEC || 30 * 60) * 1000;

let idleTimeout: NodeJS.Timeout;
let iv: NodeJS.Timeout;

export function startIdleTimeout() {
  //
  if (!isSingletonRoom) return;

  console.log(
    "Singleton room. Process will exit in",
    IDLE_TIMEOUT / 1000,
    "seconds"
  );

  //   let remainingSecs = IDLE_TIMEOUT / 1000;

  //   iv = setInterval(() => {
  //     //
  //     remainingSecs--;
  //     console.log("Remaining time:", remainingSecs, "seconds");
  //   }, 1000);

  idleTimeout = setTimeout(() => {
    //
    process.exit(0);
    //
  }, IDLE_TIMEOUT);
}

export function clearIdleTimeout() {
  //
  if (!isSingletonRoom) return;

  console.log("Clearing idle timeout");

  // clearInterval(iv);
  clearTimeout(idleTimeout);
}

import os from "node:os";

/**
 * Returns true if we are running in Termux on Android.
 */
export function isTermux(env: NodeJS.ProcessEnv = process.env): boolean {
  return os.platform() === "linux" && Boolean(env.TERMUX_VERSION);
}

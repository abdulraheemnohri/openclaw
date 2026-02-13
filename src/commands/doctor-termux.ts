import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { isTermux } from "../infra/termux.js";
import { note } from "../terminal/note.js";

const execFileAsync = promisify(execFile);

export async function noteTermuxIssues() {
  if (!isTermux()) {
    return;
  }

  try {
    await execFileAsync("termux-notification", ["-h"]);
  } catch {
    note(
      "Termux-api is not installed. Some features like notifications, camera, and location won't work.\nFix: pkg install termux-api",
      "Termux",
    );
  }

  try {
    await execFileAsync("sv", ["status"], { encoding: "utf8" });
  } catch {
    note(
      "termux-services is not installed. Background services won't work.\nFix: pkg install termux-services",
      "Termux",
    );
  }
}

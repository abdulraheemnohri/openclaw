import { execFile } from "node:child_process";
import fs from "node:fs/promises";
import { promisify } from "node:util";
import { cameraTempPath } from "../cli/nodes-camera.js";

const execFileAsync = promisify(execFile);

export async function termuxNotify(params: {
  title?: string;
  body?: string;
  id?: string;
  group?: string;
  sound?: boolean;
}) {
  const args = [];
  if (params.title) {
    args.push("-t", params.title);
  }
  if (params.body) {
    args.push("-c", params.body);
  }
  if (params.id) {
    args.push("--id", params.id);
  }
  if (params.group) {
    args.push("-g", params.group);
  }
  // Termux-api doesn't have a direct 'sound' flag for termux-notification in some versions,
  // but we can just call it.
  await execFileAsync("termux-notification", args);
}

export async function termuxCameraList() {
  const { stdout } = await execFileAsync("termux-camera-info", []);
  return JSON.parse(stdout);
}

export async function termuxCameraSnap(params: { facing?: "front" | "back"; deviceId?: string }) {
  const cameraId = params.deviceId || (params.facing === "front" ? "1" : "0");
  const filePath = cameraTempPath({
    kind: "snap",
    facing: params.facing,
    ext: "jpg",
  });

  await execFileAsync("termux-camera-photo", ["-c", cameraId, filePath]);
  const buffer = await fs.readFile(filePath);

  return {
    format: "jpg",
    base64: buffer.toString("base64"),
    width: 0, // termux-camera-photo doesn't return dimensions easily without extra tools
    height: 0,
  };
}

export async function termuxLocationGet(params: {
  provider?: "gps" | "network" | "passive";
  request?: "once" | "last" | "updates";
}) {
  const args = ["-p", params.provider || "gps", "-r", params.request || "once"];
  const { stdout } = await execFileAsync("termux-location", args);
  return JSON.parse(stdout);
}

export async function termuxSmsSend(params: { number: string; message: string }) {
  await execFileAsync("termux-sms-send", ["-n", params.number, params.message]);
  return { ok: true };
}

export async function termuxSmsList(params: {
  limit?: number;
  offset?: number;
  number?: string;
  type?: "all" | "inbox" | "sent" | "draft" | "outbox";
}) {
  const args = [];
  if (params.limit) {
    args.push("-l", String(params.limit));
  }
  if (params.offset) {
    args.push("-o", String(params.offset));
  }
  if (params.number) {
    args.push("-n", params.number);
  }
  if (params.type) {
    args.push("-d", params.type);
  }

  const { stdout } = await execFileAsync("termux-sms-list", args);
  return JSON.parse(stdout);
}

export async function termuxBatteryStatus() {
  const { stdout } = await execFileAsync("termux-battery-status", []);
  return JSON.parse(stdout);
}

export async function termuxWifiConnectionInfo() {
  const { stdout } = await execFileAsync("termux-wifi-connectioninfo", []);
  return JSON.parse(stdout);
}

export async function termuxTelephonyDeviceInfo() {
  const { stdout } = await execFileAsync("termux-telephony-deviceinfo", []);
  return JSON.parse(stdout);
}

export async function termuxTorch(enabled: boolean) {
  await execFileAsync("termux-torch", [enabled ? "on" : "off"]);
  return { ok: true };
}

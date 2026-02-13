import { execFile } from "node:child_process";
import fs from "node:fs/promises";
import path from "node:path";
import { promisify } from "node:util";
import type { GatewayServiceRuntime } from "./service-runtime.js";
import { colorize, isRich, theme } from "../terminal/theme.js";

const execFileAsync = promisify(execFile);

function resolveServiceDir(name: string): string {
  const prefix = process.env.PREFIX || "/data/data/com.termux/files/usr";
  return path.join(prefix, "var", "service", name);
}

const formatLine = (label: string, value: string) => {
  const rich = isRich();
  return `${colorize(rich, theme.muted, `${label}:`)} ${colorize(rich, theme.command, value)}`;
};

export async function isTermuxServicesAvailable(): Promise<boolean> {
  try {
    await execFileAsync("sv", ["status"], { encoding: "utf8" });
    return true;
  } catch {
    return false;
  }
}

export async function installTermuxService({
  name,
  programArguments,
  environment,
  stdout,
}: {
  name: string;
  programArguments: string[];
  environment?: Record<string, string | undefined>;
  stdout: NodeJS.WritableStream;
}) {
  const serviceDir = resolveServiceDir(name);
  const runScriptPath = path.join(serviceDir, "run");
  const logDir = path.join(serviceDir, "log");
  const logRunScriptPath = path.join(logDir, "run");

  await fs.mkdir(serviceDir, { recursive: true });
  await fs.mkdir(logDir, { recursive: true });

  const envLines = Object.entries(environment || {})
    .filter(([, v]) => v !== undefined)
    .map(([k, v]) => `export ${k}="${v}"`)
    .join("\n");

  const runScript = `#!/data/data/com.termux/files/usr/bin/sh
${envLines}
exec ${programArguments.join(" ")} 2>&1
`;

  const logRunScript = `#!/data/data/com.termux/files/usr/bin/sh
exec svlogd -tt /data/data/com.termux/files/home/.openclaw/logs/${name}
`;

  await fs.writeFile(runScriptPath, runScript, { mode: 0o755 });
  await fs.writeFile(logRunScriptPath, logRunScript, { mode: 0o755 });
  await fs.mkdir(path.join("/data/data/com.termux/files/home/.openclaw/logs", name), {
    recursive: true,
  });

  try {
    await execFileAsync("sv-enable", [name]);
  } catch (err) {
    throw new Error(`sv-enable failed: ${String(err)}`, { cause: err });
  }

  stdout.write("\n");
  stdout.write(`${formatLine("Installed Termux service", serviceDir)}\n`);
}

export async function uninstallTermuxService({
  name,
  stdout,
}: {
  name: string;
  stdout: NodeJS.WritableStream;
}) {
  try {
    await execFileAsync("sv-disable", [name]);
  } catch {
    // ignore
  }

  const serviceDir = resolveServiceDir(name);
  try {
    await fs.rm(serviceDir, { recursive: true, force: true });
    stdout.write(`${formatLine("Removed Termux service", serviceDir)}\n`);
  } catch {
    stdout.write(`Termux service not found at ${serviceDir}\n`);
  }
}

export async function stopTermuxService({ name }: { name: string }) {
  await execFileAsync("sv", ["stop", name]);
}

export async function restartTermuxService({ name }: { name: string }) {
  await execFileAsync("sv", ["restart", name]);
}

export async function isTermuxServiceEnabled(name: string): Promise<boolean> {
  const serviceDir = resolveServiceDir(name);
  try {
    await fs.access(serviceDir);
    return true;
  } catch {
    return false;
  }
}

export async function readTermuxServiceCommand(name: string): Promise<{
  programArguments: string[];
  workingDirectory?: string;
  environment?: Record<string, string>;
  sourcePath?: string;
} | null> {
  const serviceDir = resolveServiceDir(name);
  const runScriptPath = path.join(serviceDir, "run");
  try {
    const content = await fs.readFile(runScriptPath, "utf8");
    const lines = content.split("\n");
    const programArguments: string[] = [];
    const environment: Record<string, string> = {};

    for (const line of lines) {
      if (line.startsWith("export ")) {
        const match = line.match(/export (\w+)="(.+)"/);
        if (match) {
          environment[match[1]] = match[2];
        }
      } else if (line.startsWith("exec ")) {
        const cmd = line.slice(5).replace(" 2>&1", "").trim();
        programArguments.push(...cmd.split(" ")); // Simplistic split
      }
    }

    return {
      programArguments,
      environment,
      sourcePath: runScriptPath,
    };
  } catch {
    return null;
  }
}

export async function readTermuxServiceRuntime(name: string): Promise<GatewayServiceRuntime> {
  try {
    const { stdout } = await execFileAsync("sv", ["status", name], { encoding: "utf8" });
    const line = stdout.trim();
    if (line.startsWith("run:")) {
      const match = line.match(/pid (\d+)/);
      return {
        status: "running",
        state: "run",
        pid: match ? parseInt(match[1], 10) : undefined,
      };
    }
    if (line.startsWith("down:")) {
      return {
        status: "stopped",
        state: "down",
      };
    }
    return {
      status: "unknown",
      detail: line,
    };
  } catch (err) {
    return {
      status: "unknown",
      detail: String(err),
    };
  }
}

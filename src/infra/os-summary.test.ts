import os from "node:os";
import { describe, expect, it, vi } from "vitest";
import { resolveOsSummary } from "./os-summary.js";

vi.mock("node:os", () => ({
  default: {
    platform: vi.fn(),
    release: vi.fn(),
    arch: vi.fn(),
  },
}));

vi.mock("./termux.js", () => ({
  isTermux: vi.fn(),
}));

import { isTermux } from "./termux.js";

describe("resolveOsSummary", () => {
  it("includes termux in label when in termux", () => {
    vi.mocked(os.platform).mockReturnValue("linux");
    vi.mocked(os.release).mockReturnValue("5.10.0");
    vi.mocked(os.arch).mockReturnValue("arm64");
    vi.mocked(isTermux).mockReturnValue(true);
    process.env.TERMUX_VERSION = "0.118";

    const summary = resolveOsSummary();
    expect(summary.label).toContain("termux 0.118");
    expect(summary.label).toContain("(arm64)");
  });

  it("uses standard linux label when not in termux", () => {
    vi.mocked(os.platform).mockReturnValue("linux");
    vi.mocked(os.release).mockReturnValue("5.10.0");
    vi.mocked(os.arch).mockReturnValue("x64");
    vi.mocked(isTermux).mockReturnValue(false);

    const summary = resolveOsSummary();
    expect(summary.label).toBe("linux 5.10.0 (x64)");
  });
});

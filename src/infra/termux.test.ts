import os from "node:os";
import { describe, expect, it } from "vitest";
import { vi } from "vitest";
import { isTermux } from "./termux.js";

vi.mock("node:os", () => ({
  default: {
    platform: vi.fn(),
  },
}));

describe("isTermux", () => {
  it("returns true when platform is linux and TERMUX_VERSION is set", () => {
    vi.mocked(os.platform).mockReturnValue("linux");
    expect(isTermux({ TERMUX_VERSION: "0.118" })).toBe(true);
  });

  it("returns false when platform is not linux", () => {
    vi.mocked(os.platform).mockReturnValue("darwin");
    expect(isTermux({ TERMUX_VERSION: "0.118" })).toBe(false);
  });

  it("returns false when TERMUX_VERSION is not set", () => {
    vi.mocked(os.platform).mockReturnValue("linux");
    expect(isTermux({})).toBe(false);
  });
});

/**
 * Tests for src/utils/helpers/youtubeCookieHandler/youtubeCookieHandler.ts
 */
import { youtubeCookieHandler } from "../youtubeCookieHandler";
import { config } from "@/config";
import fs from "fs";
import path from "path";

// Mock config
jest.mock("@/config", () => ({
  config: {
    YOUTUBE_NETSCAPE_COOKIES_B64: undefined,
  },
}));

// Mock fs
jest.mock("fs", () => ({
  writeFileSync: jest.fn(),
}));

describe("YouTube Cookie Handler", () => {
  let consoleWarnSpy: jest.SpyInstance;
  let consoleErrorSpy: jest.SpyInstance;
  let consoleLogSpy: jest.SpyInstance;

  beforeEach(() => {
    jest.clearAllMocks();

    // Silence console outputs and allow tracking
    consoleWarnSpy = jest.spyOn(console, "warn").mockImplementation();
    consoleErrorSpy = jest.spyOn(console, "error").mockImplementation();
    consoleLogSpy = jest.spyOn(console, "log").mockImplementation();

    // Reset config to baseline
    config.YOUTUBE_NETSCAPE_COOKIES_B64 = undefined;
  });

  afterEach(() => {
    consoleWarnSpy.mockRestore();
    consoleErrorSpy.mockRestore();
    consoleLogSpy.mockRestore();
  });

  it("should warn and return undefined if YOUTUBE_NETSCAPE_COOKIES_B64 is missing", () => {
    config.YOUTUBE_NETSCAPE_COOKIES_B64 = undefined;

    const result = youtubeCookieHandler();

    expect(result).toBeUndefined();
    expect(consoleWarnSpy).toHaveBeenCalledWith(
      "[YouTube Cookie Handler] No YOUTUBE_NETSCAPE_COOKIES_B64 found in environment variables"
    );
    expect(consoleWarnSpy).toHaveBeenCalledWith(
      "[YouTube Cookie Handler] For better results, consider adding youtube cookies"
    );
    expect(fs.writeFileSync).not.toHaveBeenCalled();
  });

  it("should write cookies to file, log success, and return the file path when valid", () => {
    const validCookies = "cookie1=value1; cookie2=value2;";
    config.YOUTUBE_NETSCAPE_COOKIES_B64 =
      Buffer.from(validCookies).toString("base64");

    const result = youtubeCookieHandler();

    // The result path includes __dirname of the handler file
    const expectedPath = path.join(__dirname, "..", "cookies.txt");

    expect(fs.writeFileSync).toHaveBeenCalledWith(
      expectedPath,
      validCookies,
      "utf8"
    );
    expect(consoleLogSpy).toHaveBeenCalledWith(
      "[YouTube Cookie Handler] Cookies written to file successfully"
    );
    expect(result).toEqual(expectedPath);
  });

  it("should catch errors thrown during execution and return undefined", () => {
    const validCookies = "cookie1=value1";
    config.YOUTUBE_NETSCAPE_COOKIES_B64 =
      Buffer.from(validCookies).toString("base64");

    const mockError = new Error("File system write failed");
    (fs.writeFileSync as jest.Mock).mockImplementationOnce(() => {
      throw mockError;
    });

    const result = youtubeCookieHandler();

    expect(result).toBeUndefined();
    expect(consoleErrorSpy).toHaveBeenCalledWith(
      "[YouTube Cookie Handler] Error handling cookies:",
      mockError
    );
  });
});

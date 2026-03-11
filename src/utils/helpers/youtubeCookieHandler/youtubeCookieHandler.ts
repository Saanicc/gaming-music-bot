import { config } from "@/config";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/**
 * Handles YouTube cookies by reading from environment variables,
 * writing them to a file, and returning the file path
 */
export const youtubeCookieHandler = () => {
  try {
    const b64 = config.YOUTUBE_NETSCAPE_COOKIES_B64;
    if (!b64) {
      console.warn(
        "[YouTube Cookie Handler] No YOUTUBE_NETSCAPE_COOKIES_B64 found in environment variables"
      );
      console.warn(
        "[YouTube Cookie Handler] For better results, consider adding youtube cookies"
      );
      return;
    }

    const cookies = Buffer.from(b64, "base64").toString("utf8");

    if (!cookies) {
      console.warn("[YouTube Cookie Handler] Decoded cookies string is empty");
      return;
    }

    const cookiePath = path.join(__dirname, "cookies.txt");

    // Write cookies to file
    fs.writeFileSync(cookiePath, cookies, "utf8");
    console.log(
      "[YouTube Cookie Handler] Cookies written to file successfully"
    );

    return cookiePath;
  } catch (error) {
    console.error("[YouTube Cookie Handler] Error handling cookies:", error);
    return;
  }
};

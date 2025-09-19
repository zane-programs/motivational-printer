import fs from "fs";
import { getArchiveDateFormatted } from "./date.mjs";

/**
 * Archives the provided message to a timestamped text file in the ./archive directory.
 * @param {string} message - The message to archive
 */
export function archiveMessage(message) {
  const filename = `./archive/${getArchiveDateFormatted()}.txt`;
  fs.writeFileSync(filename, message);
  return { filename };
}

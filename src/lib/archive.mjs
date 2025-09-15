import fs from "fs";
import { getArchiveDateFormatted } from "./date.mjs";

/**
 * Archives the provided message to a timestamped text file in the ./archive directory.
 * @param {string} message - The message to archive
 */
export function archiveMessage(message) {
  fs.writeFileSync(`./archive/${getArchiveDateFormatted()}.txt`, message);
}

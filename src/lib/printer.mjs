import format from "date-fns/format";
import { Printer } from "@node-escpos/core";
import USB from "@node-escpos/usb-adapter";

export default class PrinterAdapter {
  /** @type {USB} */
  _device;

  /** @type {Printer} */
  _printer;

  /** @type {boolean} */
  _readyState;

  constructor() {
    this._device = new USB();
    this._printer = new Printer(this._device, { encoding: "utf8" });
    this._readyState = false;
    this._isExiting = false;

    process.on("exit", () => this._handleExit(false));
    process.on("SIGINT", () => this._handleExit());
    process.on("SIGUSR1", () => this._handleExit());
    process.on("SIGUSR2", () => this._handleExit());
  }

  /**
   * Initializes the printer.
   * @returns {Promise<void>}
   */
  async start() {
    await this._openDevice();
    this._readyState = true;
  }

  /**
   * Closes the printer connection.
   * @returns {Promise<void>}
   */
  async close() {
    this._readyState = false;
    await this._printer.close();
  }

  /**
   * Sends a beep signal to the printer.
   * @param {number} n
   * @param {number} t
   * @returns {Promise<void>}
   */
  async beep(n, t) {
    await this._printer.beep(n, t).flush();
  }

  /**
   * Prints a formatted header with a logo and sender.
   * @param {string} sender
   * @returns {Promise<void>}
   */
  async printHeader(sender) {
    await this.printText(
      format(new Date(), "MMMM d, yyyy | h:mm aa") + "\nFrom " + sender + "\n\n"
    );
  }

  /**
   * Prints a footer with version and end line.
   * @returns {Promise<void>}
   */
  async printFooter() {
    await this.printText(`Printer`);
    await this.printLine();
    await this.printEndLine();
  }

  /**
   * Prints arbitrary text.
   * @param {string} text
   * @param {"LT" | "CT" | "RT"} [align="CT"]
   * @param {number} [size=0]
   * @returns {Promise<void>}
   */
  async printText(text, align = "CT", size = 0) {
    await this._printer
      .font("A")
      .size(size, size)
      .style("NORMAL")
      .align(align)
      .text(text)
      .flush();
  }

  /**
   * Prints line breaks.
   * @param {number} [n=1]
   * @returns {Promise<void>}
   */
  async printLine(n = 1) {
    await this._printer.size(0, 0).text("\n".repeat(n)).flush();
  }

  /**
   * Prints the decorative end line.
   * @returns {Promise<void>}
   */
  async printEndLine() {
    await this.printLine();
    await this.printText("~ ~ ~ ~ ~ ~ ~ ~ ~ ~ ~ ~ ~ ~ ~ ~ ~ ~ ~ ~ ~ ~ ~ ~ ~");
    await this.printLine();
  }

  /**
   * Performs a self-test by printing sample content.
   * @returns {Promise<void>}
   */
  async selfTest() {
    await this.printText("Printer! | self-test\n" + new Date().toString());
    await this.printText("Printer Server v" + APP_VERSION);
    await this.printLine();

    for (let i = 0; i < 4; i++) {
      await this.printText("Size " + (i + 1), "LT", i);
    }

    await this.printText("Left", "LT");
    await this.printText("Center", "CT");
    await this.printText("Right", "RT");

    await this.printEndLine();
    await this.printLine();
  }

  /**
   * Prints an image.
   * @param {Image} image
   * @returns {Promise<void>}
   */
  async printImage(image) {
    console.log("Print image");
    await this._printer.align("CT").image(image, "D24");
    await this._printer.flush();
  }

  /**
   * Whether the printer is ready.
   * @returns {boolean}
   */
  get isReady() {
    return this._readyState;
  }

  /**
   * Opens the USB device.
   * @returns {Promise<void>}
   */
  async _openDevice() {
    return new Promise((resolve, reject) => {
      this._device.open((error) => {
        if (error) {
          console.error(error);
          reject(error);
        } else {
          console.log("Device open");
          resolve();
        }
      });
    });
  }

  /**
   * Handles app exit, optionally calls `process.exit`.
   * @param {boolean} [shouldProcessExit=true]
   * @returns {Promise<void>}
   */
  async _handleExit(shouldProcessExit = true) {
    if (this._isExiting) return;
    this._isExiting = true;

    console.log("\nClosing. Goodbye!");
    await this._printer.close();
    if (shouldProcessExit) process.exit(0);
  }
}

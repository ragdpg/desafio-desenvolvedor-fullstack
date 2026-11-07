import puppeteer from "puppeteer-core";
import { spawn } from "child_process";
import path from "path";
import { fileURLToPath } from "url";
import fs from "fs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");
const outDir = path.join(root, "output");
const silentVideo = path.join(outDir, "video-silent.mp4");
const audio = path.join(outDir, "episodio-audio.wav");
const finalMp4 = path.join(outDir, "joao-e-manu-ep1.mp4");

fs.mkdirSync(outDir, { recursive: true });

const WIDTH = 1920;
const HEIGHT = 1080;
const DURATION = 62; // buffer past 60s

const browser = await puppeteer.launch({
  executablePath: "/usr/bin/google-chrome-stable",
  headless: false,
  defaultViewport: { width: WIDTH, height: HEIGHT, deviceScaleFactor: 1 },
  args: [
    `--window-size=${WIDTH},${HEIGHT}`,
    "--window-position=0,0",
    "--no-first-run",
    "--no-default-browser-check",
    "--disable-infobars",
    "--autoplay-policy=no-user-gesture-required",
    "--kiosk",
    "--start-fullscreen",
  ],
  ignoreDefaultArgs: ["--enable-automation"],
});

const page = await browser.newPage();
await page.setViewport({ width: WIDTH, height: HEIGHT, deviceScaleFactor: 1 });
await page.goto("http://127.0.0.1:8765/?record=1", {
  waitUntil: "networkidle0",
  timeout: 60000,
});

// Ensure fonts/images ready
await page.waitForSelector("#stage");
await new Promise((r) => setTimeout(r, 1500));
await page.click("body");
await page.evaluate(() => {
  if (window.__JOAO_MANU__) window.__JOAO_MANU__.start();
});

// Start ffmpeg x11grab of the display
const display = process.env.DISPLAY || ":1";
const ff = spawn(
  "ffmpeg",
  [
    "-y",
    "-f",
    "x11grab",
    "-video_size",
    `${WIDTH}x${HEIGHT}`,
    "-framerate",
    "30",
    "-i",
    `${display}+0,0`,
    "-t",
    String(DURATION),
    "-c:v",
    "libx264",
    "-pix_fmt",
    "yuv420p",
    "-preset",
    "veryfast",
    "-crf",
    "18",
    silentVideo,
  ],
  { stdio: ["ignore", "inherit", "inherit"] }
);

await new Promise((resolve, reject) => {
  ff.on("exit", (code) => (code === 0 ? resolve() : reject(new Error(`ffmpeg exit ${code}`))));
});

await browser.close();

// Mux audio
await new Promise((resolve, reject) => {
  const mux = spawn(
    "ffmpeg",
    [
      "-y",
      "-i",
      silentVideo,
      "-i",
      audio,
      "-map",
      "0:v:0",
      "-map",
      "1:a:0",
      "-c:v",
      "copy",
      "-c:a",
      "aac",
      "-b:a",
      "192k",
      "-shortest",
      "-movflags",
      "+faststart",
      finalMp4,
    ],
    { stdio: "inherit" }
  );
  mux.on("exit", (code) => (code === 0 ? resolve() : reject(new Error(`mux exit ${code}`))));
});

console.log("Wrote", finalMp4);

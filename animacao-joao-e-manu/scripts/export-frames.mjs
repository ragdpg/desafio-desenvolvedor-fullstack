import puppeteer from "puppeteer-core";
import { spawn } from "child_process";
import path from "path";
import { fileURLToPath } from "url";
import fs from "fs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");
const framesDir = path.join(root, "output", "frames");
const silentVideo = path.join(root, "output", "video-silent.mp4");
const audio = path.join(root, "output", "episodio-audio.wav");
const finalMp4 = path.join(root, "output", "joao-e-manu-ep1.mp4");

fs.rmSync(framesDir, { recursive: true, force: true });
fs.mkdirSync(framesDir, { recursive: true });

const WIDTH = 1920;
const HEIGHT = 1080;
const FPS = 12;
const DURATION = 60;
const TOTAL = FPS * DURATION;

const browser = await puppeteer.launch({
  executablePath: "/usr/bin/google-chrome-stable",
  headless: true,
  defaultViewport: { width: WIDTH, height: HEIGHT, deviceScaleFactor: 1 },
  args: [
    `--window-size=${WIDTH},${HEIGHT}`,
    "--autoplay-policy=no-user-gesture-required",
    "--no-sandbox",
    "--disable-dev-shm-usage",
    "--font-render-hinting=none",
  ],
});

const page = await browser.newPage();
await page.setViewport({ width: WIDTH, height: HEIGHT, deviceScaleFactor: 1 });
await page.goto("http://127.0.0.1:8765/?record=1", {
  waitUntil: "networkidle0",
  timeout: 90000,
});
await page.waitForFunction(() => window.__JOAO_MANU__);
// Wait for webfonts
await page.evaluate(() => document.fonts.ready);
await new Promise((r) => setTimeout(r, 800));

console.log(`Capturing ${TOTAL} frames at ${FPS} fps…`);
for (let i = 0; i < TOTAL; i++) {
  const t = i / FPS;
  await page.evaluate((time) => window.__JOAO_MANU__.seek(time), t);
  // allow CSS transitions / confetti paint
  await new Promise((r) => setTimeout(r, 40));
  const file = path.join(framesDir, `frame-${String(i).padStart(5, "0")}.png`);
  await page.screenshot({ path: file, type: "png" });
  if (i % 24 === 0) console.log(`  frame ${i}/${TOTAL} t=${t.toFixed(2)}s`);
}

await browser.close();

console.log("Encoding silent video…");
await run("ffmpeg", [
  "-y",
  "-framerate",
  String(FPS),
  "-i",
  path.join(framesDir, "frame-%05d.png"),
  "-c:v",
  "libx264",
  "-pix_fmt",
  "yuv420p",
  "-preset",
  "medium",
  "-crf",
  "18",
  silentVideo,
]);

console.log("Muxing audio…");
await run("ffmpeg", [
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
]);

console.log("Done:", finalMp4);

function run(cmd, args) {
  return new Promise((resolve, reject) => {
    const p = spawn(cmd, args, { stdio: "inherit" });
    p.on("exit", (code) => (code === 0 ? resolve() : reject(new Error(`${cmd} exit ${code}`))));
  });
}

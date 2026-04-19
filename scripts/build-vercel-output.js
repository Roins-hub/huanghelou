import { cp, mkdir, rm } from "node:fs/promises";
import { existsSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();
const dist = join(root, "dist");

const staticFiles = [
  "index.html",
  "style.css",
  "script.js",
  "背景图.png",
  "开始.mp4",
  "黄鹤楼逐层精讲介绍.pdf"
];

const staticDirectories = [
  "assistant",
  "lou",
  "全息",
  "文创",
  "世界场景"
];

await rm(dist, { recursive: true, force: true });
await mkdir(dist, { recursive: true });

for (const file of staticFiles) {
  const source = join(root, file);

  if (existsSync(source)) {
    await cp(source, join(dist, file));
  }
}

for (const directory of staticDirectories) {
  const source = join(root, directory);

  if (existsSync(source)) {
    await cp(source, join(dist, directory), { recursive: true });
  }
}

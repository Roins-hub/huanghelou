import { createReadStream, existsSync, readFileSync } from "node:fs";
import { createServer } from "node:http";
import { extname, join, normalize, resolve } from "node:path";

import chatHandler from "./api/chat.js";
import testModelHandler from "./api/test-model.js";

const root = process.cwd();
const port = Number(process.env.PORT || 3000);

const mimeTypes = {
  ".css": "text/css; charset=utf-8",
  ".html": "text/html; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".mp4": "video/mp4",
  ".mtl": "text/plain; charset=utf-8",
  ".obj": "text/plain; charset=utf-8",
  ".pdf": "application/pdf",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".svg": "image/svg+xml",
  ".webp": "image/webp"
};

function loadEnvFile() {
  const envPath = join(root, ".env.local");

  if (!existsSync(envPath)) {
    return;
  }

  const lines = readFileSync(envPath, "utf8").split(/\r?\n/);

  for (const line of lines) {
    const trimmed = line.trim();

    if (!trimmed || trimmed.startsWith("#")) {
      continue;
    }

    const separatorIndex = trimmed.indexOf("=");
    if (separatorIndex === -1) {
      continue;
    }

    const key = trimmed.slice(0, separatorIndex).trim();
    const value = trimmed.slice(separatorIndex + 1).trim();

    if (key && process.env[key] === undefined) {
      process.env[key] = value;
    }
  }
}

function readRequestBody(request) {
  return new Promise((resolveBody, rejectBody) => {
    let body = "";

    request.on("data", (chunk) => {
      body += chunk;

      if (body.length > 1024 * 1024) {
        rejectBody(new Error("Request body too large"));
        request.destroy();
      }
    });

    request.on("end", () => {
      if (!body) {
        resolveBody({});
        return;
      }

      try {
        resolveBody(JSON.parse(body));
      } catch {
        rejectBody(new Error("Invalid JSON body"));
      }
    });
  });
}

function createVercelLikeResponse(response) {
  return {
    setHeader(name, value) {
      response.setHeader(name, value);
    },
    status(statusCode) {
      response.statusCode = statusCode;
      return this;
    },
    json(body) {
      response.setHeader("Content-Type", "application/json; charset=utf-8");
      response.end(JSON.stringify(body));
    },
    write(chunk) {
      response.write(chunk);
    },
    end(chunk = "") {
      response.end(chunk);
    }
  };
}

async function handleApiChat(request, response) {
  try {
    request.body = await readRequestBody(request);
    await chatHandler(request, createVercelLikeResponse(response));
  } catch (error) {
    response.statusCode = error.message === "Invalid JSON body" ? 400 : 500;
    response.setHeader("Content-Type", "application/json; charset=utf-8");
    response.end(JSON.stringify({ error: "本地 AI 接口请求失败，请检查请求内容或服务日志。" }));
  }
}

async function handleApiTestModel(request, response) {
  try {
    request.body = await readRequestBody(request);
    await testModelHandler(request, createVercelLikeResponse(response));
  } catch (error) {
    response.statusCode = error.message === "Invalid JSON body" ? 400 : 500;
    response.setHeader("Content-Type", "application/json; charset=utf-8");
    response.end(JSON.stringify({ error: "本地模型测试接口请求失败，请检查请求内容或服务日志。" }));
  }
}

function sendStaticFile(request, response) {
  const url = new URL(request.url, `http://${request.headers.host}`);
  const decodedPath = decodeURIComponent(url.pathname);
  const relativePath = decodedPath === "/" || decodedPath.endsWith("/")
    ? `${decodedPath}index.html`
    : decodedPath;
  const safePath = normalize(relativePath).replace(/^(\.\.[/\\])+/, "");
  const filePath = resolve(root, `.${safePath}`);

  if (!filePath.startsWith(root)) {
    response.writeHead(403);
    response.end("Forbidden");
    return;
  }

  if (!existsSync(filePath)) {
    response.writeHead(404);
    response.end("Not found");
    return;
  }

  response.setHeader("Content-Type", mimeTypes[extname(filePath).toLowerCase()] || "application/octet-stream");
  createReadStream(filePath).pipe(response);
}

loadEnvFile();

createServer((request, response) => {
  if (request.url?.startsWith("/api/chat")) {
    handleApiChat(request, response);
    return;
  }

  if (request.url?.startsWith("/api/test-model")) {
    handleApiTestModel(request, response);
    return;
  }

  sendStaticFile(request, response);
}).listen(port, () => {
  console.log(`Local dev server running at http://localhost:${port}/`);
  console.log("Static files and /api/chat are served from the same origin.");
});

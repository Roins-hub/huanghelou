import { readFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const projectRoot = join(__dirname, "..");

const markdownKnowledgeSources = [
  {
    title: "黄鹤楼数字化转型路线图：从传统观光到智慧沉浸的战略跃迁",
    path: "黄鹤楼数字化转型路线图：从传统观光到智慧沉浸的战略跃迁.md"
  },
  {
    title: "黄鹤楼历史遗址数字化转型战略路线图：从“景观游览”到“文化共鸣”",
    path: "黄鹤楼历史遗址数字化转型战略路线图：从“景观游览”到“文化共鸣”.md"
  }
];

async function readJsonKnowledge() {
  const raw = await readFile(join(projectRoot, "data", "assistant-knowledge.json"), "utf8");
  return JSON.parse(raw);
}

async function readMarkdownKnowledge() {
  return Promise.all(
    markdownKnowledgeSources.map(async (source) => ({
      title: source.title,
      content: await readFile(join(projectRoot, source.path), "utf8")
    }))
  );
}

export async function loadAssistantKnowledge() {
  const [base, documents] = await Promise.all([
    readJsonKnowledge(),
    readMarkdownKnowledge()
  ]);

  return {
    base,
    documents
  };
}

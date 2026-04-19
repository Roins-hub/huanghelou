# 黄鹤楼沉浸式数字展厅

这是一个围绕黄鹤楼文化展示制作的网页互动项目。项目从早期的 3D 手势导览扩展为多入口数字展厅，包含开始页、三维模型交互、全息展示、文创海报抽卡和 AI 智能导览等功能。AI 小助手支持流式输出、自定义三方模型和本地知识库问答。

## 主要功能

- 开始页入口：统一进入手势交互、全息系统、文创展示和 AI 智能导览。
- 3D 手势导览：使用 Three.js 加载黄鹤楼模型，配合 MediaPipe Hands 实现缩放、旋转和楼层切换。
- 楼层热点：模型上提供楼层标注，可通过热点或手势查看一至五层内容。
- 全息系统：展示黄鹤楼主题全息视频和扫描式视觉效果。
- 文创展示：展示多张文创海报，并支持摄像头手势抽卡。
- AI 智能导览：基于 React、Chatscope 和 OpenAI-compatible 接口，提供黄鹤楼楼层、玩法、路线和常见问题问答，支持流式输出。
- API 设置页：可在浏览器中设置 API Base URL、API Key、模型名称，并测试连接，用于切换 DeepSeek、OpenAI 或其他兼容模型。
- 知识库增强：AI 小助手会读取基础展厅知识和两份黄鹤楼数字化转型路线图 Markdown 文档作为回答依据。
- 本地开发服务：提供静态文件访问、`/api/chat` 聊天接口和 `/api/test-model` 模型测试接口，方便本地完整体验 AI 功能。

## 技术栈

- HTML5 / CSS3 / Vanilla JavaScript
- Three.js
- MediaPipe Hands
- React + Vite
- @chatscope/chat-ui-kit-react
- DeepSeek / OpenAI-compatible Chat Completions API
- Node.js 本地开发服务
- Vitest

## 项目结构

```text
.
├─ index.html                 # 主展厅页面和多入口开始页
├─ style.css                  # 主展厅样式
├─ script.js                  # 3D、手势、全息、文创交互逻辑
├─ local-dev-server.js        # 本地开发服务器，支持静态资源和 /api/chat
├─ api/
│  ├─ chat.js                 # AI 聊天接口
│  ├─ chat-core.js            # AI 请求参数、历史记录和流式解析逻辑
│  ├─ knowledge.js            # AI 知识库加载逻辑
│  └─ test-model.js           # 模型连接测试接口
├─ assistant-app/             # AI 智能导览 React 源码
├─ assistant/                 # AI 智能导览构建产物
├─ data/
│  └─ assistant-knowledge.json
├─ 黄鹤楼数字化转型路线图：从传统观光到智慧沉浸的战略跃迁.md
├─ 黄鹤楼历史遗址数字化转型战略路线图：从“景观游览”到“文化共鸣”.md
├─ lou/                       # 黄鹤楼 3D 模型与贴图
├─ 全息/                       # 全息展示视频资源
├─ 文创/                       # 文创海报资源
├─ tests/                     # 自动化测试
└─ .env.example               # AI 接口环境变量示例
```

## 安装依赖

首次运行前，请先安装 Node.js，然后在项目根目录执行：

```bash
npm install
```

AI 小助手源码在 `assistant-app/` 中，根目录脚本会自动安装和构建它的依赖。

## 本地启动

推荐使用项目自带的本地开发服务，这样主展厅和 AI 小助手都可以正常访问。

```bash
cd D:/3Dmoxing
npm run dev
```

启动后访问：

```text
http://localhost:3000/
```

AI 智能导览页面：

```text
http://localhost:3000/assistant/
```

## 配置 AI 小助手

AI 小助手默认使用 `.env.local` 中的模型配置。请复制 `.env.example` 为 `.env.local`：

```bash
cp .env.example .env.local
```

Windows PowerShell 也可以使用：

```powershell
Copy-Item .env.example .env.local
```

然后编辑 `.env.local`：

```text
DEEPSEEK_API_KEY=你的 DeepSeek API Key
DEEPSEEK_BASE_URL=https://api.deepseek.com
DEEPSEEK_MODEL=deepseek-chat
```

注意：不要把 `.env.local` 提交到仓库。

### 在页面中切换三方模型

进入 AI 智能导览后，点击左侧的“API 设置”，或直接访问：

```text
http://localhost:3000/assistant/?settings=1
```

设置页可以填写：

- 服务商名称
- API Base URL
- API Key
- 模型名称
- 是否启用流式输出

保存后，配置会存入当前浏览器的 `localStorage`。之后聊天会优先使用页面中保存的自定义模型；如果没有填写自定义配置，则继续使用 `.env.local` 或部署平台环境变量中的默认模型。

常见填写示例：

```text
DeepSeek:
API Base URL: https://api.deepseek.com
Model: deepseek-chat

OpenAI:
API Base URL: https://api.openai.com/v1
Model: gpt-4o-mini
```

其他 OpenAI-compatible 服务也可以按其平台文档填写对应的 Base URL 和模型名称。

页面中的“测试连接”会请求 `/api/test-model`，用于确认 API Key、Base URL 和模型名称是否可用。

公开部署时请注意：页面 API 设置会把用户填写的 API Key 保存在用户自己的浏览器本地，适合个人使用、演示和测试。如果要统一由站点管理员控制模型，请使用部署平台环境变量或后续扩展服务端配置。

## AI 知识库

AI 小助手会在回答时读取以下知识库内容：

- `data/assistant-knowledge.json`
- `黄鹤楼数字化转型路线图：从传统观光到智慧沉浸的战略跃迁.md`
- `黄鹤楼历史遗址数字化转型战略路线图：从“景观游览”到“文化共鸣”.md`

这些内容会作为上下文提供给模型，用于回答黄鹤楼楼层、交互玩法、数字化转型、智慧沉浸、文化共鸣等问题。这里不是训练模型参数，而是基于本地知识库进行问答增强。

## 构建与测试

构建 AI 小助手：

```bash
npm run build
```

运行测试：

```bash
npm test
```

## 静态预览方式

如果只想查看主展厅静态页面，也可以使用 Python 静态服务器：

```bash
cd D:/3Dmoxing
python -m http.server 8000
```

浏览器打开：

```text
http://localhost:8000/
```

这种方式适合查看静态页面和资源，但不会运行 `/api/chat` 和 `/api/test-model`，因此 AI 小助手接口和模型测试不可用。需要完整体验 AI 功能时，请使用 `npm run dev`。

## 使用说明

1. 打开开始页后选择入口。
2. 进入手势交互时，请允许浏览器摄像头权限。
3. 双手靠近或分开可缩放模型，移动手掌可调整视角。
4. 单手比出 1 到 5 指，可查看对应楼层介绍。
5. 在文创展示页中，将手掌移到卡牌上并捏合，可抽取文创海报。
6. 在 AI 智能导览页中，可直接输入问题，也可点击快捷问题。
7. 如果需要切换模型，进入“API 设置”填写三方 OpenAI-compatible 接口信息并保存。

## 注意事项

- 推荐使用最新版 Chrome 或 Edge。
- 摄像头功能需要浏览器授权。
- 模型、视频和图片资源较大，首次加载可能需要等待。
- 如果 3D 模型无法显示，请确认 `lou/` 目录和贴图文件完整。
- 如果 AI 小助手无法回答，请检查 `.env.local` 是否配置了 `DEEPSEEK_API_KEY`，或检查页面 API 设置中的 Base URL、API Key 和模型名称是否正确。

## 部署建议

静态页面可部署到 Vercel、Cloudflare Pages、Netlify 或任意静态服务器。若需要 AI 小助手后端接口，请选择支持 Node/Vercel Function 或等价后端函数的平台，并配置默认模型环境变量。页面 API 设置可以在部署后由浏览器本地保存自定义模型配置，但服务端仍需要可用的 `/api/chat` 和 `/api/test-model` 接口。

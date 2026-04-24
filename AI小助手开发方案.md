# AI 小助手开发方案（DeepSeek 版本）

## 当前实施版本

当前已按“方案 B：主站保持静态，assistant 单独构建”推进开发：

- 主站继续保留 `index.html`、`style.css`、`script.js` 的静态结构。
- 新增 `assistant-app/` 作为 React + Vite + Chatscope 源码目录。
- `assistant-app` 构建产物输出到根目录 `assistant/`，主站通过 `assistant/` 路径访问 AI 小助手。
- 新增 `api/chat.js` 作为后端函数，负责读取环境变量并调用 DeepSeek。
- 新增 `data/assistant-knowledge.json` 作为展厅知识库。
- 新增 `.env.example` 说明 DeepSeek 环境变量配置。

本方案的核心原则仍然是：前端不保存 DeepSeek API Key，浏览器只请求自己的 `/api/chat`，后端函数再调用 DeepSeek。

## 1. 项目背景

当前项目是一个黄鹤楼沉浸式数字展厅网页，核心文件包括：

- `index.html`
- `style.css`
- `script.js`
- `lou/` 三维模型资源目录
- `全息/` 全息展示资源目录
- `文创/` 文创互动资源目录

项目目前以静态网页为主，通过 Three.js 展示黄鹤楼 3D 模型，并使用 MediaPipe Hands 实现手势交互。AI 小助手将作为一个新的独立功能入口，帮助用户了解黄鹤楼、学习手势操作、解决使用问题，并提供导览问答。

## 2. 开发目标

在开始页新增一个入口按钮：

```text
AI 智能导览
```

用户点击后跳转到独立页面：

```text
assistant.html
```

AI 小助手页面用于提供以下能力：

- 黄鹤楼楼层内容问答
- 手势导览使用说明
- 摄像头、模型加载、手机访问等常见问题解答
- 手势导览、全息展示、文创互动三个模块介绍
- 简单参观路线推荐
- 用户自由提问

第一版目标是实现一个稳定、简洁、中文体验良好的文字导览助手。语音讲解、长期记忆、复杂知识库检索等能力可作为后续版本扩展。

## 3. 总体架构

由于项目是前端静态网页，DeepSeek API Key 不能写入浏览器端代码。推荐使用“静态前端 + 后端函数”的结构：

```text
index.html
  -> 点击 AI 智能导览按钮

assistant.html / assistant.js
  -> fetch("/api/chat")

api/chat.js
  -> 读取 DEEPSEEK_API_KEY
  -> 调用 DeepSeek Chat Completions API
  -> 返回 AI 回复
```

推荐第一版使用 Vercel Function：

```text
api/chat.js
```

如果后续决定部署到 Cloudflare Pages，也可以改为：

```text
functions/api/chat.js
```

## 4. DeepSeek 接口选择

第一版推荐使用 DeepSeek 官方 OpenAI-compatible 接口：

```text
Base URL: https://api.deepseek.com
Endpoint: /chat/completions
Model: deepseek-chat
```

推荐模型：

```text
deepseek-chat
```

使用原因：

- 适合普通中文对话和导览问答
- 响应速度适合网页交互
- 成本更适合高频问答场景
- 对项目第一版功能已经足够

后续如果需要更复杂的推理能力，例如深度历史文化分析、个性化参观路线生成，可以考虑切换到：

```text
deepseek-reasoner
```

## 5. 环境变量设计

部署平台中配置以下环境变量：

```text
DEEPSEEK_API_KEY=你的 DeepSeek API Key
DEEPSEEK_BASE_URL=https://api.deepseek.com
DEEPSEEK_MODEL=deepseek-chat
```

其中：

- `DEEPSEEK_API_KEY` 必填，不能提交到 Git 仓库
- `DEEPSEEK_BASE_URL` 可选，默认使用 `https://api.deepseek.com`
- `DEEPSEEK_MODEL` 可选，默认使用 `deepseek-chat`

前端代码中不能出现 DeepSeek API Key。

## 6. 文件规划

建议新增文件：

```text
assistant.html
assistant.css
assistant.js
data/assistant-knowledge.json
api/chat.js
package.json
```

说明：

- `assistant.html`：AI 小助手独立页面
- `assistant.css`：AI 小助手页面样式
- `assistant.js`：聊天交互逻辑
- `data/assistant-knowledge.json`：展厅知识库
- `api/chat.js`：后端聊天接口
- `package.json`：用于安装后端依赖和本地开发

如果希望减少文件数量，也可以把 `assistant.css` 合并进 `style.css`。但为了避免主样式文件继续变大，推荐单独维护。

## 7. 页面交互设计

### 7.1 开始页入口

在现有开始页入口中新增：

```text
AI 智能导览
问黄鹤楼历史、楼层内容、手势玩法和展厅路线
```

点击后跳转：

```js
window.location.href = "assistant.html";
```

### 7.2 AI 小助手页面结构

页面包含：

- 顶部导航区
  - 返回数字展厅按钮
  - 页面标题：AI 智能导览
- 欢迎语
  - 简短说明小助手可以回答什么
- 聊天记录区
  - 用户消息
  - AI 回复
  - 加载状态
  - 错误提示
- 快捷问题区
  - 介绍黄鹤楼
  - 怎么使用手势导览？
  - 带我从一层开始参观
  - 摄像头打不开怎么办？
  - 文创互动怎么玩？
- 底部输入区
  - 文本输入框
  - 发送按钮

### 7.3 移动端体验

移动端建议使用全屏聊天布局：

- 顶部固定返回按钮
- 中间聊天记录滚动
- 底部输入框固定
- 快捷问题可横向滚动

这样比在 3D 页面上叠加浮窗更稳定，也不会遮挡模型和摄像头区域。

## 8. 知识库设计

新增文件：

```text
data/assistant-knowledge.json
```

建议结构：

```json
{
  "identity": "黄鹤楼沉浸式数字展厅 AI 导览助手",
  "floors": [
    {
      "floor": 1,
      "title": "楼阁初识",
      "description": "介绍黄鹤楼的整体印象、空间氛围和导览起点。"
    },
    {
      "floor": 2,
      "title": "建筑史话",
      "description": "介绍黄鹤楼的建筑演变和文化记忆。"
    },
    {
      "floor": 3,
      "title": "诗赋留痕",
      "description": "介绍黄鹤楼相关诗词与文学意象。"
    },
    {
      "floor": 4,
      "title": "江汉胜景",
      "description": "介绍黄鹤楼与江汉景观、城市视野之间的关系。"
    },
    {
      "floor": 5,
      "title": "城市象征",
      "description": "介绍黄鹤楼作为城市文化符号的意义。"
    }
  ],
  "gestureGuide": {
    "oneHand": [
      "单手伸出 1 至 5 根手指，可以唤起对应楼层的介绍。",
      "1 指对应第一层，2 指对应第二层，以此类推。"
    ],
    "twoHands": [
      "双手扩散可以放大模型。",
      "双手靠近可以缩小模型。",
      "双手合拢后做圆周运动可以旋转模型。"
    ]
  },
  "modules": [
    {
      "name": "手势导览",
      "description": "通过摄像头识别手势，控制黄鹤楼 3D 模型并查看楼层信息。"
    },
    {
      "name": "全息展示",
      "description": "用于观看黄鹤楼相关的沉浸式视觉展示。"
    },
    {
      "name": "文创互动",
      "description": "通过互动抽取或展示黄鹤楼主题文创设计。"
    }
  ],
  "faq": [
    {
      "question": "摄像头打不开怎么办？",
      "answer": "请确认使用 HTTPS 或 localhost 访问页面，并在浏览器中允许摄像头权限。"
    },
    {
      "question": "模型加载失败怎么办？",
      "answer": "请确认 lou 目录中的 OBJ、MTL 和贴图文件完整，并通过本地静态服务器或线上 HTTPS 地址访问。"
    },
    {
      "question": "手机能使用手势识别吗？",
      "answer": "建议部署到 HTTPS 平台后再用手机访问，否则浏览器可能限制摄像头权限。"
    }
  ]
}
```

第一版可以先使用项目现有资料填充。后续可从 `黄鹤楼逐层精讲介绍.pdf` 中整理更详细内容。

## 9. 后端接口设计

### 9.1 请求格式

前端向 `/api/chat` 发送：

```json
{
  "message": "黄鹤楼第一层讲什么？",
  "history": [
    {
      "role": "user",
      "content": "介绍黄鹤楼"
    },
    {
      "role": "assistant",
      "content": "黄鹤楼是武汉的重要文化地标..."
    }
  ]
}
```

### 9.2 返回格式

后端返回：

```json
{
  "reply": "第一层可以作为黄鹤楼的初识入口，适合从整体建筑印象、导览方式和文化氛围开始了解。"
}
```

### 9.3 后端处理流程

`api/chat.js` 负责：

1. 只允许 `POST` 请求。
2. 读取 `message` 和 `history`。
3. 校验 `message` 是否为空。
4. 限制单次输入长度，例如 800 字以内。
5. 读取 `data/assistant-knowledge.json`。
6. 拼接 system prompt。
7. 调用 DeepSeek API。
8. 解析 AI 回复。
9. 返回 `{ reply }`。
10. 发生错误时返回友好提示。

## 10. 系统提示词设计

后端发送给 DeepSeek 的 system prompt 建议如下：

```text
你是黄鹤楼沉浸式数字展厅的 AI 导览助手。

回答要求：
1. 使用简洁、亲切、适合展厅观众的中文。
2. 优先依据提供的展厅资料回答。
3. 不要编造资料中没有的具体年代、人物、文物细节。
4. 如果资料不足，请说明“目前展厅资料中没有明确说明”，并给出合理的参观建议。
5. 当用户询问操作问题时，用步骤式说明。
6. 回答不要太长，默认控制在 150 字以内；用户要求详细介绍时可以展开。
7. 如果用户询问与黄鹤楼、展厅、手势互动无关的问题，可以简短回答后引导回展厅导览。
```

同时把知识库内容作为上下文传入模型：

```text
以下是展厅资料：
{assistantKnowledge}
```

## 11. 前端聊天逻辑

`assistant.js` 负责：

- 渲染用户消息
- 渲染 AI 回复
- 处理输入框提交
- 处理快捷问题点击
- 调用 `/api/chat`
- 显示加载状态
- 防止重复提交
- 保存最近几轮对话历史

建议限制历史长度：

```text
最多保留最近 6 到 8 轮对话
```

这样可以控制请求体大小和模型成本。

## 12. 错误处理

前端错误提示：

```text
小助手暂时没有回应，请稍后再试。
```

后端错误场景：

- 未配置 `DEEPSEEK_API_KEY`
- DeepSeek API 请求失败
- 模型返回格式异常
- 用户输入为空
- 用户输入过长
- 请求方法不是 `POST`

后端不应该把原始 API Key、完整错误堆栈或敏感信息返回给前端。

## 13. 安全要求

必须遵守：

- 不在前端写入 DeepSeek API Key
- 不把 `.env` 文件提交到 Git
- API Key 只放在部署平台环境变量中
- 前端只请求自己的 `/api/chat`
- 后端限制输入长度
- 后端限制历史消息数量
- 错误信息避免泄露敏感数据

建议在 `.gitignore` 中加入：

```text
.env
.env.local
```

## 14. 开发阶段安排

### 阶段一：新增入口

- 修改 `index.html`
- 在开始页新增“AI 智能导览”按钮
- 在 `script.js` 中添加跳转逻辑

验收标准：

- 首页可以看到 AI 智能导览入口
- 点击后进入 `assistant.html`

### 阶段二：创建静态聊天页面

- 新建 `assistant.html`
- 新建 `assistant.css`
- 新建 `assistant.js`
- 实现聊天界面和快捷问题

验收标准：

- 页面能正常打开
- 输入消息后能显示用户消息
- 快捷问题按钮可点击
- 返回按钮可回到首页

### 阶段三：接入 DeepSeek 后端接口

- 新建 `api/chat.js`
- 新建 `package.json`
- 配置 DeepSeek 环境变量
- 实现 `/api/chat`

验收标准：

- 本地或部署环境中 `/api/chat` 能返回 AI 回复
- 浏览器源码中看不到 API Key

### 阶段四：接入知识库

- 新建 `data/assistant-knowledge.json`
- 填入楼层、手势、模块、FAQ 信息
- 后端把知识库加入 system prompt

验收标准：

- 询问楼层内容时，回答和项目资料一致
- 询问手势操作时，能给出准确步骤
- 询问摄像头问题时，能给出 HTTPS 和权限相关建议

### 阶段五：体验优化

- 添加加载状态
- 防重复点击
- 支持 Enter 发送
- 移动端布局适配
- 优化错误提示

验收标准：

- 连续点击发送不会重复提交
- 手机端输入和阅读体验正常
- API 报错时页面不会崩溃

### 阶段六：部署验证

- 在部署平台配置 `DEEPSEEK_API_KEY`
- 重新部署项目
- 使用电脑和手机访问
- 测试常见问题和自由问答

验收标准：

- 线上页面可以正常访问 AI 小助手
- AI 回复正常
- API Key 未暴露
- 原有手势导览、全息展示、文创互动不受影响

## 15. 本地开发建议

如果使用 Vercel Function，建议本地使用：

```powershell
npm install
npx vercel dev
```

如果后续使用 Cloudflare Pages Function，建议使用：

```powershell
npx wrangler pages dev .
```

当前第一版推荐使用 Vercel Function，原因是接入 Node.js 后端接口更直接，适合快速验证 DeepSeek 问答功能。

## 16. 后续扩展方向

第一版完成后，可以继续扩展：

- 流式输出，让回答逐字显示
- 语音播报，将回答转成讲解音频
- 语音输入，让用户直接提问
- PDF 知识库增强，将 `黄鹤楼逐层精讲介绍.pdf` 整理进知识库
- 根据用户兴趣生成参观路线
- 在手势导览页传递当前楼层给 AI 小助手
- 使用 `deepseek-reasoner` 处理复杂文化问答
- 增加后台日志，用于分析用户常问问题

## 17. 推荐第一版范围

第一版建议只实现：

- 开始页新增 AI 智能导览按钮
- 独立 `assistant.html` 页面
- 文字聊天界面
- 快捷问题
- DeepSeek `deepseek-chat` 接口调用
- 本地 JSON 知识库
- 基础错误处理和移动端适配

不建议第一版加入：

- 语音输入
- 语音播报
- 长期记忆
- 多模型切换
- 复杂检索系统
- 用户登录

这样可以保持改动范围清晰，优先把 AI 小助手功能稳定跑通。

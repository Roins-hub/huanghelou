# 黄鹤楼手势导览

一个基于 `Three.js + MediaPipe Hands` 的纯静态网页项目，用于展示黄鹤楼 3D 模型，并通过手势完成模型缩放、旋转和楼层信息导览。

项目无需构建工具，使用 `HTML + CSS + Vanilla JavaScript` 即可运行，适合直接部署到静态站点或上传到 GitHub Pages。

## 项目特色

- 纯静态文件，无需打包
- 使用 `OBJ + MTL + PNG` 加载黄鹤楼模型
- 基于 MediaPipe Hands 的实时手势识别
- 双手模式与单手模式分离
- 液态玻璃风格 UI
- 支持摄像头预览框大小调节
- 支持全局字体大小调节

## 手势交互规则

### 双手模式

- 双手扩散：放大模型
- 双手靠近：缩小模型
- 双手合拢后做圆周运动：旋转模型

### 单手模式

- 单手比出 `1` 到 `5` 指：弹出对应楼层介绍
- `1` 指对应第一层
- `2` 指对应第二层
- `3` 指对应第三层
- `4` 指对应第四层
- `5` 指对应第五层

## 楼层内容

- 第一层：楼阁初识
- 第二层：建筑史话
- 第三层：诗赋留痕
- 第四层：江汉胜景
- 第五层：城市象征

## 技术栈

- HTML5
- CSS3
- Vanilla JavaScript (ES Modules)
- [Three.js](https://threejs.org/)
- [MediaPipe Hands](https://developers.google.com/mediapipe)

## 项目结构

```text
.
├─ index.html
├─ style.css
├─ script.js
├─ lou/
│  ├─ huanghelou.obj
│  ├─ material.mtl
│  ├─ texture_pbr_20250901.png
│  ├─ texture_pbr_20250901_metallic.png
│  ├─ texture_pbr_20250901_normal.png
│  └─ texture_pbr_20250901_roughness.png
└─ 背景图.png
```

## 本地运行方式

推荐使用本地静态服务器运行，不建议直接双击 `index.html`。

### 方式一：Python

```bash
cd D:/3Dmoxing
python -m http.server 8000
```

浏览器打开：

```text
http://localhost:8000/
```

### 方式二：VS Code Live Server

如果使用 VS Code，也可以通过 Live Server 直接启动。

## 使用说明

1. 打开网页后允许摄像头权限
2. 等待模型和手势模块初始化完成
3. 通过双手缩放或旋转模型
4. 通过单手数字手势查看楼层介绍
5. 页面顶部可调节：
   - 全局字体大小
   - 摄像头预览面板大小

## 注意事项

- 推荐使用最新版 `Chrome / Edge`
- 液态玻璃相关效果在 Chromium 内核浏览器中显示更稳定
- 如果模型未加载成功，请确认：
  - `lou/` 目录存在
  - `OBJ / MTL / PNG` 文件完整
  - 当前通过本地静态服务器访问页面
- 如果摄像头不可用，手势识别将无法正常工作

## 适合部署的平台

- GitHub Pages
- Vercel
- Netlify
- 任意静态文件服务器

## 后续可扩展方向

- 增加模型热点标注
- 增加楼层切换动画
- 增加语音讲解
- 增加移动端手势适配优化
- 增加更多展陈信息面板

## License

如需开源发布，可按你的需要补充许可证，例如 `MIT License`。

# Assistant Guide Page Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the AI 智能导览 page match the approved immersive guide-desk design with a stronger chat area, floor distribution card, and mobile layout.

**Architecture:** Keep the current React + Vite app and Chatscope chat components. Add one small static `FloorGuideCard` component inside `App.jsx`, then update `assistant.css` to reproduce the approved layout and responsive behavior.

**Tech Stack:** React, Vite, Chatscope Chat UI Kit, CSS.

---

### Task 1: Add Floor Guide Content

**Files:**
- Modify: `assistant-app/src/App.jsx`

- [ ] **Step 1: Add static floor guide data above `App`**

```jsx
const floorGuideItems = [
  "一层：楼阁初识",
  "二层：建筑史话",
  "三层：诗赋留痕",
  "四层：江汉胜景",
  "五层：城市象征"
];
```

- [ ] **Step 2: Add a `FloorGuideCard` component above `App`**

```jsx
function FloorGuideCard() {
  return (
    <section className="floor-guide-card" aria-label="黄鹤楼层分布">
      <h2>黄鹤楼层分布</h2>
      <div className="floor-guide-card__body">
        <ul>
          {floorGuideItems.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
        <div className="floor-guide-card__image">
          <img src={heroImage} alt="" aria-hidden="true" />
        </div>
      </div>
    </section>
  );
}
```

- [ ] **Step 3: Render `<FloorGuideCard />` inside the chat container after `MessageList`**

```jsx
<MessageList>
  {messages.map((item) => (
    <Message
      key={item.id}
      model={{
        message: item.message,
        direction: item.direction,
        sender: item.sender
      }}
    />
  ))}
</MessageList>
<FloorGuideCard />
```

### Task 2: Match Desktop Visual Design

**Files:**
- Modify: `assistant-app/src/assistant.css`

- [ ] **Step 1: Update the left panel and return button styling**

Set the guide panel to a fixed paper-like width, keep the return button compact, and make quick question buttons match the reference image.

- [ ] **Step 2: Update chat panel geometry**

Set `.assistant-chat` to start near the horizontal center, keep the top label above the panel, and give the chat area a translucent paper surface.

- [ ] **Step 3: Style messages and avatars**

Keep existing `/assistant/机器人管理.png` and `/assistant/用户.png` assets, with fixed 42px avatars and readable paper message bubbles.

- [ ] **Step 4: Style `.floor-guide-card`**

Create a wide paper card with a title, divider line, two-column body, floor list on the left, image crop on the right, and stable dimensions.

- [ ] **Step 5: Keep input visible**

Style the Chatscope input so it sits below the floor card, centered inside the chat area, with a small red send button accent.

### Task 3: Mobile Layout

**Files:**
- Modify: `assistant-app/src/assistant.css`

- [ ] **Step 1: Compress the guide panel at `max-width: 900px`**

Make it full-width with small margins, horizontal quick questions, and no seal.

- [ ] **Step 2: Convert the chat area to a lower sheet**

Set `.assistant-chat` below the compact guide panel, spanning left/right/bottom.

- [ ] **Step 3: Stack the floor guide card**

Make `.floor-guide-card__body` one column and reduce image height.

- [ ] **Step 4: Prevent text overflow**

Reduce title size, message max-width, and avatar spacing on narrow screens.

### Task 4: Verify

**Files:**
- No code changes.

- [ ] **Step 1: Run assistant build**

Run: `npm --prefix assistant-app run build`

Expected: Vite build succeeds and writes to `assistant/`.

- [ ] **Step 2: Run tests**

Run: `npm test`

Expected: Vitest suites pass.

- [ ] **Step 3: Run local server and inspect**

Run: `npm run dev`

Expected: local server starts and `/assistant/` shows the updated guide-desk layout.

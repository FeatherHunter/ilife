---
"skill-calorie": patch
---

#106 HELP：逐场景「可执行命令」回补（裁决 Q11 第二半——F3 丢了逐场景 CLI 展示）

- **诊断**：`base-paint` 壳的逐场景 CLI 形态文本恒等于 `Scene.id`（`help.ts:391-393`，R32），#88 已让
  id 取场景键（414）／`main_prompt.cli` 原文（22 legacy），并登记 **L-09「完整 CLI 展示归 #106」**；
  而 SoT 的 `main_prompt.cli` 有 **376/436 条是已不存在的旧架构命令**（`python scripts/render_*.py` 370／
  `mavis` 3／`mmx` 2／裸键 1），复刻它违背旧 ADR-0008「必须遵守 3：可一键复制执行」。
- **回补落点**：`SceneEditableField`（**冻结槽位，零新增契约面**；`Scene` 机读属性集恒七键）→ 壳渲染进
  Sheet 详情层（`data-field="cli"` ＋ `可执行命令` 标签），对齐 ADR-0008 实施规范
  「`data_source` → ✅ cli 块 → **L4 直接显示**」。
- **取值单一真相**：`helpSceneCli(wakeWord)` ＝ **#81 路由层**（`triggers/routing.ts`）该唤醒词首条
  `kind==='exec'` 路由的 `cli`（恒 `calorie-cmd-read calorie.*`；**341/436**，`t81-exec-smoke.md` 全量实跑
  exit 0）。非 exec 的 **95** 条（out-of-scope 10／legacy-chain 85）**不发该行**，不造占位文案。
- **不回归**：卡面 `cliText` 仍恒 `Scene.id`（436 条逐字不变；261 条唯一 CLI < 341 条 → 塞进 id 会
  `duplicate-id`）；`data-scene-id` 436／`data-subgroup-id` 54／`data-action-id` 1308 三计数不变；
  `text` 态不含命令行（纯文本索引；#88 D-3 锁「尖括号集恒 `{<N>}`」）。
- **变体示例（Q11 另一半）：不补**（如实登记）——F1 的 31 变体属旧 12 分类快照、数据已不存在；当前 SoT
  （与旧 `_triggers.py` sha parity 冻结）仅 **5** 条变体／3 个宿主场景，其 label **全部不可路由**
  （非唤醒词／非别名／`routesFor` 零命中），其 prompt 指向不存在的唤醒词；且「同场景不同窗口」在新架构
  由 `--params` 表达，已由本票 CLI 行承载。
- **测试**：新增 `packages/skill-calorie/test/help-center-106.test.mjs`（8 用例：口径／死命令零泄漏／落位／
  卡面不动／复制参数记账／零契约面／三态记账／变体不补机械锁）；靶向 88／91／106／t11 共 49 pass 0 fail。

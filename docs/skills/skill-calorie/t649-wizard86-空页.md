# t649 · wizard-86 四处旧断言锚点重钉（#538 新措辞）

来源：票 [#649](https://github.com/FeatherHunter/ilife/issues/649)（map #159 收口遗留）。本件是交付证据，落点照 `docs/agents/doc-homes.md`。本票只改测试锚点，业务代码一行未动（`git diff --stat` 仅测试件＋本件）。

## 一 · 现象与根因（实施前逐条复核）

- 复现：`node tooling/run-locked.mjs --ticket 649 -- node --test packages/skill-calorie/test/wizard-86.test.mjs` ⇒ 8 pass / 2 fail（exit 1）：
  - 围度用例红 `空页应带复制区`（`:102` 断 `includes('复制 prompt')`）；
  - 体脂用例红 `空页 prompt 应先要来源`（`:136` 断 `includes('请选来源')`）。
- 根因链：`8a576155`「场景08 过程型五页重排」把两页可见文本改成人话——复制区从 `promptCopyArea` 缺省小标题「复制 prompt（必走）」改为一个动作区「复制指令」＋「复制数据」（`copyActionHtml`＋`dataCopyArea`）；体脂空页 prompt 占位从「请选来源（本页按默认……」改为「请先选来源。本页按默认的……」。「请先选来源」不含连续子串「请选来源」（「先」字隔断），新页含「复制指令」不含「复制 prompt」，旧断言必红。同窗 `ab5a4ccb` 只同步了 `t360`／`t366`、漏掉 `wizard-86`（该提交 stat 无此件）。
- 排除：`7f96c854`（#494）改的是档案预检页 `copyZone`，与两页引用链（`wizard.ts` → `body/wizardPlate` 取数 ＋ `body/wizardDocs` 装配，`prompt` 取自 `wizardPrompt`）无交集；`git show 7f96c854` 逐处复核与两条断言无关。正文原猜测作废。

## 二 · 改法（测试件四处，只换措辞锚点，手算值与结构断言不动）

`packages/skill-calorie/test/wizard-86.test.mjs`：

1. 围度空页：`includes('复制 prompt')` → `includes('还没量任何一项')`。不断「复制指令」的原因：该四字也落在公共层运行时脚本里（`var COPY_LABEL = "复制指令"`，每页 `<script>` 自带），断标题摘了复制区仍绿、不断牙；空态 prompt 首句只活在复制按钮的 `data-t` 里（全页唯一 1 处），摘区／改句两向必红。
2. 体脂空页：`includes('请选来源')` → `includes('请先选来源')`（`data-t` 唯一 1 处）。
3. 皮褶总和：`includes('7 处总和:82 mm')` → `includes('7 处总和：82 毫米')`（半角冒号＋`mm` 已改全角＋`毫米`；此前被第 2 条挡住未执行到，属同一根因）。
4. 越界句：`includes('(0, 60)')` → `includes('体脂率要在 0 到 60 之间')`（`bfRangeText` 旧串已下屏；同上，被挡住未执行到，同一根因）。

为什么是有意变更（非产品回退理由）：改文本那一笔是场景 08 的人话重排（编排者裁定口径：并列一条一行、内部叫法不上屏），同窗 `t366` 已按此同步且门全绿；复制区功能仍在（按钮＋载荷＋CLI 端到端全绿），页面行为无回归。

## 三 · 机器读数

```
node tooling/run-locked.mjs --ticket 649 -- node --test packages/skill-calorie/test/wizard-86.test.mjs
→ tests 10 / pass 10 / fail 0（改前 8/2；改中两处新增锚点是被前红挡住的同根因暗红）
node node_modules/typescript/bin/tsc -b packages/skill-calorie → exit 0（本票未改 src，构建恒绿）
邻门：t366-复制执行闭环 ＋ body-wizard-538 → tests 17 / pass 17 / fail 0
```

- 变异一（摘围度空页复制区：`wizardDocs.ts` 暂去 `copyActionHtml(v.prompt) +`，重建跑门）⇒ 围度用例红 `空页应带复制区`、其余 9 绿；已还原＋重建复绿。
- 变异二（改体脂首句「请先选来源」→「请先选出处」，重建跑门）⇒ 体脂用例红 `空页 prompt 应先要来源`、其余 9 绿；已还原＋重建复绿。
- 还原后 `git status` 无 `src/**` 改动，`dist/` 无跟踪变更（构建产物，未入跟踪）。

## 四 · 顺带（不在本票范围）

- `wizardPlate.ts` 里与新措辞重复的那段旧体脂文本（取数 view 已不走它）未删：按 triage Q2 推荐留给结构票／收口票，另附注释未加（保持测试件最小 diff）。
- 当刻工作区另有在途改动（`base-combos/src/present.ts`、`skill-calorie/test/cmd-write-40-persist.test.mjs` 分属他席）一律未碰，本次提交仅含本票两件。

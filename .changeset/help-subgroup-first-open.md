---
'base-paint': patch
'skill-bill': patch
'skill-calorie': patch
'skill-chef': patch
'skill-home': patch
'skill-memo-ilife': patch
'skill-schedule': patch
'dsh-bill-ilife': patch
'dsh-calorie': patch
'dsh-chef': patch
'dsh-home-ilife': patch
'dsh-memo-ilife': patch
'dsh-schedule-ilife': patch
---

feat(help): HELP 二级分组的默认态改成「每个分组页只展开第一个」；卡路里**速查台整支下线**（两份裁定都在 2026-09-24，用户逐字裁定）

**① 二级分组默认态**（用户：每个功能默认第一个 ITEM 展开、其余折叠）
- A 路（HELP 文件）：`packages/base-render/assets/help-template.html` 渲染循环按序位给 `open`（`si === 0`）；并补**搜索复位**——搜索期命中组会被自动打开（`sg.open = true`），清空搜索的复位支原先只恢复 `display`，现在一并回落成「只第一个展开」（不复位＝搜一次就把裁定悄悄改回去了）。
- B 路（组件式 `renderHelpShell`）：`src/help.ts:renderSubgroup` 收 `open` 形参、`renderGroupPage` 按序位传。
- 门：`gen:help-shell` 重生生成物与前后缀哈希 ＋ `gen:help-shell:check` 不漂移；新增回归用例 `packages/base-render/test/help-subgroup-open-default.test.mjs`（A 路走 headless 浏览器读 DOM、B 路判产物串，两半都锁默认态与搜索复位）。

**② 卡路里速查台整支下线**（用户逐字：「不存在速查台这种实际场景 这是多余的，我们只有 HELP HTML」）
- 入口：`calorie.help.center` 的 `mode`（`file`／`inline`／`text`）进来即 `exit 2` 并指路（照 #652 下线 `q` 支的先例）；`SHEET_FILE_STEM` 与复用窗口表里的那一项撤掉。
- 装配件：三态壳落地（`sectionFragment`／`inlineFragment`／`renderTextIndex`／`renderHelpCenterHtml`／`helpCenterAssets`／`HELP_CENTER_MODES`）＋ 两块 `meta_blocks`（「看板页入口」#107／「新词别名」#471）整族删除；取数面按归属律独立成 `src/photo/helpScene.ts`（304 行，**因此掉回 350 线内**，台账那一行由 `--sync` 剔除）。
- 随之下线：6 件老网页模板 `templates/*.html` 与装载器 `src/photo/templates.ts`（#107 当年为「不许存在但零引用」把它们挂进速查台；用户裁定连带下架），`package.json` 的 `files` 里 `templates/*.html` 同步撤。
- 裁定记录：72 条「补口词」（`NEW_KEY_ROUTES`）**不单独上页**（决策 A）——查单条走 `calorie.help.lookup`，页面上只剩一份 HELP HTML；标题「唤醒词速查台」**不改**（它描述的是内容形态，且是老实物逐字），只把 `helpFile.ts` 与 `helpScene.ts` 两个同值常量合并成一份来源。
- 测试面：`skill-t11`（#107 六件模板）整件删单；`help-center-88/91/106`、`help-new-family-471`、`help-paths-133`、`help-reuse-245`、`help-delivery-139`、`delivery-83` 里速查台那几条改成删单断言或删块（保留的判据＝数据类型面、`helpSceneCli`／`helpSceneCommand`、落点／命名／复用窗口、`calorie.help.lookup` 查找面）。

**版本与发版**：模板是六家共用（`base-paint`），故六家 HELP 一起变；六个插件精确 pin 技能版本、随技能版本一起走。`packages/base-render/AGENTS.md` 的「三包版本锁步」与 `pnpm base:floor`（下界＝仓内 base 版本）在定版那一窗一起对齐；本 changeset 只记账，未定版、未发版。

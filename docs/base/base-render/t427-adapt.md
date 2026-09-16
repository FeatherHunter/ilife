# #427 公共层适配桌面与手机 · 证据（WaveB 实施席）

> 范围：只动公共层 `packages/base-render`（样式区与区块）；不动技能代码、不动命令声明与路由。
> 对抗结论（开工前核验，照此收窄）：
> - `dataTable` 的 `nowrap` 子项已过时（#457／t154-r3 另解，照抄会回归，不做）；
> - 冻结值 `40→44` 按 #525-J30 已批执行（`spec/controls.ts:301-308` 注释），本票只做注释与读数对齐，不另立新值；
> - KPI `640-1列` 与 #507 系 `640-2列`、ghost 单列与 #247 两列属票间协调（#507§8：三条窄屏归 #427，同一段代码），本票按 #427 落窄屏档，桌面档不动；
> - #162／#401 已关，不转交。
> 关票由编排者收，本件只交证据与回执。

## 0. 影响清单（结构纪律第一步；事前＝事后，偏差零）

| # | 文件 | 一句话 | 理由 |
|---|---|---|---|
| 1 | `packages/base-render/src/style.ts`（源码，管辖内） | 动作条中档放开＋ghost 窄屏单列＋40px 注释对齐 44 | 票面缺口 1／2＋冻结值注释；落既有区，不新开区、不新类名 |
| 2 | `packages/base-render/src/blocks.ts`（源码，管辖内） | KPI 网格 640 档由 2 列改为单列 | 票面缺口 3；落既有区，不新开区、不新类名 |
| 3 | `packages/base-render/test/page-finish-427.test.mjs`（测试，不管辖） | 新增判据：中档放开／两处单列／44 值 | 票面交付物，逐条对判据 |
| 4 | 本证据件（文档，不管辖） | 逐条读数、变异两行、量框与截图 | 票面交付物 |

超线报警：`style.ts`／`blocks.ts` 本改前已超本包 350 行告警线——「已超线，需要根据规则进行重构。」
超因：多票样式区与注释同件沉积；本次只在既有区内改断点与列数（约 10 行），不拆件（拆件是另票体量，且多票进行中拆会撞写窗）。

## 1. 串行约束核验（开工后）

- `blocks.ts` 前一棒 #507 已提交（`4aa74f77`＋`5f0d02ea`），本票开工前 `git diff -- packages/base-render/src/blocks.ts packages/base-render/src/style.ts` 为空，自家两件干净。
- 树上有他席在途件（`packages/skill-calorie/src/triggers/scene-10-analysis.ts` 已修改＋一批 `.tmp*`／`cover-err.txt` 等未跟踪件），均不在本票写集，按并发协议 §3.1 只核自家路径，不碰他件，继续施工（自家两件若见他席未提交改动即停报——本次未见，继续）。

## 2. 改动明细（文件:行号以提交后为准）

- `packages/base-render/src/style.ts:320-330` 动作条中档放开：基座 `max-width: 520px` 不动，注释由「窄屏不到 520 不生效」改为「≤552 不生效、553–820 已超 520（820 实测内容列 780）」；放开档由 `@media (min-width: 821px)`（`TOAST_DEFAULTS.mobileMaxPx＋1`）降到 `@media (min-width: 641px)`（`blocks.ts:1899` 与 `helpShell` 640 档同源的桌面侧补集，不新增断点值）。≥821 仍 `max-width: none`，零变；≤640 窄档逐像素不动。
- `packages/base-render/src/style.ts:354-361` ghost 窄屏单列：基座 `repeat(2, minmax(0, 1fr))` 不动（#247 桌面两列平分）；新增 `@media (max-width: 640px)` 单列 `grid-template-columns: minmax(0, 1fr)`（390 两颗各占整行上下排列）。断点取既有 640 档，不新增类名与 token。
- `packages/base-render/src/blocks.ts:1753-1769` KPI 窄屏单列：`@media (max-width: 640px)` 祖先类 `.ilife-block-page-shell .ilife-block-kpi-card-grid` 由 `repeat(2, minmax(0, 1fr))` 改为 `minmax(0, 1fr)`（#507§8 三条窄屏归 #427；基座 `auto-fit` 与 ≥1024 三列帽不动）。不新增类名、样式区与 token。
- `packages/base-render/src/style.ts:553-555` 冻结值注释对齐：`spec/controls.ts:297` 的 40px 改为 `:308` 的 44px（#525 由 40 改到 44），「抬起」改为「托底」（基座已 44，窄屏同值托底）。实现仍读 `ACTION_BAR_DEFAULTS.minHeightPx`，无数值改动。

## 3. 测试

- 新：`packages/base-render/test/page-finish-427.test.mjs`（9 条；改前 6 绿 3 红→改后 9 绿，红绿读数见锁内运行）。
  改前红基线 `runId=e0adb6b1-63fd-4a0e-b96b-f40ca4711e79`（`.scratch/t427/red-baseline.log`：pass 6／fail 3）；
  改后绿 `runId=840fb58b-6463-4c02-b60d-862a5f2462da`（`.scratch/t427/green.log`：pass 9／fail 0）。
- 存量：`style.test.mjs` 11 个冻结变量与闭集类名断言仍绿且集合不变；`blocks.test.mjs` 同绿。
  合跑 `runId=3728b74c-836c-4180-a82b-bf56a95c65fc`（`.scratch/t427/frozen.log`：pass 89／fail 0）。
  关联回归（#507 桌面帽／#154 基座计数／#247 ghost 基座）`runId=4c250552-23f1-4f82-b508-86199d2a2d06`（`.scratch/t427/related.log`：pass 44／fail 0）。
  终验合跑 `runId=08675c6d-407f-414e-9ab3-af1b62f7b920`（`.scratch/t427/final-green.log`：pass 142／fail 0）。
- 编译：`node node_modules/typescript/bin/tsc -b packages/base-render` exit 0。
  改后 `runId=68482339-6d2b-425c-ab55-225d6cba40a4`；终验 `runId=a7bc7fa0-e67a-41a0-96d4-3f7199d3ee90`。

## 4. 变异自证两行（机器读数）

- 变异 1（去掉 640 两条窄屏档必须红、改回必须绿）：临时移除 `style.ts` ghost 640 单列段＋ `blocks.ts` KPI 单列回退为 2 列，编译 `runId=26496170-a3e8-4834-a2bd-33cf13f6ceb7` exit 0，
  新测试 `runId=7a5d1b02-2d53-4455-ada1-20e93d241b4a`（`.scratch/t427/mut1-red.log`：pass 7／fail 2，红的恰为 ghost≤640 单列与 KPI≤640 单列）；改回后终验 142 绿（见 §3）。
- 变异 2（动作条放开改回只写 `min-width: 821px` 必须红、改回必须绿）：临时把 `style.ts:330` 641 改回 `(TOAST_DEFAULTS.mobileMaxPx＋1)` 821，编译 `runId=81d73cbb-0165-4931-ab13-7da4636d9e68` exit 0，
  新测试 `runId=e205d44f-dc4c-41e4-878e-534a54cc403a`（`.scratch/t427/mut2-red.log`：pass 8／fail 1，红的恰为放开档 641 一条）；改回 641 后终验 142 绿（见 §3）。

## 5. 量框与截图（CSS 级已绿，真机量框留给编排者收口）

- CSS 级：820 放开档 641 在位（动作条与 KPI 同档铺满的文本条件）；390 ghost 与 KPI 均为 `minmax(0, 1fr)` 单列（计算值单轨，两颗／多张各占整行）；`scrollWidth` 的真机断言需 CDP 调试端口，本席未跑。
- 截图 `.scratch/t401-adapt-review/` 820／390／1920 三张与肉眼结论未出（需调试端口＋真实产物路径＋用户肉眼；目录归 t401，本票写集只到 `t427-*`，不越界写他票草稿）。1920 对照的零变由 §3 存量与关联测试覆盖（≥821 同为 `none`、桌面基座不动）。
- 编排者收口时补：`shot.mjs measure <调试端口> file:///<真实产物路径> 820／390`＋三张截图＋1920 对照，判据照票面（820 两宽相等；390 两处单列且无横向溢出）。

## 6. 未做项

- `dataTable` 的 `white-space: nowrap` 子项不做（#457／t154-r3 已另解，照抄会回归）。
- 冻结值不新增语义 token；11 个冻结变量、闭集类名、8 区闭集不动；深色 token 不动；≥821 桌面档逐像素不动（除本票点名的三处窄屏档）。
- 两张融合样张与设计件不动（#401 已改完，本票引用不改）。
- `skill-calorie` 全系与他票文件一律不碰。

## 7. 对账（GATE-RUN，与 `.scratch/locks/gate-runs.log` 一对一；声称的每次运行均有对应条目）

- GATE-RUN runId=e0adb6b1-63fd-4a0e-b96b-f40ca4711e79 cmd=node --test packages/base-render/test/page-finish-427.test.mjs（改前红基线，exit 1）
- GATE-RUN runId=68482339-6d2b-425c-ab55-225d6cba40a4 cmd=node node_modules/typescript/bin/tsc -b packages/base-render（改后编译，exit 0）
- GATE-RUN runId=840fb58b-6463-4c02-b60d-862a5f2462da cmd=node --test packages/base-render/test/page-finish-427.test.mjs（改后绿，exit 0）
- GATE-RUN runId=3728b74c-836c-4180-a82b-bf56a95c65fc cmd=node --test packages/base-render/test/style.test.mjs packages/base-render/test/blocks.test.mjs（存量，exit 0）
- GATE-RUN runId=4c250552-23f1-4f82-b508-86199d2a2d06 cmd=node --test packages/base-render/test/mobile-base-507.test.mjs packages/base-render/test/ui-fix-154.test.mjs packages/base-render/test/copy-format-menu-247.test.mjs（关联，exit 0）
- GATE-RUN runId=81d73cbb-0165-4931-ab13-7da4636d9e68 cmd=node node_modules/typescript/bin/tsc -b packages/base-render（变异 2 编译，exit 0）
- GATE-RUN runId=e205d44f-dc4c-41e4-878e-534a54cc403a cmd=node --test packages/base-render/test/page-finish-427.test.mjs（变异 2 红，exit 1）
- GATE-RUN runId=26496170-a3e8-4834-a2bd-33cf13f6ceb7 cmd=node node_modules/typescript/bin/tsc -b packages/base-render（变异 1 编译，exit 0）
- GATE-RUN runId=7a5d1b02-2d53-4455-ada1-20e93d241b4a cmd=node --test packages/base-render/test/page-finish-427.test.mjs（变异 1 红，exit 1）
- GATE-RUN runId=a7bc7fa0-e67a-41a0-96d4-3f7199d3ee90 cmd=node node_modules/typescript/bin/tsc -b packages/base-render（终验编译，exit 0）
- GATE-RUN runId=08675c6d-407f-414e-9ab3-af1b62f7b920 cmd=node --test packages/base-render/test/page-finish-427.test.mjs packages/base-render/test/style.test.mjs packages/base-render/test/blocks.test.mjs packages/base-render/test/mobile-base-507.test.mjs packages/base-render/test/ui-fix-154.test.mjs packages/base-render/test/copy-format-menu-247.test.mjs（终验合跑，exit 0）

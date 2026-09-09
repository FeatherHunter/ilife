# #106 · 红队审查报告（独立复跑 · 对抗式）

> 被审：`867536b`（实现）＋`1b3924a`（证据）。审查席 red13；只读＋自写探针。
> 完整性自检：审查前后 `packages/skill-calorie/src/render/helpCenter.ts` sha256 恒 `a85f02c2…e7b7e`；canonical 后 `SKILL.md` 无改动。

## ① 复跑清单（全部本席自跑）

| 项 | 结果 |
|---|---|
| `node docs/research/t106-probe-cli.mjs` | **11/11 fails=0**，exit 0 |
| 四门 build／boundaries／snapshot:check／publish:pre | **0／0／0／0** |
| 靶向 88／91／106／t11 | **49 pass 0 fail** |
| canonical `pnpm test` ×1 | exit 1（基线既有红）→ **base=34 after=29 新增 0 消失 5**（同实施者轮 2） |
| `t106-mutate.mjs` | **RESULT: PASS** |
| `check-gate-audit --allow-nonzero` 独立复跑 | **matched=17/17 undeclared=0 PASS**；17 个 runId 逐条命中**实时** `.scratch/locks/gate-runs.log`（cmd 不一致 0，非仅导出件） |

```
GATE-RUN runId=366c9b66-b8df-4f39-bd60-3fe40b788b5a cmd=pnpm test
GATE-RUN runId=da47b86e-3bd9-4352-9c19-39375542ece0 cmd=pnpm build
GATE-RUN runId=a6a459e7-ffbf-414e-8f59-100b8dbcf27f cmd=pnpm boundaries
GATE-RUN runId=55305ab1-5235-417d-a045-59f5e03fce0a cmd=pnpm snapshot:check
GATE-RUN runId=651d7bfe-5ac0-4ed5-ba85-f74386586ff8 cmd=pnpm publish:pre
GATE-RUN runId=e120f874-f5c2-4cab-9fea-55e797e7f29b cmd=node --test packages/skill-calorie/test/help-center-88.test.mjs packages/skill-calorie/test/help-center-91.test.mjs packages/skill-calorie/test/help-center-106.test.mjs packages/skill-calorie/test/skill-t11.test.mjs
```
变异复核 runId `db292a24-eabf-4dff-939f-c4f19e59a7fb`（ticket=106，exit 0）。

## ② 「341 条」独立复算 ＋ 实跑

- 自写正则（不复用探针 F）：file **341**／inline **341**／text **0**，`可执行命令` 标签 341。
- **全量 341 条**（非抽样）逐字 = `WAKE_ROUTES` 中该唤醒词首条 exec 路由 `cli`，文档序 `deepEqual`；形态恒 `calorie-cmd-read calorie.*`；唯一 CLI 261 条。
- **实跑 12 条**（10 分组各首条 ＋ 2 条含占位符）：**exit 0 ×12 且 envelope key = 路由 key ×12**。
- 3 条含 `<照片路径>`，需替换真实路径才可跑（与 t81-exec-smoke 口径一致）。

## ③ 不取 `main_prompt.cli`

- 全量：SoT 原文 **376 条** `!isExecCli`（python 370／mavis 3／mmx 2／裸键 `goal_history.list_completed_goals` 1）；产出 341 条无一 python/mavis/mmx。
- **341 条中 285 条与 SoT 原文不同** → 非照抄；抽样 12 条中 7 条原文是死命令、8 条与产出不同。
- 95 条 non-exec：数据层 `editable_fields === undefined`；卡内 `data-field=`／`可执行命令`／`field-value` 命中 **0**（不造占位文案）。桶构成独立数 = out-of-scope 10 ＋ legacy-chain 85。

## ④ 冻结面

`SPEC_FROZEN_SURFACE` 恒 **130**、pending 0；`Scene` 机读属性集恒**七键**、无 `cli`。`editable_fields`／`SceneEditableField` 是**既有冻结槽位**（`packages/base-render/src/spec/help.ts:30-36,45`，该文件末次改动 `3903b69`＝#78）；两 commit 未触碰 `packages/base-render/**` → **零新增契约面**成立。

## ⑤ 不回归

`data-scene-id` 436／`data-subgroup-id` 54／`data-action-id` 1308；HTML `id` 全唯一；六标记＋泛化 `<!--`/`-->` 命中 0；`renderHelpCenterHtml` 签名逐字未变；file/inline 有 `<style>`、text 无标签且场景行 436；卡面 `code.cli` 436 条逐字 = `Scene.id`（22 条 legacy 死命令 id 未变，L-19 保持）。

## ⑥ 变异复核（独立重跑）

M1 `helpSceneCli` 恒 null → build=0／testExit=1／**fail=4 RED** → 还原 sha `a85f02c2…` match=true → **fail=0 GREEN**。M2 新场景不挂 `editable_fields` → **fail=3 RED** → 还原 match=true → **GREEN**。本席另用文件哈希独立核还原，一致；无变异残留。

## ⑦ 自设新探针（打被审脚本盲区）

- **a 尖括号**：含 `<照片路径>` 的 CLI 1 条（3 场景共用）。产物**裸 `<照片路径>` 0 次**，`&lt;照片路径&gt;` 在 file／inline 均存在，`data-t` 与 `field-value` 值域 0 个裸尖括号 → **转义安全**（比实施者假设更强：payload 也走 HTML 转义）。
- **b 多 exec 路由**：全仓仅 `记身材照`×3；三条 `cli` 完全相同；取数组序首条、`routesFor` 同序、两次渲染逐条一致、50 词重复调用稳定 → 无歧义。**新发现**：三卡（单／备注／批量）示例同为单张 `photo.add`；能力面其实覆盖（`srcPaths` 数组 ≤20＝批量、`note` 可选＝备注，`cli/write.ts:653-662`），但**示例未按场景参数化**。
- **c text 态 vs #88 D-3**：自跑 D-3 通过（尖括号集恒 `{<N>}`）；CLI token 集 = `{<照片路径>}`，写进 text 必破 D-3。但**人为给 436 场景全挂字段后 text 仍 0 条** → 壳 text 渲染器**结构性不渲染 `editable_fields`**，D-3 只是假想冲突。

## ⑧ 体积归因

解析式复算**精确 = +231,168 B**：Sheet 字段行 122,502 ＋ `复制参数` 文本 48,576 ＋ payload JSON 60,090 → 归因完整、无他票混入，属本票必要代价（60 KB 为壳「payload＋DOM 双存」既有形态 P-5）。**口径有偏**：`1,264,822 B` 只在 `updatedAt: ''` 成立；按同文档 §6／探针口径 `updatedAt: '2026-09-09 12:00'` 实测 **1,264,882 B**（差 60 B；delta 仍精确）。

## ⑨ 缺陷清单

- **S1-交付缺陷 0；S1-过程违规 0；S2 0。**
- **S3-1**（本票）：测试文件注释 `353/436` ×2 与证据／源码 `376/436` 不一致（断言 `>300` 仍成立）。
- **S3-2**（本票）：体积数字未标口径，与文档自身复跑口径差 60 B。
- **S3-3**（本票）：L-106-04 把「text 不补」主因写成撞 D-3，实为结构性不渲染；D-3 与「未来 text 渲染字段」的跨票耦合未登记。
- **S3-4**（本票范围／根因在 #81）：三卡同一条单张示例，能力覆盖但未参数化。
- **S3-5**（本票）：`editable_fields.length === 1` 硬断言把冻结槽位锁成「恰一行 CLI」，与 t71 §E.3#10 真参数表单票耦合（全仓仅 HELP 壳消费该槽位）。
- **S3-6**（范围外）：`复制参数` 按钮文案与内容不符（现复制整条命令＋标签）；按钮文案属 base-render 冻结面，转 #89／#121。
- 范围外（不决定 verdict）：L-09 卡级仍 `Scene.id`，F1／F2 的「卡级 CLI」只做到「详情级 CLI」，由壳 `cliText` 冻结所致，证据 §3.4 已登记。

## ⑩ 五维 ＋ verdict

契约一致 **29**/30（零新增面、槽位既有；扣 1：槽位语义由「可编辑参数」转为只读展示行）｜证据真实可复现 **22**/25（全部复现；扣 3：体积 60 B 口径偏、注释 353 错数）｜parity **17**/20（341/436 已回补，位置差异＋变体不补均已登记）｜工程红线 **15**/15｜文档同步 **8**/10。**合计 91／100（均分 91）**。

**verdict：PASS**（无 S1-交付缺陷、无未处置的 S1-过程违规、均分 ≥85）。

> 复跑入口：`node docs/research/t106-probe-cli.mjs`；本席自写探针 `.scratch/orchestrator/red13-work/red13-probe{2,3}.mjs`（18/18、7/7）、`red13-size2.mjs`、`red13-audit.mjs`（gitignored 过程稿）。

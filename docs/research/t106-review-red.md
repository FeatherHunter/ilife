# #106 · 红队审查报告（独立复跑 · 对抗式）

> 被审：`867536b`（实现）＋`1b3924a`（证据）。审查席 red13。
> 自检：审查前后 `helpCenter.ts` sha256 恒 `a85f02c2…e7b7e`；canonical 后 `SKILL.md` 无改动。

## ① 复跑清单（本席自跑）

| 项 | 结果 |
|---|---|
| `node docs/research/t106-probe-cli.mjs` | **11/11 fails=0**，exit 0 |
| 四门 build／boundaries／snapshot:check／publish:pre | **0／0／0／0** |
| 靶向 88／91／106／t11 | **49 pass 0 fail** |
| canonical `pnpm test` ×1 | exit 1（基线既有红）→ **base=34 after=29 新增 0 消失 5**（同实施者轮 2） |
| `t106-mutate.mjs` | **PASS** |
| `check-gate-audit` 独立复跑 | **matched=17/17 undeclared=0 PASS**；17 个 runId **逐条命中实时** `.scratch/locks/gate-runs.log`（cmd 不一致 0，非仅导出件） |

```
GATE-RUN runId=366c9b66-b8df-4f39-bd60-3fe40b788b5a cmd=pnpm test
GATE-RUN runId=da47b86e-3bd9-4352-9c19-39375542ece0 cmd=pnpm build
GATE-RUN runId=a6a459e7-ffbf-414e-8f59-100b8dbcf27f cmd=pnpm boundaries
GATE-RUN runId=55305ab1-5235-417d-a045-59f5e03fce0a cmd=pnpm snapshot:check
GATE-RUN runId=651d7bfe-5ac0-4ed5-ba85-f74386586ff8 cmd=pnpm publish:pre
GATE-RUN runId=e120f874-f5c2-4cab-9fea-55e797e7f29b cmd=node --test packages/skill-calorie/test/help-center-88.test.mjs packages/skill-calorie/test/help-center-91.test.mjs packages/skill-calorie/test/help-center-106.test.mjs packages/skill-calorie/test/skill-t11.test.mjs
```
变异复核 runId `db292a24-eabf-4dff-939f-c4f19e59a7fb`（ticket=106，exit 0）。

## ② 341 条复算 ＋ 实跑

自写正则（不复用探针 F）：file／inline **341**、text **0**。**全量 341 条**逐字 = `WAKE_ROUTES` 首条 exec 路由 `cli`（非抽样）；唯一 261 条。**实跑 12 条**（10 分组＋2 占位符）：**exit 0 ×12、envelope key 全对**。3 条含 `<照片路径>`，需替换真实路径（同 t81 口径）。

## ③ 不取 `main_prompt.cli`

SoT 原文 **376 条** `!isExecCli`（python 370／mavis 3／mmx 2／裸键 1）；产出 0 条死命令；**285 条与原文不同**。95 条 non-exec：数据层无字段，卡内 `data-field=`／`可执行命令`／`field-value` 命中 **0**；桶 = 10＋85。

## ④ 冻结面

`SPEC_FROZEN_SURFACE` 恒 **130**、pending 0；`Scene` 恒**七键**、无 `cli`。`editable_fields` 是**既有冻结槽位**（`packages/base-render/src/spec/help.ts:30-36,45`，末次改动 `3903b69`＝#78）；两 commit 未触碰 `packages/base-render/**` → **零新增契约面**成立。

## ⑤ 不回归

`data-scene-id` 436／`data-subgroup-id` 54／`data-action-id` 1308；HTML `id` 全唯一；六标记＋泛化 `<!--` 命中 0；`renderHelpCenterHtml` 签名逐字未变；text 无标签、场景行 436；卡面 `code.cli` 436 条 = `Scene.id`。

## ⑥ 变异复核

M1 恒 null → **fail=4 RED** → 还原 sha match=true → **GREEN**；M2 不挂字段 → **fail=3 RED** → match=true → **GREEN**；另以文件哈希独立核对，无残留。

## ⑦ 自设新探针

- **a**：含 `<照片路径>` 的 CLI 1 条；产物**裸尖括号 0 次**、`&lt;照片路径&gt;` 在 file／inline 均在、属性域 0 裸尖括号 → **转义安全**（payload 亦转义）。
- **b**：全仓仅 `记身材照`×3 多条 exec 路由，三条 `cli` 相同；取数组序首条、两次渲染一致、50 词稳定 → 无歧义。新发现：三卡同一条**单张** `photo.add` 示例，能力面其实覆盖（`srcPaths` 数组＝批量、`note` 可选，`cli/write.ts:653-662`）但**未按场景参数化**。
- **c**：自跑 #88 D-3 通过（`{<N>}`）；CLI token 集 `{<照片路径>}` 写进 text 必破 D-3；但全挂字段后 text 仍 0 条 → 壳 text 渲染器**结构性不渲染**该槽位，D-3 只是假想冲突。

## ⑧ 体积归因

解析式复算**精确 = +231,168 B**（Sheet 行 122,502 ＋ 复制参数 48,576 ＋ payload 60,090）→ 归因完整、无他票混入。**口径偏**：`1,264,822 B` 只在 `updatedAt: ''` 成立；按文档 §6／探针口径实测 **1,264,882 B**（差 60 B，delta 仍精确）。

## ⑨ 缺陷清单

**S1-交付 0／S1-过程 0／S2 0。** S3：
① 测试注释 `353/436` ×2 与证据 `376/436` 不一致；
② 体积数字未标口径（差 60 B）；
③ L-106-04 把「text 不补」主因写成撞 D-3，实为结构性不渲染；
④ 三卡同一条单张示例未参数化（根因 #81）；
⑤ `editable_fields.length === 1` 硬断言与 t71 §E.3#10 真参数表单票耦合；
⑥ `复制参数` 按钮文案与内容不符（范围外，转 #89／#121）。
范围外（不决定 verdict）：L-09 卡级仍 `Scene.id`，「卡级 CLI」只做到「详情级 CLI」，由壳 `cliText` 冻结所致，证据 §3.4 已登记。

## ⑩ 五维 ＋ verdict

契约一致 **29**/30｜证据真实可复现 **22**/25｜parity **17**/20｜工程红线 **15**/15｜文档同步 **8**/10 → **合计 91／100（均分 91）**。

**verdict：PASS**（无 S1-交付缺陷、无未处置的 S1-过程违规、均分 ≥85）。

> 复跑入口：`node docs/research/t106-probe-cli.mjs`；本席自写探针 `.scratch/orchestrator/red13-work/red13-probe{2,3}.mjs`（18/18、7/7）＋`red13-size2.mjs`、`red13-audit.mjs`（gitignored）。

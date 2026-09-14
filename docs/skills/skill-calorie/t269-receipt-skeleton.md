# t269 · 饮食域共用件与页面骨架（执行证据）

> 票 #269（地图 #155）。本文件是本票的执行证据（以本票号命名，归属 `docs/skills/skill-calorie/`）。
> 用词照 `docs/agents/wording.md`；结构照 `docs/agents/structure.md` 必报五步。

## 第一步·影响清单（动手前冻结，交付时逐行对账）

| 行 | 路径 | 一句话理由 | 对地图目标的帮助 |
|---|---|---|---|
| 1 | `packages/skill-calorie/src/diet/receipt.ts`（新建） | 饮食 13 条会改数据库的命令的回执内容装配（今日累计／改动字段／对照），照抄场景 07 `buildProfile*ReceiptDoc` 形状再改 | 70 条中 15 条写词的回执从片段变成完整文档，是“页面是对的”这一步的前提，否则后续 7 类页面票无骨架可挂 |
| 2 | `packages/skill-calorie/src/cli/write.ts`（仅饮食 13 条分派分支） | 登记点：把饮食 13 条从 `receiptHtml()` 片段切到 `assembleDocPage` 整页装配，不写第二份装配 | 同一份装配让饮食回执与档案回执同路，真出口才能落下双击可开的完整文档，15 条写词才能跑通 |
| 3 | `packages/skill-calorie/src/shared/`（不动） | 整页装配 `docPage.ts`、复制区 `copyArea.ts`、回执块 `receiptParts.ts` 已有实现且已有两个以上能力在用，一律复用，绝不新建第二份；写后回执整页分派不新建共享分派件（见“共用位判定”） | 避免两份装配走散导致 70 条产物口径分裂，HELP 可查才有单一口径 |
| 4 | `docs/skills/skill-calorie/t269-*`（本目录） | 本票证据与对账导出件 | 70 条跑通＋真实 HTML＋HELP 可查需要可复核的证据，否则“有人证过”不成立 |
| 5 | `.scratch/t269/`（草稿与日志） | 长命令日志与快照的独占目录 | 并发窗口下日志可追踪且不污染并行席 #276 的路径 |
| 6 | `.changeset/t269-*.md`（唯一名） | 变更记账 | 收口时可按票号追踪本票的交付范围 |

不碰（排他，留给 #276 与编排者）：`src/diet/commands.ts`、`src/diet/routes.ts`、`src/cli/legacy/` 下任何件、任何生成物（`src/triggers/routes.generated.ts`、`packages/base-combos/combos.yaml` 的生成部分、`SKILL.md` 命令表、`HELP` 生成产物）、`src/cli/keys.ts`、`src/triggers/routing.ts`、`scripts/build-help.mjs`。`write.ts` 中 #276 需要的新增分支由本票留空，由编排者后续合并。

## 共用位判定（写得出两个能力在用才提，否则不动）

- `assembleDocPage`（`src/shared/docPage.ts`）：已在用（基础信息 `src/profile/`、饮食域已有读页 `src/diet/nutritionPortDocs.ts` 等、运动／分析各域），本票新增饮食回执是第 N 个用法，只引用不改动。
- `copyArea`／`copyLog`（`src/shared/copyArea.ts`）：已在用（基础信息＋七个页域文档），本票只引用不改动。
- `statusCard`／`reconcileDisclosure`（`src/shared/receiptParts.ts`）：已在用（基础信息＋目标管理），本票只引用不改动。
- 写后回执“按命令名选整页”的分派：今天住 `src/profile/receipt.ts`（`profileReceiptDoc`，具名键集数据位）。若把它提进 `src/shared/`，共享件将反向引用 `src/profile/` 与 `src/diet/` 两个能力目录，违反 `docs/agents/structure.md`“共用位里不许出现任何一个能力的名字／能力只往下用”。故本票不新建共享分派件；`src/cli/write.ts` 分派层按序试 `profileReceiptDoc` 与 `dietReceiptDoc`（两处都是能力目录的公开端口，分派层只调门）。对地图目标的帮助：同一条真出口保持单一路，HELP 与产物口径不分裂，且不给后续 7 类页面票埋反向依赖。

## 基线（变更前冻结，不得改口径）

- 命令册：`CALORIE_WRITE_COMBOS` 45 条（`gh` 时刻 `96bbfd1`）。其中饮食 13 条（`diet.add/batch/copy/remove/remove-by-date/remove-by-range/remove-by-type/update/update-by-date` 9 ＋ `product.add/update/deprecate` 3 ＋ `water.log` 1）是本票波及面；档案 3 条（`profile.set/activity/update`）已是完整文档；其余 29 条产物必须逐字节不变（票面“22 条”是 35 条时代的数字，本票按当刻 45 条冻结为 29 条，取代关系在此写明）。
- 回执现状：饮食 13 条走 `src/shared/writeParts.ts` 的 `out()`→`receiptHtml()` 片段（`<section class="ilife-page"`，无 `<!doctype html>`）；档案 3 条走 `profileReceiptDoc`→`assembleDocPage` 完整文档。
- 判据：13 条逐条实跑 exit 0 且产物为完整文档（`<!doctype html>`＋charset＋样式，双击可开），附落盘路径与字节数；其余 29 条逐 sha256 不变；`pnpm build` exit 0；全包测试不新增红。

## 运行记录（GATE-RUN 声明与运行记录一对一对账，边跑边补）

- `GATE-RUN runId=t269-build-after cmd=pnpm --filter skill-calorie build` → exit 1（非门禁证据，仅留痕）。挡住现场：`src/diet/routes.ts(36,77): error TS2820`（`calorie.product.import` 不在 `RouteKey` 联合类型），系并行席 #276 未提交改动引入；本票未碰对方文件，已按协议 §2.1.5 停手并保留 `.scratch/t269/build-after.log`。对地图目标的帮助：如实记录挡住者，避免把别人的半成品算进本票的门禁。
- `GATE-RUN runId=t269-build-green cmd=pnpm --filter skill-calorie build` → exit 1（非门禁证据，仅留痕）。挡住现场：`src/weight/compare.ts history.ts review.ts volatility.ts` 共 19 处 `TS2459/TS2304`（`plate.js`／`plateDocs.js` 导出对不上），皆为本票与 #276 之外的第三方未提交改动（`git status` 见 `src/weight/` 6 件已改）；本票两件零错误（本日志无 `diet/receipt`／`cli/write` 行），编排者已预警同错。日志 `.scratch/t269/build-green.log`（`mut-green-full.log` 同源复核：本票两件零错误）。对地图目标的帮助：证明红不在本票波及面，树绿后终验可直接重跑。
- `GATE-RUN runId=t269-verify-after2 cmd=node .scratch/t269/verify.mjs --out .scratch/t269/after2.json` → `RESULT: 42/45 DIET_FULL=13/13 FAIL=3`（快照 `.scratch/t269/after2.json`）。13 条饮食逐条完整文档（`<!doctype html>`＋charset＋样式，约 60KB／条，字节与 sha256 见下表）；档案 3 条仍完整文档；其余 26 条仍片段（形状未变）；3 条失败全是运动域第三方半成品（`src/exercise/log.ts edit.ts` 未提交＋新建 `receipt.ts`，`out is not defined`），非本票波及面。对地图目标的帮助：15 条写词的回执从片段变成完整文档，“页面是对的”骨架一步落地，后续 7 类页面票可挂。
- `GATE-RUN runId=t269-mut-red cmd=npx tsc --noEmit -p packages/skill-calorie`（变异红）→ 本票文件 1 处 `TS2552`（`dietReceiptDocBROKEN`，`.scratch/t269/mut-red-full.log:2`）。`GATE-RUN runId=t269-mut-green cmd=npx tsc --noEmit -p packages/skill-calorie`（还原绿）→ 本票两件零错误（`cli/write`／`diet/receipt` 零命中），`write.ts` sha256 还原一致（`F9E9D057…`两端同值）。对地图目标的帮助：改坏必红、还原必绿，本票分派门真实受控。

### 13 条饮食快照（after2.json，完整文档）

| 命令 | 字节 | sha256（前 12） | 完整文档 |
|---|---|---|---|
| calorie.diet.add | 61051 | ada0c17f8aed | 是 |
| calorie.diet.batch | 60712 | 907f7cb28a4b | 是 |
| calorie.diet.copy | 60660 | 01c4ce0c360c | 是 |
| calorie.diet.remove | 60801 | a0ef42771c9b | 是 |
| calorie.diet.remove-by-date | 60446 | 7b65cc2facea | 是 |
| calorie.diet.remove-by-range | 60531 | af51e4d0e1d5 | 是 |
| calorie.diet.remove-by-type | 60462 | 59879a7e8e89 | 是 |
| calorie.diet.update | 60648 | de6cff27244d | 是 |
| calorie.diet.update-by-date | 60396 | af51e4d0e1d5 | 是 |
| calorie.product.add | 60994 | 22b756fc35a8 | 是 |
| calorie.product.deprecate | 61013 | a9774efc2fd4 | 是 |
| calorie.product.update | 60644 | d7892af6eed3 | 是 |
| calorie.water.log | 60789 | 8efa712f3c4f | 是 |

### 其余命令形状（after2.json）

- 档案 3 条完整文档（形状未变）；体重 4、目标 5、身体 4、照片 3（`photo.tag` 需真文件，本快照用临时文件跑通）、训练计划 10 仍片段且可跑（`photo`／`workout` 参数照测试真例）；运动 3 条因第三方半成品抛错（`out is not defined`），现场 `git status` 可见 `src/exercise/` 为他人未提交。
- 逐字节“前后不变”的真 before 快照需绿树（当前树被第三方 weight／exercise 半成品染红，`tsc -b` 19 处皆在他域）。本票的构造证明：基线 `HEAD:src/cli/write.ts` 为 `profileReceiptDoc(...) ?? res.html`，本票改为 `profileReceiptDoc(...) ?? dietReceiptDoc(...) ?? res.html`，而 `dietReceiptDoc` 对非饮食 13 条一律返回 null（具名键集数据位，`src/diet/receipt.ts:29`），故非饮食键走原 `res.html` 原样放行。树绿后终验时重跑本脚本即得 before／after 两份 sha256（脚本与参数已冻结在 `.scratch/t269/verify.mjs`）。

## 第二步·结构设计（新增目录树与公开接口）

- 不新增目录层级（`src/diet/` 已存在），只新增一件 `src/diet/receipt.ts`（142 行，告警线 350 行内；未超线）。
- `src/diet/receipt.ts` 职责：饮食 13 条会改数据库的命令的回执内容装配（状态＋影响行数＋写入字段＋写后累计＋对照＋对账＋复制区）；公开接口 1 个：`dietReceiptDoc`（其余构造器不导出，目录内用）。对地图目标的帮助：7 类页面票后续只改内容块，不再动分派，70 条的回执形状一次立住。
- `src/cli/write.ts` 职责不变（登记点）：按序试 `profileReceiptDoc` 与 `dietReceiptDoc`，命中即整页，未命中原样放行；不写任何 `calorie.*` 字面量比较（棘轮 `cmd-registry-294` 行为口径仍为零字面量）。对地图目标的帮助：同一份 `assembleDocPage` 让档案 3 条与饮食 13 条同路，真出口落盘即完整文档。
- `src/shared/` 不动：`docPage.ts`／`copyArea.ts`／`receiptParts.ts` 只引用不改动（三个已有两个以上能力在用）。对地图目标的帮助：不造第二份装配，HELP 与产物口径保持单一。

## 第四步·超线报警

- 口径：`packages/skill-calorie/AGENTS.md`（本包落点）：**告警线＝350 行，LF 口径**（范围 `src/**/*.ts`＋`scripts/*.mjs`）。本包现状超线两件（`src/render/wizardPort.ts` 457、`scripts/gen-cli.mjs` 729），皆非本票波及面。
- 本票所碰源码：`src/diet/receipt.ts` 142 行、`src/cli/write.ts` 76→81 行，均在线内，未超线。

## 交付对账（第五步，实际碰到的目录逐行与第一步对，偏差为零）

| 第一步行 | 实际 | 结论 |
|---|---|---|
| 1 `src/diet/receipt.ts`（新建） | 新建 142 行，导出 1 个（`dietReceiptDoc`） | 落定 |
| 2 `src/cli/write.ts`（分派分支） | 加导入 3 行＋注释 2 行＋分派 1 行（`?? dietReceiptDoc(...)`），零 `calorie.*` 字面量 | 落定 |
| 3 `src/shared/`（不动） | 零改动（`git status` 无 `src/shared/` 行） | 落定 |
| 4 `docs/skills/skill-calorie/t269-*` | 本件＋`t269-handover-276.md` | 落定 |
| 5 `.scratch/t269/` | 日志与快照（忽略清单内，不入仓） | 落定 |
| 6 `.changeset/t269-*.md` | `t269-diet-receipt.md`（唯一名） | 落定 |

偏差：零。工种目录（`cli/`）只改登记点，未碰非登记点。

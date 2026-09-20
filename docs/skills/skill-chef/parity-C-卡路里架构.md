# 新卡路里：解耦架构参照

- 调查对象：`D:\ilife\packages\skill-calorie`（新卡路里，TypeScript）。只读调查，未改任何源码。
- 口径：行数一律 LF 口径 `readFileSync(f,'utf8').split('\n').length - 1`（仓规钦定口径，见 `docs/agents/命令登记纪律.md:158-159`）。
  本机 `Get-Content` 显示的数目**不等于**这个数（实测 `src/index.ts`：LF＝26，`Get-Content` 报 18），别拿它对数。
- 主要出处：`docs/agents/structure.md`、`docs/agents/命令登记纪律.md`、`docs/agents/命令登记纪律-照抄说明.md`、
  `packages/skill-calorie/AGENTS.md`、`.github/workflows/ci.yml`、包内源码逐件。

---

## 1 · 目录形状

包根（`Get-ChildItem D:\ilife\packages\skill-calorie`）：

```
dist/  node_modules/  scripts/(13 件 mjs+sh)  src/  templates/(6 件 html)  test/(207 件 *.test.mjs + 夹具)
workflows/(08-身体细节.md, 09-身材照片.md)
AGENTS.md  MIGRATE_ROLLBACK.md  SKILL.md  package.json  tsconfig.json  tsconfig.tsbuildinfo
```

`src/` 第一层（`Get-ChildItem D:\ilife\packages\skill-calorie\src`，18 个目录 ＋ 7 个文件）。
**能力域目录＝恰好同时有 `commands.ts` ＋ `routes.ts` ＋ `index.ts` 的目录**（判据可机器扫，见 `test/cmd-registry-294.test.mjs:50-60`）：

| 能力域目录 | ts 件数 | 声明键数（读/写） | 对应 HELP 一级分组 |
|---|---|---|---|
| `analysis/` | 28 | 22（22/0） | 分析 |
| `body/` | 21 | 10（6/4） | 身体细节 |
| `diet/` | 30 | 26（12/14） | 饮食 |
| `exercise/` | 19 | 10（7/3） | 运动 |
| `goal/` | 17 | 15（9/6） | 目标管理 |
| `home/` | 9 | 4（4/0） | 今日主页 |
| `photo/` | 31 | 11（8/3） | 身材照片（＋HELP 速查台） |
| `profile/` | 10 | 5（2/3） | 基础信息 |
| `weight/` | 21 | 9（5/4） | 体重 |
| `workout/` | 31 | 22（7/15） | 健身计划 |
| **合计** | — | **134（读 82／写 52）** | 与 `src/cli/keys.ts:2` 逐字相符 |

**共用位／基础设施目录（8 个，不含 `commands.ts`）**：

| 目录 | 是什么 | 关键件 |
|---|---|---|
| `cli/` | 唯一出口 ＋ 分派层 | `cmd_read.ts`（165 LF，`dispatch()` 在 :60）、`write.ts`、`readArgs.ts`、`delivery.ts`、`config.ts`、`health.ts`；`keys.ts`／`registry.ts` 是**生成物** |
| `triggers/` | 唤醒词与路由 | `routeSpec.ts`（类型唯一处，73 LF）、`routes.generated.ts`（生成物 530 LF）、`routing.ts`（逻辑＋类型再导出，267 LF）、`scene-01…scene-10`（l0 冻结词表）、`wake-assets.ts`（4757 LF，HELP 内容资产）、`help-lookup.ts` |
| `shared/` | 跨能力共用件（21 件） | `commandSpec.ts`（命令声明类型唯一处，90 LF）、`docPage.ts`（整页装配，149 LF）、`copyArea.ts`、`sourceLine.ts`、`pageStrips.ts`、`receiptParts.ts`、`params.ts`、`meal.ts`… |
| `render/` | 页面模板与 HTML 串 ＋ 部分按页装配件（24 件） | `html.ts`（586 LF）、`trendDocs.ts`／`trendPredictDocs.ts`、`sportDocs.ts`、`index.ts`（包内汇总 barrel，116 LF）；#704／#714～#716 起按归属律把属单一能力的件搬回能力目录 |
| `fetch/` | 读写库与取数库（12 件） | `diet.ts`／`body.ts`／`profile.ts`／`audit.ts`／`validate.ts`／`shapes.ts`／`cli.ts`（`skill-calorie-fetch` 这条 bin） |
| `xunji/` | 训记（外部服务）集成（19 件 ＋ `data/`） | `catalog.ts`／`push.ts`／`backfill.ts`／`key.ts`／`rateLimit.ts`／`run.ts` |
| `migrate/` | 一次性迁移 | `migrate.ts`（494 LF） |
| `db/` | 只读句柄 | `readonly.ts` |

`src/` 根文件 7 个：`config.ts`(72)、`health.ts`(510)、`index.ts`(26，**包门**)、`kcal.ts`(29)、
`output.ts`(264，落盘与命名)、`paths.ts`(44)、`schema.ts`(299)。

包自己的数字（`packages/skill-calorie/AGENTS.md`）：**文件行数告警线＝350 行，LF 口径，只数 `\n`**；
扫描面＝`src/**/*.ts` ＋ 包内 `scripts/**/*.mjs`（生成物与模板／测试／`dist` 不算）。超线是报警不是拦路。

---

## 2 · 命令登记机制

### 2.1 三件套：声明 / 生成器 / 校验

| 角色 | 落点 |
|---|---|
| **声明（唯一权威源）** | `packages/skill-calorie/src/<能力>/commands.ts`（每件**恰好导出一个** `satisfies readonly CommandSpec[]` 的数组），并在 `packages/skill-calorie/src/<能力>/index.ts` 再导出 |
| **类型唯一处** | `packages/skill-calorie/src/shared/commandSpec.ts` |
| **生成器** | `packages/skill-calorie/scripts/gen-cli.mjs`（847 LF）＋ `packages/skill-calorie/scripts/gen-routes.mjs`（238 LF） |
| **校验** | `pnpm gen:check`（＝`node packages/skill-calorie/scripts/gen-cli.mjs --check && …`，根 `package.json:13`） |
| **写盘** | `pnpm gen`（根 `package.json:12`） |

最短的一句（`docs/agents/命令登记纪律.md:8` 逐字）：
**「一条命令的事实只有一个定义地，就是它自己的能力目录；所有共用位都是那个定义地的派生件。」**

### 2.2 三个域的实际形状（摘片段）

`weight`（读 5 ＋ 写 4，参考实现）：`packages/skill-calorie/src/weight/commands.ts:30-40`

```ts
export const WEIGHT_COMMANDS = [
  { kind: 'read', key: 'calorie.view.weight', shape: 'stat', title: '体重盘', wakeWord: '看今日体重', flows: ['量体重', '体重复盘'], run: viewWeight, example: 'calorie-cmd-read calorie.view.weight' },
  { kind: 'read', key: 'calorie.view.weight-history', shape: 'stat', title: '体重历史', wakeWord: '看本周体重', flows: ['看体重明细', '看体重曲线', '看体重备注'], run: viewWeightHistory, example: '… --params \'{"days":7}\'' },
  { kind: 'write', key: 'calorie.weight.log', title: '记体重', wakeWord: '记体重', flows: ['量体重'], run: writeWeightLog, doc: weightReceiptDoc, example: '… --params \'{"kg":70.5}\'' },
] satisfies readonly CommandSpec[];
```

`body`（写 4 ＋ 读 6）：`packages/skill-calorie/src/body/commands.ts:31-34` —— 写声明**不写 `shape`**，只多一个 `doc:`（整页回执端口）：

```ts
{ kind: 'write', key: 'calorie.body.composition-add', title: '记体脂', wakeWord: '记体脂（皮褶钳）', run: writeCompositionAdd, doc: bodyReceiptDoc, example: '… --params \'{"source":"gym","bodyFatPct":18.5}\'' },
```

`analysis`（全读 22）：`packages/skill-calorie/src/analysis/commands.ts:417-431`，一条一行、`satisfies readonly CommandSpec[]` 收尾（:443）。
声明件头把「子功能 ↔ 键」逐条点名（`diet/commands.ts:14-23`：记饮食＝`log.ts`…看排行＝`ranking.ts`），**这就是「目录里文件名取自 HELP 下一级」的落法**。

### 2.3 声明字段（`src/shared/commandSpec.ts`）

- 读：`kind:'read'`／`key`／`shape`／`title`／`wakeWord?`／`flows?`／`example`／`run`（8 个）
- 写：`kind:'write'`／`key`／`title`／`wakeWord?`／`flows?`／`example`／`run`／`doc?`（8 个）
- `example` **必填非空、没有退回路径**；`wakeWord` 可缺（缺了速查表退回键名）；`flows` 取值是**封闭表**（帮助面场景的下一级分组名），名单外的名字 `pnpm gen` 与 `pnpm help:build` 见即抛。
- #703：写命令的信封形状**不写进声明**（写命令一律 `receipt`，那件事实的唯一定义地在生成器合成的 `cli/keys.ts`）。

### 2.4 共用位怎么派生（生成物文件路径，逐件）

`scripts/gen-cli.mjs:10-17` 自述的六路输出：

| # | 生成物路径 | 形状 |
|---|---|---|
| ① | `packages/skill-calorie/src/cli/keys.ts`（181 LF） | 导出名不变：`CALORIE_COMBOS`／`CALORIE_WRITE_COMBOS`／`CALORIE_VIEW_KEYS`…；键序＝写键（键名升序）在前、读键在后 |
| ② | `packages/skill-calorie/src/cli/registry.ts`（50 LF） | 一能力一行：`SOURCES` 数组 → `REGISTRY`（key→声明）＋ `REGISTRY_KEYS` |
| ③ | `packages/base-combos/combos.yaml` 的 **calorie 镜像段**（标记块 `GEN-CLI-START/END`） | 键表镜像 |
| ④ | `packages/skill-calorie/scripts/build-help.mjs` 的 **REPR 表**（标记块） | 代表唤醒词 |
| ⑤ | 同上 **EXAMPLE 表**（标记块） | 速查表「例」列 |
| ⑥ | 同上 **FLOW 表**（标记块） | 命令 → 工作流程名 |
| ⑦ | `packages/skill-calorie/src/triggers/routes.generated.ts`（530 LF） | 生成器 `scripts/gen-routes.mjs`；`WAKE_ROUTES`(437)／`NEW_KEY_ROUTES`(69)／`COVERAGE_REPAIR_ROUTES`(1)＋`ALL_ROUTES` |

派生的三条成立要件（`docs/agents/命令登记纪律.md:18-24`，逐字）：
**「① 确定性——同一份声明跑两次 `pnpm gen`，产物逐字节相同；② 哈希锁——产物入仓且「产物 ≠ 生成器输出」即可判定为假；
③ 机器校验在 CI 里真跑」**。判据不是「有没有生成器这个文件」。

新鲜度守卫：生成器读的是**编译后**的 `dist/`，故 `pnpm build` 在 `tsc -b` 之后调 `gen-cli.mjs --stamp`
往 `packages/skill-calorie/dist/.gen-inputs.json` 写**内容印记**（源与 dist 各一份 sha256，v2，**不看时间戳**）。
三道失败码：`GEN-STALE FAIL`（改了源没重建）／`GEN-PAIR FAIL`（印记自洽但现场对不上）／`GEN-CHECK FAIL`（盘上生成物 ≠ 生成器输出）。
生成链四步（`docs/agents/命令登记纪律-照抄说明.md:37` 逐字）：

```
pnpm build → pnpm gen → pnpm build → pnpm help:build
```

### 2.5 路由那一半（唤醒词面）

- 声明面：`packages/skill-calorie/src/<能力>/routes.ts`（一能力一件；**动前抢 `gate.lock` 并广播**）。
- 类型唯一处：`packages/skill-calorie/src/triggers/routeSpec.ts`。
- 记录面：生成物 `src/triggers/routes.generated.ts`，**日常零接触**。
- `src/triggers/routing.ts` 只留逻辑与类型再导出，**不承接记录数据**，不在生成器 `targets` 里（手改那道门不报红，由测试对账兜）。

### 2.6 `pnpm gen:check` 守什么（守的门）＋棘轮

- 生成物门：**生成物 == 生成器输出**，不等即 `exit 1` 并指出第一处差异；生成期另拦「同键两处声明」（`merge()`）与「一个 `commands.ts` 导出多于一个数组」。
- 棘轮：`packages/skill-calorie/test/cmd-registry-294.test.mjs`（331 行）——分派层（`src/cli` 全目录）**一条按键分支都不许有**（`case '…'`／`case "…"`／`if (key === '…')` 四种写法一视同仁）、
  `cmd_read.ts` 冻结 **1146 行**／`write.ts` 冻结 **745 行**（:19-20）、注册表每条声明与 `cli/keys.ts` 逐条对账、键集单源、老路容器 `src/cli/legacy/` 不许回来。
- 手跟的口径（唯一必须人跟的一处）：**新键要能被唤醒词命中，得有一条路由声明**；漏了红在两处（`test/calorie-routing-81.test.mjs` 的覆盖数、`cmd-registry-294` 的代表词回同键）；删命令时 `RouteKey` 是编译期约束，先过不了类型门。

---

## 3 · 页面装配骨架

### 3.1 `base-render` 提供了什么

目录名 `packages/base-render`，**发布名＝`base-paint@0.3.6`**（`packages/base-render/package.json:2`）。
`exports` 五条子路径（:8-15）：`.`、`./blocks`、`./docShell`、`./help-shell`、`./save-html`、`./package.json`。

| 件 | 提供什么 |
|---|---|
| `src/docShell.ts`（87 LF） | **整页装配的最后一层**：`renderDocShell(input)` 拼 `<!doctype html>` 起、`</html>` 止的骨架（head 三槽位／正文槽／两个 helpers 槽／图表位）＋资产拼接口径 `buildStyleSheet().css + '\n' + blocksCss() + ('\n' + extraCss)`。件头逐字：**「本件不写任何技能名／域名」**、**「`*Shell.ts` ＝某类文档的壳，一个文件对外只一个名字」**（`docShell.ts:8-11`） |
| `src/blocks.ts`（2571 LF） | 12 区块 ＋ 22 个 `export function`：`renderPageShell`／`renderKpiCard`／`renderKpiGrid`／`renderDataTable`／`renderTocBlock`／`renderCaliberLine`／`renderConclusionBar`／`renderChips`／`renderListRows`／`renderDisclosure`／`renderParamForm`／`renderCopyBlock`／`renderEmptyBlock`／`renderFeedbackBlock`…＋ `blocksCss()`。走子路径出口，**不进** `SPEC_FROZEN_SURFACE` |
| `src/helpShell.ts` | 帮助页壳 |
| `src/output/saveHtml.ts`（316 LF） | 落盘（`saveHtmlFile`／`HtmlLanding`；独占 `wx` ＋同秒递补） |
| `src/pageUi.ts`（307 LF）／`src/pageShapes.ts`（423 LF） | 页面级两层：移动端配方（断点／44px 触摸区／安全区／窄屏表格）与页面级形状件（事实条／图片与 GIF 容器／时间轴条／媒体占位件） |
| `src/spec/index.ts`（217 LF） | `SPEC_FROZEN_SURFACE` 冻结面清单（机器可读唯一真相源）；`src/ui.ts` 给 `createPageRegistry`／`pageOrReco`（单品页自注册，`PageKind = 'page' \| 'reco'`） |

**`base-render` 里没有「按域页型表」这个件**（详 §5）。它给的是骨架＋区块＋形状件；「这是哪一页、页头写什么」归调用方。

### 3.2 卡路里怎么用它：两个装配入口

```ts
// packages/skill-calorie/src/shared/docPage.ts:106（入口一：卡路里侧整页装配）
export function assembleDocPage(input: DocPageInput): string {
  … if (bline) { … return renderDocShell({ docTitle: input.docTitle, bodyHtml: body, extraCss, charts, pageUi }); }
  const eyebrow = …; const body = renderPageShell({ … });
  return renderDocShell({ docTitle: input.docTitle, bodyHtml: body, extraCss, charts, pageUi });
}
```

- **入口一（技能侧页头语义）**：`packages/skill-calorie/src/shared/docPage.ts:106` `assembleDocPage()`——
  11 字段：`docTitle`／`title`／`eyebrow`／`subtitle`／`content`／`charts?`／`metaLeft?`／`badge?`／`summary?`／`printable?`／`pageUi?`；
  A／B 双路（给了 `metaLeft` 才走新路）。件头自述谁在用：基础信息（`src/profile/`）与身体／照片（`src/body/wizardDocs.ts`／`src/photo/wizardPortDocs.ts`），饮食／运动／分析同走这一份。
  另有 `metricsOf()`（:143）做 stat-metrics 投影（`null`／`undefined` 不进投影）。
- **入口二（公共层文档壳）**：`base-paint/docShell` 的 `renderDocShell`（`packages/base-render/src/docShell.ts:73`）。
  #725 之前这一圈在卡路里侧，现在只剩「页头语义 ＋ 补丁样式」在技能侧（`docPage.ts:10-12` 逐字）。

各域自己的页装配件住 `src/<能力>/*Docs.ts`（如 `weight/plateDocs.ts`、`diet/todayDocs.ts`、`photo/galleryDoc.ts`），
共用小件住 `src/shared/`（`copyArea.ts` 复制区／`sourceLine.ts` 来源脚注／`pageStrips.ts`／`receiptParts.ts`／`operationHead.ts`／`emptyGuide.ts`）。

### 3.3 仓对 `packages/` 下源码形状的硬要求（`docs/agents/structure.md` 关键句逐条抄）

- 管辖：**「管 `packages/` 下全部源码：技能、插件、公共层，每个文件都管，无大小之分。」「不管：测试文件、页面模板、构建产物、生成的资产、文档。」**（:7-9）
- 包也有门（#703）：**「包对外的门＝包门 `src/index.ts` 转出的名字 ＋ `package.json` 的 `exports` 列出的键」**「两条都只许收窄」「不许给同一个东西开第二条对外路径」（:17-19）
- 铁律一 · 能力自治：**「一个能力的代码住在自己那个目录里。要用别的能力的东西，走它对外那一个公开接口。」「把对方那份抄一遍放进自己目录，不算走了接口」**（:25-27）
- 铁律二 · 概念唯一：**「同一个东西——常量、类型、公式、口径——在整个管辖范围内只有一个定义地，别处引用它。」**；清单要么标出处、要么换成指向权威出处的指针，**「会过期的清单不进规矩。」**（:32-39）
- 铁律三 · 改动可预告：**「类型上写得出具体形状：不出现 `any`，不出现说不出形状的 `unknown`。」**（:43）
- 铁律四 · 名字取自 HELP：**「能力目录名取自 HELP 的一级分组；目录里的文件名与公开接口名取自下一级（子功能）。名字只许从 HELP 的现成说法里取，不许自创。」**；违反的样子点名 **`utils`／`helpers`／`common`／`misc`／`core`／`types`／`base`** 与 **「名字带 `2`／`3` 的第二次追加」**（:48-53）
- 铁律五 · 接口小、里面厚：**「一个文件对外给的东西不多于五个，一个类型的字段不多于八个，其中至少一个真正干活。」**；汇总能力**「不许重算别家的口径，只许调别人的公开接口」**（:55-59）
- 结构标准：**「`src/` 下第一层必须是能力名，不能是工种名。」**「能力内部：一层到两层即可。分层依据是**变化频率**——同一批改动一起改的东西放近」「内部每一层只许往下用」「**依赖方向**：能力只往下用东西，不许反向。**共用位里不许出现任何一个能力的名字。**」「**共用件是从第二个用法里长出来的，不是预先设计的。**」「**就地摆正**」「**一次性脚本**住包内 `scripts/`，与源码目录分开」「**文件行数告警线**：具体数字由各包自己定」（:68-74）
- 必报五步（动作，按序做、每步报给用户）：**第一步 影响清单**（「每行指向**一个**能力目录；一行里出现两个能力名，就是这一步没做对」）／**第二步 结构设计**（「每个文件对外给的东西数得出不超过五个」；「新建目录层级、或者要碰三个以上能力时，等用户点头再动」）／**第三步 写代码**（「**只有出这个目录才算对外**：目录内互相用的东西不必对外给，接口自然就小」）／**第四步 超线报警**（当场报一句 **「已超线，需要根据规则进行重构。」**，后头接为什么超 ＋ 拆法或本次不拆的理由）／**第五步 交付对账**（「**这是整套纪律唯一的机械验收点**」）（:78-111）

---

## 4 · 机器门（命令逐字）

### 4.1 编译与包内 npm scripts

```
node node_modules/typescript/bin/tsc -b packages/skill-calorie
```
（仓规钦定编译入口；本机 `node_modules\.bin` 不存在，**`npx tsc` 是假出口**。）

`packages/skill-calorie/package.json:31-34` 只有两条 script，逐字：

```json
"build": "tsc -b && node scripts/build-help.mjs",
"test": "node --test ../../test/scaffold.test.mjs ../../test/calorie-triggers.test.mjs test/fetch-t6.test.mjs test/help-reuse-245.test.mjs"
```

### 4.2 仓根 npm scripts（`package.json:11-31`，逐字摘）

```
"build": "tsc -b && node packages/skill-calorie/scripts/gen-cli.mjs --stamp && node packages/skill-bill/scripts/gen-cli.mjs --stamp && pnpm -r --if-present run build:client",
"gen": "node packages/skill-calorie/scripts/gen-cli.mjs && node packages/skill-bill/scripts/gen-cli.mjs && node tooling/skill-call-form.mjs",
"gen:check": "node packages/skill-calorie/scripts/gen-cli.mjs --check && node packages/skill-bill/scripts/gen-cli.mjs --check && node tooling/skill-call-form.mjs --check",
"test": "node --test \"test/*.test.mjs\" \"packages/base-render/test/*.test.mjs\" \"packages/skill-calorie/test/*.test.mjs\" …（另九包同形）",
"help:build": "node packages/skill-calorie/scripts/build-help.mjs",
"help:examples:check": "node packages/skill-calorie/scripts/check-examples.mjs",
"boundaries": "node tooling/check-boundaries.mjs",
"snapshot:html:check": "node tooling/skill-html-snapshot.mjs --check",
"gate:run": "node tooling/run-locked.mjs",
```

持锁包装（编译／测试／git 写操作一律经它）：
```
node tooling/run-locked.mjs --ticket <票号> -- <命令…>
```

### 4.3 卡路里包里有哪些机器判据

| 门 | 命令逐字 | 在哪跑 |
|---|---|---|
| 类型/编译门 | `node node_modules/typescript/bin/tsc -b packages/skill-calorie` | 本地；CI 里是 `pnpm build` 的前半 |
| 生成物门 | `node packages/skill-calorie/scripts/gen-cli.mjs --check`（`pnpm gen:check` 的第一段） | CI `build-test` 第 1 门（`ci.yml:43-44`） |
| 测试面（207 件 `*.test.mjs`） | `node --test "packages/skill-calorie/test/*.test.mjs"`（根 `pnpm test` 里的一段） | CI `build-test`（`ci.yml:47-48`）＋ `win-detail` job（:136） |
| 棘轮 | `node --test packages/skill-calorie/test/cmd-registry-294.test.mjs` | 含在上一条 glob 内 |
| 路由对账 | `node --test packages/skill-calorie/test/calorie-routing-81.test.mjs` | 同上 |
| 结构边界 | `pnpm boundaries`＝`node tooling/check-boundaries.mjs` | CI `build-test`（`ci.yml:49-50`） |
| 六技能 HTML 不回归 | `pnpm snapshot:html:check`＝`node tooling/skill-html-snapshot.mjs --check` | CI `build-test`（`ci.yml:53-54`） |
| 速查示例可执行 | `pnpm help:examples:check`＝`node packages/skill-calorie/scripts/check-examples.mjs` | CI `build-test` 末位（`ci.yml:72-73`，**票外既有红**） |
| 行数门（350 LF 台账） | `node packages/skill-calorie/scripts/check-warning-line.mjs` | **不在 npm scripts、不在 CI**，包内 AGENTS.md 要求手跑；回绿＝`node packages/skill-calorie/scripts/check-warning-line.mjs --sync`（先 `--dry` 演练） |
| 测试缝门（spawn 真出口必须解析 envelope） | `node packages/skill-calorie/scripts/check-page-assert.mjs`（自证 `--selftest` 五条） | 同上，手跑 |
| 同一符号只许一条 dist 路径 | `node packages/skill-calorie/scripts/check-one-path.mjs`（自证 `--selftest`） | 同上，手跑 |
| 独立验收探针（三桶，`UNACCOUNTED` 必须空） | `node docs/skills/skill-calorie/t293-验收-命令自治.mjs` | 手跑（口径见 `docs/agents/命令登记纪律.md:143-150`） |

CI 结构（`.github/workflows/ci.yml`）：`build-test` 矩阵 os `ubuntu/macos/windows` × node `22.13.0/24.x`，
八道门**每道都带 `if: always()`**（一步红不许吞掉其余门，`ci.yml:35-42` 写明了这条的来由）；
另有 `publish-gates`（`pnpm publish:pre`／`publish:tarball`／`publish:fresh`／模板资产门）与 `win-detail`（`pnpm doctor`＋`pnpm test`）。

### 4.4 判据四条（`docs/agents/命令登记纪律.md:133-150`，照这四条查，别查感觉）

1. 加一条命令，`git status` 里除声明与生成物之外还有没有手写文件？有就是形状没做到。
2. 手改一件生成物，`pnpm gen:check` 红不红？红＝门有鉴别力；绿＝门坏了。基线红不是放宽门的理由。
3. 加一条命令要碰几处？**只有两处**：`src/<能力>/commands.ts` ＋ `src/<能力>/routes.ts`；其余全是派生。
4. 独立验收探针的三桶里 `UNACCOUNTED` 是不是空的？非空 ⇒ 还有面没被认下，报上去，别当误报。

---

## 5 · 「按域页型表」与「域声明」的实际形状

### 5.1 结论先说

- **卡路里包里没有 `declaration.ts` 这种「域声明」件，也没有「按域页型表」这件事。**
  一条命令/一条唤醒词的事实分住两处声明：`src/<能力>/commands.ts`（命令事实）＋ `src/<能力>/routes.ts`（唤醒词→键）；
  第三件 `src/<能力>/index.ts` 是**能力门**（对外面）。
- 「按域页型表」是**饼干记账（skill-bill）侧** #685／#724 的规格产物：`docs/skills/skill-bill/t685-按域页型表.md`
  （工作副本 `packages/skill-bill/docs/t685-按域页型表.md`）。#724 明确把卡路里列为 **Out of Scope**：
  「卡路里侧 110 处调用点与其页型表（本规格只让它改走同一份机制）」（逐字见 `docs/agents/t699-收口调查.md:183-184`）。
  也就是说：**这份参照要从卡路里拿的，是「声明住能力目录 ＋ 共用位全由生成器派生」这套机制，不是页型表。**

### 5.2 域声明的字段清单（两侧对照）

| | 卡路里（本文调查对象） | skill-bill（新侧兄弟件，供对照） |
|---|---|---|
| 域声明文件 | **无**；等价事实分住 `src/<能力>/commands.ts` ＋ `src/<能力>/routes.ts` | `packages/skill-bill/src/<域>/declaration.ts`（8 份，含 `src/help/declaration.ts`） |
| 域级字段 | 无（域名＝目录名，取自 HELP 一级分组） | `DomainDeclaration{ id, label?, icon?, order, entries[], subgroups[] }`（`packages/skill-bill/src/triggers/routeSpec.ts:80-87`） |
| 词条字段 | 路由声明 `RouteDecl`：`list`('wake'\|'new'\|'repair')／`order`／`wakeWord`／`scene`('01'…'10')／`kind`('exec'\|'non-exec')／`key?`／`cli?`／`bucket?`／`reason?`（`src/triggers/routeSpec.ts:63-73`） | `WakeEntryDecl{ phrase, key, preset?, needs?, carries?, scenes[] }` |
| 场景字段 | 冻结词表件 `src/triggers/scene-01…scene-10*.ts`（19 字段 JSON 形态，含 `category`／`wake_word`／`main_prompt`／`types`／`order`）＋ `wake-assets.ts`（4757 LF typed 资产） | `WakeSceneDecl{ id, title, status, prompt_template, types[] }` |
| 命令声明 | `ReadCommandSpec`／`WriteCommandSpec`（8 字段，见 §2.3） | `packages/skill-bill/src/shared/commandSpec.ts`（**代表唤醒词不在里面**，#721 撤：按 `key` 从域声明算） |
| 合并位 | 生成物 `src/cli/registry.ts` ＋ `src/triggers/routes.generated.ts` | 手写薄合并件 `src/triggers/wakeTable.ts` ＋ `src/triggers/wake-assets.ts` |

### 5.3 「页型」在卡路里怎么和域对上

- 页型＝**信封形状** `EnvelopeShape`，闭集六值 `list / detail / stat / receipt / analysis / fallback`
  （定义地 `base-paint` 的 `STRICT_ENVELOPE_SHAPES`，`packages/base-render/src/spec/index.ts:64`）。
- 卡路里**读命令**声明上只出现三值：`stat` 73 条／`list` 7 条／`analysis` 1 条／`detail` 1 条（82 读键合计）；
  **写命令一律 `receipt`，且不写在声明上**（#703，定义地在生成器）。
- 页头「页型徽章」由调用方传：`assembleDocPage({ badge })`——**不传或传空串即整颗徽章不渲染**（`src/shared/docPage.ts:39-42`，
  注释逐字：「B线老A壳第1行右：类型徽章。**由调用方传页型**（如「整体趋势」／「热量趋势」／「组合分析」）；不传或传空串即**整颗徽章不渲染**」）。
- 所以「域 ↔ 页型」在卡路里是**逐命令声明的关系**，不是一张按域的表；跨域的页框靠 `shared/docPage.ts` ＋ `base-paint/blocks` 的区块复用，不靠页型表。

### 5.4 归属律的现场（重构参照要看的债务面）

`src/render/` 是**跨能力共用位与「属单一能力的页面件」混住**的过渡区；#704 起按「归属律」把只被一个能力目录引用的件搬回能力目录
（如 `sportPortDocs.ts` → `src/exercise/`、`planEditorRuntime.ts` → `src/workout/`、`wizardPort.ts` → `src/photo/`），
搬迁判据一律是**产物逐字节相同**。参照时别把 `src/render/` 当成「共用位的样板」——它是正在收口的搬迁债务。

---

## 6 · 「唤醒词 → 命令 → HTML 绝对路径」索引页／清单

**卡路里 `src/` 里没有产出这类索引页的命令或件**（也没有对应键）。它是**验收侧脚本的产物**，住在 `docs/`：

| 位置 | 形状 |
|---|---|
| `docs/skills/skill-calorie/t369-链路总表.mjs`（94 LF，生成器） | 件头逐字：**「链路总表生成器：prompt → 唤醒词 → 命令 → HTML 绝对路径（一页可点）。」**「只读两处真源：唤醒词 prompt 取 `packages/skill-calorie/src/triggers/scene-08-body.ts`，产物映射取同目录 `manifest.json`；出同目录 `t369-链路总表.html`（自检：缺链 exit 1）」 |
| 产物 `docs/skills/skill-calorie/t369-验收/t369-链路总表.html` ＋ `manifest.json`（80 KB） | manifest 键：`generatedAt`／`declsSource`／`gate{separator,overflow,fmt}`／`results[]`（每行：`word`／`order`／`key`／`kind`／`exit`／`params`／`file`（绝对路径）／`rel`／`bytes`／`sha256`／`fullPage`）／`process[]`（写前预检确认页那一支） |
| 表行形状（`t369-链路总表.mjs:52-59`） | 六格：`序号` ／ `意图＋<details>看完整 prompt</details>` ／ **唤醒词** ／ `<code>calorie-cmd-read …</code>` ／ **`<a href=绝对路径>` HTML** ＋ `exit=… · NNKB · 整页 ✓` ／ 过程页（无则印 `—（读词／对比／删除无过程页）`） |
| `docs/skills/skill-calorie/scene02-验收墙/链路总表.html`（71 KB，`restage.mjs` 重出） | 表头 8 列逐字：`# ｜ prompt 示例（点复制拿去新 session 发）｜ 唤醒词 ｜ 命令 ｜ 参数 ｜ 页型 ｜ 流程 ｜ 产物绝对路径（点直达）`（`restage.mjs:85`）；同目录还有 `总索引.html`／`桌面墙-1280.html`／`手机墙-390.html`／`manifest.json` |
| `docs/skills/skill-calorie/t268-链路清单.json` ＋ `t268-链路总览.html`（`t268-链路总览.build.mjs`） | 清单 JSON 键：`ticket`／`generated_at`／`page`／**`chain`（值逐字 `prompt → 唤醒词 → 命令 → HTML 绝对路径`）**／`today_pinned`／`placeholders`（`<日期>`→`2026-09-12` 这类）／`frozen_table`／`count{total,read7,write13,other_read19}`／`by_page_family`／`by_template` |
| `docs/skills/skill-calorie/t369-验收/README.md`、`t369-链接自检.mjs`、`t369-总索引.html` | 自检（缺链 exit 1）＋索引壳 |

要点：这类页**不是**技能产物，也**不进** `src/` 的键表；它是「拿真出口跑一遍、把落盘路径收集成 manifest、再由脚本渲染成一页可点」的验收器械，
所以它天然是「会过期的清单」——按铁律二，它只能当外部观察，不能当规定（`docs/agents/structure.md:36-39`）。

---

## 7 · 一句话总结（给重构照抄的骨架）

**一条命令的事实住它自己的能力目录（`src/<能力>/commands.ts` 声明 ＋ `src/<能力>/routes.ts` 路由），
能力门是 `src/<能力>/index.ts`，其余共用位（索引／键表／速查表／路由记录）一律由 `pnpm gen` 从编译后的声明派生、
由 `pnpm gen:check` 逐件比对、由 CI 每轮真跑；页面侧只留「页头语义 ＋ 补丁样式」，文档壳交 `base-paint/docShell`，
区块交 `base-paint/blocks`，共用小件从第二个用法里长出来。**

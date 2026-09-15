# t276 · 餐别 5 条唤醒词（运行期接不上餐别参数）修复（Lane F / `wf155-f`）

基线 `D:\ilife` 的 HEAD ＝ `8c1d94b59aa91b915ec736ed466d2e0fa784d7ed`（开工前实测）。
工作目录 `D:\ilife-wt\wf155-f`（基点同一 sha）；`D:\ilife` 一字未改。日志 `.scratch\t276f\`。
判据脚本 `docs/skills/skill-calorie/t276-餐别修复-run.mjs`（自播种子、自取基线、命令行一律读运行期总表原文）。

## 一 · 判定

| 判据 | 判定 |
|---|---|
| 1 五条词各自实跑 exit 0、五份产物内容互异、各含对应餐别名 | **PASS**（互异 5/5；早餐／午餐／晚餐／加餐／全部餐别各自命中） |
| 2 场景 01「看今日饮食概览」产物逐字节未变 | **PASS**（`bdc9623f…` 改动前＝改动后） |
| 3 `pnpm gen` 后 `pnpm gen:check` exit 0 | **PASS（exit 0）**；但改动前它是 **RED（exit 1）**，见第四段第 1 条 |
| 4 变异自证 | **PASS**：`MUTANT_EXIT=1 … 互异=1/5` ／ `RESTORED_EXIT=0 … 互异=5/5 命中=5/5` |
| 5 `npx tsc -b packages/skill-calorie` exit 0 | **PASS** |
| 附 `pnpm boundaries` | PASS（额外读数） |

五条词**改动前**的实况（本席独立复现上一席的缺陷读数）：全部 exit 0、`h1="饮食总览"`、
各 101653 B、**互异 1/5** ⇒ 词面与产物对不上。

## 二 · 机器证据

```
播种            calorie.diet.batch 一条写命令 → 真表读：7d 窗 2026-09-09 ~ 2026-09-15 共 28 条，四餐别各 7 条
改动前 全跑      42 条判据：绿 30 红 12 ；判据 2 互异 1/5 ；五条词 h1 全 "饮食总览"
改动后 全跑      47 条判据：绿 47 红 0 ；互异 5/5 ；H1 全 "餐别分布 2026-09-09 ~ 2026-09-15"
判据 5（场景 01） 当刻 bdc9623fcd6e1ee0d800ddd1494eacec448a0bf7d6812773a67ef770f741d17a
                 基线 bdc9623fcd6e1ee0d800ddd1494eacec448a0bf7d6812773a67ef770f741d17a  （79536 B，逐字节同）
判据 5（看饮食总览）当刻＝基线 8100b5b8dfaec1c795309e01eb04a18bcbfc7964a1c41f7960b650e942f549d4（101653 B）
只认值不猜值      {"window":"7d","meal":"宵夜"} → exit 2「缺参数 meal（餐别：早餐／午餐／晚餐／加餐／all）：收到「宵夜」」
别名同一处        {"window":"7d","meal":"全部餐别"} → exit 0（`mealParamOf` 的别名表，本票未新增取值表）
变异自证          MUTANT_EXIT=1  exit0=5/5  命中餐别名=0/5  互异=1/5
                 RESTORED_EXIT=0  exit0=5/5  命中餐别名=5/5  互异=5/5
npx tsc -b packages/skill-calorie   EXIT=0
pnpm gen                            EXIT=0（派生件 sha256 5d752eab… 与 HEAD 逐字同值 ⇒ 该文件本次无内容变更）
pnpm gen:check  改动前 EXIT=1 ／ 改动后 EXIT=0
pnpm boundaries                      EXIT=0（PASS）
```

## 三 · 逐条路径（命令行取自运行期总表 `ALL_ROUTES`，不手打；`…` ＝ `.scratch\t276f\db\calorie_html\`）

| 唤醒词 | 运行期 `--params` | exit | 产物 | 字节 | sha256（前 16） | 命中餐别串 |
|---|---|---|---|---|---|---|
| 看早餐（最近 7 天） | `{"window":"7d","meal":"早餐"}` | 0 | `…\饮食总览_20260915_195717.html` | 75989 | `1da864fc07d18909` | 早餐 |
| 看午餐（最近 7 天） | `{"window":"7d","meal":"午餐"}` | 0 | `…\饮食总览_20260915_195717_2.html` | 75989 | `004a35ea37fa81e1` | 午餐 |
| 看晚餐（最近 7 天） | `{"window":"7d","meal":"晚餐"}` | 0 | `…\饮食总览_20260915_195717_3.html` | 75989 | `833cee58a5f2e48e` | 晚餐 |
| 看加餐（最近 7 天） | `{"window":"7d","meal":"加餐"}` | 0 | `…\饮食总览_20260915_195717_4.html` | 75989 | `8a77cc149130749a` | 加餐 |
| 看全部餐别分布（最近 7 天） | `{"window":"7d","meal":"all"}` | 0 | `…\饮食总览_20260915_195718.html` | 91765 | `7850b06aabc48c01` | 全部餐别 |

四份单餐别页字节数相同但 sha256 互异；另有更强的判别读数：早餐页只出 `BF-` 明细行、
不出 `LN-／DN-／SN-`（其余三页同理），全部餐别页四餐明细都出。

源码改动只两件：`packages/skill-calorie/src/home/routes.ts`（那五行各加餐别参数）、
`packages/skill-calorie/src/home/today.ts`（`viewDietOverview` 收 `meal` 时走
`src/diet/index.ts` 的门 `buildMealDistributionView`，页交 `render/dietDocs.ts` 的既备支；
不给 `meal` 时那两处一行不执行）。`src/diet/` 未动；取值域与解析只有 `mealParamOf` 一处。

## 四 · 未做项与下一手缺什么

1. **【与编排者前提不符，需入账】** 改动前本检出上 `pnpm gen:check` **本来就是 RED（exit 1）**，不是 PASS：
   盘上 `src/triggers/routes.generated.ts:85` 已是 `{"window":"7d","meal":"早餐"}`，而**声明源**当时是 `{"window":"7d"}`
   ⇒ 上一席 `8c1d94b` 提交的派生件是从**未提交的编译产物**生成的（生成器读编译后的声明模块
   `dist/home/routes.js`，而当时工作区那份带着餐别参数）。所以那五条词的运行期命令行**早已带参**，
   真缺口只剩处理体（实测：改动前五条词的 cli 已带 `meal`，产物仍全是「饮食总览」）。
   本次声明改动让「源 ↔ 派生件」重新一致，`gen:check` 随之转绿；派生件本身无需改（sha256 未变）。
   **下一手**：这类「派生件带走了未提交的声明状态」只有 `gen:check` 能拦，任何 lane 提交派生件前必须先跑它。
2. **本席交付不关票**，票面正文未改；视觉（页头／版式／复制区）不做脚本化判定，留负责人肉眼。
3. 产物**落盘名**仍是 `饮食总览_*.html`（页头已是「餐别分布」）——命名取自命令键／标题，
   不在本票授权范围（只准改那两件），交给命名那一票或负责人裁定。
4. 餐别那一支的 `data.metrics` 仍是宿主命令原有的总览口径（页面换了、JSON 指标没换）。
   判据未要求，且改成餐别口径要定 JSON 形状，故留白：**下一手**若需要，改点在 `src/home/today.ts` 同一处。
5. **环境事实**：worktree 的 `node_modules` 是到 `D:\ilife\node_modules` 的联结，`pnpm run` 的依赖预检
   会判定布局不符并中止（`ERR_PNPM_ABORTED_REMOVE_MODULES_DIR_NO_TTY`，未执行任何删除）；
   故 `gen`／`gen:check` 用 `pnpm --config.verify-deps-before-run=false gen[:check]` 跑的是同一个脚本，
   另有直跑 `node packages/skill-calorie/scripts/gen-cli.mjs --check` 的读数。**不许**在此布局下跑 `pnpm install`。
6. `gen:check` 报 `GEN-STAMP WARN`（缺 `dist/.gen-inputs.json`）：印记由 `pnpm build` 写，而 `pnpm build`
   因范围外红（`base-render/test-d/contract-signatures.ts:390`，`minHeightPx 40` vs 实况 44）从未跑到。
   该警告按设计不判红；印记补上后配对门才生效。
7. 变异自证一度出现**假红**：`tsc -b` 在 Windows 上因 `copyFileSync` 连时间戳一起复制而**跳过重编**，
   还原后 dist 仍留变异体。脚本已改为直起 `tsc -b --force` 并**回读 dist 内容**判定换版
   ——凡是「编译后看运行期」的判据都该这样回读，否则增量编译能造出假绿／假红。

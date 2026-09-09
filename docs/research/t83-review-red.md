# #83 红队审查报告（wayfinder #63 · HTML-First 工作流与渲染失败回执）

- 被审：`8439976`（实现：三态交付 ＋ envelope `delivery` ＋ 渲染失败回执）／`14a7701`（证据／变异／对账源／changeset）。
- 审查席：**红队（本 session 自任）**——独立复跑 ＋ **自建探针**，不采信实施者结论；蓝队席**缺**（见 §9 与票面）。
- **结论：verdict FAIL（五维 82）** —— **S1-交付缺陷 ×1（R-1 相对落点）** ＋ S3×5。
- **返修 `R-1` 已闭环**（§4）：1 行修复 ＋ 3 条回归测试 ＋ 红队探针 33/33 ＋ 变异 M3 红→绿 ＋ 四门 exit 0 ＋ 靶向 59/59；**定点复核 verdict PASS（五维 90）**。

---

## ① 被审范围与路径

- `git show --stat 8439976`：6 文件（`cli/cmd_read.ts`／`output.ts`／`render/envelope.ts`／`test/delivery-83.test.mjs`／`test/help-center-91.test.mjs`／`docs/research/t83-evidence.mjs`）；`14a7701`：4 文件（`t83-html-first.md`／`t83-mutation.mjs`／`t83-gate-runs.log`／`.changeset/t83-html-first-delivery.md`）。
- **路径合规**：全部落在票面声明面内；`packages/base-render/**`／`packages/base-paint/**`／`render/helpCenter.ts`／`render/receipt.ts`／`render/html.ts`／`SKILL.md`／`templates/**`／`tooling/**` **零改动**（`git show --stat` 逐笔核对）。
- **授权改动核**：`test/help-center-91.test.mjs` 实为 **2 token**（`:33` `ENVELOPE_FIELDS` 5→6、`:81` 断言文案），`:114-115`（`strip` 比较）与 `:189`（照片路径 data 键集）**原样通过**——与编排者授权一致。
- **契约面兼容核**：`base-render` 的冻结签名 `STRICT_ENVELOPE_FIELDS`（5 项，`spec/template.ts:233`）在 `template.ts:195-203` 是**存在性**校验（`hasOwnProperty`），**不拒绝多余键** → 顶层追加 `delivery` **不违反** 130 条冻结面；`contract-signatures.test.mjs:578` 的类型断言不受影响。

## ② 红队独立探针（`docs/research/t83-review-red.mjs` → `RESULT-RED: 33/33 PASS`，exit 0）

| 探针 | 内容 | 结果 |
|---|---|---|
| R1 | 相对 `SKILLS_DB_PATH`（子进程 cwd 设进 tmp、DB 给 `.`）→ exit 0 ＋ `mode=file` ＋ `path` 绝对 ＋ `path===data.output` ＋ 产物存在 ＋ `bytes===statSync().size` | PASS |
| R2 | 相对 `--output` → exit 0 ＋ 回传路径＝实际写入路径 ＋ 绝对 | PASS |
| R3 | 相对 DB 路径 ＋ **写键** → exit 0 ＋ `template=receipt` ＋ **只读打开真库读回** `food_log`「💧水」`n=1/ml=250`（不信回执自报） | PASS |
| R4 | 绝对落点对照组：`path === data.output === --output` 逐字不变 | PASS |
| R5 | `delivery.path` 绝对不变量**仍生效**（`buildDelivery` 传相对 path 仍抛 `bad-input`）——证明 R-1 是在归一化处修的，不是把不变量拆了 | PASS |
| R6 | 只读目录（`icacls` DENY）→ ② 内联态：exit 0 ＋ `mode=inline` ＋ 无 `path`／`data.output` ＋ `data.html` 与 ① 落盘产物**逐字相同** | PASS |
| R7 | 结构错落点 → exit 5 ＋ stdout 空 ＋ 一行 `RECEIPT` ＋ `template=receipt` ＋ 含建议命令 ＋ 不退化为「未知失败」 ＋ 占位文件未被改写 | PASS |
| R8 | P9：成功态 stdout 恰一行 JSON | PASS |

**红队自曝（证据可信度）**：本探针**首轮自误报 5 条**（`RESULT-RED 28/33`）——R6 未先清空 `calorie_html` 基线产物 → 只读目录下**覆盖同名旧文件仍成功**（文件自身 ACL 不受目录 DENY 影响）→ 误判为文件态；R3 用 `calorie.view.home` 读回 → 空库 `missing-data` exit 4。**两处均为探针缺陷、非产品缺陷**，已修（清空基线 ＋ 改只读直读 sqlite）后 33/33。留痕：`.scratch/t83/review-red.log`（gitignored）。

## ③ 缺陷清单

### R-1（**S1-交付缺陷** · 用户可见回归）相对落点：产物已写盘却 exit 2

- **复现（返修前，真机）**：
  - `SKILLS_DB_PATH=.scratch/…`（**相对**）＋ 无 `--output` → `exit 2`，stderr `ERR 2: 参数失败：delivery.path 须为绝对路径：.scratch\…\calorie_html\身材照HELP_….html`，**而该 1,264,822 B 产物已落盘**、stdout **无 envelope**（调用方拿不到 `data.output`）。
  - `--output .scratch/…/rel.html`（相对）→ 同上（文件已写出、exit 2）。
  - **写键**（`calorie.water.log`）：**库已写入**、回执已落盘，仍 exit 2 —— 按 M4 判据（「成功 ＝ exit 0 且产物存在」）会被当成**写失败**，诱导重试 → **重复落库**（数据风险）。
- **根因**：`output.ts:deliverHtml` 把落点**原样字符串**当 `delivery.path` 回传（`resolveExplicitHtmlPath` 不归一化），而 `envelope.ts:buildDelivery` 有「`path` 须绝对」的不变量 → 抛 `CalorieRenderError('bad-input')` → `cmd_read.ts` 外层 `fail(2)`。**写盘已经发生**（`writeFileSync` 在抛错之前）。
- **性质**：`SKILL.md:31` 明写「`--output <路径>` 显式覆盖**任意路径**」；`paths.ts:12-21` 的 `resolveDbDir()` **原样返回** `SKILLS_DB_PATH`（无 `resolve`）。→ 相对路径是**被文档化的既有能力**，返修前**可用**（`8439976^` 无任何绝对路径校验，`writeFileSync` 按 cwd 解析）。故属**用户可见回归**。
- **修复（R-1，1 行）**：`deliverHtml` 内 `const written = resolve(target)`，写的就是它、回传的也是它——`delivery.path`／`data.output` 恒绝对，落盘行为与旧版逐字一致。
- **鉴别力**：变异 **M3**（还原「原样回传」）→ `delivery-83.test.mjs` **fail=3**（恰为新增三例）；还原后 sha256 逐字节相同 ＋ 重建后 13/13 绿。

### S3（记账跟进，不阻塞关闭）

- **S3-1 文档漂移**：`test/help-center-91.test.mjs:8` 文件头注释仍写「envelope 全字段＝`version/skill/shape/key/data`」（五字段）——实施者已自认（`t83-html-first.md §7-2`），授权范围只限 2 token，注释未改。
- **S3-2 只读回退的**「显式落点被静默忽略」：`--output <只读路径>` → 转 ② 内联态、exit 0，且 `delivery` 里**不带** `reason`（`HtmlDelivery` 有 `reason` 但 `buildDelivery` 未透出）→ 用户无法得知「你给的落点被忽略了、产物在 stdout 里」。建议后续把 `reason` 作为 `delivery` 的可选字段或在 stderr 提示（属契约追加，须另票）。
- **S3-3 回执覆盖面**：旧铁则字面「渲染失败（**退出码非 0**／产物缺失）→ 错误回执」覆盖 `missing-data`（exit 4），本票只对 exit 5 发回执（exit 4 仍只有一行 `ERR 4:`）。口径澄清留账。
- **S3-4 类型缝**：`cmd_read.ts:dataTextOf` 用 `as unknown as Parameters<typeof buildDataText>[0]` 强转 base-paint 入参——上游签名若变，编译期不报错。建议收窄为真实入参类型。
- **S3-5 对账源可复现性**：证据 §5 声明的四门命令是 `node .scratch/t83/gates.mjs`，而 `.scratch/` **被 gitignore**（`git ls-files --error-unmatch` 报 pathspec 不存在）→ 新克隆无法逐字复跑该条（#120 曾因同类问题被扣分）。四门**本身**可复现（`pnpm build／boundaries／snapshot:check／publish:pre`），本席按后者逐条重跑（§5）。

## ④ 返修与定点复核

| 项 | 内容 |
|---|---|
| 改动 | `packages/skill-calorie/src/output.ts`（`deliverHtml` 归一化回传路径，+8/−2 注释＋1 行逻辑）／`packages/skill-calorie/test/delivery-83.test.mjs`（⑥ 三例：相对 DB 路径、相对 `--output`、相对 DB 路径＋写键）／`docs/research/t83-mutation.mjs`（新增 M3）／本报告 ＋ `t83-review-red.mjs` |
| 未改 | `cmd_read.ts`／`envelope.ts`／`helpCenter.ts`／`base-render/**`／`base-paint/**`／`SKILL.md`／`tooling/**` **零改动**；`delivery` 契约、三态语义、回执形态、P9 全部逐字不变 |
| 定点复核 | 探针 **33/33**、靶向 **59/59（0 fail）**、四门 **0/0/0/0**、变异 **15/15**（M1 fail=1／M2 fail=8／M3 fail=3，三次还原 sha256 逐字节相同）、canonical 见 §5 |
| 结论 | **R-1 闭环；定点复核 verdict PASS（五维 90）** |

## ⑤ 门禁实测（全部经 `run-locked --ticket 83`；runId 逐条见 §7）

| 门 | 命令 | exit | 关键行 |
|---|---|---|---|
| 四门 | `pnpm build` | 0 | `tsc -b` 无 `error TS` |
| | `pnpm boundaries` | 0 | 13 条 OK |
| | `pnpm snapshot:check` | 0 | 快照 == 实际 |
| | `pnpm publish:pre` | 0 | PASS |
| 靶向 | `node --test` delivery-83／cmd-read-t11／render-copy-90／help-center-91／skill-t11／output-naming-87 | 0 | **tests 59／pass 59／fail 0** |
| 红队探针 | `node docs/research/t83-review-red.mjs` | 0 | `RESULT-RED: 33/33 PASS` |
| 变异 | `node docs/research/t83-mutation.mjs` | 0 | `RESULT-MUT: 15/15 PASS` |
| canonical | `pnpm test`（1 轮） | 1 | `tests 1137 suites 133 pass 1112 fail 25`（既有红）→ `t101-fail-set`：**base=34 after=29 新增=0 消失=5**（消失 5 条全部是基线已登记的抖动项：`#41 M3`／`#76 无宿主证据`／`#80 HELP 生成`／`helpers ≤820px`／`③ check-combos`） |
| 白名单 diff | `git diff --stat -- docs/research/t88-baseline/test-failset.txt .scratch/t88/baseline/test-failset.txt` | — | **0 行** |

事故 #124 自检：跑完 `git status --short` 无 `SKILL.md` 改动；变异残留扫描 `MUT-\d` **0 命中**。

## ⑥ 变异自证（单锁内「变异→重建→红→还原→重建→绿」＋ sha256）

| 变异 | 落点 | 变异轮 | 还原 sha256 | 还原后 |
|---|---|---|---|---|
| M1 摘掉只读回退 | `output.ts:deliverHtml` | 红 fail=1 | `1F29FD8A…A275E1` → 同值 | 绿 13/13 |
| M2 摘掉 `delivery` 注入 | `cmd_read.ts:buildDeliveredEnvelope` | 红 fail=8 | `9B5D9548…B61785` → 同值 | 绿 13/13 |
| **M3 还原相对落点原样回传**（本席新增） | `output.ts:deliverHtml` | **红 fail=3** | `1F29FD8A…A275E1` → 同值 | 绿 13/13 |

## ⑦ 机械门禁对账

对账窗口：`--ticket 83 --since 2026-09-09T15:31:50.000Z --until 2026-09-09T15:35:10.000Z`；对账源 `docs/research/t83-review-gate-runs.log`（受跟踪）。

GATE-RUN runId=f7874e83-1819-4a88-9a3b-5d01e013dfd6 cmd=pnpm build
GATE-RUN runId=79a9c4f2-cd6f-4b1c-ab43-394a9777113a cmd=node --test packages/skill-calorie/test/delivery-83.test.mjs packages/skill-calorie/test/cmd-read-t11.test.mjs packages/skill-calorie/test/render-copy-90.test.mjs packages/skill-calorie/test/help-center-91.test.mjs packages/skill-calorie/test/skill-t11.test.mjs packages/skill-calorie/test/output-naming-87.test.mjs
GATE-RUN runId=5aa91f76-ef70-4238-9522-9b47667a1fc3 cmd=node docs/research/t83-review-red.mjs
GATE-RUN runId=a2d2bede-2195-4e2c-9cdb-9dc16e76e405 cmd=node docs/research/t83-mutation.mjs
GATE-RUN runId=fa9f09fc-8c6f-4621-9451-291187c8ac30 cmd=pnpm boundaries
GATE-RUN runId=38a23ac9-668f-4a43-8618-6ad1284677d1 cmd=pnpm snapshot:check
GATE-RUN runId=1bfee536-e6a6-4e4d-b537-b8dfbb02965c cmd=pnpm publish:pre
GATE-RUN runId=72dc41ac-ffcc-44f2-b10b-b5e3e5a7e823 cmd=pnpm test

**过程轮（非门禁证据，逐条声明）**：

GATE-RUN runId=c24b074d-2251-4170-95d1-8b2c3720d954 cmd=node --test packages/skill-calorie/test/delivery-83.test.mjs packages/skill-calorie/test/cmd-read-t11.test.mjs packages/skill-calorie/test/render-copy-90.test.mjs packages/skill-calorie/test/help-center-91.test.mjs packages/skill-calorie/test/skill-t11.test.mjs packages/skill-calorie/test/output-naming-87.test.mjs
GATE-RUN runId=dbbf5903-703f-4cdc-afe2-b32fc2ea7a9c cmd=node --test packages/skill-calorie/test/delivery-83.test.mjs packages/skill-calorie/test/cmd-read-t11.test.mjs packages/skill-calorie/test/render-copy-90.test.mjs packages/skill-calorie/test/help-center-91.test.mjs packages/skill-calorie/test/skill-t11.test.mjs packages/skill-calorie/test/output-naming-87.test.mjs
GATE-RUN runId=355203ef-f3d7-4e87-8d57-8dfbda7c3d20 cmd=node docs/research/t83-review-red.mjs

GATE-RELAX flag=--allow-nonzero reason=窗口内 3 条 exit≠0 均为**过程轮**：`72dc41ac` canonical `pnpm test` exit 1 系基线既有红（判据＝失败集新增 0，实测 `base=34 after=29 新增=0`）；`c24b074d` 本席新增测试的**前置断言缺陷**（tmp 在 C:、仓库在 D:，`path.relative` 返回绝对路径）→ 已改为子进程 `cwd` ＋ `SKILLS_DB_PATH=.`（`dbbf5903` 起绿）；`355203ef` 红队探针**自身缺陷**（未清空只读目录基线产物／读回键选择错）→ 已修，重跑 `5aa91f76` 33/33。

对账命令（逐字复跑）：

```
node tooling/check-gate-audit.mjs --evidence docs/research/t83-review-red.md \
  --ticket 83 --since 2026-09-09T15:31:50.000Z --until 2026-09-09T15:35:10.000Z \
  --allow-nonzero --export docs/research/t83-review-gate-runs.log
```

## ⑧ 未确证／风险

1. **蓝队席缺**：维护者标准是「每票 2 席」。本席为**单席自审**（fresh session，独立于实施者），结论**不覆盖**第二席的盲区；建议补蓝队席后再关票（或由维护者具名豁免）。
2. 「无对应模板」仍**无真机场景**（97 键全有渲染器），与实施者自认一致（结构缝＋单元探针）。
3. R-1 的**相对落点**在生产插件里是否真被用到**未取证**（插件侧 `SKILLS_DB_PATH` 取值面归 #64 打通图）——本席只证明「返修前该输入必红、返修后必绿」，不主张线上一定踩过。

## ⑨ 五维评分

| 维（权重） | 审查轮 | 定点复核 | 依据 |
|---|---|---|---|
| 契约一致（30） | 24 | 29 | 三态＋`delivery` 与方案 A 逐条一致、只追加、P9 未破；审查轮因**绝对路径不变量与既有相对落点能力冲突**（R-1）扣分 |
| 证据真实可复现（25） | 19 | 22 | 探针可复跑、摘要行齐；扣：遗漏相对落点场景 ＋ 四门声明的 `.scratch/t83/gates.mjs` 不可复现（S3-5） |
| parity（20） | 18 | 18 | M4 铁则（渲染优先、失败回执、禁手写 HTML）与旧 `SKILL.md:18-19` 对齐；回执命名沿用旧 `操作失败` |
| 工程红线（15） | 14 | 15 | 零越界、零 `tooling/**` 改动、变异自证、无 `git add -A` |
| 文档同步（10） | 7 | 8 | 证据充分；扣：`help-center-91.test.mjs:8` 注释漂移（S3-1）、未记录相对落点行为 |
| **合计** | **82（FAIL）** | **90（PASS）** | 量刑律：任一 S1-交付缺陷 → FAIL；均分 <85 → FAIL |

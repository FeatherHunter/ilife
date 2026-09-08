# #78 独立验收报告 · V1（契约面）

- 验收者：独立验收员 V1（契约面），与施工者 A1／A2、编排者自评**互相隔离**；本报告只以代码／契约／命令输出为判据。
- 仓库：`D:\ilife`，分支 `master`，基线 `aed1b7c`（实测 `git rev-parse --short HEAD` = `aed1b7c`）。
- 手段：`read`／`grep`／`glob`／侧栏终端（Windows PowerShell 5.1）＋ `node --% -e` 一次性只读脚本；**未执行任何 git 写命令**；**唯一写操作 = 本文件**。
- 范围：仅契约面（ACCEPTANCE.md「V1 · 契约面验收」）。行为 parity／变异鉴别力属 V2／V3，本报告不判。

---

## 0. 结论前置

**裁决：`通过`**（阻断缺陷 **0 条**）。

5 条 `pending` 已全部翻为 `implemented`；全仓 pending 恰为 2（仅 #75）；三处同步（清单 ↔ 契约 §3.5 标记区 ↔ `test-d`）**逐字零漂移、签名值零改动**；运行时出口面**恰好**等于清单 implemented 运行时项（EXTRA／MISSING 均为空）；`ChartError`／`HelpSchemaError`／`buildShellTemplate` **未导出**；R11／R22／R27／R5＋R14 逐条落地并有实测；越界扫描无票外文件、无技能包／插件包／lock／`package.json` 改动；两条门禁命令均 exit 0（`tsc -b --force`；签名测试 47/47 全绿）。

非阻断观察 2 条（OB-78-V1-1／2），均**不构成返修**，见 §3。

---

## 1. 逐条证据

### 必做 1 · 5 条 pending 翻转 ＋ 全仓 pending 计数 —— **符合**

| 项 | 证据 |
|---|---|
| `charts` | `packages/base-render/src/spec/index.ts:173` `status: 'implemented'`（原 `pending`） |
| `RenderHelpShell` | `src/spec/index.ts:177` `status: 'implemented'` |
| `renderHelpShell` | `src/spec/index.ts:178` `status: 'implemented'` |
| `BuildChartsHelpersJs` | `src/spec/index.ts:180` `status: 'implemented'` |
| `buildChartsHelpersJs` | `src/spec/index.ts:181` `status: 'implemented'` |

命令实测（`node --% -e`，读 `dist/spec/index.js` 的 `SPEC_FROZEN_SURFACE`）：

```
PENDING=2 ["BuildStyleSheet@#75","buildStyleSheet@#75"]
#78 total=27 pending=0 implemented=27
```

独立佐证（同一脚本对比 HEAD `aed1b7c` 版 `src/spec/index.ts` 与当前工作区）：

```
oldEntries=130 curEntries=130
pendingInOldSrc=7 pendingInCurSrc=2
nonStatusFieldChanges=0
```

→ 5 条全部翻转；pending 恰为 2 且均为 `#75`（`BuildStyleSheet`／`buildStyleSheet`）；条目总数 130 未增减；**除 status 外零字段改动**。

### 必做 2 · 三处同步逐字比对 ＋ 签名值零改动 —— **符合**

改动面（`git --no-pager diff --numstat aed1b7c`）：

```
6       6       docs/base-paint-contract.md
8       0       packages/base-render/src/index.ts
2       1       packages/base-render/src/spec/charts.ts
3       0       packages/base-render/src/spec/controls.ts
6       1       packages/base-render/src/spec/help.ts
5       5       packages/base-render/src/spec/index.ts
13      3       packages/base-render/test-d/contract-signatures.ts
```

- **清单侧**：`spec/index.ts` 5 增 5 删 = 5 行 `status` 翻转，无其它。
- **文档侧**：`docs/base-paint-contract.md` 6 增 6 删 = §3.5 标记区 5 行 status 翻转（`:770`／`:774`／`:775`／`:777`／`:778`）＋ `:815` 的 AC-3 引证更正（R22 明令）。文档行 `:752-778` 27 行现全为 `implemented`。
- **test-d 侧**：`git diff -U0` 仅 **2 个 hunk**（`@@ -349,2 +349,7 @@`、`@@ -359 +364,6 @@`）——3 条 `Absent<>`→`Present<>` ＋ 新增 3 条 `Equal<>` 出口类型锁 ＋ 新增 3 条 `Absent<>`；`:348` `_H12`／`:363` `_H19` 两条类型签名锁**未动**。

独立三方比对（自写解析器读 `docs/base-paint-contract.md` 全部 `FROZEN-SURFACE-TABLE` 标记区 vs `dist/spec` 清单）：

```
docRows_total=130
doc#78=27 man#78=27
onlyInDoc=[] onlyInManifest=[]
fieldMismatches=0
doc#78 statuses=["implemented"]
```

文档 ↔ 清单 130 行、逐字段（name／kind／ticket／status／section／signature）**零差异**；`#78` 27 条全 `implemented`。

签名值零改动（HEAD vs 工作区，逐条把 `status` 归一后全量比对）：

- 清单：`nonStatusFieldChanges=0`（130/130 条）。
- 文档：`docPendingOld=7 docPendingCur=2`，`docNonStatusRowChanges=0`（130/130 行）。
- 非清单行改动仅 4 处，且**均不触碰任何冻结签名串**：`spec/charts.ts:12-14` 注释（R16）、`spec/controls.ts:108-110` 注释（R27）、`spec/help.ts:6-8` 注释（R22）、`spec/help.ts:147-149` `minItems: 1` ＋注释（R11，`SCENE_DATA_SCHEMA` 的冻结签名串 `object（draft-07；$id: …）` 未变，且不在 FX-20 值锁名单，实测 47/47 绿）。

### 必做 3 · 出口面 —— **符合**

`node -e "import('./packages/base-render/dist/index.js').then(m=>console.log(Object.keys(m).sort().join(',')))"` 的等价集合运算（`tsc -b --force` 之后复跑，确保不是陈旧 dist）：

```
POSTBUILD keys=105 actual=87 expected=87
EXTRA=[]
MISSING=[]
ChartError=false HelpSchemaError=false buildShellTemplate=false
has-charts=true has-renderHelpShell=true has-buildChartsHelpersJs=true
```

（`actual` = `dist/index.js` 键集 − 既有 18 出口；`expected` = 清单 `kind==='runtime' && status==='implemented'`。）→ 新增运行时出口**恰好**等于清单 implemented 运行时项，多一个／少一个都为 0。

- 新增出口落点：`src/index.ts:37`（`buildChartsHelpersJs, charts`）、`:40`（`renderHelpShell`）；该文件 `8 增 0 删`，即**只追加**。
- `ChartError`／`HelpSchemaError`／`buildShellTemplate` 未导出：运行时不含（`false` × 3）；`dist/index.d.ts` 中 `Select-String 'export.*(ChartError|HelpSchemaError|buildShellTemplate)'` **0 命中**（仅有注释提及）。三者确为模块内部物：`src/charts.ts:68` `export class ChartError`、`src/help.ts:111` `export class HelpSchemaError`（**未**从 `src/index.ts` 再导出，与 `TemplateError`／`ControlsError` 同口径）、`src/help.ts:613` `function buildShellTemplate`（**非导出**，故 `Absent<'buildShellTemplate'>` 非空断言）。

### 必做 4 · `test-d` 断言 —— **符合**

`packages/base-render/test-d/contract-signatures.ts`：

| 行 | 现文 |
|---|---|
| `:352` | `type _H13 = Expect<Equal<Present<'charts'>, true>>;` |
| `:353` | `type _H13b = Expect<Equal<Mod['charts'], ChartsApi>>;` |
| `:354` | `type _H14 = Expect<Equal<Present<'renderHelpShell'>, true>>;` |
| `:355` | `type _H14b = Expect<Equal<Mod['renderHelpShell'], RenderHelpShell>>;` |
| `:364` | `type _H20 = Expect<Equal<Present<'buildChartsHelpersJs'>, true>>;` |
| `:365` | `type _H20b = Expect<Equal<Mod['buildChartsHelpersJs'], import('../src/index.js').BuildChartsHelpersJs>>;` |
| `:367`–`:369` | `_H21`／`_H22`／`_H23` = `Absent<'ChartError'>`／`Absent<'HelpSchemaError'>`／`Absent<'buildShellTemplate'>` |

- 三条 `Absent<>` 已翻为 `Present<>`（`:352`／`:354`／`:364`），并**补了「出口类型 = 冻结签名」的 `Equal<>`**（`:353`／`:355`／`:365`）；配合未改动的 `:348` `_H12`（`RenderHelpShell` = 冻结签名）与 `:363` `_H19`（`BuildChartsHelpersJs` = 冻结签名），形成「出口值类型 → 冻结签名类型别名 → 冻结签名串」三级闭合。
- `_H21`–`_H23` 正确：`Absent<K> = K extends keyof Mod ? false : true`（`:99`，语义注释 `:97-98`「值出口存在性（类型名不算值出口）」）。该口径自证——同文件 `:143` `_H16 = Absent<'FillTemplateInput'>`，而 `FillTemplateInput` **确是** `src/index.ts` 的 type-only 导出，且整体编译 exit 0 ⇒ `keyof Mod` 不含 type-only 导出 ⇒ 三条 `Absent<>` 判的正是「入口模块无同名值出口」，与实测 `false` × 3 一致。
- 断言是否真在编译门内：`pnpm exec tsc -p tsconfig.json --noEmit --listFiles` 输出含 `D:/ilife/packages/base-render/test-d/contract-signatures.ts`，`ROOT_TSC_EXIT=0`（root `tsconfig.json:25` `include: ["packages/base-render/test-d"]`）。

### 必做 5 · 复跑命令 —— **两条均 exit 0**

```
PS D:\ilife> pnpm exec tsc -b --force; "TSC_EXIT=$LASTEXITCODE"
TSC_EXIT=0
```

```
PS D:\ilife> node --test packages/base-render/test/contract-signatures.test.mjs
ℹ tests 47
ℹ suites 6
ℹ pass 47
ℹ fail 0
ℹ cancelled 0
ℹ skipped 0
ℹ todo 0
ℹ duration_ms 105.9104
TEST_EXIT=0
```

### 必做 6 · R11（`minItems: 1` ＋ 空 `scenes[]` 实测） —— **符合**

- 落点：`packages/base-render/src/spec/help.ts:145-149`——`scenes` 为 `{ type: 'array', minItems: 1, items: { … } }`，注释写明「文档 §3.5.2 明写『`scenes[]`（必填，**非空**）』…→ 补齐 `minItems: 1`」；文档侧口径 `docs/base-paint-contract.md:819`「`scenes[]`（必填，非空）」。
- **自构数据实测**（`renderHelpShell`，非只读代码）：

```
empty-scenes: THROW name=HelpSchemaError code=schema-invalid path=/groups/0/subgroups/0/scenes msg=元素不足：minItems=1，实际 0
valid-1-scene: OK htmlBytes=2891
missing-scenes: THROW name=HelpSchemaError code=schema-invalid path=/groups/0/subgroups/0/scenes msg=缺必填字段：scenes
dup-id: THROW name=HelpSchemaError code=duplicate-id path=/groups/0/subgroups/0/scenes/1/id msg=scene.id 重复：x
```

→ 空 `scenes[]` 确被校验器拒为 `schema-invalid`（并给出 `minItems` 归因）；**对照组** `valid-1-scene` 正常产出，证明该判定非「一律抛错」的恒真；`missing-scenes`／`dup-id` 顺序与 R6 判定次序一致。

### 必做 7 · R22（AC-3 引证更正） —— **符合**

- `docs/base-paint-contract.md:815`：`…docs/help-template-contract.md:51` 用 `type`（笔误；#78 施工期取证 R2 更正引证：旧稿写的 `assets/help_template.html:52` 实为 CSS 行…）。
- `packages/base-render/src/spec/help.ts:6`：同一引证 `docs/help-template-contract.md:51`；`:7-8` 记录更正理由。
- **实质核验**（只读对照旧侧）：`D:\2Study\StudyNotes\SKILLS\公共组件\docs\help-template-contract.md:51` = `"type": "采集/查看/结果/向导/批量/校验（可选）",` → 更正后的出处**指向正确**。
- 残留（不判缺陷）：AC 归档件 `docs/research/t92-architect-calls.md:21`、`docs/research/t92-contract-freeze-brief.md:118` 仍是旧引证；R22 只要求更正契约与 spec 两处，归档件为 AC 原文存档，不属本票改动面。

### 必做 8 · R27（actionId 唯一性注释加 HELP 壳例外） —— **符合**

- `packages/base-render/src/spec/controls.ts:106` 原约定行；`:108-110` 新增「**例外（#78 记账，R27）**：HELP 壳按 §3.5.3 字面把三个复制目标的 actionId **逐字**写入**每张**场景卡…歧义由宿主适配端解决…」。
- 该文件 diff 为 `3 增 0 删`、纯注释：`COPY_ACTION_IDS`（`:112-115`）与 `HELP_COPY_ACTIONS` 值零改动（清单 `nonStatusFieldChanges=0` 覆盖全 130 条）。

### 必做 9 · R5／R14（不发布口径） —— **符合**

```
dist-json:False root-json:False
```

（`packages/base-render/dist/scene-data.schema.json` = False；`packages/base-render/scene-data.schema.json` = False。）全仓 `Get-ChildItem -Recurse -Filter 'scene-data.schema.json'`（排除 `node_modules`）**0 命中** → 与 R5「不发布」／R14「FX-6 用例保持文件不存在即跳过」一致。

### 必做 10 · 越界扫描 —— **符合**

`git status --porcelain`：

```
 M docs/base-paint-contract.md
 M packages/base-render/src/index.ts
 M packages/base-render/src/spec/charts.ts
 M packages/base-render/src/spec/controls.ts
 M packages/base-render/src/spec/help.ts
 M packages/base-render/src/spec/index.ts
 M packages/base-render/test-d/contract-signatures.ts
?? .changeset/base-paint-charts-help.md
?? .scratch/
?? assets/
?? docs/research/t78-contract-scope.md
?? docs/research/t78-old-baseline.md
?? packages/base-render/src/charts.ts
?? packages/base-render/src/help.ts
?? packages/base-render/test/charts.test.mjs
?? packages/base-render/test/help.test.mjs
?? 我的想法.md
```

> 时序说明：本项首次执行 `git status`（验收开始时）**不含** `docs/research/t78-contract-scope.md`／`t78-old-baseline.md`；二者在验收过程中出现（与 `.scratch/t78/{contract-scope,old-baseline}.md` **SHA-256 逐字节相同**：73723 B／95592 B，mtime 09-09 04:11／04:12），属 R10「证据入仓时落 `docs/research/t78-*.md`（由编排者决定入仓时机）」的归档动作，非本票代码改动。

`git diff --stat aed1b7c`：`7 files changed, 43 insertions(+), 16 deletions(-)`——**受版本控制的改动文件集**与本票应有面**完全一致**（`src/charts.ts`／`src/help.ts`／两个测试／`src/spec/{help,charts,controls}.ts`／`docs/base-paint-contract.md`／`test-d/contract-signatures.ts`／`src/index.ts`／`.changeset/base-paint-charts-help.md`）。

越界项**空集**实测：

```
git --no-pager diff --stat aed1b7c -- packages/skill-calorie packages/plugin-anything pnpm-lock.yaml package.json packages/base-render/package.json packages/base-render/test/contract-signatures.test.mjs
（无输出，exit=0）
```

→ 无技能包／插件包／lock／`package.json` 改动；**门禁文件 `test/contract-signatures.test.mjs` 零改动**（未被「改测试凑绿」）。

噪声甄别（非本票产出）：`assets/`（LastWriteTime 2026-09-08 08:13）、`我的想法.md`（2026-09-06 18:24）均早于本票产物（`.scratch/` 2026-09-09 04:02；`src/charts.ts`／`src/help.ts` 2026-09-09 04:31），与 `.scratch/t78/contract-scope.md:4`「工作区仅既有未跟踪噪声」一致。

---

## 2. 缺陷清单

**0 条**（无 `FX-78-V1-*` 阻断项）。

| 编号 | 文件:行号 | 应改成什么 | 判定 |
|---|---|---|---|
| —— | —— | —— | 无 |

---

## 3. 观察项（非阻断，不要求本票返修）

- **OB-78-V1-1（断言强度，归 V3 口径）**：`test-d/contract-signatures.ts:367-369` 的三条 `Absent<>` 只锁「入口模块无同名**值**出口」；若将来有人以 type-only 形式再导出（如 `export type { ChartError }`），`keyof Mod` 不增键（口径自证：`:143` `_H16`），断言仍会绿。**当前无此问题**——`dist/index.d.ts` 对三个名字 `Select-String 'export.*(…)'` 0 命中。建议：在 `packages/base-render/test/contract-signatures.test.mjs`（`:280-284` 同风格处）补一条对 `dist/index.d.ts` 的文本扫描断言。
- **OB-78-V1-2（引证可读性）**：`docs/base-paint-contract.md:815` 与 `src/spec/help.ts:6` 的 `docs/help-template-contract.md:51` 是**旧侧**路径（本仓 `docs/` 下不存在：`Test-Path docs/help-template-contract.md` = False；同段 `docs/scene-data-contract.md:78`／`docs/scene_data.schema.json:70` 同样不存在），与全仓旧侧引证惯例一致（旧侧实文件在 `D:\2Study\StudyNotes\SKILLS\公共组件\docs\`）。建议后续补「（旧侧）」前缀以防误读；不影响本票结论。
- **OB-78-V1-3（归档时序，非本票缺陷）**：`docs/research/t78-contract-scope.md`／`t78-old-baseline.md` 在验收过程中被并发写入（首轮 `git status` 无、末轮有），与 `.scratch/t78/` 原件 **SHA-256 相同**、非源码／测试／lock／`package.json` 改动，属 R10 许可的证据入仓位置。仅提示：若收口时以「越界扫描」为准绳，需把这两份证据件列入白名单，避免误判为票外文件。

---

## 4. 验收边界声明

1. 本报告只判**契约面**（清单／文档／`test-d`／出口面／R11／R22／R27／R5＋R14／越界）；选项级语义 parity、HELP 壳行为、断言鉴别力（变异）分别归 V2／V3，未在本报告结论内。
2. 判据仅取代码、契约、命令输出；未采信施工者／编排者自评。
3. 全程未改任何源码／测试；未执行 git 写命令（`diff`／`status`／`show`／`rev-parse` 均只读）；唯一写操作 = 本文件 `.scratch/t78/verify-v1.md`。

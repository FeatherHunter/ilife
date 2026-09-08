# #74 V2 门禁与越界验证（对抗式 · 独立）

验证者：#74 V2 门禁与越界验证 agent
工作目录：`D:\ilife`
被验基线：`HEAD = bf6ca34dc2cf0cbab2508c12a0c9d2741a7eb2d9`（2026-09-09 00:21:34 +0800）
验证时间窗：2026-09-09 00:31–00:33
唯一问题：#74 是否守住门禁与范围红线（只动 base-paint／技能包零改动／无新增失败／冻结签名未被改）

---

## 五命令

全部实跑，退出码取自 `$LASTEXITCODE`。

| # | 命令 | 退出码 |
|---|---|---|
| 1 | `pnpm build` | **0** |
| 2 | `pnpm boundaries` | **0** |
| 3 | `pnpm test:types` | **0** |
| 4 | `node --test packages/base-render/test/*.test.mjs` | **0** |
| 5 | `pnpm test` | **1**（基线态，见下） |

### 1. `pnpm build` → exit 0

```
$ tsc -b
```
无任何诊断输出（`tsc -b` 增量构建全绿）。

### 2. `pnpm boundaries` → exit 0

```
$ node tooling/check-boundaries.mjs
OK: link-core 零依赖
OK: render 无运行时依赖（link-core 仅 dev/typeof）
OK: render 不依赖 combos
OK: combos 强依赖 link-core
OK: present 只许字符串级引用，禁 import render
OK: link-core 源码不引用任何 workspace 包
OK: 装配 owner 归一 render（link-core/combos 无自装配）
boundaries: PASS
```
7 条全 `OK`，末行 `boundaries: PASS`。

### 3. `pnpm test:types` → exit 0

```
$ tsc -b
```
无诊断。`test-d` 确在类型检查面内：`tsconfig.json:25` `"include": ["packages/base-render/test-d"]`，故 `test-d/contract-signatures.ts:140` 的 `Present<'fillTemplate'>` 是被真编过的断言，不是死代码。

### 4. `node --test packages/base-render/test/*.test.mjs` → exit 0

```
ℹ tests 96
ℹ suites 20
ℹ pass 96
ℹ fail 0
ℹ cancelled 0
ℹ skipped 0
ℹ todo 0
```
新增的两个用例族全绿：`A1…A9`（六标记／载荷槽／容器／包裹／次序／8 码／strict／零残留／calorie 遗留）、`report／bytes／替换细节`；签名面 20 个 suite 全绿。

### 5. `pnpm test` → exit 1

```
$ node --test "test/*.test.mjs" "packages/base-render/test/*.test.mjs" ... "packages/plugin-bill-ilife/test/*.test.mjs"
ℹ tests 489
ℹ suites 74
ℹ pass 467
ℹ fail 22
ℹ cancelled 0
ℹ skipped 0
ℹ todo 0
[ELIFECYCLE] Test failed. See above for more details.
```
`tests 489 / pass 467 / fail 22`。**22 条失败与基线逐条同集**（见下一节），退出码 1 是基线遗留态，非 #74 引入。

---

## 失败多重集比对

### 基线

`.scratch/t92/test-full.txt`（#92 时台账）：

```
ℹ tests 430
ℹ suites 63
ℹ pass 408
ℹ fail 22
```

### 本次

```
ℹ tests 489
ℹ suites 74
ℹ pass 467
ℹ fail 22
```

### 结果

**新增 = 0 / 消失 = 0**

### 比对方法（自己实现，不复用施工者脚本）

1. 两份日志都截取 `✖ failing tests:` 之后的**失败清单段**，只取以 `✖ ` 开头的行，剥掉行尾 ` (NNN.NNNNms)` 时长，得到失败用例名序列。
2. 对两侧各建**多重集** `Map<名字, 出现次数>`（不是集合——`#50 envelope 契约：面板路 readViaCli 同键打通不返空` 等名字在基线里重复出现 4 次，集合比对会漏计数）。
3. 双向相减：`新增` = 本次次数 > 基线次数的差量；`消失` = 基线次数 > 本次次数的差量。
4. 另做唯一名集合交叉核对。

实跑输出：

```
BASELINE counts: {"tests":430,"suites":63,"pass":408,"fail":22}
NOW      counts: {"tests":489,"suites":74,"pass":467,"fail":22}
baseline failing entries: 22  now failing entries: 22
新增 = 0
消失 = 0
baseline unique: 19  now unique: 19
now-only names: []
baseline-only names count: 0
```

### 解读

- 失败**条目数与多重集完全一致**（22 / 22），唯一名 19 / 19 相同，`now-only` 为空 → 零新增失败。
- 总数 430 → 489（**+59**）、suites 63 → 74（**+11**）、pass 408 → 467（**+59**）→ 新增的 59 个用例**全部通过**，且失败数不变，说明新增用例没有挤掉或掩盖任何既有失败。
- 22 条失败全部落在 `packages/plugin-*/test/smoke.test.mjs`（envelope 契约：`SyntaxError: Unexpected end of JSON input` / `SkillBridgeError: 出口非 JSON`）与 `test/client-bundle-48.test.mjs`（`SyntaxError: Cannot use import statement outside a module` / `产物缺 loader 注册头`）——均在 base-paint 之外，与 #74 改动面（`packages/base-render/src/*` + docs + changeset）无交集。

---

## 改动面与技能包零改动

### 命令原文与结果

```
$ git status --short
 M docs/base-paint-contract.md
 M packages/base-render/src/contract.ts
 M packages/base-render/src/index.ts
 M packages/base-render/src/spec/index.ts
 M packages/base-render/test-d/contract-signatures.ts
 M packages/base-render/test/contract-signatures.test.mjs
?? .changeset/base-paint-fill-template.md
?? .scratch/
?? assets/
?? packages/base-render/src/template.ts
?? packages/base-render/test/template.test.mjs
?? 我的想法.md
```

```
$ git diff --stat
 docs/base-paint-contract.md                          |  4 ++--
 packages/base-render/src/contract.ts                 |  9 ++++++++-
 packages/base-render/src/index.ts                    |  3 +++
 packages/base-render/src/spec/index.ts               |  4 ++--
 packages/base-render/test-d/contract-signatures.ts   |  2 +-
 packages/base-render/test/contract-signatures.test.mjs | 20 ++++++++++++--------
 6 files changed, 28 insertions(+), 14 deletions(-)
```

```
$ git diff --name-status
M	docs/base-paint-contract.md
M	packages/base-render/src/contract.ts
M	packages/base-render/src/index.ts
M	packages/base-render/src/spec/index.ts
M	packages/base-render/test-d/contract-signatures.ts
M	packages/base-render/test/contract-signatures.test.mjs
```

改动面 = `packages/base-render`（4 个 src ＋ 1 个 test-d ＋ 1 个 test）＋ `docs/base-paint-contract.md` ＋ 新增 `.changeset/base-paint-fill-template.md`。**全部落在 base-paint 及其契约文档**。

### 技能包零改动（逐条命令）

```
$ git status --short -- 'packages/skill-*'
(空)

$ git diff --stat -- 'packages/skill-*'
(空)

$ git ls-files --others --exclude-standard -- 'packages/skill-*'
(空)

$ git status --short -- 'packages/plugin-*'
(空)

$ git status --short -- packages/skill-calorie/package.json packages/base-combos/HELP.md
(空)
```

四条命令输出**均为空**：技能包无修改、无暂存、无新增未跟踪文件；`plugin-*` 未动；点名的 `packages/skill-calorie/package.json`、`packages/base-combos/HELP.md` 未动。

### `D:\2Study`

```
$ git status --short -- 'D:/2Study'
fatal: D:/2Study: 'D:/2Study' is outside repository at 'D:/ilife'
```
`D:\2Study` 不在仓内，git 无法证明；改用**时间窗取证**：

```
$ Get-ChildItem -Path 'D:\2Study' -Recurse -File | Sort LastWriteTime -Desc | Select -First 5
D:/2Study/StudyNotes/SKILLS/npm-publish/wizard-ilife-014.sh   2026/9/8 16:07:23
D:/2Study/StudyNotes/SKILLS/npm-publish/run-wizard-014.ps1    2026/9/8 12:36:03
D:/2Study/StudyNotes/SKILLS/npm-publish/wizard-ilife-45.sh    2026/9/8 12:30:12
D:/2Study/StudyNotes/SKILLS/npm-publish/run-wizard-45.ps1     2026/9/8 10:34:02
D:\2Study\TEST\.agents\skills\skill-calorie\help.html         2026/9/8 8:25:42
```
`D:\2Study` 最新写入 2026-09-08 16:07:23，**早于 #74 施工窗起点**（`.scratch/t74/WORKORDER.md` mtime = 2026-09-08 23:40:42；`packages/base-render/src/template.ts` mtime = 2026-09-09 00:25:47）→ #74 未碰 `D:\2Study`。

### 未提交证明

```
$ git diff --cached --stat
(空)                      # 无暂存内容

$ git rev-parse HEAD
bf6ca34dc2cf0cbab2508c12a0c9d2741a7eb2d9   # 与验证前一致
```
`git status --short` 全部为工作区态（` M`）与未跟踪（`??`），无 `A`/`M` 暂存态 → 未执行 `git add`／`git commit`。

### 无关未跟踪项（非 #74 交付，不阻塞）

`?? assets/`、`?? 我的想法.md`、`?? .scratch/` 的 mtime 分别为 2026/9/8 8:13:20、2026/9/6 18:24:47、2026/9/8 23:53:54；`assets/` 内仅 `skill_install_calorie_success.png`（截图，与 #74 无关）。属仓内既有遗留，非本票产物。

---

## 冻结面审计

### `git diff -- packages/base-render/src/spec/index.ts` 逐行结论

```diff
@@ -65,8 +65,8 @@
   { name: 'FillTemplateInput', ... status: 'implemented', ... },
   { name: 'FillTemplateReport', ... status: 'implemented', ... },
   { name: 'FillTemplateOutput', ... status: 'implemented', ... },
-  { name: 'FillTemplate', kind: 'type', ticket: '#74', status: 'pending', section: '3.1', signature: '(input: FillTemplateInput) => FillTemplateOutput' },
-  { name: 'fillTemplate', kind: 'runtime', ticket: '#74', status: 'pending', section: '3.1', signature: '(input: FillTemplateInput): FillTemplateOutput' },
+  { name: 'FillTemplate', kind: 'type', ticket: '#74', status: 'implemented', section: '3.1', signature: '(input: FillTemplateInput) => FillTemplateOutput' },
+  { name: 'fillTemplate', kind: 'runtime', ticket: '#74', status: 'implemented', section: '3.1', signature: '(input: FillTemplateInput): FillTemplateOutput' },
   { name: 'TemplateErrorShape', ... status: 'implemented', ... },
```

逐行结论：

| 行 | 结论 |
|---|---|
| `spec/index.ts:68` | `FillTemplate`：`status: 'pending'` → `'implemented'`，**唯一变化是 status 字面量**；`kind`／`ticket`／`section`／`signature` 逐字不变（`'(input: FillTemplateInput) => FillTemplateOutput'` 两侧同字节） |
| `spec/index.ts:69` | `fillTemplate`：`status: 'pending'` → `'implemented'`，同上；`signature` `'(input: FillTemplateInput): FillTemplateOutput'` 不变 |

hunk 只有这 2 行 `-`/`+`（`git diff --stat` 记 `4 ++--`＝2 增 2 删），**无任何签名值改动**。

### 机器化复核（独立于 diff 目视）

对 `git show HEAD:...spec/index.ts` 与工作区版本逐条解析 `{ name, status, signature }` 后比对：

```
old entries: 130  new entries: 130
signature-changed count: 0
added: []  removed: []
status flips (2):
  FillTemplate: pending -> implemented
  fillTemplate: pending -> implemented
```

- **条目数：130 → 130**（未增未减）。
- **签名值改动：0 条**（130 条逐条 signature 字符串相等）。
- **status 翻转：恰 2 条**，且正是 `FillTemplate`／`fillTemplate`，方向 `pending → implemented`。
- 计数交叉核对：`status: 'implemented'` = 106、`status: 'pending'` = 24，合计 130（翻转前 104 / 26）。

### `SPEC_FROZEN_SURFACE` 条目数是否仍 130

**是，仍为 130 条。**

```
$ (Get-Content packages/base-render/src/spec/index.ts | Select-String -Pattern "name: '" -AllMatches).Count
130
```
另以「数组体行内 `{ name: '` 计数」复核 = 130 行（`spec/index.ts:46`…`:187`），与 status 计数 106 + 24 = 130 自洽。

### 三处同步

| 处 | 位置 | 本次内容 | 同步 |
|---|---|---|---|
| ① 清单 | `packages/base-render/src/spec/index.ts:68-69` | 两条 `implemented` | ✓ |
| ② 文档标记区 | `docs/base-paint-contract.md:151-152` | `\| `FillTemplate` \| type \| #74 \| implemented \| 3.1 \| …` / `\| `fillTemplate` \| runtime \| #74 \| implemented \| 3.1 \| …` | ✓ |
| ③ `test-d` | `packages/base-render/test-d/contract-signatures.ts:140` | `type _T15 = Expect<Equal<Present<'fillTemplate'>, true>>;`（原 `Absent<'fillTemplate'>`） | ✓ |

三处的证据：

1. **② 与 ① 逐字绑死（机器断言，非目视）**：`packages/base-render/test/contract-signatures.test.mjs:242-247`
   `it('标记区表格与清单逐字一致')` → `assert.deepEqual(rows.map(norm).sort(), manifest.map(norm).sort())`，即文档全部 `FROZEN-SURFACE-TABLE` 标记区的表行必须与清单 130 条逐字段相等。实跑 **PASS**（在五命令 4 与 5 中均绿）。
   行数交叉核对：文档 7 个标记区（`docs/base-paint-contract.md:126/260/315/522/617/794/852` 起始）表行合计 = 25 + 8 + 44 + 24 + 27 + 1 + 1 = **130**，与清单 130 条相等。
2. **③ 与 ① 绑死**：`contract-signatures.test.mjs:222-226` `新增运行时出口恰好等于清单 implemented 的运行时项`、`:228-232` `pending 运行时项必须尚未导出`。清单翻 `implemented` 后 `fillTemplate` 必须导出，`src/index.ts:14` `export { fillTemplate } from './template.js';` 到位 → 两断言 PASS。
3. **文档散文同步**：`git diff -- docs/base-paint-contract.md` 只有 `:151-152` 两行 status 翻转，表格其余 128 行与散文区一字未动。

### 附：`spec/template.ts` 未动

```
$ git diff -- packages/base-render/src/spec/template.ts
(空)
```
`spec/template.ts`（§3.1 冻结面的常量正本）零改动。

---

## 边界门禁

### 7 条全 PASS

见「五命令 / 2」：`link-core 零依赖`／`render 无运行时依赖（link-core 仅 dev/typeof）`／`render 不依赖 combos`／`combos 强依赖 link-core`／`present 只许字符串级引用，禁 import render`／`link-core 源码不引用任何 workspace 包`／`装配 owner 归一 render（link-core/combos 无自装配）`，共 **7 条 `OK:`**，末行 `boundaries: PASS`，exit 0。

`tooling/check-boundaries.mjs` 本身未被改动（`git status --short` 无该文件）。

### `contract.ts` 新取常量的越界／环核（自己读 import 图）

新导入：`packages/base-render/src/contract.ts:9`
```
import { ESCAPE_HTML_CHARS, ESCAPE_HTML_ENTITIES } from './spec/controls.js';
```
被导入侧：`packages/base-render/src/spec/controls.ts:14` `export const ESCAPE_HTML_CHARS = ['&', '<', '>', '"', "'"] as const;`、`:18` `export const ESCAPE_HTML_ENTITIES = Object.freeze({ … })` —— **纯数据常量**，符合 `src/index.ts:12` 注释口径「spec/*：type-only 类型 ＋ 纯数据常量」。

全量 import 图（`packages/base-render/src` 下 13 个 `.ts`，递归 walk 后解析相对导入）：
```
contract.ts -> ui.ts(type), style.ts, spec/controls.ts
injector.ts -> ui.ts(type)
spec/controls.ts -> spec/text.ts(type)
spec/help.ts -> spec/template.ts(type)
spec/index.ts -> spec/template.ts(type)
template.ts -> spec/template.ts
```
DFS 环检测：
```
cycles: 0 []
```
- **无环**：`contract.ts → spec/controls.ts` 是单向边；`spec/controls.ts` 只 `import type ./text.js`，**不回指** `contract.ts`／`style.ts`／`ui.ts`，也不 import 任何 workspace 包。
- **不破界**：新增边为包内 `src → src/spec`，不跨包；`render 无运行时依赖` 与 `present 只许字符串级引用` 两条边界门均 PASS；`spec` 目录仍只 `import type`（`AC-13` 用例 `src/spec/*.ts 只许 import type（AC-13）＋ 代码不得读写浏览器全局（AC-7）` PASS；脚本化复核无 spec 文件存在非 type 导入）。
- 无新增外部依赖：`packages/base-render/package.json` 不在改动面内。

---

## 他人票未越界

三件他人票资产产出者**仍是 `pending`、未实现**：

清单侧（`packages/base-render/src/spec/index.ts`）：
```
80:  { name: 'buildStyleSheet',      kind: 'runtime', ticket: '#75', status: 'pending', section: '3.2', ... }
112: { name: 'buildSharedHelpersJs', kind: 'runtime', ticket: '#76', status: 'pending', section: '3.3', ... }
181: { name: 'buildChartsHelpersJs', kind: 'runtime', ticket: '#78', status: 'pending', section: '3.5', ... }
```
（对应的 `BuildStyleSheet` `:79`、`BuildSharedHelpersJs` `:111`、`BuildChartsHelpersJs` `:180` 亦均 `pending`。）

实现侧（递归 grep 整个 `packages/base-render/src`）：
```
$ grep -r 'buildStyleSheet|buildSharedHelpersJs|buildChartsHelpersJs' packages/base-render/src
spec/template.ts:304-306   仅注释：'← buildSharedHelpersJs(input?)（§3.3，归 #76）' 等
spec/style.ts:62           仅注释：'冻结签名：buildStyleSheet(...)'
spec/index.ts:80/112/181   清单条目
spec/controls.ts:157/176   仅注释
spec/charts.ts:268         仅注释
```
**无任何函数实现、无 `export`**；`src/index.ts` 只新增 `export { fillTemplate } from './template.js';`（`:14`），未导出三者。出口面锁断言 `pending 运行时项必须尚未导出`（`contract-signatures.test.mjs:228-232`）实跑 PASS。

`TemplateError` 亦未新增运行时出口（`src/index.ts:12-13` 注释明写「**不在此导出**」，冻结面无该运行时条目），与 changeset 自述一致。

---

## 格式

对 9 个被验文件逐字节检查（读原始 bytes → 判 BOM → UTF-8 解码 → 判字面反斜杠 n → 计 CRLF／裸 LF）：

| 文件 | BOM | 字面反斜杠 n | CRLF | 裸 LF |
|---|---|---|---|---|
| `packages/base-render/src/template.ts` | 无 | 无 | 0 | 427 |
| `packages/base-render/src/contract.ts` | 无 | 无 | 0 | 60 |
| `packages/base-render/src/index.ts` | 无 | 无 | 0 | 14 |
| `packages/base-render/src/spec/index.ts` | 无 | 无 | 0 | 188 |
| `packages/base-render/test-d/contract-signatures.ts` | 无 | 无 | 0 | 392 |
| `packages/base-render/test/template.test.mjs` | 无 | 无 | 0 | 570 |
| `packages/base-render/test/contract-signatures.test.mjs` | 无 | 无 | 0 | 922 |
| `docs/base-paint-contract.md` | 无 | 无 | 0 | 1025 |
| `.changeset/base-paint-fill-template.md` | 无 | 无 | 0 | 28 |

**全部：无 BOM、无字面反斜杠 n、纯 LF（CRLF = 0）。**

旁证：`contract-signatures.test.mjs:249-257` 与 `'格式合规：无 BOM、无字面反斜杠 n'` 用例在五命令 4／5 中均 PASS；测试自身还刻意用 `String.fromCharCode(10)`（`:116`）回避源码出现字面换行转义。

---

## changeset

`.changeset/base-paint-fill-template.md`（新增，28 行）：

```
---
'base-paint': minor
---
```
`:2` = `'base-paint': minor` ✓（票面 D6 要求 `base-paint: minor`）。

自洽性逐条核（每条都能回指实证）：

| changeset 声明（行号） | 独立核实 | 结论 |
|---|---|---|
| `:19-20` 「`SPEC_FROZEN_SURFACE` 仅把两条 `status` 由 `pending` 翻成 `implemented`（130 条不变）」 | 条目 130→130；签名改动 0；status 翻转恰 2 | ✓ |
| `:20` 「implemented 104 → 106、pending 26 → 24」 | 实测 106 / 24 | ✓ |
| `:20-21` 「三处同步（清单 ↔ 契约 §3.1 标记区表格 ↔ `test-d/contract-signatures.ts`）」 | 见「冻结面审计 / 三处同步」，机器断言 PASS | ✓ |
| `:7` 新增运行时 `fillTemplate` | `src/index.ts:14` 导出，`src/template.ts:216` 实现 | ✓ |
| `:14-17` `escapeHtml` 4 → 5 字符，恒读 `ESCAPE_HTML_CHARS`／`ESCAPE_HTML_ENTITIES` | `contract.ts:9` 导入、`:34-35` 使用、`:37` 实现 | ✓ |
| `:21-22` `TemplateError` 不新增运行时出口 | `src/index.ts:12-13` 注释 + 出口面锁 PASS | ✓ |
| `:24` 技能包零改动 | 四条 skill 命令全空 | ✓ |
| `:25` 迁移路径写在 `docs/research/t74-migration-path.md` | 该文件存在（mtime 2026-09-09 00:28:45） | ✓（内容属 V3 面） |
| `:17` calorie 差异证据 `docs/research/t74-escape-html-calorie-diff.md` | 该文件存在（mtime 2026-09-09 00:27:52） | ✓（内容属 V3 面） |
| `:27-28` 三个资产产出者仍 `pending` | 见「他人票未越界」 | ✓ |
| `:22` 只声明 `base-paint`，base-* 统一版本归 #79 | frontmatter 仅一条 `'base-paint': minor` | ✓ |

changeset 未声明任何技能包 bump，与「技能包零改动」自洽。

---

## 低／nit（不阻塞）

- **N-1（low，非缺陷）**：`pnpm test` 整体 exit 1。22 条失败与基线**同集同量**（新增 0 / 消失 0），全部落在 `packages/plugin-*/test/smoke.test.mjs` 与 `test/client-bundle-48.test.mjs`，属 #48／#50 遗留态。A12 的「门禁全绿」应读作「`build`／`boundaries`／`test:types` 三条 exit 0 ＋ 新增失败 0」，`pnpm test` 自身非绿是基线态而非 #74 引入。**建议**：在 #74 票面或验收报告里显式写明这一口径，避免后来者把 exit 1 误读为回归。
- **N-2（nit）**：`.scratch/t74/baseline-fail-names.txt`（施工者自建，25 名，含 6 条 suite 级 `✖ … 烟囱`）与我采用的 `.scratch/t92/test-full.txt`（22 条 test 级）口径不同。我未采信施工者脚本，独立从 `✖ failing tests:` 段重建多重集；两口径不冲突，但若日后要复用，建议统一到 test 级。
- **N-3（nit）**：`D:\2Study` 不在仓内，git 无法作证，只能用 mtime 时间窗推断（结论：未被碰）。若后续要硬证据，需对该目录单独建校验清单。

---

V2 结论：通过
新增失败数：0

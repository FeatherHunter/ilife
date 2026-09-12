# #228 对抗式复审报告（复审员 K）· 风险面与下游可接性

**复审对象**：wayfinder 地图 #220 子票 **#228「渲染接线」**（自报 100%）
**复审范围**：**只审「会不会伤到别人／能不能被下游接走」**。渲染逐字节正确性归**复审员 J**，本报告不重复。
**施工日期**：2026-09-12 ｜ 分支 `master` ｜ HEAD `3da2559`（未 commit，已复验）
**本席纪律**：全程**只读**；未改 `packages/**`、未改任何 issue、未 `git add`／`restore`／`reset`／commit；未跑仓根 `tsc -b`／`pnpm -r build`／全量 `pnpm install`；未重启／未碰 `127.0.0.1:43120`；未弹任何问卷。本报告为**唯一**新建文件。

---

## 一、总评与评分

### 一句话结论

**三处包外改动都「没伤到别人」——这是真的，我独立复验过，没有一处和稀泥的反例。** `packages/base-render/**` 一个字节没碰、别人家写进 `pnpm-lock.yaml` 的条目一条没丢、`check-boundaries.mjs` 只少了一个名字且作息会话的 `#199` 注释块原封保留、包根出口仍是 49。**下游 #229 不但「能接走」，实际已经在接——它的工作树里 `cmd_read.ts` 已经 `import { buildMemoHelpFileData, renderMemoHelpHtml } from '../help/helpFile.js'`，我实测这三个符号纯函数、零 IO、零副作用、可复现。**

扣分**只扣在两处「披露不完整」**上，都不是技术缺陷，是**记账缺陷**：① `package.json` 自报「手工加一行」，实际是**两处**改动（多出的 `files` 加 `SKILL.md` 一字未报）；② `helpFile.ts` 自己的注释说「要用它们的是出口层，不是别人」，但**没有任何地方说明这三个符号对外不可达**，而 `#229` 票面写的 import 路径若被读成包外路径就会踩空。

### 评分（0–100）：**87**

| 维度 | 分 | 扣分指名道姓 |
| --- | --- | --- |
| **对别人的影响面** | **36 / 40** | **−8**：`packages/skill-memo-ilife/package.json` 的 `files` 数组加了 `"SKILL.md"`，**交付报告 §一 的表里一字未提**（该行只写 `dependencies` 手工加一行）。这是**包外发布面**的字节级改动，混在同一个暂存件里 ⇒ 谁审 `package.json` 都会以为只有依赖边。改动本身**方向正确**（`skill-calorie` 已是 `["dist","SKILL.md","templates/*.html"]`），但**未披露即扣分**。另 **−4**：`pnpm-lock.yaml` 里**混着别人家的改动**（`packages/plugin-chef` 的 `devDependencies.tsdown`，共 4 行）——报告§六第 3 条如实登记了「非本席直接编辑」，**方向诚实**，但把两家的改动**揉进同一个未提交文件**，对后来者是一颗定时雷（见风险清单 R3）。**扣满为止，未触及别人任何一个字节，故未再扣。** |
| **回滚可逆** | **18 / 20** | **−2**：回滚路径干净（回滚本票＝只回 6 件，`base-render` 无需回滚因为根本没动），但 `pnpm-lock.yaml` 的 10 行是**两家改动交错**（本票 6 行 `base-paint` link ＋ 别人家 4 行 `tsdown`）⇒ 「整文件回滚」会**误伤别人家**，「按块回滚」需要人工分辨。这不是本票的错，但**回滚指令必须写成「只删本票那 6 行」而非「checkout 该文件」**，本报告第五节给了逐行依据。 |
| **下游可接性** | **24 / 25** | **−1**：可接性**实测通过**（见作业 6），且 #229 **已在生产中消费**。仅扣一处：`formatHelpMinute`／`buildMemoHelpFileData` 对**非法 Date** 抛的是 `MemoRenderError`，`code` 却是 **`MEMO_TEMPLATE_MISSING`**（`helpFile.ts:93` 的 `fail()` 只有这一个 code）——下游若照 `#229` 惯用的 `code` 分支处理，会把「参数坏了」误判成「模板缺了」。**不会静默、会炸**，故仅扣 1。 |
| **披露诚实度** | **9 / 15** | **−6**：`files` 加 `SKILL.md` **未报**（同上）；**−0** 其余自报项**逐条属实**：`SKILLS_BASE_FROZEN` 的「删我们一项、没碰 `skill-home`、`#199` 块原封保留」**逐字为真**；`pnpm-lock.yaml`「10 增加／0 删除」**逐字为真**；「未动 `base-render`」**逐字为真**。扣分集中在「改动清单不完整」，不在「说了假话」——本票**没有说假话**。另因 `helpFile.ts:41` 注释「要用它们的是出口层，不是别人」**与事实不符**（事实是**至今无任何出口层引用它们**，`help/index.ts` 未转发）而未在报告里点出⇒ 下游可接性口径**披露不到位**。 |

**总评**：这是一次**手法干净、边界自律极强**的改动，最大的问题不是「伤了谁」，而是**「有一处包外改动没报」**。按本席口径：**够格关票，但 `package.json` 的 `files` 那处必须在关票前补进交付报告，或明确移交 `#231`**。

---

## 二、作业 1–8 逐条复验（附命令与原始输出）

### 作业 1 · `SKILLS_BASE_FROZEN` 逐字核 ✅ **属实**

```
$ git diff --cached -- tooling/check-boundaries.mjs
-// #96 · base-* 变更影响面断言：其余 4 技能（chef/home/schedule/memo-ilife）当前**不消费** base-*，
-// 故 base-paint（目录 base-render）的任何变更都不得改动这 4 个技能的页面。结构面在这里卡死，
+// #96 · base-* 变更影响面断言：其余 3 技能（chef/home/memo-ilife）当前**不消费** base-*，
+// 故 base-paint（目录 base-render）的任何变更都不得改动这 3 个技能的页面。结构面在这里卡死，
 // #145 起 skill-bill **移出**该名单：……
-// #96 那条「尚未迁移」的现状断言对它已失效。其余 4 个技能的断言一字未放宽（仍查依赖闭包＋源码）。
-const SKILLS_BASE_FROZEN = ['skill-chef', 'skill-home', 'skill-schedule', 'skill-memo-ilife'];
+// #96 那条「尚未迁移」的现状断言对它已失效。
+// #199 起 skill-schedule **移出**该名单：地图 #197 已裁「作息管家 HELP 走共享 help 模板
+// base-paint/help-shell」（用户 Q5=A／Q11=A，裁定成文见 docs/skills/skill-schedule/t199-structure-verdict.md），
+// schedule 自此同样是有意的消费方。断言口径、判定实现与其余技能的覆盖面一律未动
+// （仍查依赖闭包＋源码／模板扫描），只是这一份「尚未迁移」名单少一个名字。
+// #220 起 skill-memo-ilife **移出**该名单：地图 #220 已裁「备忘录 HELP 走共享 help 模板
+// base-paint/help-shell」（走 A 路＝`renderHelpShellHtml`，裁决正本 docs/skills/skill-memo-ilife/
+// t220-orchestrator-decisions.md），memo 自此同样是有意的消费方。同上：断言口径、判定实现
+// 与其余技能的覆盖面一律未动，只是这一份「尚未迁移」名单再少一个名字。
+const SKILLS_BASE_FROZEN = ['skill-chef', 'skill-home'];
```

**逐字判定**：

| 断言 | 判定 | 证据 |
| --- | --- | --- |
| 现值 = `['skill-chef', 'skill-home']` | ✅ | diff 尾行逐字 |
| 我们那一项 `'skill-memo-ilife'` 删了 | ✅ | 旧行有、新行无 |
| `'skill-home'` 没碰（`#183` 的地盘） | ✅ | 新旧两行 `skill-home` 均在第二位，前后位置一致 |
| 作息会话的 `#199` 注释块**原封保留** | ✅ | `#199` 三段注（含 `t199-structure-verdict.md` 出处与「Q5=A／Q11=A」）**逐字未增删**；唯一被改写的是 `#96` 那段总述里的计数「其余 4 技能」→「其余 3 技能」、「这 4 个技能」→「这 3 个技能」，属**该删项导致的必然连带**，非越权改写 |
| 我们自己的 `#220` 注释块照同一体例补上 | ✅ | 体例三要素齐备：`#号起` ＋ 「地图已裁」＋ 「自此同样是有意的消费方」＋ 裁定正本路径 ＋ 「同上：断言口径…一律未动」 |

**⚠️ 一处必须点破的连带改写**：本票把 `#96` 总述的**计数**从 4 改成 3。这在**语义上正确**（名单确实从 4 项变 2 项，但注释说的是「其余 4 技能（chef/home/schedule/memo-ilife）」这个**枚举**，其中 schedule 已被 `#199` 移出却仍被列在枚举里——即 `#199` 会话**漏改了这个计数**）。本票顺手修正了别人漏改的计数，**改对了但动了别人家注释块的边界**。这属于善意越界，**我认为可接受且应当接受**（不改则注释自相矛盾），但**必须在关票说明里点名**，否则 `#199` 会话回头 diff 会以为自家注释被改。**这一条我判「不必回退，只须补一句说明」。**

### 作业 2 · `pnpm-lock.yaml` = 10 增加 / 0 删除，且别人家条目都在 ✅ **属实**

```
$ git diff --numstat -- pnpm-lock.yaml
10      0       pnpm-lock.yaml

$ git diff --name-status -- pnpm-lock.yaml
M       pnpm-lock.yaml
```

**10 行明细（全量 diff，无省略）**：

```
@@ -74,6 +74,10 @@ importers:            ← packages/plugin-chef  ← 别人家（#231/#218 一族）
       skill-chef:
         specifier: ^0.1.0
         version: link:../skill-chef
+    devDependencies:
+      tsdown:
+        specifier: 0.22.14
+        version: 0.22.14(typescript@5.9.2)

@@ -160,12 +164,18 @@ importers:           ← 本票（skill-memo-ilife）＋ 作息会话（skill-schedule）
       base-link-core:
         specifier: ^0.3.0
         version: link:../base-link-core
+      base-paint:
+        specifier: ^0.3.0
+        version: link:../base-render

   packages/skill-schedule:
     dependencies:
       base-link-core:
         specifier: ^0.3.0
         version: link:../base-link-core
+      base-paint:
+        specifier: ^0.3.0
+        version: link:../base-render
```

**分量核对**：本票 `skill-memo-ilife` 段 **+3** 行；作息会话 `skill-schedule` 段 **+3** 行；别人家 `plugin-chef` 段 **+4** 行；合计 **10 增 / 0 删** ✅。**报告§六第 3 条把 `skill-schedule` 那 3 行也算进「pre-flight 顺带写入」——这一点措辞上把别人的改动揽了一半**，但同一段已明确「非本席直接编辑」，且 `skill-schedule/package.json` 至今**未暂存**（属作息会话），故**不构成冒领**，仅建议措辞收紧。

**别人家条目存活核对（自己重跑，非采信）**：

```
$ node -e "统计 pnpm-lock.yaml 中各名字出现次数"
skill-chef        => 3
plugin-chef       => 1
skill-schedule    => 3
skill-calorie     => 3
base-paint        => 4
skill-memo-ilife  => 3
base-render       => 5
base-link-core    => 18
base-combos       => 1
```

**全部非零** ⇒ 无条目被洗掉 ✅。`pnpm-lock.yaml.bak-218` 仍在（`?? pnpm-lock.yaml.bak-218`，未跟踪、未被本票触碰）✅。

### 作业 3 · `pnpm boundaries` 真退出码 0 ✅ **属实**

直跑（按要求用 `node` 直跑，不经 pnpm 包装）：

```
$ cd D:\ilife; node tooling/check-boundaries.mjs
OK: link-core 零依赖
OK: render 无运行时依赖（link-core 仅 dev/typeof）
OK: render 不依赖 combos
OK: combos 强依赖 link-core
OK: present 只许字符串级引用，禁 import render
OK: link-core 源码不引用任何 workspace 包
OK: 装配 owner 归一 render（link-core/combos 无自装配）
OK: skill-chef 依赖闭包不含 base-*（实得：无）
OK: skill-home 依赖闭包不含 base-*（实得：无）
OK: 未迁移技能源码／模板不 import base-*（命中：无）
boundaries: PASS
EXITCODE=0
```

**✅ 退出码 0 逐字复现。** 注意末两条：`skill-chef`／`skill-home` 仍被查（`FROZEN` 只剩这俩），第三条扫描面也如实缩小。

### 作业 4 · 新依赖边的影响面 ✅ **纯渲染包、无运行时依赖、同形于先例**

**(a) `base-paint`（目录 `base-render`）是纯渲染包吗？有没有运行时依赖？** ✅ **是纯渲染包，零运行时依赖。**

```
$ node -e "require('.../base-render/package.json')"
"dependencies": 不存在（无该字段）
"devDependencies": { "base-link-core": "^0.3.0" }
```

`check-boundaries.mjs:15` 的断言 `Object.keys(render.dependencies ?? {}).length === 0` 正对此，且**每次跑 boundaries 都在断言**（本次 OK）。`base-link-core` 只在 **devDependencies**——`src/contract.ts:6` 是 `import type`，编译期擦除，**运行时零拉取**。

`base-render/src` 全部 import 都是**包内相对路径**（`./charts.js`／`./spec/*.js` 等），**无一条 workspace 包 import**。唯一的跨包引用是 `import type { Envelope } from 'base-link-core'`（`contract.ts:6`）和 `import type { PageDescriptor } from './ui.js'`（`injector.ts:9`）——**都是 type-only**。

**(b) 加依赖后 `skill-memo-ilife` 的依赖闭包变成什么？会不会间接拉到 `base-combos`／超出 `base-link-core` 的东西？** ✅ **闭包 = `{base-link-core, base-paint}`，恰好两项，没有第三项。**

推导链（可复核）：

1. `skill-memo-ilife` 直接依赖 = `base-link-core@^0.3.0` ＋ `base-paint@^0.3.0`（两项，`package.json` 实测）；
2. `base-paint` 运行时依赖 = **空集**（上条已验）⇒ **传递闭包为空**；
3. ⇒ 总闭包 = `{base-link-core, base-paint}`，**`base-combos` 不在其中**（`base-combos` 只出现在 `base-render/package.json` **没有**、`base-link-core` **零依赖**、`base-paint` **零依赖**的三重否定里）；
4. 交叉验证：`check-boundaries.mjs:16` 断言 `!JSON.stringify(render).includes('base-combos')` ✅；
5. **锁文件佐证**：`pnpm-lock.yaml` 的 `skill-memo-ilife` importer 段**只有两条** `base-link-core` ＋ `base-paint`（见作业 2 diff），**没有 `base-combos`**——`pnpm` 自己算出的闭包与我的手推一致 ✅。

**⇒ 新依赖边不把本包拖进任何不该进的地方。这一条我判「干净」。**

**(c) `BASE_RUNTIME` 的语义？加了依赖后哪些断言开始作用于本包？** ⚠️ **这里有一个必须点破的语义陷阱，答案与直觉相反：加依赖后，作用于本包的断言是「变少」而不是「变多」。**

读 `tooling/check-boundaries.mjs:46-68`：

```js
const BASE_RUNTIME = new Set(['base-paint', 'base-render']); // 目录名／包名两种写法都算
for (const name of SKILLS_BASE_FROZEN) {          // ← BASE_RUNTIME 的【唯一】消费者
  ... assert(hit.length === 0, `${name} 依赖闭包不含 base-*`);
}
const SRC_SCAN = [...SKILLS_BASE_FROZEN.flatMap(...walkSrc...), ...templates...];  // ← 同样只扫 FROZEN
```

**`BASE_RUNTIME` 只被 `SKILLS_BASE_FROZEN` 的循环引用**，语义＝「**尚未迁移**的黑名单判据」：
- 它是**反向断言**——断言「这些技能**不许**依赖 `base-paint`／`base-render`」；
- 因此 `SKILLS_BASE_FROZEN` 里**每少一个名字，就少一组断言**，**不是多一组**；
- `skill-memo-ilife` 从 `FROZEN` 移出 ⇒ 「依赖闭包不含 base-*」和「源码／模板不 import base-*」**这两条对本包同时失效**。

**这不是本票制造的漏洞，是 `#145`／`#199` 已确立的既定机理**（bill／schedule 走的就是同一条路）。**但必须写清**：移出后本包**不再有任何**「不许碰 base-render」的结构断言保护，防护转移给：
- 行为面：`pnpm snapshot:html:check`（`tooling/skill-html-snapshot.mjs`，逐件 HTML sha256）——注释 `check-boundaries.mjs:32` 自述；
- 共享层自锁：`base-version-lockstep.test.mjs`、`help-shell-136.test.mjs` 的字节锁。

**⇒ 判定：机理正确、与先例一致，但「防护是转移了不是消失了」这句话应当补进注释或报告，否则后来者会误以为本包失去保护。**

**(d) 与先例 `skill-bill` 是否同形？** ✅ **同形，逐字同形。**

```
$ node -e "require('.../skill-bill/package.json')"
"dependencies": { "base-link-core": "^0.3.0", "base-paint": "^0.3.0" }
```

- `skill-bill/package.json`：`base-link-core` ＋ `base-paint`，**正是本票加完后的同一对、同一版本区间 `^0.3.0`** ✅；
- `skill-bill/src/index.ts`：`export * from './help/index.js'` —— 与本包 `src/index.ts` **同一行、同一体例** ✅；
- `skill-bill/src/help/` 只有 `index.ts` ＋ `lookup.ts`（**没有** `helpFile.ts`）——即 bill 的 HELP 渲染**没有**独立 `helpFile.ts` 件；
- `check-boundaries.mjs:34-36` 的 `#145` 注释块：本票的 `#220` 注释块是**照它逐句仿写**（「地图 #N 已裁」→「走共享 help 模板 base-paint/help-shell」→「自此是有意的消费方」→「断言口径…一律未动」）✅。

**⚠️ 一处「不」同形，必须点破**：`skill-bill/src/help/lookup.ts` **在包根出口链上**（`help/index.ts` 转发了它），而**本票的 `helpFile.ts` 不在**（见作业 5、6）。**所以「同形」只在 `package.json` 的依赖边这一层成立；出口层不同形。** 报告写「值同记账」只覆盖了版本值，**没覆盖这个差别**。

### 作业 5 · 包根出口未扩大 ✅ **49 逐字复现，四个名字一个都没漏进去**

**方法说明（遵守「只构建本包、不跑仓根构建」）**：我没有重跑 `tsc`——`dist/` 已由本票在 13:37 构建过（`dist/help/helpFile.js` mtime `2026-09-12 13:37:59` > `src/help/helpFile.ts` 13:33:23）。**我改用「运行时真 import 数数」**，这比数 `.d.ts` 更强（`export type` 不会计入运行时，正是「运行时出口」的定义）。

```js
const m = await import('file:///D:/ilife/packages/skill-memo-ilife/dist/index.js');
Object.keys(m).length  // → 49  ✅
```

**49 个运行时出口逐字清单**（供后来者对照）：

```
LARK_DEFAULT_TIMEOUT_MS LARK_WISH_SCOPE MEMO_DEFAULT_TOP MEMO_HTML_MAX_BYTES MEMO_KEY_SHAPES
MEMO_TEMPLATES MEMO_TOPS MemoFetchError MemoPolicyError MemoRenderError REMIND_ISO_RE
SHARED_CSS_MARKER SHARED_HELPERS_MARKER WAKE_TABLE WAKE_TOPS WISH_SYNC_OPS addNote assertHtmlSize
authOpenId buildHelpLookup buildMemoEnvelope checkScope crudCreate crudRemove crudUpdate escapeHtml
estimateBytes fillSharedMarkers findLarkCli getNote larkReady larkVersion listNotes loadTemplate
lookupWake memoShapeFor normalizeRemindAt normalizeSub normalizeTop openMemoDb parseMemoEnvelope
removeNote renderEnvelopeHtml routeRemind routeWakeword routeWish runLark searchNotes updateNote
```

**四个名字的泄漏核对**：

```
HAS_buildMemoHelpFileData = false
HAS_renderMemoHelpHtml    = false
LEAK_helpFile = false   LEAK_sceneData = false   LEAK_manifest = false   LEAK_memoOutput = false
```

**✅ 裁决 16 守住**：`buildMemoHelpFileData`／`renderMemoHelpHtml`／`formatHelpMinute` **都不在**包根 49 里；`helpFile`／`sceneData`／`manifest`／`memoOutput` 的**任何符号名**都未出现。根因是 `src/help/index.ts` **一字未动**：

```
$ cat packages/skill-memo-ilife/src/help/index.ts
export { buildHelpLookup, lookupWake } from './lookup.js';
export type { HelpHit } from './lookup.js';
```

`export * from './help/index.js'` 转发的是**这个** barrel，`helpFile.ts` 不在其中 ✅。`dist/help/index.d.ts` 同样只有那两条 ✅。

**⚠️ 但我必须补一句报告没说的话**：出口**没扩大**，代价是这三个符号**对外完全不可达**（`package.json` 的 `exports` 映射只有 `.`／`./fetch`／`./policy`／`./render`／`./cli`／`./package.json`，**无 `./help`／`./help/helpFile`**）。**这正是作业 6 的核心。** 我的判定：**这是正确取舍，不是缺陷**——因为本包今天**没有包外消费者**（见作业 6）；但「不可达」这件事**必须写进票面**，否则 `#229` 或 `#233` 会以为可以从包根拿。

### 作业 6 · 下游 #229 能不能接走 ✅ **能接，而且已经在接——我实测通了**

**(a) 三个符号的签名稳定性** ✅ **稳定，且与 `#229` 的用法匹配。**

实测（真 import `dist/help/helpFile.js`）：

```
exports = buildMemoHelpFileData, formatHelpMinute, renderMemoHelpHtml      ← 恰 3 个，与报告一致
arities: buildMemoHelpFileData=1  renderMemoHelpHtml=1  formatHelpMinute=1  ← 各 1 个形参
```

源码逐字签名（`helpFile.ts`）：

| 符号 | 签名 | 判定 |
| --- | --- | --- |
| `buildMemoHelpFileData` | `(now: Date, opts: MemoHelpFileOptions = {}) => {...7 键...}` | ✅ `opts` 有缺省值 ⇒ **只传 `now` 也合法**（实测 `arities=1` 即因缺省参数被 `.length` 忽略，**不是**参数缺失） |
| `renderMemoHelpHtml` | `(data: ReturnType<typeof buildMemoHelpFileData>) => string` | ✅ 直接吃上一函数的返回，**零适配层** |
| `formatHelpMinute` | `(now: Date) => string` | ✅ 纯格式化 |

**(b) 「把库目录存在传进去」这件事** ✅ **支持，写法是 `{initialized: boolean}`**——但**票面措辞与实现有一处口径差，必须点破**：

- `#229` 票面写「落 `initialized`」，**实现收的是 `opts.initialized`**，即 `buildMemoHelpFileData(now, { initialized: true })`，**不是第二位置参数**；
- 语义已被 `helpFile.ts:138` 写死：「口径＝**库目录存在**，**不是**老的 `memo.db` 文件存在」——**正是 `#229` 票面要求重定义的那一条**（`#229` 票面写：「新库是**目录** `<SKILLS_DB_PATH>/memo`，不是 `memo.db`」）✅ **两票口径对齐**；
- 缺省语义**安全**：`hidden: opts.initialized === true` ⇒ 缺省 `false` ⇒ **横幅照显**。注释 `:139` 自述理由「误显只多一条提示，误藏会让新用户找不到入口」——**fail-safe 方向正确** ✅；
- 实测两端都对：`hidden(default)=false`、`hidden(initialized:true)=true` ✅。

**(c) 隐藏耦合排查** ✅ **零耦合，逐项实测**：

| 排查项 | 结果 | 证据 |
| --- | --- | --- |
| 依赖 `process.cwd()`？ | ✅ **否** | `helpFile.ts` 全文 grep `process\.` ⇒ **零命中**；实测 `cwdUntouched=true` |
| 读环境变量？ | ✅ **否** | 同上零命中；实测**即使环境里 `SKILLS_DB_PATH="D:\\2Study\\StudyNotes\\.db"` 存在**，函数照常返回，**不读它** |
| 顶层副作用？ | ✅ **无** | 模块顶层只有 `const` 冻结字面量 ＋ 函数声明；import 耗时 **6ms**，无 IO |
| 有 IO／落盘？ | ✅ **无** | 零 `node:fs`／`node:path` 命中；设计上「零 IO、零落盘：落点与写盘全归 #229」（`:3`） |
| 缺 `SKILLS_DB_PATH` 时抛？ | ✅ **不抛** | 见上「读环境变量 = 否」。**注意**：票 6 说 `openMemoDb` 缺目录才抛，那是 **`#229` 落在 `cmd_read.ts` 里的调用**，与 `helpFile.ts` 无关 |
| 可复现性？ | ✅ **是** | `now: Date` 显式传入（`:153`「纯函数；`now` 显式传入以保证产物可复现」） |
| 返回是否冻结／可序列化？ | ✅ | `Object.freeze`，实测 `JSON` 往返无碍；7 键 `skill_name,title,subtitle,contact,groups,version,init_banner` |

**(d) 下游「正在接」的硬证据** ⚠️ **这是本报告最重要的一条**：

```
$ git show HEAD:packages/skill-memo-ilife/src/cli/cmd_read.ts | grep helpFile   → （空）
$ git status --porcelain -- packages/skill-memo-ilife/src/cli/cmd_read.ts
 M packages/skill-memo-ilife/src/cli/cmd_read.ts          （工作树改动，+102/−11）
```

工作树（**#229 的在途施工**，非 HEAD）里 `cmd_read.ts:11-14` 已经：

```ts
import { buildMemoHelpFileData, renderMemoHelpHtml } from '../help/helpFile.js';
import { buildHelpSceneIndex } from '../help/sceneData.js';
import { buildHelpLookup } from '../help/index.js';
import { HELP_FILE_STEM, LOOKUP_FILE_STEM, resolveStemTarget, deliverMemoHtml, type MemoHtmlDelivery } from '../help/memoOutput.js';
```

**⇒ 下游不是「能不能接」的假设题，是「已经接上了」的事实题。** 且 `src/help/manifest.ts`／`memoOutput.ts`／`sceneData.ts` **都已在工作树存在**（`#227` 资产 ＋ `#229` 出口）✅。

**端到端实测（真跑，非推演）**：

```
buildMemoHelpFileData(new Date(...))  → 7 键，groups=8，scenes=30，6ms 无抛
renderMemoHelpHtml(data)              → htmlLen=115137，typeof string ✅
非法 Date                             → 抛 MemoRenderError / code=MEMO_TEMPLATE_MISSING
```

**(e) 明确结论** —— **【下游可接】**：

> **`#229` 可以接走，且已经在接。** 三个符号签名稳定、纯函数、零 IO、零环境依赖、零顶层副作用、可复现，`opts.initialized` 的语义（**库目录存在**）与 `#229` 票面要求**逐字对齐**。**唯一注意两点**：① **必须走包内相对路径** `'../help/helpFile.js'`（`#229` 现行写法正确），**不可**从包根或 `skill-memo-ilife/help` 子路径 import——包根 49 出口里没有它们，`package.json` 的 `exports` 也**没有** `./help` 映射，包外 `import` 会直接 `ERR_PACKAGE_PATH_NOT_EXPORTED`；② 非法 `Date` 抛的 `code` 是 `MEMO_TEMPLATE_MISSING`（**语义不符**），下游若按 `code` 分支，别把「参数坏了」误读成「模板缺了」。**判：#229 无障碍。**

### 作业 7 · 共享层被碰的风险 ✅ **本票一个字节没碰；哈希不一致是那个会话造成的**

**(a) 本票有没有碰 `packages/base-render/**`？** ✅ **一个字节都没有。**

**判据一（最强、机器可验）**：暂存件里**没有**任何 `base-render` 路径——本票只暂存了 6 件（作业 8 逐字列出），**`git diff --cached --name-only` 里 `base-render` 零命中**。

**判据二**：`base-render` 的三件改动全部处于**未暂存**（` M`）状态，与 `#228` 的 `M `（已暂存）状态**在 `git status` 里字形可分**：

```
 M packages/base-render/assets/help-template.html      ← 别人家，未暂存
 M packages/base-render/src/helpShell.ts               ← 别人家，未暂存
 M packages/base-render/test/help-shell-136.test.mjs   ← 别人家，未暂存
```

**判据三**：报告§一「**未碰**（只读）」段**点名列出**这三件，且明说「含正被别家改的」✅ **披露如实**。

**(b) `gen:help-shell:check` 现在报的前后缀哈希** ✅ **与给新基线逐字一致（注意：不是旧基线）**：

```
$ node packages/base-render/scripts/gen-help-shell.cjs --check
help-template check OK: prefix=b09b2ffb49aface7befedc79159467f93abc8be0aed7491539ab49ef3a853f0a suffix=eedea1d3bfb61034d919d826a45414802c7e457052b13ced3b76dd1364c6a866
CHECK_EXIT=0
```

- 题面给的基线 `prefix=b09b2ffb…`／`suffix=eedea1d3…` ⇒ **一致** ✅；
- 退出码 **0** ⇒ 模板源与生成物**无漂移** ✅。

**(c) 若与基线不一致，判是不是那个会话造成的** —— **实测与基线一致，此题本不触发；但「是谁把哈希从旧值改成新值」这个因果问题仍然值得回答，我独立查了**：

**旧基线（HEAD 记录）**：`test/help-shell-136.test.mjs` 在 HEAD 里断言的四个值是
`3b70953e…`（PREFIX）／`bfaf1791…`（SUFFIX）／`3d00cfb6…`（夹具整页）／外加 `renderHelpShell === renderHelpShellHtml`。
**新基线（工作树）**：`b09b2ffb…`／`eedea1d3…`／`d379c8df…`。
⇒ **同一文件里 3 处哈希被改**（`git diff --numstat` = `3 3`），加上 `assets/help-template.html`（`7 0`）与 `src/helpShell.ts`（`2 2`，它是生成物，内嵌整份模板）。

**归因证据链（三条独立证据）**：

1. **文件集**：三件都在 `base-render`，**均未暂存**；`#228` 的暂存件里零 `base-render` ⇒ **不是本票改的**；
2. **mtime 时序**（决定性）：
   ```
   packages/base-render/assets/help-template.html      2026/9/12 13:23:38   ← 别人家
   packages/base-render/src/helpShell.ts               2026/9/12 13:23:48   ← 别人家（生成物）
   packages/base-render/test/help-shell-136.test.mjs   2026/9/12 13:23:48   ← 别人家（基线跟改）
   packages/base-render/dist/helpShell.js              2026/9/12 13:23:50   ← 别人家（跟构）
   ------------------------------------------------------
   tooling/check-boundaries.mjs                        2026/9/12 13:28:17   ← 本票，晚 4.5 分钟
   packages/skill-memo-ilife/src/help/helpFile.ts      2026/9/12 13:33:23   ← 本票，晚 10 分钟
   packages/skill-memo-ilife/test/help-file-228.test.mjs 2026/9/12 13:34:09 ← 本票，晚 11 分钟
   ```
   **别人家的三件在 13:23:38–13:23:50 一次性落定（模板→生成物→基线→dist，是标准的「改源→跑 gen→跟构」序列），本票最早的动作晚 4.5 分钟。** ⇒ **因果方向明确：共享层先动，本票后动。**
3. **机制**：`help-template.html` 是**唯一真相源**，`helpShell.ts` 是 `gen-help-shell.cjs` 机器生成的（其 d.ts 头部自述「本文件由 … 机器生成，禁止手工改动」）⇒ 模板一改，前后缀哈希**必然**全变，测试基线**必须**跟改（`test/help-shell-136.test.mjs` 的 `3 3` 就是这个跟改）。这是一次**自洽的、完整的**共享层变更，三件同时改、方向一致、无残缺。

**⇒ 判定：哈希从旧值变为新值，是改 `base-render` 的那个会话**（13:23 那批）**造成的，与 `#228` 无因果关系。`#228` 在 13:28 之后接手时面对的已经是新基线，它「哈希同基线」的正确解读是「与**当时的**基线一致＝没有额外制造漂移」，而不是「维持了旧基线」。报告§门的措辞正是这个意思，未夸功 ✅。**

**⚠️ 但给编排会话一条重要提醒**：既然共享层正在被别人改，`#228` 报告里那句「与基线逐字一致」是**对 13:23 那个瞬时的基线**成立。**若那个会话后续再改模板，基线还会变，`#228` 的这条留证会变成历史快照而非现行事实。** 关票时应把「以 `gen:help-shell:check` 退出码 0 为现行判据」写清，别把哈希当永久锁（见风险清单 R5）。

### 作业 8 · 暂存区与 HEAD ✅ **HEAD `3da2559` 未 commit；暂存区恰 6 件，无别人家文件**

```
$ git rev-parse HEAD
3da25594a955b8b28dd860e7bdfb0349aaa62f06          ← ✅ 仍是 3da2559，未 commit
$ git rev-parse --abbrev-ref HEAD
master                                            ← ✅

$ git diff --cached --name-only
docs/skills/skill-memo-ilife/t228-body.md
docs/skills/skill-memo-ilife/t228-render-report.md
packages/skill-memo-ilife/package.json
packages/skill-memo-ilife/src/help/helpFile.ts
packages/skill-memo-ilife/test/help-file-228.test.mjs
tooling/check-boundaries.mjs
```

**逐件对表（题面要求的 6 件）**：

| 题面要求 | 实测 | 判定 |
| --- | --- | --- |
| `t228-body.md` | ✅ 在 | 命中 |
| `t228-render-report.md` | ✅ 在 | 命中（`A ` 新增） |
| `package.json` | ✅ 在 | 命中 |
| `helpFile.ts` | ✅ 在 | 命中（`A ` 新增） |
| `help-file-228.test.mjs` | ✅ 在 | 命中（`A ` 新增） |
| `check-boundaries.mjs` | ✅ 在 | 命中 |
| **恰好 6 件、无第 7 件** | ✅ | `--numstat` 也是 6 行 |

```
$ git diff --cached --numstat
15      2       docs/skills/skill-memo-ilife/t228-body.md
357     0       docs/skills/skill-memo-ilife/t228-render-report.md
3       1       packages/skill-memo-ilife/package.json      ← ⚠️ 见下方「未披露改动」
220     0       packages/skill-memo-ilife/src/help/helpFile.ts
191     0       packages/skill-memo-ilife/test/help-file-228.test.mjs
12      4       tooling/check-boundaries.mjs
```

**✅ 暂存区里没有任何别人家的文件**（无 `base-render`／`skill-chef`／`plugin-chef`／`skill-schedule`／`base-combos`／`combos.yaml`／`envelope.ts`／`render.test.mjs`／`memo-split.test.mjs`）。**按纪律我未对暂存区做任何操作（无 `add`／`restore`／`reset`），也未发现需要上报的「别人家文件混入暂存区」情形。**

**⚠️ `package.json` 的 `3 1` 是关键线索——它暴露了本报告的核心扣分项：**

```
$ git diff --cached -- packages/skill-memo-ilife/package.json
   "files": [
     "dist",
+    "SKILL.md",                                    ← ⚠️ 未披露的第 1 处改动
     "templates/*.html"
   ],
   "dependencies": {
-    "base-link-core": "^0.3.0"
+    "base-link-core": "^0.3.0",
+    "base-paint": "^0.3.0"                         ← ✅ 已披露的第 2 处改动
   },
```

`3 1` = **2 处改动**（`files` 加 1 行、`dependencies` 加 1 行、旧 `base-link-core` 行改 1 行）。**交付报告只报了其中一处。**

---

## 三、风险清单

格式：**风险 → 触发条件 → 爆炸半径 → 现有缓解 → 够不够**

**R1 · `files` 加 `SKILL.md` 未披露** → 关票时无人复核这处包外发布面改动 → **小**（`skill-provider.ts` 靠 `createRequire.resolve(包名 + '/package.json')` 定位包根**再拼 `SKILL.md` 直接读盘**，dev 态 workspace 链接下文件天然在，**不改也读得到**）→ 交付报告§一表**未列**；同文件 `dependencies` 行已列 → **⚠️ 不够**：改动方向正确（对齐 `skill-calorie` 的 `["dist","SKILL.md","templates/*.html"]`，且打包发布态**确实需要**这一行，否则 `skill-bill`／`skill-chef` 那类缺行的包发布后 agent 读不到 SKILL.md），**但零披露＝零复核**。**必须补记，或明确移交 `#231`。**

**R2 · 本包失去「不许碰 base-render」结构断言** → `SKILLS_BASE_FROZEN` 移出后 → **中**（`BASE_RUNTIME` 那两条断言对 `skill-memo-ilife` **不再生效**，本包源码／模板日后**可以**任意 import `base-paint` 而 boundaries 不报）→ 行为面 `pnpm snapshot:html:check` 逐件 sha256 ＋ 共享层字节锁 → **⚠️ 不够**：这是**既定机理**（`#145`／`#199` 同一路径，非本票缺陷），但「防护由结构面**转移**到行为面」这句话**没写进注释**，后来者会误以为保护还在。**建议在 `#220` 注释块补半句。**

**R3 · `pnpm-lock.yaml` 两家改动交错** → 任何人执行「回滚整个文件」或「提交整个文件」 → **中**（本票 6 行 `base-paint` link ＋ 别人家 4 行 `plugin-chef/tsdown` 混在同一未提交文件；整文件回滚会**误伤别人家**，整文件提交会把**别人家未完成的改动**一起 commit）→ 报告§六第 3 条已登记「非本席直接编辑」；`skill-schedule/package.json` **未暂存**故不会误提 → **⚠️ 不够**：登记了来源**但没给「只回哪 6 行」的操作说明**。**关票前必须把 R3 的回滚粒度写清**（本报告第五节给逐行依据）。

**R4 · 顺手修正了 `#96` 计数（4→3）** → `#199` 会话回头 diff `check-boundaries.mjs` → **小**（纯注释，无行为影响；且**修正本身正确**——不改则枚举与实际名单自相矛盾）→ 无 → **⚠️ 不够**：**善意越界也须点名**，否则 `#199` 会以为自家注释被擅改。**关票说明补一句即可，不必回退。**

**R5 · 共享层基线是「瞬时快照」** → 改 `base-render` 的会话**再次**改动模板 → **中**（`#228` 报告里「哈希同基线」的留证立即过期；若有人把它当永久锁，会误判后续漂移）→ `gen:help-shell:check` 退出码是**现行**判据 → **✅ 够**（前提是关票说明写「以退出码 0 为现行判据，哈希为 13:23 快照」）。

**R6 · 下游若从包根取符号会踩空** → `#229`／`#233` 试着 `import { buildMemoHelpFileData } from 'skill-memo-ilife'` 或 `'skill-memo-ilife/help'` → **中**（包根 49 出口无此符号；`exports` 无 `./help` 映射 ⇒ `ERR_PACKAGE_PATH_NOT_EXPORTED`）→ `#229` 现行写法 `'../help/helpFile.js'` **正确**；本报告作业 6 已明示 → **✅ 够**（`#229` 已在正确路径上；仅需 `#233` 别踩）。

**R7 · 非法 Date 的 `code` 语义错** → 下游按 `code` 分支处理 → **小**（抛的是 `MemoRenderError`，`code` 却是 `MEMO_TEMPLATE_MISSING`；**会炸不会静默**，且 `#229` 传的是真 `new Date()`）→ 无 → **⚠️ 不够**：属**共享层缺陷**，按裁决 20「不许改共享层」的口径应**记账归 `#242`**，别在本票改。**建议记 `#233`／`#242`。**

**R8 · 包根 49 的「冻结面」与新增渲染件的关系** → 日后有人想把 `helpFile.ts` 转发到包根 → **小** → 裁决 16 已定「不转发」；`help/index.ts` 一字未动 → **✅ 够**。

---

## 四、对 #228 关票的意见

**结论：可以关票，但附三条必办项（都不是技术缺陷，是记账补齐）。**

1. **技术面：我判「过」。** 三处包外改动**没有一处伤到别人**——`base-render` 零字节触碰（暂存件零命中 ＋ mtime 时序双重证明）、别人家写进锁文件的条目一条没丢（9 个名字全部非零）、`SKILLS_BASE_FROZEN` 只少一个名字且 `skill-home` 未碰、`#199` 注释块原封、包根出口仍恰 49（运行时实测，四个名字零泄漏）、`boundaries` 退出码 0。**下游 #229 不但可接，已经在接**，三符号纯函数零耦合、端到端真跑通（115137 字节整页 HTML）。

2. **关票前必办（记账）**：
   - **必办一**：`package.json` 的 `files` 加 `SKILL.md` **补进交付报告**，或**明确书面移交 `#231`**（若确属别人家改动，则**不应留在本票暂存件里**——但按纪律本席**不动暂存区**，请编排会话裁决）；见 R1。
   - **必办二**：`pnpm-lock.yaml` 的**回滚粒度**写清「只回本票那 6 行 `base-paint` link，不 checkout 整文件」；见 R3。
   - **必办三**：关票说明里**点名**「顺手把 `#96` 注释计数 4→3」（R4），并**写清**「`gen:help-shell:check` 的哈希是 13:23 快照，现行判据是退出码 0」（R5）。

3. **不建议扣票、不建议打回**：本票**没有说假话**（作业 1／2／3 三条自报**逐条属实**，我逐字复现），扣分全在「清单不完整」。打回重做会浪费一次已验通的下游可接性。

4. **应当表扬的一条**（对后来者有价值）：`helpFile.ts:24-25` 那句 **「⚠️ 本票载荷只对 A 路合法：喂给 B 路校验器会因 `hidden`（以及 `steps` 的对象形）判 `schema-invalid` ——这是**共享层缺陷的证据，不是本票交付的缺陷**（`#233` 的读者别误判）」**——**这是本席在整个工作树里读到的最负责任的一句注释**：它主动为下游读者（`#233`）预判了误判风险并指明归因。这正是「会不会伤到别人」的标准答案。

---

## 五、给编排会话的整改清单

### 必须改（关票前）

| # | 项 | 位置 | 动作 |
| --- | --- | --- | --- |
| **M1** | `files` 加 `SKILL.md` 未披露 | `packages/skill-memo-ilife/package.json`（暂存件）＋ `t228-render-report.md` §一表 | 二选一：**补进报告**该行的说明（写成「`dependencies` 手工加一行 `base-paint`；**另 `files` 加 `SKILL.md`**（打包发布态必需，对齐 `skill-calorie`）」），**或**裁定该行属 `#231` 并从本票暂存件剥离（**剥离动作请编排会话执行——本席按纪律不动暂存区**） |
| **M2** | `pnpm-lock.yaml` 回滚粒度未给 | 交付报告 §六 | 补一句：「回滚本票**只删** `pnpm-lock.yaml` 中 `packages/skill-memo-ilife` 段下的 3 行（`base-paint` ／ `specifier: ^0.3.0` ／ `version: link:../base-render`）；**勿 `checkout` 整文件**——该文件另含 `packages/plugin-chef` 的 `tsdown` 4 行属别家」。（注：`skill-schedule` 段那 3 行属作息会话，本票亦不应回） |
| **M3** | 共享层归因与判据时效 | 交付报告 §二门 2 ＋ 关票说明 | 补一句：「哈希 `b09b2ffb…`／`eedea1d3…` 是 **13:23** 那个改 `base-render` 的会话定下的**快照**（mtime 证据：模板 13:23:38／生成物 13:23:48／基线 13:23:48，均早于本票 13:28 起的最早动作）；**现行判据以 `gen:help-shell:check` 退出码 0 为准**，哈希会随模板再改而变」 |

### 建议改

| # | 项 | 位置 | 动作 |
| --- | --- | --- | --- |
| **S1** | 「防护是转移不是消失」未写 | `tooling/check-boundaries.mjs` `#220` 注释块 | 补半句：「移出后本包不再受 `BASE_RUNTIME` 结构断言约束（`BASE_RUNTIME` 只被 `SKILLS_BASE_FROZEN` 消费，语义＝**尚未迁移的黑名单**，每移出一个名字就**少**一组断言，不是多）；防护转移至行为面 `pnpm snapshot:html:check`」。**注意这是注释改动，会重新触发 `check-boundaries.mjs` 的暂存件更新**——若编排会话不想再动暂存区，可改为写进本报告或交付报告 |
| **S2** | `#96` 计数连带改未点名 | 关票说明 | 补一句：「本票顺带把 `#96` 总述的枚举计数 4→3（`#199` 移出 schedule 时漏改），**请 `#199` 会话知悉**」 |
| **S3** | 「同形于 skill-bill」口径不完整 | 交付报告 §一 `package.json` 行 | 补半句：「依赖边与 bill 同形（逐字 `base-link-core` ＋ `base-paint`，均 `^0.3.0`）；**出口层不同形**——bill 的 `help/lookup.ts` 在包根链上，本票 `helpFile.ts` **不在**（`help/index.ts` 未转发，裁决 16）」 |
| **S4** | `helpFile.ts:41` 注释与事实不符 | `packages/skill-memo-ilife/src/help/helpFile.ts:41` | 「要用它们的是出口层，不是别人」**与事实不符**：至今**无任何出口层引用**这两个常量，且 `buildMemoHelpFileData`／`renderMemoHelpHtml` **对外不可达**。建议改为「本包今天没有包外消费者；出口层（`#229`）走**包内相对路径** `'../help/helpFile.js'` 消费」。⚠️ 改此文件会**再次更新暂存件**，请编排会话权衡（本席**不改**） |

### 留 `#233`

| # | 项 | 理由 |
| --- | --- | --- |
| **T1** | 非法 `Date` 抛 `MEMO_TEMPLATE_MISSING`（语义不符） | `helpFile.ts:92-94` 的 `fail()` **只有这一个 code**，`formatHelpMinute` 的「坏参」与「模板缺」共用一个 code。属**本包内部**质量问题（非共享层），但**不影响下游**（会炸不会静默），且改它会动暂存件 ⇒ 留 `#233` 统一收口 |
| **T2** | `MemoHelpFileOptions` 接口未开出口、`initialized` 只能经 `opts` 传 | 现为「不对外开出口」的有意设计，`#229` 走包内相对路径无碍。若日后 `#233` 决定开 `./help` 子路径出口，需同时决定这个接口开不开 |
| **T3** | A 路／B 路载荷不兼容（`init_banner.hidden`／`steps` 对象形）的共享层根因 | 本票已按裁决 20 逐条记账并留证（`helpFile.ts:7-25` 的表格 ＋ 隔离探针）。**根因属共享层缺陷 `#242`**，本票按纪律**未改共享层**——正确。请在 `#233` 与 `#242` 之间建立引用，避免两票各自重查 |
| **T4** | 本包 `scripts/gen-help-assets.mjs` = 410 LF **超告警线 350** | 属 **`#227`**，本票已如实登记且未越权改。`#233` 收口时确认 `#227` 已按必报五步第四步当场报「已超线，需要根据规则进行重构。」并给拆法 |

---

## 附：本席复验所用命令与工具位置（供复核）

- 临时脚本全部落在 `%TEMP%`（`k-exports.mjs`／`k-downstream.mjs`／`k-tpl.mjs`／`k-probe1.mjs`），**未在仓库内落任何临时件**；
- 本报告为**唯一**新建文件：`docs/skills/skill-memo-ilife/t228-review-K.md`；
- 全程**未执行**：`git add`／`git restore`／`git reset`／`git commit`／仓根 `tsc -b`／`pnpm -r build`／全量 `pnpm install`／任何 server 重启或 kill；
- 只读命令集合：`git rev-parse`／`git status`／`git diff`／`git diff --cached`／`git show HEAD:…`／`git log`／`node tooling/check-boundaries.mjs`／`node packages/base-render/scripts/gen-help-shell.cjs --check`／`node -e`（真 import `dist`）／`Get-Item`（mtime）／`Select-String`。

**报告完。**

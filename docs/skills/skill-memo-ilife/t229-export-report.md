# #229 出口与命名落盘 · 交付报告（缺省＝HELP 文件，速查走显式参数）

- 票面：`docs/skills/skill-memo-ilife/t229-body.md`
- 权威源：`docs/skills/skill-memo-ilife/t220-orchestrator-decisions.md`（20 条裁决；冲突以它为准）
- 上游件：#228 `packages/skill-memo-ilife/src/help/helpFile.ts`（3 个运行时导出，本票只依赖其签名）
- 结论：**命令落地、真跑拿到落盘文件与绝对路径回执、跑完不建库**；命令表 10 → 11 连带四处已同批处理（D1／D2／D3 已改，D4 按裁决 19 归 #231）。

---

## 一、新增与改动（LF 口径）

| 文件 | LF | 状态 | 一句话 |
|---|---|---|---|
| `packages/skill-memo-ilife/src/help/manifest.ts` | 21 | 新增 | 三条命名值：`HELP_HTML_DIR_NAME`／`HELP_FILE_STEM`／`LOOKUP_FILE_STEM`，**只放值** |
| `packages/skill-memo-ilife/src/help/memoOutput.ts` | 128 | 新增 | 自持最小管线（裁决 3）：通式命名（零 IO）＋ `wx` 独占 ＋ `EEXIST` 递补 ＋ `resolve` 绝对路径；9 个运行时出口 |
| `packages/skill-memo-ilife/src/cli/cmd_read.ts` | 238 | 改 | **分派顺序**：`memo.help.lookup` 在开库之前走 `dispatchHelp`；内部断言防回退；`delivery` 顶层追加 |
| `packages/skill-memo-ilife/src/render/envelope.ts` | 46 | 改 | 命令表补 `'memo.help.lookup': 'list'`（10 → 11） |
| `packages/skill-memo-ilife/test/cli-help-229.test.mjs` | 180 | 新增 | 回归锁：命名／独占递补／三支口径／真 spawn 出口／不建库 |
| `packages/skill-memo-ilife/scripts/build-help.mjs` | 38 | 改 | 见 §6.2：自述计数由写死 `10` 改为**派生** |
| `packages/skill-memo-ilife/SKILL.md` | — | 改 | 由上面那个生成器重跑注入（块内一行：多 `memo.help.lookup`、`10` → `11`） |
| `packages/skill-memo-ilife/test/render.test.mjs` | 56 | 改 | D2：`GOOD` 补第 11 条载荷 ＋ 断言 10 → 11 |
| `docs/memo-migration-split.md` | — | 改 | D1 配套：围栏块补 `memo.help.lookup \| list`，节标题 `10 处` → `11 处` |
| `test/memo-split.test.mjs` | 26 | 改 | D1：`rows.length` 10 → 11 |
| `packages/base-combos/combos.yaml` | — | 改 | D3：`combos:` 段加 1 条（恰 5 字段，`shape: list`，`cmd: skill-memo-ilife`），**别的键一个没动** |
| `packages/base-combos/src/present.ts` | 115 | 改 | D3：由 `scripts/gen-present.mjs` 重新生成（88 → 111 键中的新一条） |

**未碰**：`packages/base-render/**`、`tooling/check-boundaries.mjs`（#228 已就地改好，本票不再动）、`src/help/index.ts`（裁决 16：不转发、包根出口维持 **49**，实测复验见 §7）、`src/index.ts`、`pnpm-lock.yaml`。

---

## 二、完成判据：真跑原始输出

跑法：`node packages/skill-memo-ilife/dist/cli/cmd_read.js memo.help.lookup`，环境 `SKILLS_DB_PATH=D:\2Study\StudyNotes\.db`（真机值，未改写）。

```json
{"version":"0.1.0","skill":"memo","shape":"list","key":"memo.help.lookup","data":{"items":[{"id":"memo","icon":"📝","label":"备忘类","subgroupCount":2,"sceneCount":6},{"id":"search","icon":"🔍","label":"查找类","subgroupCount":3,"sceneCount":7},{"id":"remind","icon":"⏰","label":"提醒类","subgroupCount":2,"sceneCount":4},{"id":"wish","icon":"🎯","label":"心愿类","subgroupCount":2,"sceneCount":5},{"id":"checkin","icon":"✅","label":"打卡类","subgroupCount":1,"sceneCount":3},{"id":"mood","icon":"💭","label":"情绪类","subgroupCount":1,"sceneCount":3},{"id":"sync","icon":"🔄","label":"同步类","subgroupCount":1,"sceneCount":1},{"id":"init","icon":"🚀","label":"初始化类","subgroupCount":1,"sceneCount":1}],"total":8,"subgroupTotal":13,"sceneTotal":30,"version":"1.3.0","mode":"file"},"delivery":{"mode":"file","path":"D:\\2Study\\StudyNotes\\.db\\memo_html\\备忘录_HELP_20260912_133708.html","bytes":130885}}
```
`exit=0`，`stderr` 空。

**产物绝对路径**：`D:\2Study\StudyNotes\.db\memo_html\备忘录_HELP_20260912_133708.html`
**字节数**：回执 `130885` ＝ 实测 `Get-Item .Length` `130885`（一致）
**产物是全壳页**：含 `<script id="help-data" type="application/json">`＝真、含 `备忘录 · 使用手册`＝真；`memo.` 命令名 0 处、`--html` 0 处（用户 U6「命令不上页面」未破）
**扁平落盘（裁决 1）**：`memo_html\` 下**子目录 0 个**；文件名无 `help/` 段
**不建库证据**：
- 跑前 `Test-Path <db>\memo` ＝ `False`（本机 0 字节空壳 `memo.db` 在、真目录不在，正是票面警告的那种局面）
- 跑后 `Test-Path <db>\memo` ＝ **`False`**
- 跑前 `memo_html\备忘录_HELP_*.html` ＝ 61 件 → 跑后 **62 件**（只多本件，未动任何老实物）
- `memo_html\备忘录_速查表*` ＝ 0 件（缺省支不产速查表）

> ⚠️ 判据「今天空过」已解除：旧代码在 `cmd_read.ts` 早期就抛 `ERR 3: 未知联动 key`，开库那段根本没走到；现在真跑通、且新增一条测试真断言 `existsSync(join(db,'memo')) === false`。

**旁证（不是本票自己跑的）**：交付期内 `memo_html\` 又多出 `备忘录_HELP_20260912_133947.html`，**本票的两次调用是 `133708` 与 `133959`**。该件的写入时刻（13:39:47）与本票任何一步都不对应 ⇒ 另有进程（编排会话／自动化／`--html` 之外的调用）也在对真机 `SKILLS_DB_PATH` 跑同一个命令，并同样拿到 130885 B 的全壳页（逐项核过：全壳＝真、标题＝真、`memo.` 命令名 0 处）。本票**未**碰它——它是独立第二次调用产出的**合法同形产物**，可当作「命令在真机上被反复调用都正常」的旁证；但也说明**真机目录正在被并发写**，验收 #233 数件数时要把这几次算进去。

---

## 三、三支显式口径（照 `#144`）

真 spawn 三支（`--params` 逐字传，绕开 Windows shell 吃引号）：

| 支 | 参数 | exit | 结果 |
|---|---|---|---|
| 缺省 | 无 | 0 | `memo_html\备忘录_HELP_<stamp>.html`，130885 B，全壳页 |
| 速查 | `{"mode":"lookup"}` | 0 | `memo_html\备忘录_速查表_20260912_133729.html`，6476 B，`total: 28`（全量唤醒词），每行带 `key`／`shape`／`cli` |
| 现找 | `{"q":"查提醒"}` | 0 | `delivery` **不存在**；`total: 1`，命中 `memo.remind`；**连 `SKILLS_DB_PATH` 目录本身都没建**（零落盘，只 stat） |
| 覆盖 | `--html <路径>` | 0 | 同路径跑两次：字节 130885／130885，目录内仍 1 件（**覆盖写、不递补**） |
| 互斥 | `{"q":"x","mode":"lookup"}` | 2 | `ERR 2: 参数 q 与 mode 互斥：q＝现找，mode＝速查表产物` |
| 坏 mode | `{"mode":"nope"}` | 2 | `ERR 2: mode 非法（nope）：本键只认 lookup` |
| 落盘失败 | `--html <父级是文件>/a.html` | 5 | `ERR 5`（不静默当成功、不换形态降级） |

`_2` 递补实测：同秒连跑三次，三次回执路径互不相同（本体／`_2`／`_3`），三个文件都在。

---

## 四、D1／D2／D3 同批改（含两处「配套另一半」）

### D1 `test/memo-split.test.mjs:15` ＋ 配套 `docs/memo-migration-split.md`

```diff
-## 联动 key×shape 映射（10 处；key 字符串为提案，P8 combos 落表时冻结；analysis/fallback 全 key 可用）
+## 联动 key×shape 映射（11 处；key 字符串为提案，P8 combos 落表时冻结；analysis/fallback 全 key 可用）
 memo.stats | stat
+memo.help.lookup | list
```
```diff
-  it('10 联动 key×shape 全合法（命名空间+6 形状）', () => {
-    assert.equal(rows.length, 10);
+  it('11 联动 key×shape 全合法（命名空间+6 形状）', () => {
+    assert.equal(rows.length, 11);
```

原始输出：
```
▶ 备忘录拆分确认 M1
  ✔ 11 联动 key×shape 全合法（命名空间+6 形状） (0.5515ms)
  ✔ 定时出 scope 已定（reminder_scheduler 不迁） (0.1297ms)
ℹ tests 2   ℹ pass 2   ℹ fail 0
```

### D2 `packages/skill-memo-ilife/test/render.test.mjs:20` ＋ 配套 `GOOD` 夹具

```diff
   'memo.stats': { metrics: { count: 3 } },
+  // #229：命令表 10 → 11（缺省「备忘录 help」＝ HELP 文件那条主路，list 形＝域级索引载荷）。
+  'memo.help.lookup': { items: [{ id: '1', icon: '📝', label: '备忘', subgroupCount: 1, sceneCount: 6 }], total: 1, version: '1.3.0' },
-  it('10 key 建 envelope 全字段可用', () => {
-    assert.equal(Object.keys(MEMO_KEY_SHAPES).length, 10);
+  it('11 key 建 envelope 全字段可用', () => {
+    assert.equal(Object.keys(MEMO_KEY_SHAPES).length, 11);
```

原始输出：
```
▶ memo 渲染层
  ✔ 11 key 建 envelope 全字段可用 (1.1434ms)
  ✔ 坏 key/错形状 throw（#34 题面追认：未知形状/超体积一律 throw） (0.5297ms)
  ✔ 转义（代理对原样保留）与超体积门 (0.3639ms)
  ✔ 模板：6 随包（含 init_report，M6 落定），标记各恰 1 (0.8350ms)
ℹ tests 4   ℹ pass 4   ℹ fail 0
```

### D3 `test/combos-p8.test.mjs` —— **测试未改**，改 `combos.yaml` ＋ 重跑生成器

```diff
   - key: memo.stats
     skill: memo
     shape: stat
     title: 聚合统计
     cmd: skill-memo-ilife
+  - key: memo.help.lookup
+    skill: memo
+    shape: list
+    title: 备忘录HELP
+    cmd: skill-memo-ilife
 channels:
```
```diff
   'memo.stats',
+  'memo.help.lookup',
 ];
```

生成器原始输出：`present 已生成：111 键 → D:\ilife\packages\base-combos\src\present.ts`（`exit=0`）

原始测试输出（`test/combos-p8.test.mjs`）：
```
✔ P8 combos 真相源与 HELP 注入 (1837.6269ms)
ℹ tests 9   ℹ pass 9   ℹ fail 0
```
其中含 `:107-114` 那条（逐键 `reg.resolve(key).key === key`，`PRESENT_KEYS` 里已有新键）与 `:115-120` 那条（`present.ts` 与生成器输出逐字相等）。

> ⚠️ **顺序踩坑留证**：改完 yaml 后**必须先重跑生成器、再重跑 `tsc --build packages/base-combos/tsconfig.json`**。测试读的是 `packages/base-combos/dist/present.js`（gitignore 的构建产物），只改 `src/present.ts` 不重建的话，`:107` 那条会以 `RegistryError: 未知 registry key：memo.help.lookup` 变红——本票实际先撞了一次，重建 `base-combos`（只含 `base-link-core` 一个上游，**未触及 `plugin-bill-ilife`**）后转绿。

### D4 —— 归 #231（兼记本票），交接项

`packages/plugin-memo-ilife/test/skills-provider.test.mjs:106` 现为**条件断言**：
`assert.ok(!def.content.includes('memo.help.lookup') || skillsHelpCommandExists(), …)`。
本票落地后 `SKILL.md` 正文**仍不含**该命令名（正文归 #231），故该断言今天仍绿（实测 `plugin-memo-ilife` 全套 17/17 过）。**#231 落地说明面时必须翻成无条件正向断言**——这是交接项，不是本票欠账（裁决 19）。

---

## 五、门输出

```
$ pnpm boundaries
Scope: all 18 workspace projects
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
```
```
$ node tooling/check-combos.mjs
OK: combos 111 注册 + channels 15 对 + scenarios 30 + fallbacks 6 + l6 空位 6
```
```
$ node packages/base-combos/scripts/gen-present.mjs
present 已生成：111 键 → D:\ilife\packages\base-combos\src\present.ts
```
```
$ node --test test/combos-help-80.test.mjs
ℹ tests 9   ℹ pass 9   ℹ fail 0
$ node --test test/memo-split.test.mjs test/combos-p8.test.mjs
ℹ tests 11  ℹ pass 11  ℹ fail 0
$ node --test "packages/skill-memo-ilife/test/*.test.mjs"
ℹ tests 48  ℹ suites 8  ℹ pass 48  ℹ fail 0
$ node --test "packages/plugin-memo-ilife/test/*.test.mjs"
ℹ tests 17  ℹ pass 17  ℹ fail 0
$ node node_modules/typescript/bin/tsc --build packages/skill-memo-ilife/tsconfig.json
（exit 0，无输出）
```

**构建纪律**：全程**只**用 `tsc --build <单个包的 tsconfig.json>`；未跑仓根 `tsc -b`／`pnpm -r build`／`pnpm test`；未重启、未触碰 `127.0.0.1:43120`。为让 D3 的测试读到新注册键，构建了 `packages/base-combos`（其引用闭包只有 `base-link-core` 一项，**不含 `plugin-bill-ilife`**，与 #241 那条雷无关）。

---

## 六、两处本票的判断（留证据，供复审）

### 6.1 速查支的 `--html`／产物写的是 envelope **片段**，不是第二张整页

缺省支写的是共享层全壳页（`renderMemoHelpHtml`，自带 CSS／JS／整页壳）；`mode:"lookup"` 支与 `--html` 覆盖支写的是本包既有的 `renderEnvelopeHtml` 片段（`<section data-skill="memo" …>`）。理由：

1. **不新造第二张页面**：本包 6 个模板与命令**没有一对一映射**（账单有 `templateFor`，备忘录没有），把速查表塞进 `memo_query.html` 会撞 3 处（`payload.message`、`meta.command_cn`、`renderItem` 的 `created_at` 时间行都取不到值）。
2. **`--html` 今天的语义就是这个片段**（`cmd_read.ts` 原实现逐字 `writeFileSync(o.html, renderEnvelopeHtml(env))`），本票**不改既有语义**；速查支跟着它走＝同一包内一条渲染路。
3. 主页面的交付物（缺省支）是完整的，速查是**显式 opt-in 的次级产物**。

若复审认为速查支也该给整页，请开票——那是「本包要不要第二张页面模板」的问题，不是落盘问题。

### 6.2 `scripts/build-help.mjs` 的 `（10 联动）` 是写死的，本票就地摆正

`build-help.mjs:18` 原来把计数写成字面量 `10`，而它的键表取自 `Object.keys(MEMO_KEY_SHAPES)`。命令表变 11 后，该生成器的输出会自述「11 个键（10 联动）」——**同一行自相矛盾**，且这是**测试钉死的生成物**（`test/skill.test.mjs:32` 断言 `SKILL.md` 的注入块与生成器输出逐字相等），不生成就红、生成了就带着假数字。故本票把它改成 `keys.length` 派生（`docs/agents/structure.md:95`「旧代码与新规矩不一致时，在本次改动里就地摆正」），并重跑生成器。

`packages/skill-memo-ilife/SKILL.md` 因此被改了 **1 行**（块尾那行）。该文件工作树里另有别的会话的 **4 行新增**（不在 AUTO 块内，`git diff` 已核）；本票只写生成器产物，**未碰正文**（正文归 #231）。

---

## 七、必报五步 · 第五步「交付对账」

| # | 第一步清单（票面／裁决给定） | 实际碰到的 | 偏差 |
|---|---|---|---|
| 1 | `src/help/manifest.ts`（新，3 导出） | 同（新，3 导出） | 零 |
| 2 | 自持最小管线（裁决 3） | `src/help/memoOutput.ts`（新，9 导出；命名＋落盘合并一件，理由：两半同属「产物是什么／怎么写下去」，合一件少一次跨件转出口） | **偏差 1：件名与票面未指名**（票面只规定职责，未指文件名）；件头已按硬条件写明「第 4 份同逻辑实现 ＋ `#237` ＋ `#240`」 |
| 3 | `src/cli/cmd_read.ts` 改分派顺序 ＋ 内部断言 | 同（`dispatchHelp` 在开库前；`case 'memo.help.lookup'` 走 `fail(1, …)` 内部断言） | 零 |
| 4 | `src/render/envelope.ts` 命令表 10 → 11 | 同 | 零 |
| 5 | 三支显式口径 | 缺省／`mode:"lookup"`／`q`／`--html` 全实现并真跑 | 零（`--html` 语义见 §6.1） |
| 6 | D1（含配套文档） | `test/memo-split.test.mjs` ＋ `docs/memo-migration-split.md` | 零 |
| 7 | D2（含配套夹具） | `packages/skill-memo-ilife/test/render.test.mjs` | 零 |
| 8 | D3（改 yaml ＋ 重跑生成器，**不改测试**） | `packages/base-combos/combos.yaml` ＋ `src/present.ts`；测试一行未动 | 零 |
| 9 | D4 归 #231（兼记本票） | 未改；已在本报告 §4 记为交接项，并复验该断言今天仍绿 | 零 |
| 10 | 交付报告（本文件） | 同 | 零 |
| — | **清单之外**（逐条报）：`packages/skill-memo-ilife/test/cli-help-229.test.mjs`（新，回归锁）；`packages/skill-memo-ilife/scripts/build-help.mjs` ＋ 其生成物 `SKILL.md`（§6.2） | — | **偏差 2：两件超出第一步清单**，理由见 §6.2 与 §1 |

**裁决 12 复验（本票未动）**：`tooling/check-boundaries.mjs` 里 `'skill-memo-ilife'` 已由 #228 移出、别的会话的 `#199` 注释块与 `skill-schedule` 移出原样保留；`packages/skill-memo-ilife/package.json` 的 `base-paint: ^0.3.0` 已由 #228 加好——本票**一行未碰**这两处。
**裁决 16 复验（实测）**：包根运行时出口 **49**，新名字（`HELP_FILE_STEM`／`LOOKUP_FILE_STEM`／`HELP_HTML_DIR_NAME`／`deliverMemoHtml`／`resolveStemTarget`／…）**一个都没进包根**；`src/help/index.ts` 未改。
**裁决 18 记账**：本票判据**未**写成「包内 `npm test` 绿」（那条快照红是本图之外的既有状态）；判据＝§2 的真跑 ＋ §5 的定向用例。

---

## 八、拿不准／留给下一环

1. **速查支的产物形态**（§6.1）：片段 vs 整页，本票选了「与 `--html` 既有语义同形」的片段。若验收要求速查表也是可独立打开的整页，需另开一票（要新增页面模板）。
2. **`memoOutput.ts` 的件名**（§7 偏差 1）：票面给的是职责不是名字。若 #240 迁移时要按名找，件头与 `manifest.ts` 件头都写了去向，不会失联。
3. **速查表内容的「一行什么」**：本票把 `WAKE_TABLE` 的 28 条（16 显式 ＋ 12 子唤醒词）派生成 `phrase`／`cli`／`key`／`shape`／`desc`。老技能没有这一支（无老实物可对），故**无逐字基线**，只有 `#144` 账单的同形样板。
4. **`memo_html/` 从此会有新世代产物与老实物并排**：本机实测已多出 1 件（62 件）。这是裁决 1 有意为之（与老实物并排供 #233 验收），但**老实物一件未动**。
5. **#240（迁移票）尚未开**：裁决 3 要求「另开迁移票『备忘录出口落盘迁入共用件 `saveHtmlFile`』，`blocked_by = #237`」。本票**未开票**（票面明令不许动任何 issue），只在 `memoOutput.ts` 件头挂账。**需要编排会话去开这张票**，否则这笔欠债没有可查记录。

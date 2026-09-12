# 04 · 硬约束实地核算（skill-home 新件住哪 · 取证子代理）

只读四份文件：`tooling/check-boundaries.mjs`、`packages/skill-home/scripts/build-help.mjs`、`packages/skill-home/src/cli/cmd_read.ts`、`docs/agents/structure.md`。
行数口径：LF（只数 `\n`），UTF-8 直读计数。

## 1. 边界门禁现状

判据原文（`tooling/check-boundaries.mjs`）：

- `:55`　`const SKILLS_BASE_FROZEN = ['skill-home'];`
- `:56`　`const BASE_RUNTIME = new Set(['base-paint', 'base-render']); // 目录名／包名两种写法都算`
- `:57-62`　依赖闭包断言：`deps = { ...dependencies, ...devDependencies, ...peerDependencies }`（`:59`），命中即 `assert(hit.length === 0, \`${name} 依赖闭包不含 base-*（实得：${hit.join(',') || '无'}）\`)`（`:61`）。
- `:63`　`const SRC_RE = /(?:from|import|require\s*\()\s*['"](?:base-paint|base-render)/;`
- `:74-78`　源码／模板扫描：`walkSrc(packages/<名单件>/src)`（`:65-73`，只扫 `.ts`）＋ `packages/<名单件>/templates/*.html`，命中即 `assert(srcHit.length === 0, '未迁移技能源码／模板不 import base-*（…）')`。
- `:80`　违规怎么报：`if (bad) { console.error(\`boundaries: ${bad} 处破界\`); process.exit(1); }`，全绿才 `boundaries: PASS`（`:81`）。

名单现状：**`skill-home` 在**（`:55`，今天名单里唯一一个）。`:30-54` 的注释记录 bill／schedule／memo-ilife／chef 已逐条移出，只剩 skill-home。

`base-paint` 的允许依赖方：名单里今天**只有 `skill-home`**，故 `BASE_RUNTIME` 与 `SRC_RE` 实际只作用于 skill-home；注释口径为「移出名单即＝有意的消费方」（`:34-39`、`:49-54`）。

**结论：会判红。** 新件若 import `base-paint`，撞两道断言：`:57-62` 依赖闭包（`packages/skill-home/package.json:24-26` 只有 `base-link-core`，无 `base-paint`）；`:74-78` 源码扫描（新件住 `src/` 下即被 `walkSrc` 覆盖）。两道各记 1 处破界，退出码 1。今天唯一不破界的做法是先把 `'skill-home'` 从 `:55` 名单摘掉（＝宣布成为有意消费方），并同时补依赖——先例是 chef：`"base-paint": "^0.3.0"` 与摘名单「同一动作的两半」（`:52`）。

## 2. build-help.mjs 的换行

- `:25`　`const text = readFileSync(skillPath, 'utf8');`　（只按 utf8 读，不探 `\r\n`）
- `:28`　`const next = text.slice(0, si + START.length) + '\n' + buildHelpBlock() + '\n' + text.slice(ei);`
- `:29`　`writeFileSync(skillPath, next);`　（不带 encoding，也不拿 `\r\n` 还原）
- `:14-19`　注入块自身也只用 LF：`lines.join('\n')`（`:19`）。

后果一句话：这条路径**只读文本、不探也不还原检出换行**——注入块一律 LF，且整份 `SKILL.md` 被原样回写、不按检出换行归一（若文件是 CRLF，写完仍是原样的 CRLF，不因本脚本变成 LF）。「不保检出换行」＝脚本压根不检测换行，不是检测后再丢掉。

## 3. cmd_read.ts 分派段

原文（`packages/skill-home/src/cli/cmd_read.ts`）：

- `:8`　`import { ... openHomeDb, closeHomeDb, ... } from ...`（第 8 行是导入段）
- `:54`　`function dispatch(key: string, params: Record<string, unknown>): unknown {`
- `:55`　`const dbPath = resolveDbPath();`
- `:56`　`const handle = openHomeDb(dbPath);`
- `:58`　`if (handle.initialized) note('居家 DB 已初始化：' + dbPath);`（`note` → stderr，见 `:38`）
- `:59`　`switch (key) {`
- `:674-678`　`case 'home.help.lookup': {` → `buildHelpLookup()` 映射为 `{ phrase, key, shape, cli, desc }` → `return buildHelpItems(all, q);`
- `:681-683`　`finally { closeHomeDb(handle); }`

**是否第一行就开库／建目录：是，且分派前就建目录。** `openHomeDb` 在 `:56`，位于 `switch`（`:59`）之前，对所有 key（含 `home.help.lookup`）都执行；`:55` 的 `resolveDbPath` 内部就 `mkdirSync(dir, { recursive: true })`（`src/fetch/paths.ts:20-23`），`openHomeDb` 还会 `CREATE TABLE IF NOT EXISTS`（`src/fetch/db.ts:69-84`）。所以今天说一句 help 也会建目录、建库、写入／初始化表。

`home.help.lookup` 回执形态（`:674-678` ＋ `src/render/views.ts:71-77`）：`{ items: HelpItem[], total: number }`，`HelpItem = { phrase, key, shape, cli, desc }`（`views.ts:72`）。**只有这份列表，没有任何文件路径回执**——分派段里不写 HELP 文件（本包 `src/` 内 `writeFileSync` 只有一处：`:723` 写 `--html` 产物）。

行数：今天 **741 行**（LF；`Get-Content` 计 735，差 6＝首尾空行口径；CRLF 0，44351 字节）。

告警线：`skill-home` **本包没有自己的数字**——`packages/skill-home/` 下无 `AGENTS.md`（实测不存在），包内 grep「告警线／maxLines／超线／行数」零命中，`package.json` 也只有 34 行、无相关字段。`structure.md:70` 只写「具体数字由各包自己定，写在各包自己的地方」；全仓 `docs/` 里的 350 ＋ LF 只见于兄弟包（memo-ilife／chef／calorie），本文照本任务指定用 structure.md 系数字 **350** 计算：741 − 350 ＝ **超 391 行**（741 ÷ 350 ≈ 2.1 倍）。

## 4. structure.md 硬规则摘录

### 五条铁律（各一句）

- 铁律一 · 能力自治（`:21-26`）：能力代码只住自己目录，用别家只走它那一个公开接口；判据「这个文件里的东西，是不是都只属于一个能力？」，**把对方那份抄一遍放进自己目录不算走接口**。
- 铁律二 · 概念唯一（`:28-35`）：常量／类型／公式／口径全管辖范围只有一个定义地，别处引用；会过期的清单不进规矩。
- 铁律三 · 改动可预告（`:37-42`）：动手前列「会碰哪些目录」，交付后逐行对账；不出现 `any`、不出现说不出形状的 `unknown`。
- 铁律四 · 名字取自 HELP（`:44-49`）：目录名取自 HELP 一级分组，文件名与接口名取下一级；判据「把目录名念给用户听，他能在 HELP 里指出这是哪一组」；禁 `utils`／`helpers`／`common`／`misc`／`core`／`types`／`base` 这类工种名。
- 铁律五 · 接口小、里面厚（`:51-58`）：一个文件对外给的不多于五个，一个类型字段不多于八个，其中至少一个真正干活；只做汇总的能力不许重算别家口径。

### 必报五步（`:72-107`）

- 第一步 · 影响清单（`:76-81`）：动手前报新增或改动哪些目录／文件、每文件一句、以及碰它的理由，用户看过再动；每行只指**一个**能力目录，一行两能力要写理由。
- 第二步 · 结构设计（`:83-88`）：报目录树、每文件职责与公开接口（导出几个、各一句）、共用件被哪两个能力用；新建目录层级或碰三个以上能力要等用户点头。
- 第三步 · 写代码（`:90-95`）：跨能力走公开接口；常量与类型只写一处；只有出目录才算对外（目录内互用不必对外）；旧代码不一致就地摆正。
- 第四步 · 超线报警（`:97-101`）：任何文件超本包告警线，当场报「**已超线，需要根据规则进行重构。**」＋为什么超＋拆法（或说明先不拆）；只有告警线数字触发报警。
- 第五步 · 交付对账（`:103-107`）：报实际碰到的目录，与第一步清单逐行对；完成判据是偏差为零，**这是整套纪律唯一的机械验收点**。

### 告警线数字与能力目录形状

- **文件行数告警线：`structure.md:70` 只给口径不给数字**——「具体数字由各包自己定，写在各包自己的地方。超线即触发第五步，不是拦路。」本文用的 350 来自兄弟包先例（`skills/skill-memo-ilife/AGENTS.md` 等），skill-home 本包数字缺失。
- **能力目录**（`:64`）：`src/` 下第一层必须是能力名，不能是工种名。
- **能力内部**（`:65`）：按能力自己的活分，一层到两层即可，分层依据是变化频率；内部每层只许往下用，不许反向。
- **依赖方向**（`:66`）：能力只往下用东西，不许反向；共用位里不许出现任何一个能力的名字。
- **共用件**（`:67`）：能力间要共用的放共用位，且写得出**哪两个能力在用**；写不出的留在那个能力目录里；**共用位是从第二个用法里长出来的，不是预先设计的**。
- 另：就地摆正（`:68`）、一次性脚本住包内 `scripts/`（`:69`）、管辖范围 `packages/` 下全部源码（`:7`），不管测试文件／页面模板／构建产物／文档（`:9`）。

## 5. 与前几份报告对不上之处（逐条给行号）

1. **`cmd_read.ts` 行数**：前几棒传 727 行，实测 **741**（`cmd_read.ts:1-741`，LF 口径；`Get-Content` 计 735）。差 14 行，取数须以开工时实测为准。
2. **告警线不是本包既有规矩**：350 只见于兄弟包（`skills/skill-memo-ilife/AGENTS.md` 等），`docs/agents/structure.md:70` 明写数字「由各包自己定」；`packages/skill-home/` 下 `AGENTS.md` 实测不存在、包内该词零命中。把 350 说成「skill-home 的既有规矩」与源文件对不上。
3. **`home.help.lookup` 无文件回执**：`cmd_read.ts:674-678` 只回 `{ items, total }`（`views.ts:71-77`），分派段不写 HELP 文件；「缺省即落一份 HELP 文件并回执绝对路径」在 skill-home 侧今天**没有实现**（对照 `skill-memo-ilife`／`skill-schedule`／`skill-chef` 的技能描述，那是别家的行为）。
4. **命令分派普遍开库**：不只是 help 分支——`cmd_read.ts:55-59` 的建目录／开库／建表在所有 key 之前，前几棒若把「开库」只记在 help 那条分支上，与 `:55-59` 对不上。
5. **`build-help.mjs` 的读法**：`:25` 按 `'utf8'` 读、`:28-29` 直接回写，全篇没有换行探测或还原代码；说它「保／不保检出换行」都应落在「不检测」这个事实上（`:25-29`）。
6. **名单移出的成文状态**：`check-boundaries.mjs:30-54` 的注释与 `:55` 名单一致（只剩 skill-home）；若前几棒转述成「4 件技能都还在名单里」，与 `:55` 对不上。

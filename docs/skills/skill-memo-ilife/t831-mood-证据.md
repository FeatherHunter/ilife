# #831 mood 域 3 场景端到端 · 证据

**结论一句话**：`mood` 域 3 个场景**唤醒词能路由、命令能跑、产物真落盘、页面按族出**；「通用回执」这一族（34 格里 19 格）在 `src/render/receipt.ts` 有唯一定义地。**五条验收命令全绿**：真出口用例 10／10、分隔符门 3 件节点级 0、响应式门三档零溢出、六列机审 3/3 PASS、五维尺逐页 96 且每维 ≥ 满权 80%。本票可关。

> 2026-09-21 收尾版。本件第一版停在 95%（当时判分件归 #851、盘上不存在）；#851 拆出的 [#867](https://github.com/FeatherHunter/ilife/issues/867)（读数链）／[#868](https://github.com/FeatherHunter/ilife/issues/868)（判分引擎）／[#869](https://github.com/FeatherHunter/ilife/issues/869)（六列机审）／[#870](https://github.com/FeatherHunter/ilife/issues/870)（共用形状件与接线）四张全部关票后，本票按新口径重跑全部读数，读数在 §二。

---

## 一 交付物与落盘实例（回执绝对路径）

真跑命令与落点：库侧扁平目录 `〈库目录〉/memo_html/`，实例名＝`主体_YYYYMMDD_HHMMSS.html`（主体由册子 `bookletFileStem()` 算，时间戳由共用件 `base-paint/save-html` 加）。

| 场景 id | 唤醒词 | 命令 | 退出码 | 库侧实例 | 字节 | 留档副本 |
|---|---|---|---|---|---|---|
| `memo_add_mood` | 记情绪 | `memo.create` | 0 | `<临时库>\memo_html\记情绪_20260921_214117.html` | 105 350 | `.scratch/memo-831/pages/记情绪_20260921_214117.html` |
| `memo_update_mood` | 改情绪 | `memo.update` | 0 | `<临时库>\memo_html\改情绪_20260921_214117.html` | 105 359 | `.scratch/memo-831/pages/改情绪_20260921_214117.html` |
| `memo_delete_mood` | 删情绪 | `memo.remove` | 0 | `<临时库>\memo_html\删情绪_20260921_214117.html` | 105 359 | `.scratch/memo-831/pages/删情绪_20260921_214117.html` |

`<临时库>` ＝ `%TEMP%\memo-831-pages-<随机>`（每次真跑新建、家目录隔离，绝不碰活库）。留档副本在仓内相对路径下可复核，逐字节同源。

**命名对账**：三件实例主体分别 `记情绪`／`改情绪`／`删情绪`，与 `src/help/booklet.ts` 的 `file` 字段**逐字相同**（生成器自校验 ✓×3，退出码 0）。

**生成器（可复跑）**：`node docs/skills/skill-memo-ilife/t831-gen-pages.mjs` —— 临时库 ＋ 隔离配置 → 逐场景真跑唯一出口 → 收 3 件产物到 `.scratch/memo-831/pages/`，并**现产**按域配置 `docs/skills/skill-memo-ilife/t831-按域配置.json`（产物名带时间戳，手抄必然发霉；由产出者写名单，判分件的 `instances` 与页群永远逐字对齐）。

---

## 二 逐条验收读数（2026-09-21 现场，全部可重跑）

| 验收命令（票面） | 现行件（口径更新处） | 当刻读数 | 退出码 | 判 |
|---|---|---|---|---|
| 本域每条命令的真出口用例 | `node --test packages/skill-memo-ilife/test/receipt-831.test.mjs` | **10/10 绿**（含两条反例） | 0 | **过** |
| 分隔符门 | `node packages/base-render/test/separator-probe.mjs <产物>`（逐件） | 3 件**节点级 0 处／行级 0 行** | 0 | **过** |
| 响应式门 | `node packages/skill-calorie/scripts/measure-responsive.mjs --dir .scratch/memo-831/pages --widths 390,768,1440 --json .scratch/memo-831/resp.json` | `OVERFLOW-ZERO pages=3 cells=9 failed=0` | 0 | **过** |
| 版式读数 | `node docs/skills/skill-calorie/t516-判据-版式.mjs --dir .scratch/memo-831/pages --widths 390,768,1440 --json .scratch/memo-831/fmt.json` | 三档 `touchSmall=0`、窄档最小字号 12、越界 0 | 0 | 读数（不是门） |
| 机审六列 | `node docs/skills/skill-memo-ilife/t869-机审.mjs --dir .scratch/memo-831/pages`（#869 落件，承 #851 第 2 件；**票面写的 `t407-v8-style-audit.mjs` 是账单域件，`t824` §4 已裁本图不用**） | `RESULT: 3/3 PASS ①0 ②0 ③0 ④0 ⑤0 ⑥0 缺件—` | 0 | **过** |
| 五维尺 | 读数链 `node docs/skills/skill-memo-ilife/t867-facts.mjs --dir .scratch/memo-831/pages --human docs/skills/skill-memo-ilife/t831-人核档.md --json .scratch/memo-831/facts.json`（#867）＋ 引擎 `node packages/base-render/scripts/判分.mjs --dir .scratch/memo-831 --config docs/skills/skill-memo-ilife/t831-按域配置.json`（#868 公共层唯一算式；**票面写的 `t<t4票号>-判分.mjs` 盘上不存在**） | **逐页 96、3/3 过线**（D1 15／D2 20／D3 25／D4 15／D5 21；硬扣 0；`RECONCILE` 逐页逐维最大绝对差 **0**，比对 21 项） | 0 | **过** |

### 2.1 本票用例套：10 例全绿（沙箱已退役）

```
✔ #831 · 通用回执族（定义级）   3 例
✔ #831 · mood 域 3 场景端到端（真出口）   7 例
ℹ tests 10   pass 10   fail 0
```

覆盖：族模板三标记与禁 `loading="lazy"`／零新断点／视口覆盖；三场景真出口各一条（含**落盘名**与**页内内容**断言）；册子三格产物齐全；**两条反例**（非情绪类笔记不出本族页；无此笔记即 exit 4 不落产物）；`--html` 逐字落点仍生效。

**沙箱退役**：本件第一版从 `dist` 的副本跑（`src/init/page.ts` 在 #833 在途时加载即死）。今天实测该件已干净加载（导出 `renderInitGuidePage`／`renderInitReportPage`），用例套**改直跑仓内 `dist/cli/cmd_read.js`**，替身代码与临时目录一并删除 ⇒ 不再可能被替身喂出假绿，也不再与在途票互相锁死。

### 2.2 分隔符门：三件全 0（本图第一处共用件债已在本票范围外收掉）

```
【节点级】含 · : 0 处   含 ；: 0 处   ≥3 段并列: 0 处   命中合计: 0 处
```

第一版这里三件各 1 处，是「复制区说明行」那一句（`点复制数据…· 点复制日志…`）。它按 `t824`／`t849` §3 的口径属**公共层共用件债**，已由 [#870](https://github.com/FeatherHunter/ilife/issues/870) 收成公共层件并接线，本票**未在本域私有模板里另写**第二处定义 —— 这正是铁律二要治的。⇒ 本列今天清零。

### 2.3 响应式门：三档零横向溢出

```
OVERFLOW-ZERO pages=3 cells=9 failed=0 scopeOutFailed=0
记情绪 390档:0 ✓  768档:0 ✓  1440档:0 ✓（三件同）
```

这是**回归门**（基线本就全绿），按 `t824` §4 口径不算成绩。

### 2.4 六列机审：3/3 PASS，六列全 0

逐件读数（同形，三件逐字同）：`①0 ②0 ③0 ④0 ⑤0 ⑥0`，明细里 `触摸44 有｜塌列 有｜窄屏内距 有｜触屏两件 有｜viewport-fit 有｜本页样式块 0 内联 4 本页色值 0｜共享层CSS 62180｜载荷已解析（文案 6 段／数据 4 段）`。

两条要记住的：**本页样式块 0／本页字面色值 0** ⇒ 本族已不在自持 CSS 上（#870 把 `MEMO_PAGE_CSS` 与 `MEMO_PAGE_RUNTIME` 两处自持退役）；**载荷已解析** ⇒ 机审看的是渲染面的文案，不是静态壳（本族正文由页内 JSON 载荷渲染上屏）。

### 2.5 五维尺：逐页 96、3/3 过线、一致性自证差 0

```
| 页     | D1/15 | D2/20 | D3/25 | D4/15 | D5/25 | 逐维合计 | 硬扣分 | 页分 |
| 记情绪 |  15   |  20   |  25   |  15   |  21   |   96     |  −0    | 96  |
| 改情绪 |  15   |  20   |  25   |  15   |  21   |   96     |  −0    | 96  |
| 删情绪 |  15   |  20   |  25   |  15   |  21   |   96     |  −0    | 96  |
SCORE 页数=3 均分=96 最低=96 最高=96 ≥90 且每维≥80% 的页=3/3
RECONCILE 逐页逐维（含硬扣分与总分）最大绝对差 = 0 ⇒ 一致（比对 21 项）
```

- **D5＝21 的构成（满 25）**：`toc` 腿 −4 —— 回执页是**短页**，没有页内目录，`tocEl=0`；仍 ≥ 该维下限 20。同族先例（#826／#828／#829 的回执页）同值；族形状归公共层票，本票不改族。
- **D1／D2 是人核位**：口径与逐页出处写在 `docs/skills/skill-memo-ilife/t831-人核档.md`（含「静态面 ≠ 载荷渲染面」那一条的渲染面复核）；如实声明为**乐观上界**（视觉那一遍不是可复现件），终审 [#835](https://github.com/FeatherHunter/ilife/issues/835) 另判。
- 其余各列全部来自机器读数：`sep.json`／`resp.json`／`fmt.json` 由 #867 读数链现产，`facts.json` 的 DOM 六列由 `t867-dom-probe.mjs` 现产。

### 2.6 包内回归

```
node --test packages/skill-memo-ilife/test/*.test.mjs  →  212 例：211 绿 / 1 红
```

**唯一那条红不是本票的，是 HEAD 既有的**：`test/cli-help-229.test.mjs` 的 #240 烟雾锁正则（禁 `nextExclusiveCandidate|writeFileExclusiveWithRetry|flag:'wx'`）命中了 `src/cli/health/probe.ts:51` 的 `writeFileSync(probe, 'probe', { flag: 'wx' })` —— 那是**可写性探针**，不是落盘实现（该件由 #855 的拆分引入，已提交）。⇒ 记入遗留出口，不在本票夹带修（改它要么动 #855 交付的域件、要么动 #240 的锁，两者都不属本票写集）。

---

## 三 改了什么（独占写集，逐行对账）

| 路径 | 动作 | 一句话 |
|---|---|---|
| `src/render/receipt.ts` | **新增**（126 LF） | 「通用回执」族的唯一定义地：8 字段槽位契约 ＋ `buildReceiptPage()` ＋ 本地侧／远端侧取值→人话两张表 |
| `templates/receipt.html` | **新增**（页面模板，不管辖） | 族的页壳：结果卡 ＋ 徽章 ＋ 事实条 ＋ 键值行 ＋ 明细 ＋ 复制区；断点只用 820（仓内既有） |
| `src/render/templates.ts` | 改 2 行 | 模板登记表 6→7（加 `receipt`） |
| `src/render/index.ts` | 改 2 行 | 转出族定义地 |
| `src/memo/run.ts`（原 `src/cli/cmd_read.ts` 的三条写分支，**#855 搬迁后落这里**） | 改 4 处 | 三条写分支返回 `deliver`（`memo.create`／`memo.update` 情绪日记那一支／`memo.remove` 单条那一支） |
| `test/receipt-831.test.mjs` | **新增**（10 例）＋ 本轮退役沙箱 | 本域真出口用例 ＋ 族定义级用例 ＋ 两条反例 |
| `test/render.test.mjs` | 改 2 行 | 模板数断言 6→7（本票正当改变，非放宽） |
| `docs/skills/skill-memo-ilife/t831-gen-pages.mjs` | **新增**（本轮） | 本域产物驱动器（临时库 ＋ 隔离配置 → 3 格产物 ＋ 按域配置） |
| `docs/skills/skill-memo-ilife/t831-人核档.md` | **新增**（本轮） | `facts.json` 四列人核取值与出处 |
| `docs/skills/skill-memo-ilife/t831-按域配置.json` | **新增**（生成物，由驱动器现产） | 判分引擎的按域配置（只许路径与名单） |
| `docs/skills/skill-memo-ilife/t831-mood-证据.md` | **新增** | 本件 |

**没碰**：`src/config.ts`、`packages/plugin-memo-ilife/**`、老技能仓库（仓外只读）、`packages/base-render/**`（公共层，串行窗口）、其余各域的页与路由、#855 的域重排产物。

**行数门**：新增件 `receipt.ts` 126 LF、`t831-gen-pages.mjs` 属 `docs/` 文档件（不在本包 `src/**` 与 `scripts/*.mjs` 的管辖内）、`receipt.html` 属页面模板（不管辖）、测试属测试件（不管辖）。**本包 350 线未触发**，无超线报警。

---

## 四 交接给下游

1. **本族其余格的复用方式**：调 `buildReceiptPage({scene, title, message, badges, summary, sections, receipt, copyLog, retryPrompt})`，主体由 `bookletFileStem(sceneId)` 自动算 —— **不要复制 `receipt.html`**，也不要自己拼文件名。`checkin` 域记／删／改打卡三格是下一批现成落点（结构同构）。
2. **产物与读数四件在** `.scratch/memo-831/`（`pages/` 3 件 ＋ `sep/resp/fmt/facts.json` ＋ `engine-score.json` ＋ `audit.json`），供 [#834](https://github.com/FeatherHunter/ilife/issues/834) 收口重铺链路总表与双端墙时直接取用。
3. **本域三格在册子里的主体**：`记情绪`／`改情绪`／`删情绪`（seq 26／27／28，族「通用回执」）—— 墙与总表的对应格由 #834 生成，本票保证主体逐字对得上。

---

## 五 票面与现行裁定的三处冲突（第一版如实记，现均已收口）

1. **交付物路径**：票面写 `src/mood/`，当时该目录要等 [#855](https://github.com/FeatherHunter/ilife/issues/855) 重排才存在。⇒ #855 已落定，今天 `src/mood/routes.ts` 就是本域的词面家；命令实现与页面按域归属落位（`src/memo/run.ts` 三条写分支 ＋ `src/render/receipt.ts` 族定义），无第二份定义。
2. **验收命令里的五维尺判分件**（票面写 `t<t4票号>-判分.mjs`）：当时盘上不存在（归 #851）。⇒ 已由 #867＋#868 落成「读数链 ＋ 公共层单引擎」这条规范链，本票按它跑出读数（§2.5）。
3. **验收命令里的机审六列**（票面写 `t407-v8-style-audit.mjs`）：那是账单域白名单件，`t824` §4 已裁本图不用。⇒ 已由 #869 落成备忘录域机审，本票按它跑（§2.4）。

---

## 六 遗留出口（照编排纪律：不夹带，写回本图）

1. **回执族的 `toc` 腿**：短页没有页内目录 ⇒ D5 恒为 21（≥ 下限 20，不构成未达标）。这是**族级**观感取舍（19 格共用），要不要给回执页加页内锚点属公共层／族级决定，不在域票写集内 —— 已在 #826 证据件登记同一条，本票重申。
2. **包内回归那一条既有红**：`src/cli/health/probe.ts:51` 的可写性探针 `flag:'wx'` 命中 #240 烟雾锁正则（见 §2.6）。修法二选一（收窄锁正则，或换探针写法）都落在本票写集之外。
3. **静态面 ≠ 载荷渲染面**：本族正文由页内 JSON 载荷渲染，静态探针看不到 ⇒ `english`／`dupFacts` 的机器候选对这类页**偏松**。本票在 `t831-人核档.md` 补了渲染面人工复核；这条缺口的落点归属仍归地图 #820（#867 证据件 §六 已登记）。

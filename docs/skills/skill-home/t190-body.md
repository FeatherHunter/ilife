## Question

照 #144 的做法，把「居家管家 帮助」这条命令的**缺省交付物**做出来：

- 真跑能拿到文件：缺省分支 → `<SKILLS_DB_PATH>/home_manager_html/居家管家_HELP_<stamp>.html`（目录／文件名／时间戳通式以票 4 的裁决为准）；
- 顶层回执带绝对路径（`delivery{mode,path,bytes}` 这一类）；
- 落盘走独占写（`wx` ＋ `EEXIST` 递补），不做「先判存再写」；
- 该命令在**开库之前**分派（跑完不建 `.db`）；
- 速查支走显式参数（参数名与产物名以票 4 的裁决为准）。

**要把「看帮助不许把库建出来」摆正**（票 1 `#184` 查出来的现状，照 bill 的做法）：

- 今天 `home.help.lookup` 是 `dispatch` 里的一个 `case`（`packages/skill-home/src/cli/cmd_read.ts:674-678`），而 `dispatch` 第一行就 `resolveDbPath()` ＋ `openHomeDb(...)`（`:54-56`）→ `new DatabaseSync` ＋ `CREATE TABLE IF NOT EXISTS`（`src/fetch/db.ts:54-70`）；
- bill 是把它抬到开库之前（`packages/skill-bill/src/cli/cmd_read.ts:69-111` 的 `dispatchHelp`、`:493-495` 的路由），初始化状态用「DB 文件是否存在」判（`:84-86`），用例断言产物目录里 0 个 `.db`；
- 注意居家的 `src/fetch/paths.ts:20-23` 的 `resolveDbPath` **自己会 `mkdirSync`**——照抄前先把这条摆正，否则「判初始化」这一步就把目录建出来了。

**结构按新代码架构规则**（用户 Q8=(a)）：第一步「影响清单」与第二步「结构设计」先报用户点头；被碰到的旧件就地摆正；交付时报第五步「交付对账」；超告警线当场报「已超线，需要根据规则进行重构。」。

## 来自上游票的硬约束（开工前必读）

<!-- 2026-09-12 由编排方写入；与 `t187-decision.md` §8–§15、`t195-decisions-record.md` 第七节冲突时，以那两份为准 -->

**出口：三支冻结（照票 4 #187）**

- 缺省（无 `mode`、无 `q`）＝落 `<SKILLS_DB_PATH>/home_manager_html/居家管家_HELP_<YYYYMMDD_HHMMSS>.html`；顶层**只追加** `delivery{mode,path,bytes}`，既有字段不改不重排；**载荷仍必须回 `{items,total}`**（`test/cli.test.mjs:93-96` 断 `total >= 88`）。
- `mode:"lookup"` ＝ 速查表产物 `居家管家_速查表_<stamp>.html`（与 HELP **分名**），同样仍回 `{items,total}`＋`delivery`。
- `q` 支**保持今天语义不动**（`cli.test.mjs:97-98` 在锁它）。三支互斥；非法 `mode` → `fail(2)`（逐字照 `packages/skill-bill/src/cli/cmd_read.ts:116-117`）。
- `--html <路径>` 支是**所有命令通用**的产物出口——**不许顺手砍**。
- 复用窗口沿用共用件（24h 内回同一路径、不新建不改写）；**验收判据写成「回执路径存在且可打开」，不得写成「文件数增加」**；强制新件走 `reuseHours: 0`。⚠️ 另有一会话正在核查复用窗口语义——开工时**以当时的共用件为准复核一遍**。

**落盘写法（照票 4 #187）**

- 自持**只有落点值**：`src/help/manifest.ts`（目录名 `home_manager_html`；文件名主体 `居家管家_HELP`／速查主体 `居家管家_速查表`）；导出面按铁律五收小（只出值，不出函数）。
- 落盘走共用件 `saveHtmlFile`（`base-paint/save-html`）：命名通式／独占写／递补／复用窗口／绝对路径回执**都不许自持**（`#237` 已收拢，五家在用）。`src/help/output.ts` 只做薄封装。
- ⚠️ **不再照抄账单旧版 `output.ts` 的 `nextExclusiveCandidate`／`writeFileExclusiveWithRetry`**——那两段已搬进共用件。

**「看帮助不许把库建出来」**

- 该命令必须在**开库之前**分派；跑完产物目录里 **0 个 `.db`**。
- 居家 `src/fetch/paths.ts:20-23` 的 `resolveDbPath` **自带 `mkdirSync`**——判初始化／算路径时不许直接用它，需要一条只读取路径出口。

**combo 登记（照票 4 #187）**

- `home.help.lookup` **要**登记进 `packages/base-combos/combos.yaml`（今天 111 条，卡路里与备忘的 help 命令都在表里）。
- 成本不是「改一行」：必须同批重跑 `base-combos/scripts/gen-present.mjs`（重写 `src/present.ts`）与 `build-help.mjs`，否则 `test/combos-p8.test.mjs:115-137` 直接红；补锁要落在 `:140-146` 那个 `it` 里，并**把 home 的 dist 加进 runtime 数组**，否则新锁跑不到。
- 动登记前先核 `plugin-home-ilife/src/bridge.ts:17`（今天只暴露 `ilife.home.read`）对登记的影响。

**门禁与依赖：已由票 6 #189 承担，本票只复核**

- 摘 `tooling/check-boundaries.mjs:55` 的 `'skill-home'` ＋ `package.json` 补 `"base-paint": "^0.3.0"` 是**同一动作的两半**，落在票 6；本票开工先核两半都在（`node tooling/check-boundaries.mjs` 应 PASS）。
- 若摘名后该脚本对居家变成空转（仍打印 PASS），必须补等效断言或明确由行为面门禁兜底——**假绿比红灯更危险**。

**结构纪律**

- `src/cli/cmd_read.ts` 实测 **741 行**、超本包告警线 **350** 达 391 行：本票**只抽「看帮助」那一支**（约 5 行），**`dispatch()` 不搬**；该文件的更大范围抽件不属本图（整包重排另立票）。
- 包内告警线数字与数法已落 `packages/skill-home/AGENTS.md`（生成物单列不计）。
- 交付时报第五步「交付对账」；任何件超线当场报「已超线，需要根据规则进行重构。」＋拆法。

## 进度：100%

下一步：无阻塞——出口与命名落盘已完成，经**两席独立对抗审查**（一席**通过 86/100**、一席**整改后通过 77/100**），整改已落实并经编排方**亲手复验**。

**交付**：`src/help/manifest.ts`（只 3 个落点值，零函数）＋`src/help/output.ts`（薄封装 `deliverHomeHelp` → 共用件 `saveHtmlFile`，**不自持**通式／递补／独占写）＋`src/cli/cmd_read.ts`：`home.help.lookup` **抬到开库之前分派**（老的 `case` 改成「走到这里即路由坏了」的 `fail(1)` 兜底）；`packages/base-combos/combos.yaml` 登记 `home.help.lookup`（111→112）＋同批重跑 `gen-present`／`build-help` ＋补锁。

**编排方亲手端到端**（临时 `SKILLS_DB_PATH`，不看报告）：

```
exit=0
delivery = {"mode":"file","path":"<tmp>\\home_manager_html\\居家管家_HELP_<戳>.html","bytes":132318}
绝对路径=True   文件存在=True   声明 bytes=实际 132318
窗口内第二次跑: 回同一路径=True（目录文件数仍 1）
产物目录 .db 数 = 0            ← 看帮助没有把库建出来
深层不存在的落点: 整条目录链建出来后才落盘
reuseHours:0 → 同秒 _2 递补／下一秒新时间戳
速查支 → 居家管家_速查表_<戳>.html（与 HELP 分名）· 12819 B · 零外部引用
坏参矩阵: q+mode 互斥／非法 mode／坏 reuseHours／非字符串 q → 一律 exit 2，且零文件落盘
写失败 → exit 5 且 stdout 空（不降级）
```

**整改**（A 席 D1–D4、B 席 ①②）：索引缺件已补（`helpAssets.ts`／`scenarios.yaml` 等 12 件进索引，消除「按索引提交即构建断」）／`q` 非字符串改 `fail(2)`／窗口校验抬到三支分派之前（参数面单点校验）／台账按实测回填（`cmd_read.ts` 818 行，超 468）。

**两条已裁、交后续票**：① 交付面**零锁**（删交付段或改落点值仍全绿）→ 归 **票 8 #191**，其票面已写入硬判据；② `SKILL.md:3` 描述仍写「出一份速查列表」→ 归 **票 9 #192**（说明面）。另：B③ `--html` 在冷目录下会落两份（指定页 ＋ 缺省交付件）——按「本图不动 `--html`、HELP 交付不走它」的既有裁定**保留现状并写明**，「与兄弟家 explicit 优先对齐」登记为另立票候选。

**本票关票即票 8 #191 与票 9 #192 解阻开工。**

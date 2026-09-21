# t832 · sync 域（1 场景）端到端证据

票：[#832](https://github.com/FeatherHunter/ilife/issues/832)（Part of [#820](https://github.com/FeatherHunter/ilife/issues/820)）。
本件是本票的交付证据：**做了什么、逐条读数、边界在哪、哪几条不归本票**。所有读数都可重跑，命令逐条给在 §八。

---

## 一 本域是哪一格（先说清范围）

HELP 官方源 `packages/skill-memo-ilife/src/help/scenes/sync.ts` 的 `sync` 域，**1 个二级组／1 个场景**：

| 项 | 值 |
|---|---|
| 场景 id | `memo_sync_feishu` |
| 唤醒词 | `备忘录同步` |
| 标题 | 备忘录 ↔ 飞书双向对账 |
| `types` | 查看、回执 |
| 命令 | `memo.sync`（回执形状 `receipt`；路由声明住 `src/sync/routes.ts`） |
| 册子格 | `src/help/booklet.ts` 第 29 行：主体 `备忘录同步`／族 **报告**／结果页／该确认「对账报告可点开」 |
| 清单格 | `t856-manifest.json` 第 29 行：`file = 备忘录同步.html`（全仓只此一处算） |
| 同族另一格 | seq 30 `首次使用`（init 域）——本域是「报告」族两格之一 |

开工时的票面缺口（原话）：**「`memo.sync` 有实现却零唤醒词；今天整域等于空的」**。

---

## 二 交付了什么（两段，都在本票写集内）

### 2.1 前一段（85% 态，已提交 `d72231f3`／`18dbe026`）

| 件 | 改动 | 为什么 |
|---|---|---|
| `src/triggers/wakewords.ts` | `WAKE_TABLE` 加一行 `备忘录同步 → memo.sync` | 唤醒词表是**唯一上游**：路由、SKILL.md 速查块、HELP 都从它派生。缺这一行 ⇒ 路由抛 `POLICY_NO_MATCH` |
| `src/sync/run.ts`（当时在 `src/cli/cmd_read.ts`） | 产物主体取册子主体 `备忘录同步`（原为 `同步报告`） | 产物名只在册子一处算；旧名与清单第 29 行的 `file` 不一致 ⇒ 收口造册时该格会「清单点名却没有文件」 |
| `test/t832-sync-domain.test.mjs` | 新增 4 例 | 票面三条各要一条真出口用例 |

### 2.2 本一段（收口，本轮）：把页面本身修到过线

**起因**：票面剩的两门（机审六列／五维尺）原先卡在「件不存在」上，归 [#851](https://github.com/FeatherHunter/ilife/issues/851)；
#851 已按 #838 先例**分解成四张并全部关闭**（[#867](https://github.com/FeatherHunter/ilife/issues/867) 读数链／[#868](https://github.com/FeatherHunter/ilife/issues/868) 判分引擎／[#869](https://github.com/FeatherHunter/ilife/issues/869) 六列机审／[#870](https://github.com/FeatherHunter/ilife/issues/870) 共用形状件接线）。
⇒ 本票的到期触发器成立，两门跑得动了，于是按同一份验收链重取全部读数。**重跑就翻出真缺陷**，逐条如下（§四）。

改动**只落在 `templates/sync_report.html`**（本域唯一一份页模板，全仓只有 `src/sync/run.ts` 用它；`grep sync_report` 的另两处命中是 `templates.ts` 的模板名表与一份调查脚本的映射表）：

| # | 改什么 | 性质 |
|---|---|---|
| 1 | 载荷键名 `d.due_added` 一族 → 驼峰（`d.dueAdded`…） | **真缺陷**：六项统计读成 0，页面少报 |
| 2 | `.kpi-hint` 字号 11px → 12px | D5 字号腿（基准线 12px） |
| 3 | 补页内导航 `<nav class="ilife-block-toc">` ＋ 四个锚点区块吃 `scroll-margin-top:20px` | D5 页内定位腿 ＋ `t849-视觉基准.md` §2「长页必须有页内目录或锚点」 |
| 4 | 运行时文案面清账（半角标点／`·` 并列／裸英文／`→`） | 静态链看不见的那一半（见 §4.3） |
| 5 | 令牌收债：7 个字面色值搬进 `:root` 令牌定义地 | `t849` §2 禁令「色值只许用令牌」 |
| 6 | 断点对齐：删 `@media(max-width:360px)`、`600px` → `640px` | `t849` §2 禁令「零新断点」（只许 400／640／820／1001／1200） |

**没碰**：`src/config.ts`、`packages/plugin-memo-ilife/**`、老技能仓库、任何公共层件、任何别的域的 src。
没切分支、没 `reset`／`stash`；每一笔只 `git add` 自己声明的路径，提交前用 `git diff --cached --name-only` 复核。

---

## 三 逐条验收读数（2026-09-21 夜，五门全绿）

页群：`.scratch/t832/pages/` 的 1 件真产物 `备忘录同步.html`（**118060 B**，sha256 `2627F0B9ACBB3979D48C83E6A11F6A94602502543A4B24BD035532E2C274C124`）；读数四件与按域配置同目录。

| 票面验收命令 | 读数 | 退出码 | 判 |
|---|---|---|---|
| 本域每条命令的真出口用例 | `node --test test/t832-sync-domain.test.mjs` → **tests 4／pass 4／fail 0**；回归抽查（booklet848＋wizard665＋wish-sync661＋policy＋本票）→ **33／33** | 0 | ✅ |
| 分隔符门 | `separator-probe` → 行级 **0 行**／节点级 **0 处** | 0 | ✅ |
| 响应式门 | `OVERFLOW-ZERO pages=1 cells=3 failed=0 scopeOutFailed=0`（390／768／1440 三档零溢出，`img=0 clip=0`） | 0 | ✅ |
| 机审六列（#869 落件） | `RESULT: 1/1 PASS ①0 ②0 ③0 ④0 ⑤0 ⑥0 缺件— 名单=页群目录` | 0 | ✅ |
| 五维尺（#868 公共层单引擎 ＋ #867 读数链） | `\| 备忘录同步 \| 15 \| 20 \| 25 \| 12 \| 25 \| 97 \| −0 \| **97** \| 是 \|`；`SCORE 均分=97 最低=97 最高=97 ≥90 且每维≥80% 的页=1/1`；`RECONCILE 逐页逐维最大绝对差 = 0` | 0 | ✅ |

三条旁证读数（读数器，不是门）：`fmt.json` 三档 `touchSmall=0`／`minFontPxNoSvg=**12**`／`toc=1`；`resp.json` 三档 `why` 皆空；`sep.json` `RESULT: 1/1 PASS`（节点级 0）。

---

## 四 本轮修的四条，逐条给「改前读数 → 改后读数」

### 4.1 真缺陷：报告页把「排期变更 3 条」印成 0

**改前**：模板的页内脚本读 `d.due_added`／`d.due_overridden`／`d.due_removed`／`d.skipped_no_local_note`／`d.skipped_no_memo_id`／`d.skipped_already_done` 六项，而载荷是回执对象原样（`src/sync/run.ts` 的 `extra: { ...r.receipt }`），键名一律**驼峰**。逐键对账（`.scratch/t832/check-keys.mjs`）：12 个被读的键里 **7 个 MISS**、六项统计全部落 0。

**后果**：一份真有 «补建=3／完成同步=1／排期同步=3» 的对账，页面上印成「排期变更 **0**」「跳过 **0**」，状态卡还少一行「3 条排期已按飞书更新」。**而且这个缺陷一直是隐形的** —— 旧产物跑在本机（远端不可用）那一态，六项本来全是 0，读不出来。

**改后**（渲染后 DOM 取元素文字，`.scratch/t832/scan-rendered.mjs`）：

```
KPI 四格    : 完成同步=1  补建到飞书=3  排期变更=3  跳过=0
明细徽章数  : 1, 3, 3
statusMeta  : 21:46 同步飞书
```

**顺带收的一处**：`d.command` 同样是 MISS（载荷把命令名放在 `data.meta.command_cn`、场景名放在 `data.scene.scene_id`）——改读 `d.scene.scene_id`，于是 meta 行从「只有时间」变成「时间 ＋ 同步飞书」。

### 4.2 D5 两条腿：字号与页内定位

**改前**：`fmt.json` 三档 `minFontPxNoSvg=11`（owner 是 `div.kpi-hint`，全模板**唯一**一处 <12px 的字号规则）；页内**没有**目录元素（`ilife-block-toc` 的 8 次出现全是公共层样式规则，不是元素），`facts.tocEl=0`。⇒ 引擎的 D5 ＝ 25 − 5（字号）− 4（页内定位）＝ **16 < 20**（满权 80% 的下限）。

**改后**：`minFontPxNoSvg=12`、`toc=1`、`scrollMargin=2` ⇒ **D5＝25**。

### 4.3 运行时文案面：静态链看不见的那一半

`t867-读数链契约.md` §八 已具名这条缺口：四件读数里的静态面要剥掉 `<script>` 整段，而本页正文由页内脚本渲染 ⇒ 静态候选 0 处，渲染后才见。

本票用**机审 ⑥ 的同款判据**（ALLOW／HALF 两组常量逐字抄自 `t869-机审.mjs:71-79`）写了两把尺：

- `.scratch/t832/scan-template-text.mjs` —— 扫模板里会成为文案的串（先剥标签）；
- `.scratch/t832/scan-rendered.mjs` —— 扫 Chrome `--dump-dom` 出来的渲染后 DOM。

**改前**：模板扫出 **22 处**（半角逗号与冒号、`·` 并列、裸英文 `due`／`task`／`memo_id`、`→` 顶替「到」）；渲染后能看见的其中两类（顶栏说明行、四块指标卡的 hint）。其中 `due`／`task`／`memo_id` 与 `.join(' · ')` 原先**住在条件分支里没渲染**——正因 4.1 那个键名缺陷把计数压成 0，它们从未上屏；**修好 4.1 会把它们一起翻出来**，所以两件事必须同一笔收掉。
**改后**：模板 **0 处**、渲染后 **0 处**。

### 4.4 令牌收债与断点对齐（`t849` §2 的两条禁令）

**改前**：规则里散着 7 个字面色值（状态卡四档底色 `#ebfaef`／`#fff7e0`／`#ffe8e6`／`#fafafa`、超小屏图标底 `#f0f0f2`、徽章底 `#ececef`、桌面底色 `#ededf0`）；断点里有 `@media(max-width:360px)` 与 `@media(min-width:600px)` 两个**不在仓内既有集合**里的档。

**改后**：7 个字面色值搬进 `:root`（`--ok-tint` 一族，**值逐字不变**，只是从规则里挪到令牌定义地），规则里只剩 `var()`；断点只剩 `@media(min-width:640px)`（集合内）与 `@media(prefers-reduced-motion:reduce)`（媒体特性，不是宽度档）。

**如实记两条边界**：

1. 删掉 `@media(max-width:360px)` 那段是**行为改动**，但只在 <360px 生效（比全部验收宽都窄）：那段做的事是把 320 档内距再收 4px、页题从 22px 降到 20px，本页是 mobile-first、基样式本来就是移动优先，删掉即回落基样式。**三档验收宽的读数一字不变**（改后复跑过）。
2. 本页仍带**自己那份 `:root` 调色板**（同族先例 `t867-人核档.md` §五 也照此判「色只用令牌」）。把「报告」族整体搬进公共层底座（像列表查询族那样）是一次独立的架构改动，**不在本票的五门之内**，见 §六 第 3 条。

---

## 五 变异自证（改坏必红／还原必绿）

电池 `.scratch/t832/mutation-battery.mjs`：把本票新收的**两处一起改坏**（`.kpi-hint` 回 11px ＋ 拿掉页内导航 nav），走与交付**同一条链**（模板 → 真跑产物 → 三件读数 → facts → 公共层引擎）。

| 轮 | 逐维 | 页分 | 过线 |
|---|---|---|---|
| 交付态 | D1 15／D2 20／D3 25／D4 12／**D5 25** | **97** | **1/1** |
| 变异态 | D1 15／D2 20／D3 25／D4 12／**D5 16** | **88** | **0/1** |
| 还原态 | D1 15／D2 20／D3 25／D4 12／**D5 25** | **97** | **1/1** |

还原判据＝**逐字节**：模板 sha256 改前与还原后同为 `F934281DFF58EDFAD80863F8C9B87C24FCAA54BBCCD17DDAA103B30CBA6BC004`。
⇒ 两条腿合起来值 **9 分**，且正是「过线／不过线」的分界（88 卡在 ≥90 上、D5 16 卡在 ≥20 上）。

---

## 六 边界读数与遗留出口（不夹带）

### 1 不给远端挡板那一路：退出码 4、页面照出，且如实带一条家族债

`memo.sync` 的退出码与「有没有出页」是两件事（[#657](https://github.com/FeatherHunter/ilife/issues/657)／[#658](https://github.com/FeatherHunter/ilife/issues/658) 的「ensure 型合成写」契约 D-25）。本机不给挡板时真读数：

```
exit = 4        delivery.bytes = 121063        remote = 'unavailable'
message = 对账没跑成：远端不可用（lark-cli 未找到：缺失阻断取数）
机审（.scratch/t832/boundary）→ RESULT: 0/1 FAIL ①0 ②0 ③0 ④0 ⑤0 ⑥1
  ⑥ 英文裸词 1 处：版式位·载荷 message（副标题）→ 「…lark-cli 未找到…」
```

**这条命中不是本票引入、也不归本票修**：串出自 `src/sync/feishu.ts` 的 throw 文案（`lark-cli auth status 失败（未登录？）` 一族），经 `src/wish/gate.ts` → `src/wish/reconcile.ts` 拼进回执 `message`；而 `test/t760-设置页收窄.test.mjs:336` 与 `test/wizard-pages-665.test.mjs:141` 两条**别票的断言**逐字钉着现文案 ⇒ 改动面跨票，按「共用位只由它的独占票改」**另开票**：[#875](https://github.com/FeatherHunter/ilife/issues/875)。

**格产物为什么走挡板**：册子 seq 29 要判的是**交付面**（一张对账报告页），不是「本机没装飞书」这一态；同族先例 `docs/skills/skill-memo-ilife/t829-wish-证据.md` 记的处置与此逐条相同（「给上挡板后七条全 exit=0、消息干净，门判的是交付面」）。**两支读数都在本件里**，不挑好看的那支写。

### 2 一处如实记的偏离：机审「名单对册子」是页群目录模式

本次页群目录里只有本域 1 件，机审走的是**页群目录模式**（缺件不判），33 件缺件逐条列出、**不判红**——整批那一次归 [#834](https://github.com/FeatherHunter/ilife/issues/834) 收口。

### 3 候选：把「报告」族搬进公共层底座

本页仍自持 `:root` 调色板与一份页内样式（`memo_query.html` 那一路已全走公共层）。这是**独立的一次架构改动**，不在本票五门之内，留作候选。

---

## 七 交付对账（必报五步第五步）

| 开工前清单 | 实际落到的路径 | 偏差 |
|---|---|---|
| 票面：「产物落册子声明的目录」 | `<库目录>/memo_html/` 扁平一层（用例 ③ 断言同名同目录） | 零 |
| 票面：「源码落 `packages/skill-memo-ilife/src/sync/`」 | 前一段落 `src/triggers/wakewords.ts` ＋ `src/sync/run.ts` 的 `deliver`；本段落 `templates/sync_report.html` | 零（本段是页面件，属本域自持模板） |
| 票面：「证据落 `docs/skills/skill-memo-ilife/t<本票号>-sync-证据.md`」 | 本件 | 零 |
| 五门的读数件 | `.scratch/t832/`（`sep.json`／`resp.json`／`fmt.json`／`facts.json`／`engine-score.json`）＋ 入仓的 `docs/skills/skill-memo-ilife/t832-人核档.md`／`t832-按域配置.json` | 零 |
| 发现要交回地图的 | [#875](https://github.com/FeatherHunter/ilife/issues/875)（家族文案债）＋ 本件 §六 | 零 |

**行数门（本包 350 LF，告警线）**：本票碰的件读数 —— `templates/sync_report.html` **506 LF**（**模板不在本包告警线的计数范围内**：`packages/skill-memo-ilife/AGENTS.md` 明写「不算 `templates/*.html`」）；`src/sync/*.ts` 全族最长 `src/sync/feishu.ts` 221 LF、`src/sync/run.ts` 57 LF，均未越线（本段一字未改它们）。

---

## 八 可重跑清单（照本件复算）

⚠️ 两条跑法坑（都会伪装成「代码坏了」）：

- **`run-locked.mjs` 强制把子进程 cwd 钉在仓根**（`tooling/run-locked.mjs` 的 `cwd: repoRoot`），所以命令里的相对路径一律按**仓根**写；旧版本件 §八 写的包内 cwd 跑法会 `Cannot find module 'D:\node_modules\typescript\bin\tsc'`。
- 本包**测试必须把 cwd 钉在包目录**（出口依赖包内 `node_modules` 的 junction 依赖 `base-paint`）。本件为此备了 `.scratch/t832/run-in-pkg.mjs`（换 cwd 再跑）。

```sh
cd D:\ilife        # 以下一律仓根

# 0) 编译（改了 src 才要；本轮只改模板，模板是运行时读的，不必重编）
node tooling/run-locked.mjs --ticket 832 -- node node_modules/typescript/bin/tsc -b packages/skill-memo-ilife

# 1) 本域用例（正例）：tests 4／pass 4／fail 0；回归抽查：33／33
node tooling/run-locked.mjs --ticket 832 -- node .scratch/t832/run-in-pkg.mjs --test test/t832-sync-domain.test.mjs
node tooling/run-locked.mjs --ticket 832 -- node .scratch/t832/run-in-pkg.mjs --test test/booklet-848.test.mjs test/wizard-pages-665.test.mjs test/wish-sync-661.test.mjs test/policy.test.mjs test/t832-sync-domain.test.mjs

# 2) 真产物（临时库＋远端挡板，绝不碰活库）
node tooling/run-locked.mjs --ticket 832 -- node .scratch/t832/gen-sync-page.mjs
node tooling/run-locked.mjs --ticket 832 -- node .scratch/t832/gen-sync-page.mjs --no-stub   # 边界读数（另落 .scratch/t832/boundary）

# 3) 五门
node packages/base-render/test/separator-probe.mjs .scratch/t832/pages/备忘录同步.html
node packages/skill-calorie/scripts/measure-responsive.mjs --dir .scratch/t832/pages --widths 390,768,1440 --label t832 --json .scratch/t832/resp.json
node docs/skills/skill-memo-ilife/t869-机审.mjs --dir .scratch/t832/pages
node packages/skill-calorie/scripts/audit-separators.mjs --dir .scratch/t832/pages --json .scratch/t832/sep.json --quiet
node docs/skills/skill-calorie/t516-判据-版式.mjs --dir .scratch/t832/pages --widths 390,768,1440 --json .scratch/t832/fmt.json
node tooling/run-locked.mjs --ticket 832 -- node docs/skills/skill-memo-ilife/t867-facts.mjs --dir .scratch/t832/pages --human docs/skills/skill-memo-ilife/t832-人核档.md --json .scratch/t832/facts.json
node tooling/run-locked.mjs --ticket 832 -- node packages/base-render/scripts/判分.mjs --dir .scratch/t832 --config docs/skills/skill-memo-ilife/t832-按域配置.json --json .scratch/t832/engine-score.json

# 4) 变异自证（改坏必红／还原必绿；内部直调生成器，勿再套一层锁）
node tooling/run-locked.mjs --ticket 832 -- node .scratch/t832/mutation-battery.mjs

# 5) 文案面两把尺（静态链看不见的那一半）
node .scratch/t832/scan-template-text.mjs packages/skill-memo-ilife/templates/sync_report.html
& "C:\Program Files\Google\Chrome\Application\chrome.exe" --headless --disable-gpu --virtual-time-budget=4000 --dump-dom "file:///D:/ilife/.scratch/t832/pages/备忘录同步.html" | Out-File -Encoding utf8 .scratch\t832\rendered-dom.html
node .scratch/t832/scan-rendered.mjs .scratch/t832/rendered-dom.html
node .scratch/t832/scan-rendered-dup.mjs .scratch/t832/rendered-dom.html
```

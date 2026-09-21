# #833 · init 域（初始化类）端到端 · 证据

**判定**：本域两格产物端到端走通（唤醒词能路由、命令能跑、产物真落盘、**六门全部取到读数**）。
上一版（2026-09-21 13:16 那跑）停在 95% 的两条读数 —— **六列机审**与**五维尺** —— 已由
[#867](https://github.com/FeatherHunter/ilife/issues/867)／[#868](https://github.com/FeatherHunter/ilife/issues/868)／[#869](https://github.com/FeatherHunter/ilife/issues/869)／[#870](https://github.com/FeatherHunter/ilife/issues/870)
四张判据件交付，本票按它们的规范链重取，**并据实收掉两处读出来的真缺陷**。

票：[#833](https://github.com/FeatherHunter/ilife/issues/833)（Part of [#820](https://github.com/FeatherHunter/ilife/issues/820)）。

---

## 一 阶段闸门（开工前读到的现状）

| 项 | 读数 |
|---|---|
| 认领 | 开工第一笔写操作＝本票 assignee 已是 FeatherHunter（`gh api` 实测 `assignees=["FeatherHunter"]`），本次会话在原认领上继续 |
| 标签 | `wayfinder:task`（**无** `needs-triage`）⇒ 不走诊断前置，直接进实施／核验 |
| 阻塞 | 原生依赖 **7 条全关**（#822／#823／#824／#867／#868／#869／#870），`issue_dependencies_summary.blocked_by = 0`；本条同时是 [#834](https://github.com/FeatherHunter/ilife/issues/834) 的阻塞源（`blocking = 1`） |
| 票面 | 目标／验收命令／不许动的东西／交付物路径／遗留出口五段齐；进度区原为 **95%** |
| 未取读数 | 票面两条（机审六列、五维尺）写明「归 #851，未开工 ⇒ 取不到」——**本次会话开始时那四张票已全关，故先重取** |

**#870 的作废声明（本次会话的行为依据）**：#870 正文逐字写「本票一落，**八张票的两门读数作废**，
重跑由它们自己或 #834 分批做」。故上一版证据件 §五 的四门读数（分隔符／跨宽／版式／真出口）
**本次一律重取**，不引用旧值。

## 二 开工前基线 → 交付后（同一把尺、同一份载荷）

同一条命令（`memo.init`，同一份诊断载荷），同一批门：

| 读数 | 上一版（13:16 跑，#870 前） | 本次交付（21:44 跑，#870 后） |
|---|---|---|
| 机审六列 | **未跑**（判据件当时不存在） | ①0 ②0 ③0 ④0 ⑤0 **⑥2**（两件各 1 处英文裸词） |
| 五维尺逐页页分 | **未跑**（引擎当时不存在） | **91 ／ 91，2/2 过线**（每维 ≥ 满权 80%） |
| 分隔符门 | 两件 节点级 0／行级 0 | 两件 **节点级 0／行级 0**（保持） |
| 跨宽三档 | 0（回归门） | **OVERFLOW-ZERO pages=2 cells=6 failed=0**（保持） |
| 版式读数 | 触摸 0／字号 5 档／公共层区块 6 类 | 触摸 **<44px 0 处**、最小字号 **12px（5 档）**、`toc=1` `conclusion=1`、越界 0 |
| 真出口用例 | 5／5 | **5／5** |
| 产物 | `_20260921_131627` 两件（89,0xx B） | `_20260921_214401` 两件（**89,295／89,273 B**） |

## 三 本次真跑产物（真出口落盘）

`node tooling/t833-page-driver.mjs`（隔离家目录 `%TEMP%\memo833-driver-*`，绝不碰活库；`memo.init` 不开库故只落 HTML）：

| 序 | 册子格 | 唤醒词 | 命令 | 退出码 | 产物（绝对路径） | sha256 前 12 |
|---|---|---|---|---|---|---|
| 30 | `首次使用` | 首次使用 | `memo.init` | 0 | `D:\ilife\.scratch\t833\pages\首次使用_20260921_214401.html` | `61c051bcb57d` |
| 34 | `首次使用-向导` | 首次使用-向导 | `memo.init --params '{"mode":"wizard"}'` | 0 | `D:\ilife\.scratch\t833\pages\首次使用-向导_20260921_214401.html` | `b6e7e69248ba` |

两件各 2,885 行／约 89 KB；主体逐字等于册子 seq 30／34（由 `bookletFileStem` 算，不手写）。
**产物目录**＝`<库目录>/memo_html/`（扁平一层，与既有 216 件并排）。

**注**：驱动器住 `tooling/t833-page-driver.mjs`，是**开工前的一次性取数件**，按 #833 票面的写集
（源码 `src/init/` ＋ 测试 ＋ 证据）**不入本票提交**；复跑命令见 §八。

## 四 六门读数（2026-09-21 21:44，安静窗口内一次跑完）

原始回执全文落 `.scratch/t833/gate-runs.txt`（本件不重抄）。

| 门 | 命令 | 读数 | 退出码 |
|---|---|---|---|
| ① 机审六列 | `node tooling/run-locked.mjs --ticket 833 -- node docs/skills/skill-memo-ilife/t869-机审.mjs --dir .scratch/t833/pages` | `RESULT: 0/2 FAIL ①0 ②0 ③0 ④0 ⑤0 ⑥2 缺件— 名单=页群目录`；⑥ 两件各 1 处（「装飞书 CLI」） | 1（⑥ 留红，见 §五） |
| ② 分隔符门 | `node packages/base-render/test/separator-probe.mjs <产物>`（逐件） | 两件各：**节点级 0 处／行级 0 行** | 0 ×2 |
| ③ 响应式门 | `node packages/skill-calorie/scripts/measure-responsive.mjs --dir .scratch/t833/pages --widths 390,768,1440 --json .scratch/t833/resp.json --label t833` | `OVERFLOW-ZERO pages=2 cells=6 failed=0 scopeOutFailed=0` | 0 |
| ④ 版式读数 | `node docs/skills/skill-calorie/t516-判据-版式.mjs --dir .scratch/t833/pages --widths 390,768,1440 --json .scratch/t833/fmt.json` | 三档 `touchSmall=0`；`窄档字号=12（5档）`；`kpi极差=0`；`1440列宽=1280/1440`；`toc=1` `caliber=0` `conclusion=1`；`越界=0` | 0 |
| ⑤ 五维尺 | `node docs/skills/skill-memo-ilife/t867-facts.mjs …` ＋ `node packages/base-render/scripts/判分.mjs --dir .scratch/t833 --config docs/skills/skill-memo-ilife/t833-按域配置.json` | **逐页 91、2/2 过线**；`RECONCILE … 最大绝对差 = 0` | 0 ×2 |
| ⑥ 真出口用例 | `node tooling/run-locked.mjs --ticket 833 -- node --test packages/skill-memo-ilife/test/t833-init-domain.test.mjs` | `tests 5 / pass 5 / fail 0` | 0 |

**五维尺明细**（`t867` 读数链一次性产出 `sep.json`／`resp.json`／`fmt.json`／`facts.json` 四件；
人核档＝`docs/skills/skill-memo-ilife/t833-人核档.md`；按域配置只给路径与名单）：

| 序 | 页 | D1/15 | D2/20 | D3/25 | D4/15 | D5/25 | 逐维合计 | 硬扣分 | 页分 | 过线（≥90 且每维 ≥80%） |
|---|---|---|---|---|---|---|---|---|---|---|
| 30 | 首次使用 | 15 | 20 | 21 | 15 | 25 | 96 | −5 | **91** | 是 |
| 34 | 首次使用-向导 | 15 | 20 | 21 | 15 | 25 | 96 | −5 | **91** | 是 |

**判据件指纹（同一窗口同一行）**：
`packages/base-render/scripts/判分.mjs=dee8cb815cec`／`docs/skills/skill-memo-ilife/t869-机审.mjs=2fd24feed01e`／
`t867-facts.mjs=58ab4758bbbb`／`t867-dom-probe.mjs=d0e14bf749c0`／
`src/init/page.ts=4b5eb38ae75b`／`dist/init/page.js=ae830a3d2884`。

## 五 两处真缺陷：读出来的、收掉的、以及如实留下的

上一版票面把两处读数的缺失归给别人；本次判据件到位后**读到真缺陷两笔**，逐笔处置：

| # | 缺陷 | 哪儿读到的 | 处置 |
|---|---|---|---|
| 1 | **同一事实一页两处**（H3）：状态档位「必装缺失」既挂在 KPI 卡上、又作为列表行首徽章再出现一次（报告页 2 处、向导页 2 处） | 探针 `dupFacts` 候选 ＋ 视觉模型独立复核（「必装缺失」在向导页出现 3 次） | **已收**：`src/init/page.ts` 去掉列表行首那枚同名徽章（分档信息已由 KPI 卡与本节标题承担）⇒ H3 归零，D3 由 19 回到 21（越过 ≥20 的每维下限） |
| 2 | **露英文**（H7）：诊断载荷的 `desc`／`action` 文本透传上屏，露出 `CLI` 与 `fts5` | 机审⑥（两件各 2 处）＋ 五维尺 H7 | **收一半，留一半**（逐条见下） |

**缺陷 2 的两处，为什么只收一处**：

- `装 fts5 扩展后重跑` —— 这串是**本票自造的人核夹具／驱动里的示例文案**（全仓 grep：`packages/skill-memo-ilife` 下
  `fts5` 只出现在本票新增的测试与驱动里，生产代码一处没有；同族的九条体检项标题全是中文）。
  按票面自己那句「Python 时代文案」的口径，它就是应当被收掉的债 ⇒ **已改成中文说法**
  （`装全文搜索扩展后重跑`），机审⑥ 由 4 处降到 2 处。
- `装飞书 CLI` —— 这串是**全仓冻结的品牌叫法**，三处公开面同名：`SKILL.md:93`（配置项说明）、
  `src/help/helpFile.ts:53`（HELP 条目）、`src/cli/health/items.ts:198`（体检项标题）。
  它同时是诊断载荷里那一项的 `name`，故必然上屏。机审⑥ 的允许清单点名 `CLI` 要收，
  **但改它等于对 HELP 条目与体检项标题同时改名** —— 那是跨公开面的用词变更，不属本票写集
  （票面「不许动的东西」把 HELP 与配置文件面的改名留给各自的票）⇒ **这一分如实留下**，
  机审⑥ 因此停在 `0/2 FAIL`（exit 1），与五维尺里的 `H7 ×1 ⇒ −1 分`（两页各一处）**是同一条账**。

**⇒ 账目对得上**：`H3 ×2（2 处）＋ H7 ×1（1 处）＝ −5`，与引擎打出的 `硬扣分 −5` 逐分相符。

## 六 变异自证（要自证不要自述）

**变异**：把 `src/init/page.ts` 里刚去掉的那枚列表行首徽章**塞回去**（`left: statusText(i.status)`），
逐字还原后必须回绿。两态都用同一条读数链量：

| 态 | 产物 | 探针 `dupFacts` 候选 | 读数链出口 |
|---|---|---|---|
| **红** | `_20260921_214249`（向导）／`_20260921_214248`（报告） | 向导 **3**（改前 2）、报告 **4**（改前 3） | `RESULT: ABORT exit=1`，逐条点名：`列 dupFacts 判「采纳候选」但取值 2 ≠ 机器候选 3（页 首次使用-向导）`、`列 english 的出处引 #31，但它不在机器候选里（页 首次使用；候选节点号 33）` |
| **还原后绿** | `_20260921_214401` | 向导 **2**、报告 **3** | `RESULT: 四件读数齐 … 页键 2` ＋ `PASS`，exit 0 |

（变异确认：红那轮的 `dist/init/page.js` 第 144 行逐字为 `left: statusText(i.status),`；还原后该命中数 0。）

⚠️ **一处过程事故（如实记）**：还原时用 `Copy-Item` 覆盖源件，**保留了备份件的 mtime**，
于是 `tsc -b` 判定「无变化」而跳过重编，`dist` 里仍是被变异的产物（探针照旧读 4）。
诊断：比 `src/init/page.ts` 与 `dist/init/page.js` 的同名片段，源码已还原而 dist 未变。
解法：`tsc -b packages/skill-memo-ilife --force` 强制重建 ⇒ dist 命中数 0、探针回到 2／3。
**教训**：还原源件后必须验 `dist`（或直接 `--force`），否则「还原必绿」是假绿。

## 七 交付对账（必报五步第五步）

| 票面声明的交付物路径 | 实际落到 | 偏差与理由 |
|---|---|---|
| 源码落 `packages/skill-memo-ilife/src/init/` | 已在盘（上一版落）；**本次改动一处**：`src/init/page.ts` 去掉列表行首同名徽章 | 零偏差（写集内） |
| 产物落扁平 `memo_html` | 两件真落盘（本件为可复跑落在 `.scratch/t833/pages/`） | 零偏差 |
| 证据落 `docs/skills/skill-memo-ilife/t833-init-证据.md` | 本件（重写） | 零偏差 |
| — | **＋** `docs/skills/skill-memo-ilife/t833-人核档.md`（新增） | ＋1 件：五维尺的 `facts.json` 四列人核位**必须**有档才能出分，是「取到读数」的必备件（同 `#826`／`#827`／`#829` 的先例） |
| — | **＋** `docs/skills/skill-memo-ilife/t833-按域配置.json`（新增） | ＋1 件：判分引擎的按域配置（只给包路径与实例名单），同上先例 |
| — | **＋** `test/t833-init-domain.test.mjs` 一处理文字订正（示例文案去 `fts5`） | 同族的 `t827`／`t829` 也各改过一处测试文案 |

**未碰**：`src/config.ts`、`packages/plugin-memo-ilife/**`、`packages/base-render/**`（公共层）、老技能仓库、
其余 7 域的任何路径；不切分支、不 `reset`、不 `stash`。`dist/` 与生成物按约定不入本票提交。

**行数台账**：`src/init/page.ts` 243 → **245 LF**（仍远在 350 线下）。包内台账本席**只刷自己那一行**
（挂号值 243 留档、实测列 243 → 245）；其余 6 条红是**别席在途件**（`src/checkin/index.ts`／`receipt.ts` 未入仓，
`src/checkin/routes.ts`／`src/memo/crud.ts`／`src/memo/run.ts`／`src/render/receipt.ts` 已改未提交），
按并发纪律**不由本席代刷**——一律 `--sync` 会把别席未提交的在途件一次性「追认」进台账。

## 八 可重跑清单

```powershell
# 仓根
node tooling/run-locked.mjs --ticket 833 -- node node_modules/typescript/bin/tsc -b packages/skill-memo-ilife
node tooling/t833-page-driver.mjs                      # 一次性驱动器：隔离家目录 → .scratch/t833/pages/
node docs/skills/skill-memo-ilife/t869-机审.mjs --dir .scratch/t833/pages
node packages/base-render/test/separator-probe.mjs .scratch/t833/pages/<产物>.html      # 逐件
node packages/skill-calorie/scripts/measure-responsive.mjs --dir .scratch/t833/pages --widths 390,768,1440 --json .scratch/t833/resp.json --label t833
node docs/skills/skill-calorie/t516-判据-版式.mjs --dir .scratch/t833/pages --widths 390,768,1440 --json .scratch/t833/fmt.json
node docs/skills/skill-memo-ilife/t867-facts.mjs --dir .scratch/t833/pages --human docs/skills/skill-memo-ilife/t833-人核档.md --json .scratch/t833/facts.json
node packages/base-render/scripts/判分.mjs --dir .scratch/t833 --config docs/skills/skill-memo-ilife/t833-按域配置.json --json .scratch/t833/score.json
node tooling/run-locked.mjs --ticket 833 -- node --test packages/skill-memo-ilife/test/t833-init-domain.test.mjs
```

⚠️ **页群重建就必须连读数一起作废**：`t867-facts.mjs` 的 `sep/resp/fmt` 三件**缺件才现产、在则复用**，
旧读数记的是旧页名，留着会被「复用」而当场对不上（`t827` 踩过一次，42 条 FAIL）。驱动器已把这条写进代码。

## 九 遗留出口（登记去处，不夹带）

1. **机审⑥ 的 `CLI` 与全仓品牌叫法相抵**：本件判它留红、不自行改名（见 §五）。它与
   `t869-机审读数.md` §二⑥ 允许清单里那句「`CLI`／`fts5` 是内部实现名上屏」**在同一条账上互相矛盾**
   —— 那一栏把 `CLI` 写成「内部实现名」，实际它是 `SKILL.md`／HELP 条目／体检项标题三处同名的**公开叫法**。
   两处口径要不要统一（收 `CLI`，还是把允许清单改成「品牌叫法放过」），属判据件自己的口径修正，
   归 [#869](https://github.com/FeatherHunter/ilife/issues/869) 或收口 [#834](https://github.com/FeatherHunter/ilife/issues/834) 裁定，本票不代改。
2. **诊断载荷的作者面**：`memo.init` 的 `--data` 由 AI 生成，本域只是渲染器。本次把「自造示例文案里的
   `fts5`」收掉了，但**没有**、也不该在渲染层给透传文本做术语改写（那是第二处定义）。
   真实的上游文案是否干净，属健康体检项（`src/cli/health/items.ts`）与 AI 提示词面的账。
3. **`templates/init_report.html` 无调用点**（上一版登记）：自本域两页改走公共层文档壳起已无调用点，
   仍被 `test/render.test.mjs` 的「6 随包模板」面钉着；退役要连那条测试面一起动 ⇒ 仍归
   [#855](https://github.com/FeatherHunter/ilife/issues/855) 的收尾批或另开小票（本票不动测试面）。
4. **「两页装配」这层在 8 个域里会重复出现**：按 #823 的目标树它该上提到共用位（`src/render/` 或 `shared/`），
   本票**不抢**（共用位只由它的独占票改）。
5. **行数台账的 6 条红**（别席在途件）：见 §七，由各自席次在提交时刷自己那一行。

## 十 提交

| 提交 | 内容 |
|---|---|
| `2befe37e` | 本票交付：`src/init/page.ts` 去列表行首同名徽章（收 H3）＋ 测试示例文案去 `fts5` ＋ 人核档 ＋ 按域配置 ＋ 本证据件 ＋ 行数台账本席那一行 |

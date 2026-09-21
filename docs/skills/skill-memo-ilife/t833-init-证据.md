# #833 · init 域（初始化类）端到端 · 证据

**判定**：本域两格产物端到端走通（唤醒词能路由、命令能跑、产物真落盘、四门里能跑的三门全绿）。
**两处读数未取**（不是没过，是那两件工具还不存在）：机审六列与五维尺 —— 见 §七「待确认」。

票：[#833](https://github.com/FeatherHunter/ilife/issues/833)（Part of [#820](https://github.com/FeatherHunter/ilife/issues/820)）。
前置：#822／#823／#824 三张**已关**（`issue_dependencies_summary.blocked_by = 0`），故本票不是带 `needs-triage` 的诊断票，直接进实施。

---

## 一 阶段闸门（开工前读到的现状）

| 项 | 读数 |
|---|---|
| 认领 | 开工第一笔写操作＝`gh issue edit 833 --add-assignee @me`（现 assignee＝FeatherHunter） |
| 标签 | `wayfinder:task`（**无** `needs-triage`） |
| 阻塞 | 原生依赖 3 条（#822／#823／#824）**全关**；本条同时是 #834 的阻塞源 |
| 票面 | 目标／验收命令／不许动的东西／交付物路径／遗留出口五段齐；进度区「## 进度：0%」 |
| 范围铁律 | 只做 HELP 的 30 场景本域那 1 条（`memo_init_setup`，唤醒词「首次使用」） |

**票面里已经过期的一句**：「`首次使用` 连命令键都没有，要从零开出这条命令」——那是画图时的现状。
[#850](https://github.com/FeatherHunter/ilife/issues/850) 已把 `memo.init` 开出来（只渲染、不建库、开库前分派），
本票接的是**剩下的活**：把这一域从「有命令」推到「两格产物端到端 ＋ 视觉基准达标」。

## 二 实测：改前基线 → 改后

同一条命令（`memo.init`，同一份诊断 JSON），同一把尺：

| 读数 | 改前（#850 那版） | 改后 |
|---|---|---|
| 产物主体 | `初始化报告_<ts>.html`（与册子那一格**不同名**） | `首次使用_<ts>.html`（＝册子 seq 30）＋ `首次使用-向导_<ts>.html`（＝册子 seq 34） |
| 分隔符门（节点级／行级） | **红**：2 处（`备忘录 · 初始化报告` 标题、`点复制数据… · 点复制日志…` 说明行） | **绿**：两件各 0 处（exit 0） |
| 触摸目标 <44px（390／768） | 2 处（`button.copy@158x23`，23px 高） | **0 处**（两件、三档都 0） |
| 窄档字号档数 | 9 档（12／12.5／13／13.33／13.5／14／16／20／32） | 5 档（12／13／15／22／22.5），最小仍 12px |
| 公共层区块类命中 | **全 0**（走自持 `MEMO_PAGE_CSS`） | 6 类：`ilife-block-kpi-card`／`ilife-block-data-table`／`ilife-block-conclusion`／`ilife-block-toc`／`ilife-block-copy-block`／`ilife-status-badge` |
| 跨宽溢出（390／768／1440） | 0（回归门，不许弄红） | 0（保持绿） |

## 三 影响清单（必报五步第一步）与交付对账（第五步）

第一步报的写集（本票独占），与交付后逐行对：

| 路径 | 一句话 | 对账 |
|---|---|---|
| `packages/skill-memo-ilife/src/init/index.ts` | 新增：init 能力门（对外四件） | ✔ 新增 |
| `packages/skill-memo-ilife/src/init/diagnosis.ts` | 新增：诊断载荷读取与校验（从 `cmd_read.ts` 搬来） | ✔ 新增 |
| `packages/skill-memo-ilife/src/init/page.ts` | 新增：两页装配（公共层底座） | ✔ 新增 |
| `packages/skill-memo-ilife/src/cli/cmd_read.ts` | 改：`dispatchInit` 委托本域 ＋ 两格主体由册子算 ＋ `mode` 分派；删掉旧 `initDiagOf` | ✔ 定点改（3 处） |
| `packages/skill-memo-ilife/test/t833-init-domain.test.mjs` | 新增：本域真出口用例 5 条 | ✔ 新增 |
| `docs/skills/skill-memo-ilife/t833-init-证据.md` | 新增：本件 | ✔ 新增 |

**偏差为零**。未碰：`src/config.ts`、`packages/plugin-memo-ilife/**`、老技能仓库、`src/render/**` 的既有件、
其余 7 域的任何路径（本票不切分支、不 reset、不 stash）。
`dist/` 与生成物按约定不入本票提交。

## 四 结构设计（必报五步第二步）

```
packages/skill-memo-ilife/src/init/      ← 能力目录名取自 HELP 一级分组（「初始化类」）
├─ index.ts        能力门：INIT_SCENE_ID／InitPageMode／readInitDiagnosis／InitInputError／renderInitPage（对外 5 件）
├─ diagnosis.ts    诊断载荷（老 `init-report --data` 契约）：readInitDiagnosis ＋ InitInputError ＋ 6 个类型
└─ page.ts         两页装配：renderInitReportPage／renderInitGuidePage（＋ InitPageInput 一个类型）
```

- **谁在用**：`src/cli/cmd_read.ts` 的 `dispatchInit`（唯一出口）走 `src/init/index.ts` 这道门；
  出页走公共层 `base-paint`（`blocks` 的 12 区区块 ＋ `docShell` 的文档壳 ＋ `pageUi` 的页面级配方），
  **本域零自持样式**（改前那套 `MEMO_PAGE_CSS` 的 init 面随旧模板一起退场）。
- **两页分工**：结果页回答「现在什么样」（就绪度 KPI ＋ 环境检查表 ＋ 验证清单）；
  过程页回答「接下来做什么」（先处理项 ＋ 待办表 ＋ 一条可复制的回话指令）。同一份诊断出两页，
  是因为 HELP 给本场景标了 `向导／采集／回执` 三型，而册子只冻两格（采集不单出页）。
- **共用位未动**：本域不碰 `src/render/**`；`initSnapshot`（信封快照）仍在 `src/render/pages.ts`，
  按 #823 的搬迁批次（「`render/pages.ts` 按域拆」属框架批）不在本票搬 —— 见 §七遗留出口。

## 五 四门读数（改后，安静窗口内一次跑完）

`GATE-RUN runId=e4c42d0c-eba5-491b-8d7b-b68c730bea73 cmd=node .scratch/t833/gate-full.mjs`（编译→真跑→四门，exit 0）

| 门 | 命令 | 读数 | 退出码 |
|---|---|---|---|
| 真出口用例（本域测试面） | `node --test packages/skill-memo-ilife/test/t833-init-domain.test.mjs` | 5／5 绿 | 0 |
| 分隔符门 | `node packages/base-render/test/separator-probe.mjs <产物>` | 两件各：节点级 0、行级 0 | 0 ×2 |
| 响应式门 | `node packages/skill-calorie/scripts/measure-responsive.mjs --dir <产物目录> --widths 390,768,1440` | `OVERFLOW-ZERO pages=2 cells=6 failed=0` | 0 |
| 版式读数（读数器） | `node docs/skills/skill-calorie/t516-判据-版式.mjs --dir <产物目录> --widths 390,768,1440` | 触摸 <44px：三档 0；字号 5 档；公共层区块 6 类；越界 0 | 0 |

指纹绑定（同一窗口同一行）：`src/cli/cmd_read.ts=e5504330978e`／`src/init/page.ts=1df93638e8b3`／
`src/init/diagnosis.ts=602630370ef6`／`dist/cli/cmd_read.js=5227b2c8e289`。

**产物绝对路径**（真跑，落册子声明的扁平 `memo_html` 目录，与既有 216 件并排）：

- `D:\2Study\StudyNotes\.db\memo_html\首次使用_20260921_131627.html`（结果页·报告族）
- `D:\2Study\StudyNotes\.db\memo_html\首次使用-向导_20260921_131627.html`（过程页·向导族）

（两件在活库产物目录里跑出，`memo.init` **不开库**，故只落 HTML、不写库；同批另在隔离目录各留一份副本供复跑。）

## 六 变异自证（要自证不要自述）

源码级变异：把 `dispatchInit` 里那行主体算式砍掉，换成写死的 `'初始化报告'`。

| 态 | 运行标识 | 读数 |
|---|---|---|
| **红** | `runId=30dc15eb-bd13-4f09-84d5-8d098cedc9fd` | `pass 2 / fail 3`：报告页主体、过程页主体、两格同跑三条断言逐条点名 |
| **还原后绿** | `runId=8b9ebca8-bef7-4487-9856-39a541533d66` | `pass 5 / fail 0`（exit 0） |

（变异确认：红那轮的 `dist/cli/cmd_read.js` 第 206 行逐字为 `stem: '初始化报告'`。）

## 七 待确认与遗留出口（未确认不得 close）

1. **机审六列**：票面点名的 `docs/skills/skill-bill/t407-v8-style-audit.mjs` 是**账单域**的件，
   名单写死 32 份账单产物；跑备忘录产物得「共 0 份」＋ exit 1（**假红**）。备忘录版六列机审归
   [#851](https://github.com/FeatherHunter/ilife/issues/851) 第 2 件（「不是改两行名单」是它的原话）。
2. **五维尺**：判分引擎归 [#851](https://github.com/FeatherHunter/ilife/issues/851) 第 1 件、
   口径固化归 [#849](https://github.com/FeatherHunter/ilife/issues/849)；两件都未开工 ⇒
   「逐页 ≥90 且每维 ≥满权 80%」这条读数**本票取不到**。#851 正文给的过渡口径是「域票先用判分复制件 ＋ 人核顶上」，
   本票已按它把能取的四项读数取全（分隔符／跨宽／版式／真出口），**判分与终审仍归 #834／#835**。
   ⇒ 本票进度停 **95%**，写明待确认的正是这两条读数。
3. **遗留出口（登记去处，不夹带）**：
   - `templates/init_report.html` 自本票起**无调用点**（init 两页已改走公共层文档壳）。它仍被
     `test/render.test.mjs` 的「6 随包模板」面钉着，退役要连那条测试面一起动 ⇒ 归
     [#855](https://github.com/FeatherHunter/ilife/issues/855) 的收尾批或另开小票。
   - 「两页装配」这层（`src/init/page.ts` 的 `assemble` ＋ 复制区载荷两件）在 8 个域里会重复出现；
     按 #823 的目标树它该上提到共用位（`src/render/` 或 `shared/`），本票**不抢**（共用位只由它的独占票改）。

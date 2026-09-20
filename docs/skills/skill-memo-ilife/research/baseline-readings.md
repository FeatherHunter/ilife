# 备忘录场景 HTML 图（#820）· 改前基线读数

**谁读**：要动样式的票（视觉基准 #824、验收形制 #825、8 张域票、收口 #834）开工前先读这一页 —— 它给的是**改动之前**的现场读数，后面每一处优化都要能对着它说清「从几处降到几处」。

**怎么来的**：2026-09-20 编排会话在 `D:\ilife` 实时跑出来的，命令逐条列在文末，可重跑。**老技能仓库与活库全程只读**（只把产物复制进工作区跑门）。

---

## 一 判据四件的现场状态（先验明可不可用）

| 件 | 路径 | 行数 | 现场结论 |
|---|---|---|---|
| 分隔符探针 | `packages/base-render/test/separator-probe.mjs` | 208 | **可用，直接跑备忘录产物**。口径：有命中 exit 1／无命中 exit 0／用法错 exit 2 |
| 六列机审 | `docs/skills/skill-bill/t407-v8-style-audit.mjs` | 332 | **今天不能直接用**：`FILES` 是写死的 32 份账单产物名单（`:36-40` 的 `t407-页-<唤醒词>-采集页.html`），指到备忘录目录会报「共 0 份」并 exit 1。**要先改成按目录扫描或换名单** |
| 版式读数器 | `docs/skills/skill-calorie/t516-判据-版式.mjs` | 330 | **可用**：`--dir` 指备忘录产物实测 `8/8 件读数完成`，exit 0。**只出读数、不判红绿**（阈值写在基准里，靠人核）。13 个公共层区块类对备忘录**命中全 0** —— 那不是它读不了，是备忘录页本来就不用那些类（见 §6.3）；`touchSmall`／字号／越界三列与类名无关，照读 |
| 判分脚本（五维尺） | `docs/skills/skill-calorie/t524-判分.mjs` | 263 | 存在。包路径与读数目录写死在卡路里，**搬到备忘录要改常量**（票 #824 的活） |
| 响应式门 | `packages/skill-calorie/scripts/measure-responsive.mjs` | — | 存在（**在 `packages/` 下，不是 `docs/` 下** —— 早先一份调查报告把路径写成了 `docs/skills/skill-calorie/scripts/`，此处更正） |
| 墙生成器 | `docs/skills/skill-calorie/scene02-验收墙/gen-wall.mjs` | 293 | 存在，造册／双端墙／索引／`--check` 四形态一体 |
| 造册器 | `docs/skills/skill-calorie/scene02-验收墙/restage.mjs` | 154 | 存在，但它依赖卡路里的 `t279-真跑.mjs` 那套「逐条真跑＋快照」；**备忘录没有等价的件，得先写一件** |
| 链路总表骨架 | `docs/skills/skill-calorie/t369-链路总表.mjs` | 94 | 存在，照抄对象（一页静态表 ＋ 死链自检 exit 0／1） |

---

## 二 分隔符门：6 份模板族**全红**

命令：`node packages/base-render/test/separator-probe.mjs <产物>`（有命中 exit 1／无命中 exit 0）

### 逐族读数（每族取盘上最新一件）

| 模板族 | 样本 | 字节 | 节点级命中 | 判读 |
|---|---|---|---|---|
| `memo_query.html` | `备忘录查询_20260819_211512` | 87 681 | **2** | 真缺陷（提示行） |
| `sync_report.html` | `同步报告_20260819_000127` | 85 630 | **1** | 真缺陷（提示行） |
| `init_report.html` | `备忘录_初始化报告_20260813_161900` | 50 120 | **2** | 1 处页标题（允许）＋ 1 处提示行（真缺陷） |
| `wish_plan.html` | `心愿排期_20260813_143752` | 53 393 | **3** | 1 处提示行 ＋ 1 处三段并列 ＋ 1 处**内部文档编号** |
| `wish_complete.html` | `心愿完成_20260813_143748` | 51 417 | **2** | 1 处提示行 ＋ 1 处三段并列 |
| `change_category.html` | `批量改分类_20260813_143731` | 51 234 | **1** | 真缺陷（提示行） |
| HELP（共享模板） | `备忘录_HELP_20260912_173247` | 130 825 | **1** | **共享层**拼的文档标题（允许，不归本包） |

**合计 12 处命中**；其中**真缺陷 9 处**、允许保留 2 处、共享层 1 处。

### 逐处明细（按病型分成三类，处置完全不同）

**① 页标题位的 `·` —— `t407` 口径里是「允许保留」的一类，不算缺陷**

```
init_report  L7   #1   备忘录 · 初始化报告        <>
HELP         L6   #1   备忘录 · 使用手册          <>   ← 共享层拼，不归本包
```

**② 复制区说明行的 `·` —— 真缺陷，而且 6 份模板各写了一遍（同一句话 6 处实现）**

```
memo_query      L545 #8   跟随筛选/展开实时变化 · 粘贴给 AI 继续下一步(复制数据 = 初始全量存…   <small>
memo_query      L551 #11  点复制数据保存当前结果 · 点复制日志用于反馈问题(日志不含隐私内容)     <small>
sync_report     L810 #6   点复制数据保存本次同步结果 · 点复制日志用于反馈问题                  <hint>
init_report     L377 #6   点复制数据保存当前检查结果 · 点复制日志用于反馈问题                  <hint>
wish_plan       L368 #18  复制数据 = 心愿列表快照(存档用) · 复制日志 = 诊断信息(给开发者)        <hint>
wish_complete   L365 #18  复制数据 = 心愿列表快照(存档用) · 复制日志 = 诊断信息(给开发者)        <hint>
change_category L380 #24  复制数据 = 笔记列表快照(存档用) · 复制日志 = 诊断信息(给开发者)        <hint>
```

⇒ **7 处，同一族**。按 `docs/agents/structure.md`「一个形状一处定义」，这该收成**一个共用件**（`#700` 那批「页面里重复的小件合并成一份」的同型病），不是 6 份模板各修一遍。

**③ 最重的三条：三段并列 ＋ 内部话上屏**

```
wish_plan     L376 #21  过程型 HTML · 用户 = 桥梁 · 不会自动执行任何 CLI   <copy ghost>
                        [R3: ·x3 = 过程型 HTML ｜ 用户 = 桥梁 ｜ 不会自动执行任何 CLI]
wish_complete L373 #21  过程型 HTML · 心愿 → 打卡 原子转换 · 不调任何后端   <copy ghost>
                        [R3: ·x3 = 过程型 HTML ｜ 心愿 → 打卡 原子转换 ｜ 不调任何后端]
wish_plan     L377 #22  设计原则: 04_架构师原则 §10 · 4 部分 prompt 模板   <copy ghost>
```

这三条同时命中三样：用户第 5 条（`·` 三段并列）、用户第 4 条（冗余不合理）、五维尺硬扣分 **H2**（内部标识符或裸代码）——《过程型 HTML》《CLI》《04_架构师原则 §10》《prompt 模板》都是**内部话**，屏上不该有。

### 一条必须记住的口径（免得把假缺陷报上来）

探针**剥掉 `<script>…</script>` 整段**，所以 HELP 载荷里那句 `"subtitle":"8 个分类 · 30 个场景 · 30 可用 · 版本 1.3.0"`（4 段并列、3 个 `·`）**扫不到**。
它今天**不是**缺陷 —— `src/help/helpFile.ts:32-33` 逐字写着「`subtitle` 在 A 路模板**无渲染落点**（读完即弃，只进 `help-data`）」。
⚠️ 但这条**会变**：哪天 subtitle 有了渲染落点，探针扫不到它就等于门漏了。届时要么给 subtitle 换掉分隔符，要么给探针补「载荷渲染文本」这一列。

---

## 三 盘上现成的备忘录产物（216 件，只读副本）

目录 `D:\2Study\StudyNotes\.db\memo_html`，按文件名族：

| 族 | 件数 | 出自 |
|---|---|---|
| `备忘录_HELP` | 69 | HELP（新老两代都有） |
| `备忘录查询` | 41 | `memo_query.html` |
| `同步报告` | 40 | `sync_report.html` |
| `备忘录_初始化报告` | 35 | `init_report.html` |
| `心愿排期` | 14 | `wish_plan.html` |
| `心愿完成` | 8 | `wish_complete.html` |
| `批量改分类` | 8 | `change_category.html` |
| `备忘录_速查表` | 1 | `mode:"lookup"` 支 |

⇒ **6 份模板族在盘上都有历史实物**，可以拿来当版式对照；但**它们全是老世代或旧轮次的产物**，不是本图要交的样张。

---

## 四 两处现场发现（把渲染页真看出来的）

样本 `备忘录_HELP_20260912_173247.html` 在 1280 宽下渲染，页头下面那块「第一次用备忘录？」引导卡印的是：

```
🚀 第一次用备忘录？
从零搭建环境检测 → 安装/配置 → 初始化(数据库) → 生成报告,全程引导。
① 检查并配置 Python        版本与依赖检测
② 数据库初始化             SQLite 与 FTSS 全文检索
③ CLI                      安装并初始化核心命令
④ 环境变量                 SKILLS_DB_PATH / MEMO_MEDIA_DIR
```

**发现一：内容是 Python 时代的，与新技能不符。** 出处 `src/help/helpFile.ts:47-51` 的 `HELP_INIT_STEPS` —— 注释逐字写着「老 `memo_render.py` 的 `_init_banner` 逐字」。
新技能是 TS 实现、不吃 Python、也不靠 `SKILLS_DB_PATH` 环境变量（今天路径读 `~/.ilife/memo.yaml`）。**这就是负责人第 4 条「文字不能出现冗余和不合理」的实例**：照抄老文案把「照抄」变成了「不对」。

**发现二：引导链用了 `→` 串四段。** `从零搭建环境检测 → 安装/配置 → 初始化(数据库) → 生成报告` —— 四处并列挤在一句里，正是第 5 条要治的形态（`→` 虽不在探针的并列符集合里，但它是同一个病）。

两条都归**内容资产**（`src/help/scenes/*.ts` 与 `src/help/helpFile.ts`），不是版式的活。

---

## 五 怎么重跑

```sh
# 把产物复制进工作区（探针与截图都要求在工作区内）
mkdir -p .scratch/memo-scene-map/baseline-probe
cp "D:/2Study/StudyNotes/.db/memo_html/备忘录查询_20260819_211512.html" .scratch/memo-scene-map/baseline-probe/memo_query.html
cp "D:/2Study/StudyNotes/.db/memo_html/备忘录_HELP_20260912_173247.html"   .scratch/memo-scene-map/baseline-probe/help.html

# 分隔符门（有命中 exit 1）
node packages/base-render/test/separator-probe.mjs .scratch/memo-scene-map/baseline-probe/memo_query.html

# 双端截图（看渲染；source 必须在工作区内）
#   vision_html_screenshot source=<工作区内的绝对路径> width=1280 height=700
#   vision_html_screenshot source=<工作区内的绝对路径> width=390  height=700
```

---

## 六 补齐的三列（2026-09-20 第二轮实测）

### 6.1 跨宽溢出：**已经全绿**（三档零溢出）

命令：`node packages/skill-calorie/scripts/measure-responsive.mjs --dir <目录> --label before`

```
OVERFLOW-ZERO pages=8 cells=24 failed=0 scopeOutFailed=0 label=before
```

8 件产物在 **390／768／1440** 三档全部 `0`（`docScrollWidth − innerWidth`）。唯一一处 `clip=1` 是 `memo_query` 里的 `label.sr-only`（给读屏用的 1px 元素，**不是缺陷**）。

⇒ **D4 跨宽自适应的横向溢出这一条，基线就是绿的**。后面改动不许弄红。

### 6.2 触摸目标与字号：**这是最要紧的一列**

命令：`node docs/skills/skill-calorie/t516-判据-版式.mjs --dir <目录> --widths 390,768,1440`

| 产物 | 390 档 `<44px` 处数 | 390 最小字号 | 逐处构成 |
|---|---|---|---|
| `help.html` | **34** | **8**（`div.s-d`） | `button.copy-btn`×6、`button.ib-close`×1、`input`×1 … |
| `memo_query.html` | **24** | 11（`span.badge`） | `button.copy`×7、`input`×1 … |
| `wish_plan.html` | **10** | 12 | `button.ghost`×4、`input`×2、`input.wish-check`×2 … |
| `wish_complete.html` | **6** | 12 | `button.ghost`×4、`input`×1、`input.wish-check`×1 |
| `change_category.html` | **4** | 12 | `button.ghost`×3、`select`×1 |
| `sync_report.html` | **2** | 11 | `button.copy`×2 |
| `sync.html` | **2** | 11 | `button.copy`×2 |
| `init_report.html` | **0** | 12 | （无） |

**合计 82 处 `<44px`（390 档）。** 两条读数必须一起看：

1. **390／768／1440 三档的处数完全相同**（例如 `memo_query` 三档都是 24）⇒ 这些页**从来没有触摸档适配**，不是「窄屏才出的问题」。按五维尺的 H6（触摸区 <44px，**只在 390／768 两档扣**，每处 −1），`memo_query` 一页就是 **−24**，`help` 一页就是 **−34** —— 逐页 ≥90 的目标下，**这一列不清零，分数不可能过线**。
2. **最小字号普遍 11–12px**（`memo_query` 是 `span.badge` 的 11px）；`help.html` 更是 **8px**（`div.s-d`，初始化引导卡的说明文字）。t524 的 D5 数值表里有「字号下限 12px」这一条。

### 6.3 公共层块类命中：**全 0**

`t516` 同时统计 13 个公共层区块类（`ilife-block-kpi-card`、`ilife-block-data-table`、`ilife-charts`、`ilife-empty` …）的命中数：

```
change_category 0 | help 0 | init_report 0 | memo_query 0
sync 0 | sync_report 0 | wish_complete 0 | wish_plan 0
```

⇒ **8 件产物一处都不用公共层的区块类**。它们走的是自己那套 `MEMO_PAGE_CSS`（`src/render/pageAssets.ts`），**完全不在公共层的响应式／触摸／形状体系内**。

**这两条合起来决定了 #824 的性质**：不是「把样式微调一下」，而是「**从自己那套 CSS 搬到公共层底座**」。走到位，触摸目标与字号两列才有可能清零；不搬，82 处会一处不落地带进新页。

### 6.4 顺带一条（不在本图 30 场景范围内）

`help.html` 在 390 档有 **317 处「越界」**（元素右边缘超出视口）＋ **8px 字号**。逐条看样例（`div.init-step@376+83`、`div.s-d@368+71`）都落在**初始化引导卡**上 —— 而那块**横向滑动是模板的有意设计**（`help-template.html` 注释：「初始化步骤卡（可选 · 技能传 steps 显示 · **>4 步横向滑动**）」），备忘录传了 6 步。「越界」计数多半来自这个横滑容器，**不是缺陷**。

但 **8px 的说明文字**是不是可接受，值得单独看一次 —— HELP 页不属本图目的地（本图做 30 个场景的产物），若要处置**另开票**，别夹带进域票。

---

## 七 这份读数还没覆盖的

- **英文裸词与重复句**：仍然没量（`t407` 今天跑不动备忘录，见 §一）。
- **其余 5 份模板族各只量了 1 件样本**，族内是否每件都同形还没验。
- **触摸目标与字号只量了 8 件样本**（每族 1 件 ＋ HELP），30 个场景最终产物还没出，基线到此为止。

# #551 饮食页副题与按日汇总 caption 去文字串改形状（Part of #162）· 证据

- 基线 HEAD：`506bdca`（开工 `git pull` 已是最新；`git status` 见 §一）。
- 写集（只这三件）：`packages/skill-calorie/src/render/dietDocs.ts`、
  `packages/skill-calorie/test/551-diet-subtitle.test.mjs`（新建）、本件。
- 禁区（ powershell 实测一行未碰）：`today.ts`、`routes.ts`、别家能力目录、公共层
  （`base-paint`／`base-render` 只调用既有出口，未改）。
- 锁协议：编译／测试／提交／变异重建一律
  `node tooling/run-locked.mjs --ticket 551 -- <命令>`（留痕见 `gate-runs.log` ticket=551）。
- 长命令输出落本票日志：`.scratch/t551/*.log`（transient，不提交）。

## 一、让路检查（开工第一条）

开工 `git status --porcelain -- packages/skill-calorie/src/render/dietDocs.ts` 回空——
`dietDocs.ts` 无他人未提交改动，可开工（全仓另有 20 余件他人在途 `M`，本票一件不碰）。

## 二、必报五步

### 第一步 · 影响清单（动手前）

| 文件 | 一句话 | 碰它的理由 |
|---|---|---|
| `packages/skill-calorie/src/render/dietDocs.ts` | 副题改短结论句，窗口与五事实改窗口条＋事实条形状，caption 改短表名＋口径另起口径行 | 票面点名的唯一源码件（副题与 caption 一带） |
| `packages/skill-calorie/test/551-diet-subtitle.test.mjs` | 新建：副题／caption 节点 R1/R2/R3 零命中＋五事实可读＋390 静态守卫＋字串级变异电池 | 票面点名的新建判据件 |
| `docs/skills/skill-calorie/551-diet-subtitle.md` | 本证据件 | 票面点名的证据落点 |

### 第二步 · 结构设计（无新目录）

- 不新增目录层级，不碰三名以上能力：只动饮食域自己一件。
- 对外接口不变：本件原导出 `DietMealRow`／`ViewDietDocInput`／`buildViewDietDoc`／
  `buildHealthDoc` 四个（≤5 ✓），本次零增删；新增 `DIET_SHAPE_CSS`／`dietEsc`／`dietHead`
  三个模块内私有件（目录内互用不算对外给，不进接口计数）。
- 形状复用公共层既有出口：`renderCaliberLine`（口径注）、`renderDataTable`（caption 缩短，
  签名不动）；窗口条／事实条样式仿 `src/exercise/sportUi.ts` 与 `src/weight/weightUi.ts`
  的同型先例（冻结 token、字号 12／13 两档、断点 820），但**不跨目录引用**那两件——
  铁律一（能力自治）：形状住饮食域自己件内，不抄别家文件。
- 预告（铁律五既有项，非本票引入）：`DietMealRow` 9 字段（>8）是开工前即存在的形状，
  摘字段会动禁区 `today.ts` 的调用方，本票不动，留收口票。

### 第三步 · 写代码（diff 实况 `+21/−5`，见 §三）

### 第四步 · 超线报警

`dietDocs.ts` LF（`split('\n').length − 1` 口径）334 → 350，未超过告警线 350——
**不触发第四步**（判据 `lf > 350`，`check-warning-line.mjs` 只读跑无
`RED 漏报：src/render/dietDocs.ts`，见 §六）。
但余量归零：后续再加行即超；届时拆法＝本件只留条目列表装配，
餐别／总览两支本就经具名函数（`todayDocs`／`reviewDocs`／`nutritionPort`）转出，
形状件 `DIET_SHAPE_CSS`／`dietHead` 随条目列表支走。**超线是报警不是拦路，本次未超线。**

### 第五步 · 交付对账

事前清单（上表三件）与事后 `git show --stat` 逐行对得上，偏差为零；
禁区 `today.ts`／`routes.ts`／别家目录／公共层零改动。

## 三、改了什么（`dietDocs.ts` 四处，副题与 caption 一带）

1. 新增形状件（13 行，紧跟 `MEAL_NOTE`）：`DIET_SHAPE_CSS`（窗口条＋事实条＋820 纵列，
   flex 折行、无定宽 px）、`dietEsc`（五字符转义，与公共层同表）、`dietHead(start, end, chip, facts)`
   （单日窗退化分支：只出一枚日期块＋「（单日）」，不断言不存在的跨度）。
2. 副题：`窗口 起 ~ 止 共N天，有记录M天、K条，合计X卡，日均Y卡。` →
   `本窗合计 X 卡`（一句结论；窗口与五事实明细落页顶 `dietHead` 条：
   chip `共 N 天`＋事实 `有记录 M 天`／`记录 K 条`／`合计 X 卡`／`日均 Y 卡`）。
3. caption：`按日汇总（起 ~ 止，无记录日写 —，不断 0）` → `按日汇总`；
   表下加一行 `renderCaliberLine('无记录日写 — 不断 0')`（窗口事实已在页顶条，不复述；
   删符号不删事实）。
4. 空窗同路：同一 `dietHead` 照出（缺值 `—`），空态句／引导句／脚注原样。

## 四、判据读数（R1 `·`／R2 `；`／R3 ≥3段并列，节点级；L6 `<title>` 除外）

### TDD 红（改前，`test-before.log`，exit=1）

- `runId=106b7399-5cfe-4a9f-a70f-3bca1dd233fb exit=1`
- 红在形状判据：② caption 仍是括号串
 （实况 `按日汇总（2026-09-05 ~ 2026-09-07，无记录日写 —，不断 0）`）、
  ③/④ `diet-window` 形状缺席；① 与变异电池已绿（探针自身有识别力）。

### 改后绿（`test-after.log`／`mut-green.log`，exit=0，tests 5／pass 5／fail 0）

- `runId=3f6880e7-353a-42fb-a92a-d6c8233dada6 exit=0`
- `T551 SUB 有数 副题=本窗合计 3200 卡 命中=0`
- `T551 SUB 空窗 副题=本窗合计 0 卡 命中=0`
- `T551 CAP caption=按日汇总 命中=0`
- `T551 FACTS 五事实齐＋形状在`
- `T551-MUT 塞·=R1 塞；=R2 塞三段=R3 还原=0`
- 回归 `diet-list-t271.test.mjs` 6／6 绿
 （`runId=4390b711-13bb-4520-846e-52c72cc72b5b exit=0`：骨架／复制区／裁定4-5／两分支／两条真跑）。

### 变异自证（源码行级：改坏一行→红→还原→绿）

- 改坏：副题行塞回 `、` 三段并列
 （`本窗合计 3200 卡、有记录 2 天、共 2 条`）→ 重建 →
  `runId=94e42896-ce2b-4d4f-8101-17aa5467d9c4 exit=1`，
  `T551 SUB 有数 … 命中=R3`（红在 ①，探针点名 R3）。
- 还原 → 重建（`runId=b2f20058-9b23-4a21-9208-074562281f1a exit=0`）→
  `runId=3f6880e7-353a-42fb-a92a-d6c8233dada6 exit=0`（绿，5／5）。

### 390 无横滑（真浏览器 `measure-responsive.mjs --widths 390`）

- `OVERFLOW-ZERO pages=2 cells=2 failed=0`：`diet-filled.html 390档 0 ✓`、
  `diet-empty.html 390档 0 ✓`（`responsive-390.log`）。
- 测试 ④ 另守静态形状：`flex-wrap:wrap` 在、`max-width:820px` 纵列在、
  形状无定宽 px、按日汇总表 `data-label` 卡片化在（公共层既有件）。

### 全页探针现状（`sep-after.log`，节点级；本票只收二处）

- 副题／caption／`diet-*` 节点命中＝0（`grep` subtitle／caption／diet- 类名零行）。
  二处节点在 R1–R7 下全干净（强于票面 R1/R2/R3）。
- 整页仍 FAIL（exit 1），残留**全部在他处**，归属如下（本票写集不含，一行未动）：
  - L6 `<title>卡路里·饮食` head R1 → 票面明示除外；
  - 眉标 `卡路里 · 饮食` R1 → 眉标范畴（他票地盘）；
  - 口径行 `；`／`、`（`MEAL_NOTE` 一带）→ 口径范畴（他票地盘）；
  - 来源脚注 `·`（`sourceLine`）→ 公共层／他票范畴；
  - 空态句 `~` R6 → R1/R2/R3 范围外，且空态文案归他票。

## 五、提交

- `修复(551): 饮食副题去文字串 + dietDocs.ts/判据全绿`
- sha：`（提交后回填）`
- `git show --stat` 三件（对账见 §二第五步）。

## 六、附带门禁说明（非本票红）

- `check-warning-line.mjs` 只读跑：本票改动前后均无 `RED 漏报：src/render/dietDocs.ts`
  （350 未超线）；当刻另有两条 `RED 台账陈化`（`weight/history.ts`、`home/homeDocs.ts`）
  系他席在途改动所致，台账文件不在本票写集（且他席稍后已 `--sync` 落账），不归本票。
- `measure-responsive` 仅跑票面要求的 390 档；768／1440 未量（非票面要求）。

## 七、未做项

- 眉标／口径行／来源脚注／空态句的残留分隔符债（§四归属）：他票地盘，本票写集不含。
- 768／1440 两档未量（票面只要求 390）。
- `DietMealRow` 9 字段（§二第二步）：开工前既有，摘字段牵连禁区 `today.ts`，留收口票。

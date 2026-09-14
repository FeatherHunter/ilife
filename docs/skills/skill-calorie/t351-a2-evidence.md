# T351-a2 证据件：结果页动作明细表改**四列行内版式**（接任补齐）

> 本件作者＝**接任实施兵**（非前任）。前任中途停掉、没交回执；按 `docs/subagent-concurrency-protocol.md`
> §3.2 第 4 条「无主 diff 不许当既成事实采信」先**量现场**再自行判定完成度，补齐验证与收尾。
> 被审口径见 `docs/skills/skill-calorie/t351-a2-review-brief.md`；版式规格见
> `docs/skills/skill-calorie/t351-redesign-184-spec.md`。

## 一、接手现场（无主改动，逐件哈希）

| 件 | 盘上状态 | blob（`git hash-object`） | LF | 复核结论 |
| --- | --- | --- | --- | --- |
| `packages/skill-calorie/src/render/workoutMovementTable.ts` | `??` 新建 | `2f63eb7d4ba32adcd70ed39cbf4f847001bc2cc5` | 111 | 四条换算规则逐条复核无误（§二 第 1 条） |
| `packages/skill-calorie/src/render/workoutPlanDocs.ts` | ` M`（+14/−51） | `9270a460e4260f0c4ad398c00dd45dc6f1bf0f32` | 311 | 接线与旧六列整块删除无误 |
| `docs/skills/skill-calorie/t351-redesign-184-spec.md` | `??` 新建 | `66a355a7de74b7fee26024ffe5270c41e431df50` | 79 | 四列口径已同步；§五 有 4 处过期（§四 第 2 条） |

派单没写的三条现场事实（本次量到）：

1. `dist/render/workoutMovementTable.js`／`workoutPlanDocs.js` 的 mtime ＝ **20:05:48**，晚于两件源码
   的 20:02:26／20:03:12 ⇒ 前任至少跑过一次 `tsc -b`：不是「没编译」，而是**没跑门禁**。
2. 两个重跑脚本（`final-v3/run-176-207-v3.mjs` blob `5f08087a…`／`run-realdata-v3.mjs` blob
   `34323e98…`，mtime 20:07:14／20:08:00）**内容已经是四列口径**：`FOUR=['动作','部位','组数×次数','重量']`、
   ⑥⑦⑧ 三条已在、夹具已改成生产库真形状 ⇒ 派单里「把 `SIX` 六项改成四项」的现场**已不存在**。
3. `.scratch/t351-fix/final-v3/` 的 37 份产物 mtime 全是 **19:01**（六列口径）⇒ 对照基准没被覆盖，
   v4 全程落 `.scratch/t351-fix/final-v4/`（本席从 `final-v3/` 复制脚本到 `.scratch/t351-fix/v4/` 再改，
   `final-v3` 两个脚本的 blob 复制前后一致）。

## 二、完成度判定：代码与规格主体完成，验证与收尾全缺；另有三处「一跑就露」的错

判定依据（每条都可复核）：

1. **换算规则逐条复核通过**：方括号前那截→部位细化词进副行；方括号内逗号后那截→节奏上移会话标题行；
   逗号前那截→丢掉；无方括号→整条作细化词；备注空或 `—`→只留类型；休息日不出表、标题不加节奏。
   主件 `import { DASH, movementTableHtml, tempoOf }` 与新件三个导出吻合；`DASH` 定义收敛到新件一处。
2. **三处「一跑就露」的错 ⇒ 反证此前从未跑过**：
   - `run-realdata-v3.mjs:51` 暂存区守卫的根写成**脚本自己住的目录**，与它自己给的
     `--out .scratch/t351-fix/final-v4/realdata` 用法对不上 ⇒ 必抛错（本轮 `t351-a2-v4real` 实测 exit=1）；
   - `run-176-207-v3.mjs` 的 `withTable` 取「页内有表」而不是「本页有动作明细表」⇒ 35 份非动作表页被
     拉进 ⑥／⑧ 判据（`t351-a2-mut1` 实测清单可见），交付轮会**假红**；
   - `run-realdata-v3.mjs` 行过滤 `/组×/.test(cells[2])` 里 `cells[2]` 是 `{text,sub,name}` 对象 ⇒
     **恒不命中**：真值行断言恒红、而同句 ⑥ 的「逐行齐」恒真（**自证式假绿**）。
3. **无证据件、`final-v4/` 未建、无提交**、未跑场景测试与变异 ⇒ 派单「验证与收尾全缺」成立。

## 三、判据读数（只给机器读数；明细在 `.scratch/t351-a2/*.log`）

### 3.1 编译与测试

| runId | 命令 | 退出码 | 摘要行 |
| --- | --- | --- | --- |
| `t351-a2-a2types` | `pnpm test:types` | 0 | `$ tsc -b`；整树无一错（他席在途件本轮未致红） |
| `t351-a2-a2scene` | `node --test test/scene05-read.test.mjs test/scene05-write-create.test.mjs test/scene05-write-mutate.test.mjs` | 0 | `ℹ tests 3／pass 3／fail 0` |
| `t351-a2-a2types2` | `pnpm test:types`（修复后） | 0 | 同上 |
| `t351-a2-a2plan` | 计划路 5 支测试文件 | 0 | `ℹ tests 25／pass 25／fail 0` |
| `t351-a2-a2pkg` | `packages/skill-calorie/test/*.test.mjs` 全量 | 1 | `tests 737／pass 713／fail 24`：**24 条全在他席在途面**（#239 copyArea、#108 食品库、#111／#109 运动·身体域、#110／#113 趋势、#91 照片、#374 体重），本票范围内 **0 条** |

### 3.2 全量机检 37 份产物 ＋ 21 条判据（**交付轮**）

`GATE-RUN runId=t351-a2-v4full2 cmd="node .scratch/t351-a2/fresh-run.mjs .scratch/t351-fix/final-v4 .scratch/t351-fix/v4/run-176-207-v4.mjs" exit=0`
⇒ `RESULT: 58/58（产物 37 ＋ 判据 21）`、`PROBE: PASS（21/21 判据全绿）`。四列口径的逐条读数：

- ④ 8 份 `four` 页「四列逐字按序」（176／177／179／180／181／182／183／184）；`own1` 页 20 份「自有表（无
  `组数×次数` 列）」；`none` 页 2 份（178 空周、186 预检确认页）；**兜底 `other`=0 份**（旧后门整条封死）。
- ⑥ 动作格＝加粗名＋块级副行小字，副行逐格齐且以「主要／孤立」收尾；**生产形状命中=true**
  （`背 主 · 孤立`）；副行样例 `["胸整体 · 主要","孤立","背阔 · 主要","背 主 · 孤立","股四头 · 主要"]`。
- ⑦ 正文 `main`／`iso` 裸词 **0 处**（`data-t` 载荷不算正文，另记命中数）。
- ⑧ 节奏上移：184 恰三条 `["20-30 RPM(2-2.5秒/次)","18-25 RPM(2.5-3秒/次)","15-20 RPM(3-4秒/次)"]`；
  逐页条数＝夹具真值（177／181 各 1 场带）；休息日带节奏 0、周级标题带节奏 0、未知节奏 0。
- ⑨ 两条删减的旁证：正文不出现 `reps×` 与 `W<n> ` 记号（0 处）。

### 3.3 真数据页（生产库只读拷贝，`D:\2Study\StudyNotes\.db\calorie_data.db`）

`GATE-RUN runId=t351-a2-v4real3 cmd="node .scratch/t351-a2/fresh-run.mjs .scratch/t351-fix/final-v4/realdata .scratch/t351-fix/v4/run-realdata-v4.mjs" exit=0`
⇒ `REALDATA_RESULT: 10/10`；`REALDATA_SETS_ROWS=264`（真值行 264 行）；`副行含裸词=0`；
`生产形状数={"主":12,"补充":12}`；`休息日带节奏=0`；`REALDATA_REST_DUP=false`（休息标题 `周日 · 休息日`）；
`REALDATA_METRICS={"totalSessions":100,"totalMovements":264,"totalWeeks":4}`。

### 3.4 「两条删减是无损的」独立复算（生产库 264 个动作，全量）

脚本 `.scratch/t351-a2/derive-prod.mjs`（只读生产库）⇒ `RESULT: 9/9`：

- 动作总数 **264**；备注有方括号 **264/264**；方括号内 `W<n>` 找到 **264/264**、**恒等于该行周次 264/264**
  （分布 `{1:66, 2:66, 3:66, 4:66}`）；
- 有动作的场次 **96**、**场内节奏恒定 96/96**（全库节奏取值恰 **3** 种）；类型取值域 `iso 204 ＋ main 60`；
- 方括号内逗号前那截 ≡ 由同行 `sets` ＋ 行周次反推：**264/264**。**口径补正**（本轮实测）：那截＝
  `W<周次> <逐组次数去重后以／连>reps×<逐组重量去重一位小数、以／连>kg`，**不含组数**（组数＝`sets.length`），
  且**单位恒写 `kg`**（`自重` 行的重量写 `0kg`，库里 `unit` 是 `自重`）。按「组数×重量原样＋单位取 sets」的
  两种写法都只有 220/264，故此处把真口径写清楚。

### 3.5 变异自证（**两行读数**；变异产物一律落 `.scratch/t351-fix/mut/`，在交付目录之外）

| 变异 | 改坏必红 | 还原一致 |
| --- | --- | --- |
| m1 摘掉动作格的**副行小字拼装**（`workoutMovementTable.ts`） | `MUT_M1_RED RESULT: 57/58`、`PROBE: RED（FAIL 1／21：机检⑥）`（8 份动作表页副行为空） | `MUT_RESTORE base=0c455ec122dbeff69aa9672e6a66c898e8a99f79 restored=0c455ec122dbeff69aa9672e6a66c898e8a99f79 equal=true`；`MUT_RESTORE_REBUILD exit=0` |
| m2 摘掉**节奏上移**（`workoutPlanDocs.ts`） | `MUT_M2_RED RESULT: 57/58`、`PROBE: RED（FAIL 1／21：机检⑧）`（`184节奏=[]`、逐页条数全不符） | `MUT_RESTORE base=9270a460e4260f0c4ad398c00dd45dc6f1bf0f32 restored=… equal=true`；`MUT_RESTORE_REBUILD exit=0` |

变异在**持锁区内**做（`mutate.mjs` 的 `finally` 还原并重建 dist），runId `t351-a2-mut1c`／`t351-a2-mut2b`；
「还原必绿」由交付轮 `t351-a2-v4full2` 的 `RESULT: 58/58` 承担（该轮产物即交付产物）。另：未变异件在两轮
里 blob 前后一致（`MUT_RESTORE_SIDE … equal=true`）。

### 3.6 前任审查兵三支探针（在**新产物**上复跑）

- `.scratch/t351-review/probe-integrity.mjs --dir .scratch/t351-fix/final-v4` → `PROBE-INDEPENDENT: GREEN（37/37 份全过 7 组断言）`、`RESULT: 37/37 份产物零问题`（exit 0）——含「内嵌渲染时间戳 ≡ mtime」，可证明 37 份**同出一轮**。
- `.scratch/t351-review/probe-pre-verbatim.mjs --dir …/final-v4` → `PROBE-PRE-VERBATIM: GREEN（10/10 可见块与触发器数据全等）`（exit 0）。
- `.scratch/t351-review/probe-read-block.mjs`（持锁）→ `PROBE-READ-BLOCK: GREEN（6/6）`（exit 0）。

### 3.7 生成顺序（**两行读数**）

1. 源码最后改动：`workoutMovementTable.ts` **20:40:59**、`workoutPlanDocs.ts` **20:41:12**、规格 **20:39:20**。
2. 产物 mtime：`final-v4` 最早 `order176-result.html` **20:41:49** ～ 最晚 `order207-result.html` **20:41:58**，
   真数据页 `order184-realdata-result.html` **20:42:07** ⇒ **全部晚于源码最后改动**。

## 四、接任者改了什么（本票声明路径内；`workoutPlanDocs.ts` 未动）

1. **产品（真数据页实测出的缺陷，1 件）**：生产库 24 个动作的备注写成 `背 iso 主 …`／`背 iso 补充 …`，
   24/24 与该行 `type=iso` 同值；按「方括号前那截逐字进副行」原样印，正文就出 24 处 `iso` 裸词，
   与「类型中文化、页面不出现英文原值」冲突。改法：新增 `detailWord()` —— 先把裸词按同一张 `TYPE_ZH`
   中文化，再删掉那个与副行第二段**同字**的词，其余逐字保留 ⇒ `背 主 · 孤立`／`背 补充 · 孤立`；
   `胸整体` 这类不含裸词的细化词一字不动。文件 111 → **126 LF**（告警线 350，未超）。
2. **规格（就地摆正两处）**：§二 补「细化词混类型裸词」口径；§五 三行与「缺字段清单」里
   `movements[].note`／`sets[].reps|weight|unit` 的「缺」改成真实出处（`planStore:39-42`，`abb7c5c`
   起即已声明 —— 规格与代码走散，属原地摆正，不另开票）。
3. **机检脚本 v4**（`.scratch/t351-fix/v4/run-176-207-v4.mjs`，已入仓 `docs/skills/skill-calorie/t351-a2-run-176-207-v4.mjs`）：
   表头四列；声明细化为 `four`／`own1`／`none` 三态 ＋「不许落在兜底 `other`」；⑥ 只判**动作表页**并加
   生产形状；⑦ 正文口径写明（`data-t` 载荷不算正文）；⑧ 改**逐页条数真值两面判**（单向「有表就得有节奏」
   在本夹具上会把 177／181 误判成红）；⑨ 新增「删减记号不入正文」；**夹具改动两处**（补记于审查后）：
   ① 补一条生产形状的边界动作 `宽距高位下拉`（note 写成 `背 iso 主 […]`，细化词里混着与该行 `type` 同值的
   类型裸词）；② 首场动作名由 `俯卧撑` 改为 `悍马机卧推`。**两处都会让页上数据变**，与 `final-v3` 正文相比：
   撤①→26/37 相同、撤②→21/37、**两处都撤→29/37**（只剩 8 份目标页因版式改动而不同）；差异全在数据面
   （表形签名 `SHAPE_BAD=0`）。此表由 T351-A2 独立审查的反事实实证量出（报告
   `t351-a2-review-报告.md` §三／§五，探针 `t351-a2-review-counterfactual.mjs`）。
4. **真数据脚本 v4**（已入仓 `…-run-realdata-v4.mjs`）：修三处（暂存区守卫根、行过滤 `cells[2].text`、
   副行裸词口径）。

## 五、门禁对账（本窗口 `runId=t351-a2-*`，源 `.scratch/locks/gate-runs.log`，导出件 `t351-a2-gate-runs.log`）

| runId | 命令 | exit | 说明 |
| --- | --- | --- | --- |
| `t351-a2-a2types` | `pnpm test:types` | 0 | 首轮编译 |
| `t351-a2-a2scene` | `node --test` scene05 三支 | 0 | pass 3／fail 0 |
| `t351-a2-mut1`／`mut1b` | 变异 m1 | 0 | 机检红 57/58（⑥）；**被 `mut1c` 取代**（⑥ 口径先修） |
| `t351-a2-mut2` | 变异 m2 | 0 | 机检红 57/58（⑧）；被 `mut2b` 取代 |
| `t351-a2-v4full` | 全量机检 → `final-v4` | 0 | 58/58（修复前产物）；**被 `v4full2` 取代** |
| `t351-a2-v4real`／`v4real2` | 真数据页 | 1／1 | 脚本守卫缺陷／真数据暴露产品缺陷，两次都**未落盘** |
| `t351-a2-a2types2` | `pnpm test:types` | 0 | 修复后 |
| `t351-a2-mut1c` | 变异 m1（+还原重建） | 0 | 红 57/58（⑥）；还原 equal=true |
| `t351-a2-mut2b` | 变异 m2（+还原重建） | 0 | 红 57/58（⑧）；还原 equal=true |
| `t351-a2-v4full2` | 交付轮全量机检 | 0 | **58/58、PROBE PASS ← 交付产物取自本轮** |
| `t351-a2-v4real3` | 真数据页 | 0 | 10/10 |
| `t351-a2-a2pkg` | 包内全量测试 | 1 | 24 条红全在他席在途面（§3.1） |
| `t351-a2-a2plan` | 计划路 5 支 | 0 | 25/25 |
| `t351-a2-a2readblock` | 探针③ | 0 | GREEN 6/6 |

另：本窗口另有 `t351-a2-brief-add／commit／push`（编排者预置派单）与 `t351-a2-add／commit／push`
（编排者代本票落定 6c7daca）六条，**非本席运行**，如实登记备查；本席自己的 `git add／commit／push`
属自指面，在窗口外，不入表（同仓 `t398-gate-runs.log` 口径）。

## 六、未做项与下一手缺什么

- **未跑** `pnpm build`（含 `gen-cli --stamp`）与 `pnpm gen:check`：本票只改渲染件，`dist` 由 `tsc -b`
  （即 `pnpm test:types`）按当刻源码重建，命令登记与生成物未动；走发布链前需按发布口径补跑。
- **未跑** `packages/skill-calorie/scripts/check-warning-line.mjs`（行数台账）：两件 126／311 LF 均在 350 内，
  未新增超线条目。
- **未跑整树 `pnpm test`**：只跑包内全量 ＋ 计划路 5 支 ＋ 根 scene05 三支；包内 24 条红已逐面归因他席。
- 真数据页**只有 order184 一份**（其余真数据页不在本票范围）；`.scratch/t351-fix/final-v4/`（37 份 ＋ 真数据页）
  在 `.gitignore` 内，仓内不留 HTML 产物（沿用前几轮口径）。
- 下一手（A2 对抗审查兵）：按 `t351-a2-review-brief.md` 复跑本件全部读数；**要证伪的四条**里，
  §2.1 两条无损已由 `t351-a2-derive-prod.mjs` 给出 9/9（复核时注意 §3.4 的真口径）；
  §2.4「零表判绿的后门」现由 `four`／`own1`／`none` 三态 ＋「无产物落 `other`」共同堵，
  抽表两面（应带表的页抽表必红／178 本就无表不该红）请照 `tableVerdict()` 三支各跑一次。

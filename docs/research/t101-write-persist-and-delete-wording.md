# #101 写链落库断言 ＋ 删除回执可恢复性口径统一 · 证据（含返修轮）

票面（GitHub #101，wayfinder 地图 #63 子票）：单测只断言回执、**没有逐键库内断言**；`exercise.remove`／
`body.*-remove` 是软删但文案只说「已删除」。首轮验收两条：① 35 个写键每键至少 1 条 SELECT 校验（写后读回）；
② 软删文案统一。

两路对抗式审查：**A1 PASS 89 ／ A2 FAIL 72（含 S1）** → 编排者裁定**返修**。本文件 = 首轮证据 ＋
返修轮（H1–H7）逐项修法／证据／口径，全部落在本票独占路径内。

本票产出（全部落在独占路径内）：
- `packages/skill-calorie/test/cmd-write-40-persist.test.mjs`（新增 ＋ 返修轮重做覆盖门／口径断言，17 用例）
- `packages/skill-calorie/src/cli/write.ts`（删除回执词条 ＋ `items[].status` 同源派生）
- `packages/skill-calorie/src/render/photo.ts`（删照片回执词条 ＋ status）
- 本文件 ＋ `docs/research/t101-fail-set.mjs`（失败集抽取/比对）
  ＋ `docs/research/t101-baseline-failures.txt`（**入仓基线名单**，返修 H5）
  ＋ `docs/research/t101-softdelete-still-counted.mjs`（**文案诚实性事实复核**，返修 H1）
  ＋ `docs/research/t101-mutation.mjs`（变异自证，返修 H4 加 sha256／落盘备份／还原自证）
- `.changeset/t101-delete-wording-persist.md`

---

## 0. 返修逐项（缺陷 → 修法 → 证据）

| 项 | 缺陷（审查结论） | 修法 | 证据落点 |
| --- | --- | --- | --- |
| **H1**（S1 · A2） | 软删文案「可恢复」在用户可见面被证伪：`analysis/**` 11 处查询未过滤 `is_deleted`（统计删前=删后）＋ `view.exercise` 同时 exit 4 ＋ 全仓 0 个 restore 入口 | 软删文案**不承诺可恢复**并**如实标注统计口径**（仍计入／已排除两档）＋ `items[].status` 与 prose 同源 ＋ 新增「文案↔实测同源」用例；**不修查询**（根因在读层，另开票见 §7） | `write.ts:118-127`（口径常量）／`write.ts:539,547,556,661,770,797`（软删词条）／`cmd-write-40-persist.test.mjs:640-660`（诚实性用例）／`docs/research/t101-softdelete-still-counted.mjs`（事实 A–E） |
| **H2**（S2 · A1-1） | 覆盖门自报式：`cover()` 与 `withRead()` 解耦 → 删掉某键 SELECT 块仍 pass 15 | `withRead(dir, key, fn)` **必须声明写键**，内部 Proxy 统计真实 `prepare()` 次数，0 次直接抛；覆盖门断言 35 键**每键 ≥1 次真实只读查询** | `cmd-write-40-persist.test.mjs:95-115`（withRead）／`:743-753`（覆盖门） |
| **H3**（S2 · A1-2） | 计数三处互不一致：doc:9「11 处」／doc:87「14 处」／changeset「13 处」 | 全口径统一为**可复跑实测值 14 处（`write.ts` 13 ＋ `render/photo.ts` 1）** | 本文件 §3；事实 E 机器断言（`t101-softdelete-still-counted.mjs`） |
| **H4**（S3 · A1-1） | 变异脚本无落盘备份／无 sha256 自证（强杀会留变异态） | 跑前 `sha256` ＋ 落盘 `.bak` ＋ `finally`／`SIGINT`／`SIGTERM` 还原 ＋ **还原后 sha 相同断言**（不等即 exit 2） | `docs/research/t101-mutation.mjs:96-140` |
| **H5**（S3 · A1-2） | 复跑基线依赖 `.scratch/t75/baseline-gates.log`（`.scratch` 被 gitignore）→ 新克隆无法复现 delta | 基线**失败集名单**入仓 `docs/research/t101-baseline-failures.txt`（27 条），脚本自动识别名单/日志两种模式 | `t101-fail-set.mjs:37-58`／§8 |
| **H6**（S3 · A1-3） | `.scratch/t75/collision-matrix.md` 声明 `cmd-write-40.test.mjs`，与实际新增文件不符（该文件在 `.scratch`，本票不改） | 在本文件 §6.4 写明实际路径 `packages/skill-calorie/test/cmd-write-40-persist.test.mjs` | §6.4 |
| **H7**（S3 · A1-4） | 删除用例未断言「回执 id 能定位被删行」 | 数据驱动用例：软删用回执 id 查到该行且标志位=1；硬删用回执 id **查不到**该行 | `cmd-write-40-persist.test.mjs:603-637` |

---

## 1. H1：删除回执口径（逐句有实测，不承诺恢复）

### 1.1 审查实测复核（本票自己复跑，机器断言）

`node docs/research/t101-softdelete-still-counted.mjs`（exit 0）：

| 事实 | 观测点 | 删前 | 删后 | 与文案一致 |
| --- | --- | --- | --- | --- |
| A 软删运动「仍计入历史统计」 | `view.home.deficitToday` | 2056 | 2056 | 是 |
| A | `view.deficit.avgExerciseBurn` | 0 | 0 | 是 |
| A | `buildSeries(db).exerciseKcal(当日)` | 0 | 0 | 是 |
| B 列表侧已排除 | `view.exercise` exit | 0 | 4（`ERR 4: …无运动记录：…`） | 是 |
| C 无恢复入口 | 键表 restore/undo/recover 入口数 | 0 | 0 | 是 |
| D 体脂「已从查询与统计中排除」 | `view.body-composition` 有效行数／最新体脂 | 2／18.5 | 1／19.5 | 是 |
| D2 食品「已从查询与统计中排除」 | `view.search` 命中数 | 1 | 0 | 是 |

> 注：脚本在同一次运行里会先跑「软删运动」再跑「软删体脂／下架食品」，A 组数值为当次实测
> （该次跑批的播种为 1 条运动 250 卡／9 天窗口，故 `avgExerciseBurn` 与 `exerciseKcal` 在同一次
> 运行内取同值；关键是**删前 = 删后**）。`docs/research/t101-softdelete-still-counted.mjs` 的
> 断言是「删前 === 删后」，与具体数值无关。

**11 处未过滤 `is_deleted` 的 analysis 查询**（`git grep -n exercise_log` 实测，本票**不修**，见 §7）：

| # | 落点 | 查询摘要 |
| --- | --- | --- |
| 1 | `analysis/series.ts:96` | `SUM(calories_burned) FROM exercise_log WHERE date BETWEEN ? AND ?` |
| 2 | `analysis/exercise.ts:45` | 明细行（date/type/dur/kcal） |
| 3 | `analysis/exercise.ts:86` | 按类型汇总 |
| 4 | `analysis/exercise.ts:109` | 窗口总消耗 |
| 5 | `analysis/exercise.ts:227` | 单日逐条 |
| 6 | `analysis/review.ts:69` | 复盘按日聚合 |
| 7 | `analysis/diet.ts:162` | 饮食页按日运动消耗 |
| 8 | `analysis/cross.ts:107` | 力量类消耗 |
| 9 | `analysis/cross.ts:108` | 有氧类消耗 |
| 10 | `analysis/anomaly/common.ts:84` | 异常诊断行源 |
| 11 | `analysis/weightCompare3.ts:68` | 按月消耗 |

对照：`fetch/exercise.ts` 自己的读函数**带** `COALESCE(is_deleted, 0) = 0`（`:218,241,252,257,282`），
故同一时刻 `view.exercise`（走 `listWindow`）exit 4 —— 这正是「文案若写『可恢复』即说谎」的机制。

### 1.2 文案与结构化字段（同源派生）

`write.ts:118-127` 是**唯一口径来源**；`deleteStatus()` 由同一 `kind` 派生 `items[].status`，
所以「prose 说软／硬」与「status 说软／硬」不可能不一致（变异 M6 验证）。

| 键（删除/下架） | 库内语义（实测 file:line） | prose 词条 | `items[].status` |
| --- | --- | --- | --- |
| `exercise.remove`（id／date／range） | `UPDATE exercise_log SET is_deleted=1`（`fetch/exercise.ts:218,228`）；analysis 11 处未过滤 | `（软删除：行保留，仍计入历史统计；暂无恢复入口）` | `已删除（软，不可恢复）` |
| `body.composition-remove` | `UPDATE body_composition SET is_deprecated=1`（`fetch/body.ts:208`）；读层带 `is_deprecated = 0` | `（软删除：行保留，已从查询与统计中排除；暂无恢复入口）` | `已删除（软，不可恢复）` |
| `body.measure-remove` | `UPDATE body_measurements SET is_deprecated=1`（`fetch/body.ts:145`） | 同上 | `已删除（软，不可恢复）` |
| `product.deprecate` | `UPDATE nutrition_products SET is_deprecated = 1`（`fetch/products.ts:101`） | `（… · 软删除：行保留，已从查询与统计中排除；暂无恢复入口）` | `已下架（软，不可恢复）` |
| `diet.remove`／`-by-date`／`-by-range`／`-by-type` | `DELETE FROM food_log`（`fetch/diet.ts:153-161`） | `（硬删除，不可恢复）` | `已删除（硬，不可恢复）` |
| `weight.remove`（id／date／range） | `DELETE FROM weight_log`（`fetch/weight.ts:148-178`） | `（硬删除，不可恢复）` | `已删除（硬，不可恢复）` |
| `photo.remove` | `DELETE FROM body_photos` ＋ `rmSync(file)`（`fetch/photos.ts:168-180`） | `（硬删除，不可恢复）` | `已删除（硬，不可恢复）` |

「不承诺恢复」的机器判据（`cmd-write-40-persist.test.mjs:42-45`）：把文案里所有 `不可恢复` 剔除后，
若仍出现 `可恢复` → 红。

### 1.3 裁定：本票只修文案诚实性，**不修查询**

A2 的根因在 `analysis/**`／`fetch/**` 读层（本票**无授权**，且非本票引入）→ 编排者另开票登记（§7 给出票面措辞与落点）。
本票的「文案↔实测同源」用例正是那张票的**红→绿门**：查询一旦补过滤，本票用例会红，强制同步改写文案。

---

## 2. 验收①：35 写键逐键「写后 SELECT 回读」＋ 覆盖门（H2 重做）

`packages/skill-calorie/test/cmd-write-40-persist.test.mjs`：每个写键都
① `spawnSync` 跑独立 CLI 进程（`SKILLS_DB_PATH` 指向 tmp 库）；
② 用 `openDbReadOnly`（`dist/db/readonly.js`，#93 只读句柄，**不建表不迁移、库文件缺失直接抛**）重开**磁盘上的库**；
③ 逐列比对写入值，并断言**回执 `recordId` 能定位到刚写的行**（回执 ≠ 落库即红）。

| # | 写键 | 落库断言（回读列/行） | 用例 |
| --- | --- | --- | --- |
| 1 | `calorie.diet.add` | `food_log` 按回执 id：food_name/calories/protein/carbs/fat/grams/date/time | 饮食 add/update/remove |
| 2 | `calorie.diet.update` | 同上 id 行：grams=150、note=夜宵加餐，calories 不变 | 同上 |
| 3 | `calorie.diet.remove` | id 行 **COUNT=0**（硬删） | 同上 |
| 4 | `calorie.diet.batch` | 该日只落 1 行（粥/150/3），非法条目不落 | 饮食 batch/copy/… |
| 5 | `calorie.diet.copy` | 目标日 2 行（粥 150／米饭 500，顺序按 time） | 同上 |
| 6 | `calorie.diet.update-by-date` | 该日每行 note=食堂 | 同上 |
| 7 | `calorie.diet.remove-by-type` | 早餐窗口行 COUNT=0，窗口外仍 1 行 | 同上 |
| 8 | `calorie.diet.remove-by-range` | 范围内 COUNT=0，范围外（09-07）仍 2 行 | 同上 |
| 9 | `calorie.diet.remove-by-date` | 该日 COUNT=0 | 同上 |
| 10 | `calorie.water.log` | id 行：food_name=`💧水`（WATER_NAME）、grams=300、calories=0 | 喝水 |
| 11 | `calorie.weight.log` | id 行：weight_kg=70.2、height_cm=175、bmi=22.9、date/time | 体重 log/update/batch/remove |
| 12 | `calorie.weight.update` | id 路 weight_kg=70（bmi 同步）；date 路 note=晨起 | 同上 |
| 13 | `calorie.weight.remove` | id／date／range 三路各自 **COUNT=0**（硬删） | 同上 |
| 14 | `calorie.weight.batch` | 09-04 行 weight_kg=70.8；非法日期 `xx` 不落 | 同上 |
| 15 | `calorie.exercise.add` | 单条 id 行 5 列（type/calories/minutes/date/note）＋ is_deleted=0；items 路 快走/100；copyFrom 路 户外跑/300/30 | 运动 add |
| 16 | `calorie.exercise.update` | id 路 minutes=40 且 calories 不变；date 路该日每行 category=力量 | 运动 update |
| 17 | `calorie.exercise.remove` | id/date/range 三路：行**仍在** ＋ is_deleted=1；date 路总行数不变（软删） | 运动 remove |
| 18 | `calorie.photo.add` | `body_photos` 2 行、tag/date/time ＋ photo_path 在 photosDir 下有文件 | 身材照 add/tag/remove |
| 19 | `calorie.photo.remove` | id 行 COUNT=0 ＋ 照片文件已删除（硬删） | 同上 |
| 20 | `calorie.photo.tag` | add 保留旧标签＋新标签；set 整体覆盖；remove 只去目标标签 | 同上 |
| 21 | `calorie.product.add` | 8 列（product_name/brand/calories/protein/fat/carbohydrates/sodium/note）＋ is_deprecated=0 | 食品 add/update/deprecate |
| 22 | `calorie.product.update` | calories=400、note=新版、protein 不变 | 同上 |
| 23 | `calorie.product.deprecate` | 行**仍在** ＋ is_deprecated=1（软删） | 同上 |
| 24 | `calorie.profile.set` | `user_profile#1` age/gender/height_cm/activity_level | 档案 set/activity/update |
| 25 | `calorie.profile.activity` | activity_level=active | 同上 |
| 26 | `calorie.profile.update` | field 路 note=测试；fields 路 age=31 且 height 不变 | 同上 |
| 27 | `calorie.goal.set` | `daily_goal#1` 5 列（calorie/protein/carbs/fat/water） | 目标 set/water/weight/pause/resume |
| 28 | `calorie.goal.water` | water_goal=2200 | 同上 |
| 29 | `calorie.goal.weight` | weight_goal=68、goal_deadline、start_weight、start_date | 同上 |
| 30 | `calorie.goal.pause` | goal_paused=1 | 同上 |
| 31 | `calorie.goal.resume` | goal_paused=0 | 同上 |
| 32 | `calorie.body.composition-add` | `body_composition` date/source/body_fat_pct/age/sex ＋ is_deprecated=0 | 体脂 |
| 33 | `calorie.body.composition-remove` | 行仍在 ＋ is_deprecated=1 | 同上 |
| 34 | `calorie.body.measure-add` | waist_cm=85、hip_cm=95、未传列 NULL | 围度 |
| 35 | `calorie.body.measure-remove` | 行仍在 ＋ is_deprecated=1 | 同上 |

**覆盖门（H2 重做，不再自报）**：`withRead(dir, key, fn)`（`:95-115`）必须声明所校验的写键，
内部用 `Proxy` 拦截 `prepare()` 统计**真实只读查询次数**；`reads = 0` 当场抛
（`<key>：withRead 内没有任何只读查询（落库断言被删空/空转，覆盖门不放行）`）。
覆盖门（`:743-753`）断言：① `WRITE_KEYS.length === 35`；② 35 键**每键** `readsByKey.get(k) >= 1`；
③ `readsByKey.size === 35`；④ 只读查询总次数 ≥ 35。
变异 **M5** 实测：整块删掉 `calorie.water.log` 的落库断言块（键仍在注册表内）→ 落库断言 exit 1（红），
旧回执测试仍 exit 0（绿）——首轮那种「删 SELECT 保留 `cover()` 仍绿」的路径已不存在。

---

## 3. 验收②：删除回执词条落点计数（H3：全口径 = 14）

**统一口径（本文件／changeset／commit 一律用这一条）**：

> 删除／下架回执词条落点 **14 处 ＝ `write.ts` 13 ＋ `render/photo.ts` 1**；
> 覆盖 10 个删除／下架键（软删 4 键／硬删 6 键），多路键逐路各 1 处。

可复跑计数（事实 E，`node docs/research/t101-softdelete-still-counted.mjs` 会断言 13／1／14）：

```powershell
# write.ts：词条常量的使用处（已排除 5 行常量定义）→ 13
(Select-String -Path packages/skill-calorie/src/cli/write.ts -Pattern 'SOFT_STILL_COUNTED|SOFT_EXCLUDED|HARD_WORDING|HARD_INNER' |
  Where-Object { $_.Line.Trim() -notmatch '^const (SOFT_STILL_COUNTED|SOFT_EXCLUDED|SOFT_EXCLUDED_INNER|HARD_WORDING|HARD_INNER)\b' }).Count
# render/photo.ts：词条字面量（render 不得依赖 cli 层，故字面量重复 1 次，由用例断言两处同源）→ 1
(Select-String -Path packages/skill-calorie/src/render/photo.ts -Pattern '（硬删除，不可恢复）').Count
```

| # | 落点 | 键／场景 | 词条 |
| --- | --- | --- | --- |
| 1 | `write.ts:298` | `diet.remove` | 硬删（`HARD_INNER`） |
| 2 | `write.ts:354` | `diet.remove-by-date` | 硬删（`HARD_WORDING`） |
| 3 | `write.ts:364` | `diet.remove-by-range` | 硬删 |
| 4 | `write.ts:373` | `diet.remove-by-type` | 硬删 |
| 5 | `write.ts:435` | `weight.remove`(id) | 硬删（`HARD_INNER`） |
| 6 | `write.ts:442` | `weight.remove`(date) | 硬删 |
| 7 | `write.ts:450` | `weight.remove`(range) | 硬删 |
| 8 | `write.ts:539` | `exercise.remove`(id) | 软删·仍计入（`SOFT_STILL_COUNTED`） |
| 9 | `write.ts:547` | `exercise.remove`(date) | 软删·仍计入 |
| 10 | `write.ts:556` | `exercise.remove`(range) | 软删·仍计入 |
| 11 | `write.ts:661` | `product.deprecate` | 软删·已排除（`SOFT_EXCLUDED_INNER`） |
| 12 | `write.ts:770` | `body.composition-remove` | 软删·已排除（`SOFT_EXCLUDED`） |
| 13 | `write.ts:797` | `body.measure-remove` | 软删·已排除 |
| 14 | `render/photo.ts:270` | `photo.remove` | 硬删（字面量，render 不依赖 cli） |

**与审查时点 12 处的差异（如实记账）**：A1 审查时实测 12 处 ＝ `write.ts` 11 ＋ `photo.ts` 1
（当时 `body.composition-remove`／`body.measure-remove` 的「（软删除，可恢复）」被视为**未改**）。
返修 H1 要求「不承诺可恢复」覆盖全部软删键 → 这 2 处也必须改，故最终实测为 **14 处**。
计数以**当前可复跑值**为准（14），三处旧口径（11／14／13）已全部作废。

---

## 4. 门禁实测（持 `gate.lock`，`D:\ilife` 工作区）

| 门禁 | 命令 | 结果 |
| --- | --- | --- |
| 构建 | `pnpm build` | exit 0 |
| 边界 | `pnpm boundaries` | exit 0（7 条 OK ＋ `boundaries: PASS`） |
| 快照 | `pnpm snapshot:check` | exit 0（`快照 == 实际拉取版（0.1.0@2fc0b42170d9604a）`） |
| 发布 | `pnpm publish:pre` | exit 0（`check-publish --pre：PASS`） |
| 本票落库断言 | `node --test packages/skill-calorie/test/cmd-write-40-persist.test.mjs` | exit 0（**17/17 pass**） |
| 全量 | `pnpm test` | exit 1（既有失败）＋ **失败集 delta = 0** |

失败集口径（H5 后）：基线取**入仓名单** `docs/research/t101-baseline-failures.txt`（27 条），
与 `.scratch/t75/baseline-gates.log` 解析结果**逐名一致**（脚本自动识别两种模式，已实测 `identical=true`）。

```
node docs/research/t101-fail-set.mjs docs/research/t101-baseline-failures.txt .scratch/t101/pnpm-test-after.log
```

结果：`base=27 after=27 新增=0 消失=0`（exit 0）。

逐项对照（`ℹ` 汇总行，返修轮实测 `.scratch/t101/pnpm-test-after.log`）：

| 汇总项 | 基线（`.scratch/t75/baseline-gates.log`） | 返修轮后 |
| --- | --- | --- |
| tests | 819 | **882**（＋63：本票首轮 15 ＋ 返修轮 2 ＋ 并发票新增） |
| suites | 112 | 115 |
| pass | 795 | 858 |
| **fail** | **24** | **24（不变）** |

失败集去重后 27 条（24 条测试级实例 → 21 个不同测试名，其中 `#50 面板路 readViaCli` 跨 4 个 suite 重复 ＋
6 个 `dsh-* 烟囱` suite 级），与入仓名单 `docs/research/t101-baseline-failures.txt` 逐名一致。

---

## 5. 变异自证（`docs/research/t101-mutation.mjs`，8 例 ＋ H4 安全网）

判据：源码变异后 `pnpm build` 必须 exit 0（变异真编译进去），落库断言必须变红；恢复后两者皆绿。
**H4 安全网**（每次运行都打印）：跑前 `sha256`（前 16 位）＋ 落盘备份 `.scratch/t101-mutation-backup/*.bak`
＋ 每个变异后 `restoreAll()` 与 `finally` 各做一次**还原自证**（sha256 与跑前不等即 exit 2），
`SIGINT`／`SIGTERM` 也会先还原再退出。

| 变异 | 做了什么 | build | 落库断言（新） | 旧回执断言（对照） |
| --- | --- | --- | --- | --- |
| M1 | 运动写入值 `caloriesBurned: cal` → `0` | 0 | **1（红）** | 0（绿） |
| M2 | 摘掉 `deleteRecord(db, id)` | 0 | **1（红）** | 1（红，撞 exit 4 存在性校验，非落库断言） |
| M3 | 软删词条 → `[MUTANT-TAG]` | 0 | **1（红）** | 0（绿） |
| M4 | 硬删后把行按原 id 插回 | 0 | **1（红）** | 0（绿） |
| **M5** | 整块删除 `calorie.water.log` 的落库断言（键仍在注册表） | 跳过（`.mjs` 无需重建） | **1（红）** | 0（绿） |
| **M6** | `items[].status` 退回裸「已删除」 | 0 | **1（红）** | 0（绿） |
| **M7** | 软删回执 `recordId: id` → `null` | 0 | **1（红）** | 0（绿） |
| **M8** | 运动软删文案改成「已从查询与统计中排除」（与实测相反） | 0 | **1（红）** | 0（绿） |
| 恢复 | 源码复原＋重建 | 0 | 0（绿） | 0（绿） |

红在哪（实测日志 `.scratch/t101/mutation-full.log`）：M1 → `落库 · 运动 add/update` ＋ 覆盖门；
M2 → `落库 · 运动 remove` ＋ 口径；M3 → 口径词条；M4 → `落库 · 体重 …` ＋ 覆盖门；
M5 → 覆盖门（`calorie.water.log：withRead 内没有任何只读查询`）；M6 → `口径 · 删除键数据驱动`（status 不同源）；
M7 → `口径 · 删除键数据驱动`（recordId 未指向被删行）；M8 → `口径 · 软删运动「仍计入历史统计」与实测同源`。
**M1／M3／M4／M5／M6／M7／M8 上旧测试（`cmd-write-40.test.mjs`）全绿**，即票面「只断言回执、没有逐键库内断言」的直接证据。

---

## 6. 偏离记账

1. **票面／编排者锚点 `write.ts:407／414／422`（体重删）实为硬删**：`fetch/weight.ts:148-178` 是 `DELETE FROM weight_log`，
   无 `is_deleted` 列。照抄「软删除，可恢复」＝谎报，故按**语义**统一为「硬删除，不可恢复」，
   并在本文件 §1.2 给出逐表实测依据。**这是首轮唯一的口径扩张**（票面只要求软删统一，硬删词条为对齐而加）。
2. **饮食 4 处硬删文案同步加词条**（`diet.remove*`）：票面未点名，但若只改体重/运动，会出现
   「同样是硬删，有的标不可恢复、有的不标」的二次不一致——故一并统一。
3. **`#97 写库回执契约（id＋时间戳＋影响行数）尚未落地**（`gh issue view 97` → `state: OPEN`）：
   本票落库断言按票面口径写（写后回读＋回执 id 定位行），**不新增** id/时间戳/影响行数字段。
4. **H6 声明路径更正**：`.scratch/t75/collision-matrix.md` 把本票新增测试写成
   `cmd-write-40.test.mjs`（那是 #40 首轮既有文件）；**实际新增文件是**
   `packages/skill-calorie/test/cmd-write-40-persist.test.mjs`（本票独占路径，652 行→返修后 734 行）。
   `.scratch/` 是 gitignore 施工草稿，本票未改（越权），在此更正。
5. **H3 计数 12 → 14 的如实说明**：见 §3 末段（返修 H1 把 2 处既有「可恢复」词条也改成如实口径）。
   三处旧口径（11／14／13）作废，**唯一口径 = 14 处（13 ＋ 1）**。
6. **口径收紧（用户可见面）**：软删文案由「（软删除，可恢复）」改为「（软删除：行保留，…；暂无恢复入口）」，
   并新增「仍计入历史统计」／「已从查询与统计中排除」的区分。这是**如实化**，不是功能变更；
   恢复入口若将来落地，须同步改文案（§7 已写进另开票的完成判据）。
7. **一次 amend（历史保留）**：首轮首次提交（`54e9a82`）的中文信息被 PS 5.1 按 ANSI 读脚本文件写坏（mojibake），
   已持锁 `git commit --amend -F <UTF-8 文件>` 修正为 `710231d`；此后所有提交一律 `-F` 传消息。

---

## 7. 未修／需另开票（H1 的 11 处 analysis 查询过滤）

**本票不修**（编排者裁定：根因在读层、非本票引入；`src/analysis/**`／`src/fetch/**` 本票无授权）。
建议新票票面（可直接粘贴）：

> **标题**：读层补 `exercise_log.is_deleted` 过滤（11 处 analysis 查询）＋ 恢复入口 ADR 决策
>
> **背景**：#101 实测——软删一条运动后回执如实写「仍计入历史统计」，因为 `analysis/**` 11 处查询未过滤
> `is_deleted`，而 `fetch/exercise.ts` 自己的读函数已过滤 → 同一时刻 `view.exercise` exit 4「无运动记录」，
> 统计口径与列表口径**自相矛盾**。同时全仓 77 键 0 个 restore/undo/recover 入口。
>
> **验收**：
> 1. 11 处查询补 `AND COALESCE(is_deleted, 0) = 0`：`analysis/series.ts:96`、`exercise.ts:45,86,109,227`、
>    `review.ts:69`、`diet.ts:162`、`cross.ts:107,108`、`anomaly/common.ts:84`、`weightCompare3.ts:68`；
> 2. **红→绿门**：`packages/skill-calorie/test/cmd-write-40-persist.test.mjs` 的
>    `口径 · 软删运动「仍计入历史统计」与实测同源` 用例必须**反转**（删后统计必须变化），
>    并同步把 `write.ts` 的 `SOFT_STILL_COUNTED` 换成「已从查询与统计中排除」；
> 3. 恢复入口：要么落地 restore/undo 键（文案可写「可恢复」），要么在 ADR 里确认「不提供恢复」并保持现文案；
> 4. 回归：`node docs/research/t101-softdelete-still-counted.mjs` 事实 A 变红即证明读层已修。
>
> **落点**：`packages/skill-calorie/src/analysis/**`、`src/fetch/**`（#101 无授权）。

其他未做项（首轮沿用，未变）：
- 未对**读链**做回读断言（属 #87）；本票只覆盖写键。
- 未验证 `--html` 产物里删除文案的呈现（HTML 只回显 summary／status 文本，随词条同步；无独立断言）。
- 未覆盖 `calorie.*` 之外的技能（memo/bill/home/schedule/chef 的写键不在票面）。
- 未做并发下的多进程写库竞态断言（超出票面）。
- `dsh-calorie 烟囱` 在基线即失败（suite 级），本票未修、也未新增失败。

---

## 8. 复跑

`.scratch/` 是 gitignore 的施工草稿（不入库），故复跑只用**入仓脚本 ＋ 裸命令**：

```powershell
# ① 门禁四门（须持 gate.lock：pnpm build / node --test 共享 dist 与 .tsbuildinfo）
pnpm build; pnpm boundaries; pnpm snapshot:check; pnpm publish:pre   # 逐条须 exit 0

# ② 本票落库断言（35 键 / 17 用例）
node --test packages/skill-calorie/test/cmd-write-40-persist.test.mjs

# ③ 全量测试（exit 1 属既有基线）＋ 失败集 delta 必须为空
#    基线用【入仓名单】，不再依赖 .scratch（H5）
pnpm test *> .scratch/t101/pnpm-test-after.log
node docs/research/t101-fail-set.mjs docs/research/t101-baseline-failures.txt .scratch/t101/pnpm-test-after.log

# ④ 文案诚实性事实复核（H1；读 dist 里的 CLI，故须在 dist 未被变异/未被并发重建时跑 → 建议同样持 gate.lock）
node docs/research/t101-softdelete-still-counted.mjs

# ⑤ 变异自证（8 例；脚本自持 gate.lock，跑前 sha256＋落盘备份，跑完自动还原并自证 sha）
node docs/research/t101-mutation.mjs
```

持锁片段（协议 §2，pwsh）：见 `.scratch/t75/concurrency-protocol.md`；本票实测的持锁命令落在
`.scratch/t101/*.log`（不入库，仅施工记录）。

---

## 9. 收尾复跑与环境事故（首轮历史，保留）

首轮三个提交（`710231d`／`873d175`／`30606f1`）之后做过一次收尾复跑，结果分两段：

| 复跑项 | 结果 |
| --- | --- |
| `node --test .../cmd-write-40-persist.test.mjs` | exit 0 |
| `pnpm boundaries` / `pnpm snapshot:check` / `pnpm publish:pre` | exit 0 / 0 / 0 |
| `pnpm build` | **exit 1（环境事故，非本票代码）**：`node_modules/.bin` 条目数 = 0 → `'tsc' is not recognized` |
| `pnpm test` 失败集 delta | **＋1**：`✖ #87 ① 字段清洗逐字复刻…`（属 #87 在飞改动） |

事故根因（协议 §2.1 已收录）：某票在仓库内临时目录跑 `npm install <tgz>` → 向上解析到 workspace 根，
把 `.bin` 重写。编排者持锁 `pnpm install` 修复后，本票返修轮四门已全部 exit 0（§4）。

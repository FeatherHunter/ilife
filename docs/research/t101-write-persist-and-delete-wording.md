# #101 写链落库断言 ＋ 删除回执可恢复性口径统一 · 证据

票面（GitHub #101，wayfinder 地图 #63 子票）：单测只断言回执、**没有逐键库内断言**；`exercise.remove`／
`body.*-remove` 是软删但文案只说「已删除」。验收两条：① 35 个写键每键至少 1 条 SELECT 校验（写后读回）；
② 软删文案统一。

本票产出（全部落在独占路径内）：
- `packages/skill-calorie/test/cmd-write-40-persist.test.mjs`（新增，652 行，15 用例）
- `packages/skill-calorie/src/cli/write.ts`（删除回执词条 11 处）
- `packages/skill-calorie/src/render/photo.ts`（删照片回执词条 1 处）
- 本文件 ＋ `docs/research/t101-fail-set.mjs`（门禁失败集抽取/比对，可复跑）
  ＋ `docs/research/t101-mutation.mjs`（变异自证，可复跑）
- `.changeset/t101-delete-wording-persist.md`

---

## 1. 口径裁定：删除回执必须自曝可恢复性（依据 fetch 层实测）

票面只说「软删文案统一」。实测后把口径定为**两类词条**（而不是把所有「已删除」一律改成「软删除，可恢复」）——
因为 `weight.remove` 在票面锚点里，但它是**硬删**，照抄会变成谎报：

| 表 | 删除实现（实测 file:line） | 语义 | 回执词条 |
| --- | --- | --- | --- |
| `exercise_log` | `fetch/exercise.ts:216-238` `UPDATE ... SET is_deleted = 1` | 软删（行保留） | 软删除，可恢复 |
| `body_composition` | `fetch/body.ts:207-211` `SET is_deprecated=1` | 软删 | 软删除，可恢复 |
| `body_measurements` | `fetch/body.ts:144-148` `SET is_deprecated=1` | 软删 | 软删除，可恢复 |
| `nutrition_products` | `fetch/products.ts:101` `SET is_deprecated=1` | 软删 | 软删除，可恢复 |
| `food_log` | `fetch/diet.ts:153-161` ＋ `:258-266` `DELETE FROM` | **硬删** | 硬删除，不可恢复 |
| `weight_log` | `fetch/weight.ts:148-178` `DELETE FROM` | **硬删** | 硬删除，不可恢复 |
| `body_photos` | `fetch/photos.ts:168-180` `DELETE FROM` ＋ `rmSync(file)` | **硬删** | 硬删除，不可恢复 |

旁证：`docs/research/t67-key-audit.md:246`（既有审计同样认定 `exercise.remove`／`body.*-remove` 是软删、
只有 `body.composition-remove` 自曝）。

---

## 2. 验收①：35 写键逐键「写后 SELECT 回读」

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

**覆盖门**：文件末尾 `覆盖门 · 35 写键逐键落库断言（缺键即红）` 断言 `WRITE_KEYS` 全部进 `covered` 集合
（35/35，缺键直接列出键名并红）。`WRITE_KEYS.length === 35` 与注册表同源（`CALORIE_WRITE_COMBOS`）。

---

## 3. 验收②：删除回执词条逐处清单（14 处）

| # | 落点 | 键／场景 | 改动 |
| --- | --- | --- | --- |
| 1 | `write.ts:278` | `diet.remove` | 「已删除饮食 #id（… 卡）」→ 追加「· 硬删除，不可恢复」 |
| 2 | `write.ts:334` | `diet.remove-by-date` | 追加「（硬删除，不可恢复）」 |
| 3 | `write.ts:344` | `diet.remove-by-range` | 追加「（硬删除，不可恢复）」 |
| 4 | `write.ts:353` | `diet.remove-by-type` | 追加「（硬删除，不可恢复）」 |
| 5 | `write.ts:415` | `weight.remove`(id) | 追加「· 硬删除，不可恢复」 |
| 6 | `write.ts:422` | `weight.remove`(date) | 追加「（硬删除，不可恢复）」 |
| 7 | `write.ts:430` | `weight.remove`(range) | 追加「（硬删除，不可恢复）」 |
| 8 | `write.ts:519` | `exercise.remove`(id) | 「已删除运动 #id」→ 追加「（软删除，可恢复）」 |
| 9 | `write.ts:527` | `exercise.remove`(date) | 追加「（软删除，可恢复）」 |
| 10 | `write.ts:536` | `exercise.remove`(range) | 追加「（软删除，可恢复）」 |
| 11 | `write.ts:641` | `product.deprecate` | 「，行保留可恢复」→「· 软删除，可恢复」（词条对齐） |
| 12 | `write.ts:750` | `body.composition-remove` | 原本已「（软删除，可恢复）」——**未改** |
| 13 | `write.ts:777` | `body.measure-remove` | 原本已「（软删除，可恢复）」——**未改** |
| 14 | `render/photo.ts:269` | `photo.remove` | 「已删除身材照 #id(…)」→ 追加「（硬删除，不可恢复）」；`render-t10.test.mjs:71-72` 的 `已删除身材照 #id` 前缀契约不变 |

口径声明写进 `write.ts:12-18` 文件头（含依据 file:line）与 `render/photo.ts:261-265` 函数注释。

**文案 ≠ 谎报**：新增 `口径 · 删除回执可恢复性：文案与库内语义一致` 用例，对 10 个删除/下架键逐个
「先跑 CLI → 断言词条 → 再回读库」：软删键断言**行仍在 ＋ 标志位=1**，硬删键断言**行消失**；
末尾还断言 10 个删除键全部被归入软/硬两类（漏网即红）。

---

## 4. 门禁实测（持 `gate.lock`，`D:\ilife` 工作区）

| 门禁 | 命令 | 结果 |
| --- | --- | --- |
| 构建 | `pnpm build` | exit 0 |
| 边界 | `pnpm boundaries` | exit 0（7 条 OK ＋ `boundaries: PASS`） |
| 快照 | `pnpm snapshot:check` | exit 0（`快照 == 实际拉取版（0.1.0@2fc0b42170d9604a）`） |
| 发布 | `pnpm publish:pre` | exit 0（`check-publish --pre：PASS`） |
| 测试 | `pnpm test` | exit 1（既有失败）＋ **失败集 delta = 0** |

失败集口径：`docs/research/t101-fail-set.mjs` 抽取 `✖` 行（去缩进/去耗时），
基线取 `.scratch/t75/baseline-gates.log`（UTF-16LE，脚本按 BOM 判编码）→ **基线 27 条**
（21 条测试级 ＋ 6 条 `dsh-* 烟囱` suite 级，与 `.scratch/t75/baseline-summary.md` 一致）。

```
node docs/research/t101-fail-set.mjs .scratch/t75/baseline-gates.log .scratch/t101/pnpm-test-after.log
```

结果：`base=27 after=27 新增=0 消失=0`（`DELTA_EXIT=0`）。

逐项对照（`ℹ` 汇总行）：

| 汇总项 | 基线（`.scratch/t75/baseline-gates.log`） | 本票后（`.scratch/t101/pnpm-test-after.log`） |
| --- | --- | --- |
| tests | 819 | 871（＋52：本票 15 ＋ 并发票新增） |
| suites | 112 | 115 |
| pass | 795 | 847 |
| **fail** | **24** | **24（不变）** |

失败集去重后 27 条（24 条测试级实例 → 21 个不同测试名，其中 `#50 面板路 readViaCli` 跨 4 个 suite 重复 ＋
6 个 `dsh-* 烟囱` suite 级），与 `.scratch/t75/baseline-failing.txt`（21 条）＋ `baseline-summary.md`（6 条烟囱）一致。

---

## 5. 变异自证（`docs/research/t101-mutation.mjs`，4 例）

判据：变异后 `pnpm build` 必须 exit 0（变异真编译进去），落库断言必须变红；恢复后两者皆绿。

| 变异 | 做了什么 | build | 落库断言（新） | 旧回执断言（对照） |
| --- | --- | --- | --- | --- |
| M1 `caloriesBurned: cal` → `0` | 运动写入值不落库（回执照旧） | 0 | **1（红）** | 0（绿） |
| M2 摘掉 `deleteRecord(db, id)` | 软删调用整条消失 | 0 | **1（红）** | 1（红，但撞的是 exit 4 存在性校验，非落库断言） |
| M3 软删词条 → `[MUTANT-TAG]` | 文案与库内语义脱钩 | 0 | **1（红）** | 0（绿） |
| M4 硬删后再把行按原 id 插回 | 回执照旧、库里没删掉 | 0 | **1（红）** | 0（绿） |
| 恢复 | 源码复原＋重建 | 0 | 0（绿） | 0（绿） |

红在哪：M1 → `落库 · 运动 add` ＋ `落库 · 运动 update` ＋ 覆盖门；M2 → `落库 · 运动 remove` ＋ 口径；
M3 → 仅 `口径 · 删除回执可恢复性`；M4 → `落库 · 体重 log/update/batch/remove` ＋ 覆盖门。
**M1／M3／M4 上旧测试（`cmd-write-40.test.mjs`）全绿**，即票面「只断言回执、没有逐键库内断言」的直接证据。

---

## 6. 偏离记账

1. **票面／编排者锚点 `write.ts:407／414／422`（体重删）实为硬删**：`fetch/weight.ts:148-178` 是 `DELETE FROM weight_log`，
   无 `is_deleted` 列。照抄「软删除，可恢复」＝谎报，故按**语义**统一为「硬删除，不可恢复」，
   并在本文件 §1 给出逐表实测依据。**这是本票唯一的口径扩张**（票面只要求软删统一，硬删词条为对齐而加）。
2. **饮食 4 处硬删文案同步加词条**（`diet.remove*`）：票面未点名，但若只改体重/运动，会出现
   「同样是硬删，有的标不可恢复、有的不标」的二次不一致——故一并统一。
3. **`#97 写库回执契约（id＋时间戳＋影响行数）尚未落地**（`gh issue view 97` → `state: OPEN`）：
   本票落库断言按票面口径写（写后回读＋回执 id 定位行），**不新增** id/时间戳/影响行数字段。
   #97 落地后若回执字段变化，本票用例只需在 `runWrite` 处扩展断言，落库回读部分不受影响。
4. **未牵读链**：读链 `src/cli/cmd_read.ts`（#87 独占）零改动；本票所有文案只在写回执 prose，
   读链无「已删除」类文案需要同步（`grep` 实测读链无该词条）→ 无需补丁文本。
5. **`packages/skill-calorie/SKILL.md` 未改**（#98 独占）：实测 SKILL.md 无「已删除／软删除」词条（`grep` 0 命中），
   故不存在需要跨票同步的门面文案。
6. **一次 amend**：首次提交（`54e9a82`）的中文信息被 PS 5.1 按 ANSI 读脚本文件写坏（mojibake），
   已持锁 `git commit --amend -F <UTF-8 文件>` 修正为 `710231d`；后续提交一律 `-F` 传消息。

---

## 7. 未做／未确证

- 未对**读链**做任何回读断言（属 #87）；本票只覆盖写键。
- 未验证 `--html` 产物里删除文案的呈现（HTML 只回显 summary 文本，随词条同步；无独立断言）。
- 未覆盖 `calorie.*` 之外的技能（memo/bill/home/schedule/chef 的写键不在票面）。
- 未做并发下的多进程写库竞态断言（超出票面）。
- `dsh-calorie 烟囱` 在基线即失败（suite 级），本票未修、也未新增失败。

## 8. 复跑

```powershell
# 门禁（持锁）
powershell -NoProfile -ExecutionPolicy Bypass -File .scratch/t101/step4-gates.ps1
# 失败集 delta
node docs/research/t101-fail-set.mjs .scratch/t75/baseline-gates.log .scratch/t101/pnpm-test-after.log
# 落库断言（35 键）
node --test packages/skill-calorie/test/cmd-write-40-persist.test.mjs
# 变异自证（4 例，自带锁）
node docs/research/t101-mutation.mjs
```

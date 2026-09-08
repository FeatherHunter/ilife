# #67 卡路里 77 键逐键现状审计（"简陋处"清单）

- 票：#67（Question）· 图：#63 卡路里·本体图（1/3）
- 仓库/版本：`D:\ilife`，branch master，HEAD `6b0c1e7`，工作树含 #56 未提交改动（本审计零改动）
- 被审计对象：`packages/skill-calorie`（src 与已构建 dist；dist 构建时间 2026-09-07 10:54，晚于 src 10:53，未重建）
- 审计日期：2026-09-08
- 审计性质：只读源码 + 只读运行（仅对 **tmp 合成 sim 库副本** 执行 CLI）；**真实用户库零触碰**

---

## 0. 结论速览

| 项 | 结论 |
|---|---|
| 权威键表 | **77 = 42 读 + 35 写**，四处一致（`src/cli/keys.ts` / `SKILL.md` 速查表 / `cmd_read.ts`+`write.ts` dispatch / `base-combos PRESENT_KEYS`）；**没有任何键只在一处存在** |
| 本次运行证据 | 77 键在**合成 sim 非空库**上全部 exit 0（唯一一次 exit 4 是 photo.add 探针被前序 photo.remove 删掉源文件污染，独立复验 exit 0，见 §4 G13） |
| 真机非空证据 | **0 条**。真库窗口空（#48 实证 exit 4 无今日数据），且本票禁开真库（`openDb` 会建表+迁移=写库，见 §1）→ 记为阻塞 |
| 判定计数 | **可用 44 / 可用（弱）22 / 只在空态验过 0 / 仅代码存在 0 / 缺口 11** |
| envelope 全字段 | 42 读键中 **24 键**有 `version/skill/key/shape` 全字段断言（`cmd-read-t11`）；**18 键**（#41 新增）只断言 `key/shape/metrics`，**version/skill 无断言**（`cli-smoke-t41`）；35 写键全字段断言齐（`cmd-write-40`） |
| 边界与异常断言 | 读键 42 个里**仅 3 个**有单测级边界断言（goal-config 空库 / help.lookup 缺参 / view.diet 空尾日）；写键 35 个里 **29 个**有（缺参/负值/不存在/非法枚举） |
| 文档示例可执行性 | `SKILL.md` 77 行示例中 **5 行不可执行**：`weight-compare`/`plan-wizard`/`anomaly` exit 2、`goal-predict`/`predict` exit 4（根因 `scripts/build-help.mjs exampleFor()` 缺 #41 的 18 个 case，落到 `default: 'calorie-cmd-read ' + key`） |
| 空态不阻断 | **3 键**空库仍 exit 0 并造数：`view.deficit`（avgIntake=0/avgBurn=2507）、`view.goal-recommend`（weightKg=70 凭空）、`photo.gif`（"共 0 张"） |
| 面板可达 | 今天只有 **`calorie.view.home`** 一个键被面板调用（`plugin-calorie` 的 `DEFAULT_READ_KEY`）；`base-combos PRESENT_KEYS` 虽登记 77 键，但面板不按它取数 |

---

## 1. 方法与证据边界（含安全声明）

### 1.1 做了什么

1. **键表核对**：从 `dist/cli/keys.js` 的 `CALORIE_COMBOS`（77）导出权威清单，逐处比对 `SKILL.md` 表格、`cmd_read.ts` dispatch（42 case）、`write.ts` dispatch（35 case）、`base-combos/src/present.ts` 的 `PRESENT_KEYS`、`SKILL.md` 相关场景行（"77 组合"）。
2. **逐键运行矩阵**：`node .scratch/t67/run-matrix.mjs` —— 每键 4 类探针：
   - `doc`：`SKILL.md` 表格「例」列**原样**参数（含 `--html`）
   - `rich`：我为 sim 库构造的富参数（含 `--html`）
   - `empty`：同一富参数打**空库**（仅读键）
   - `misswin`：远窗 `2020-01-01~2020-01-02`（仅读键，用于跨窗口缺失）
   - `bad:*`：定向非法参数（缺参/负值/非法枚举/超范围）
   - 另加：`anomaly` 全 **23** kind、`contraindication` 全 **4** part、`body-measure` 全 **9** metric 展开
3. **写链落库验证**：`node .scratch/t67/write-landing.mjs` —— 35 写键每个用独立 sim 库副本，跑前/跑后对 11 张表做**行数 + 行内容指纹**快照，证明"回执"之外是否真的落库。
4. **文档/HELP 侧核对**：`crosscheck.mjs` / `reach.mjs` / `repr-check.mjs` —— 校验 `SKILL.md` 唤醒词列是否真能路由、436 唤醒词里哪些键真正有可执行入口。
5. **源码逐读**：`cmd_read.ts`、`write.ts`、`keys.ts`、`render/envelope.ts`、`analysis/series.ts`、`render/analysisPlate.ts`、`fetch/batch.ts`、`scripts/build-help.mjs`、`triggers/help-lookup.ts` 等。

### 1.2 安全声明（为什么没有真机证据）

- `SKILLS_DB_PATH` 在真机上指向 `D:\2Study\StudyNotes\.db`（`CALORIE_PHOTOS_DIR=D:\2Study\StudyNotes\.db\CalorieHub`）。**本审计从未把它作为 `SKILLS_DB_PATH` 传给 CLI，一次都没有。**
- 技术上也不允许：`src/schema.ts openDb()` → `initDb()` → `TABLE_DDLS` + `applyMigrations()`，迁移里含 `ALTER TABLE`、`DROP TABLE`、`UPDATE food_log SET sodium_mg=...` 等**写操作**。因此对真库连"只读键"都会写库，**不存在"只读打开真库"的安全姿势**。
- 数据来源：`.scratch/t67/seed-sim.mjs` 生成的**合成**库（14 天饮食/饮水、9 条运动、16 天体重、4 条体成分、8 条围度、6 条食品（含同名不同品牌）、4 条训练计划、3 张照片实体文件），路径在 `%TEMP%\t67-sim-*`，全部 tmp 隔离。
- 结论口径：本次"非空数据证据"一律标注为 **sim（合成库）**，**不等于真机非空数据证据**。

### 1.3 复现

```powershell
cd D:\ilife\.scratch\t67
node seed-sim.mjs $env:TEMP\t67-manual            # 合成 sim 库
node run-matrix.mjs D:\ilife\.scratch\t67\matrix.json
node write-landing.mjs $env:TEMP\t67-sim-XXXXXX D:\ilife\.scratch\t67\write-landing.json
node summarize.mjs matrix.json                    # 逐键摘要
```

产物：`matrix.json`（逐键逐探针原始 envelope/stderr）、`digest.txt`、`rich-digest.txt`、`write-landing.json`、`exact-map.txt`。

---

## 2. 权威键表核对

| 来源 | 键数 | 与 `CALORIE_COMBOS` 差异 |
|---|---|---|
| `src/cli/keys.ts` `CALORIE_COMBOS` | 77（42 读 + 35 写） | 基准 |
| `SKILL.md` 联动速查表（构建期注入） | 77 行 | 无差集（双向） |
| `SKILL.md`「相关场景」行 | 77 组合 | 一致 |
| `cmd_read.ts` dispatch `case` | 42 | 读键全覆盖，无多余 |
| `write.ts` dispatch `case` | 35 | 写键全覆盖，无多余 |
| `base-combos/src/present.ts` `PRESENT_KEYS` | 87（77 calorie + 10 memo） | calorie 77 全覆盖，无多余 |
| shape 分布 | stat 34 / list 6 / detail 1 / analysis 1（读）· receipt 35（写） | `fallback` 形状**有校验分支但零键使用**（死路径） |
| 版本 | `ENVELOPE_VERSION='0.1.0'` | **无任何测试把 skill-calorie 的版本与 `base-link-core` 的 `ENVELOPE_VERSION` 绑死**（漂移单测只在 `base-render` 里存在）；skill 侧只被硬编码 `'0.1.0'` 钉住 |

**结论**：键表本身没有"只在一边存在"的键，键表是干净的；问题全在**每键的可用性、口径与证据**上。

---

## 3. 逐键审计表（77 行）

列说明：
- **测试**：`t11`=`test/cmd-read-t11.test.mjs`，`t41s`=`test/cli-smoke-t41.test.mjs`，`t41r`=`test/render-t41.test.mjs`，`w40`=`test/cmd-write-40.test.mjs`，`c43`=`test/calorie-c43.test.mjs`
- **envelope 全字段**：是否断言 `key/skill/shape/data` 四件套
- **边界断言**：空库 / 无今日 / 跨窗口 / 非法参数 / 极端值 —— 写"单测"或"仅 sim"区分证据等级
- **非空证据**：`单测种子` = 测试用非空种子库；`sim` = 本次合成库运行；`真机` = 无（全列为 0）
- **判定**：可用 / 可用（弱）/ 缺口 / 只在空态验过 / 仅代码存在

### 3.1 读键（42）

| key | 读/写 | 实现文件 | 测试覆盖（断言） | envelope 全字段 | 边界与异常断言 | 非空数据证据 | 判定 |
|---|---|---|---|---|---|---|---|
| calorie.today | 读 | `fetch/diet.ts` + `render/diet.ts` | t11 T8：exit0、shape=list、total≥4 | ✅ t11 runOk | 仅 sim（空库 exit4、无非法参数探针） | 单测种子 + sim(items=4) | 可用（弱）：无单测边界 |
| calorie.view.home | 读 | `render/home.ts` | t11 T8：metrics 全 number、intakeCal、HTML 快照 | ✅ t11 | 仅 sim（空库 exit4、windowDays=0 exit2、date 非法 exit2） | 单测种子 + sim(16 metrics) | 可用（弱）：`windowDays` 参数零测试 |
| calorie.view.diet | 读 | `render/diet.ts` | t11 T8（totalCalories>0）+ c43（空尾日 distTotal=0、HTML 餐别分布） | ✅ t11 | **单测**：空尾日回零（c43）；仅 sim：空库/远窗 exit4、start>end exit2 | 单测种子 + sim(10) | 可用 |
| calorie.view.exercise | 读 | `render/exercise.ts` | t11 T8：totalBurned=620 | ✅ t11 | 仅 sim（空库/远窗 exit4） | 单测种子 + sim(7) | 可用（弱） |
| calorie.view.goal | 读 | `render/goal.ts` | t11 T9：calorie_goal=1800 | ✅ t11 | 仅 sim（空库 exit4） | 单测种子 + sim(13) | 可用（弱） |
| calorie.view.goal-config | 读 | `render/goalPlate.ts` | t11 T9：calorie_goal=1800；**空库 exit4** | ✅ t11 | **单测**：空库 exit4 | 单测种子 + sim(8) | 可用 |
| calorie.view.goal-recommend | 读 | `render/goalPlate.ts` | t11 T9：calorieGoal>0 | ✅ t11 | 仅 sim：profile 非法 exit2；**空库 exit0 不阻断（造 weightKg=70）** | 单测种子 + sim(11；空库同样 11) | **缺口**：空库造数 |
| calorie.view.goal-weight | 读 | `render/goalPlate.ts` | t11 T9：latestKg=70 | ✅ t11 | 仅 sim（空库 exit4） | 单测种子 + sim(4) | 可用（弱） |
| calorie.view.goal-progress | 读 | `render/goalPlate.ts` | t11 T9：completionPct 为 number 或 undefined | ✅ t11 | 仅 sim（historyDays=0 exit2） | 单测种子 + sim(8) | 可用（弱） |
| calorie.view.goal-status | 读 | `render/goalPlate.ts` | t11 T9：paused=0 | ✅ t11 | 仅 sim（空库 exit4） | 单测种子 + sim(3) | 可用（弱） |
| calorie.view.combined | 读 | `render/analysisPlate.ts` + `analysis/cross.ts` | t11 T9：aCount 为 number | ✅ t11 | 仅 sim：pair 非法 exit2；**window 无白名单（`99d`→99 天生效；未知值静默 30d）** | 单测种子 + sim(10) | **缺口**：window 参数未校验 |
| calorie.view.deficit | 读 | `render/analysisPlate.ts` + `analysis/deficit.ts` | t11 T9：avgDeficit 为 number | ✅ t11 | 仅 sim：**空库 exit0 返 avgIntake=0/avgBurn=2507** | 单测种子 + sim(11) | **缺口**：空库不阻断 |
| calorie.view.diet-review | 读 | `render/analysisPlate.ts` + `analysis/diet.ts` | t11 T9：loggedDays≥2 | ✅ t11 | 仅 sim（空库/远窗 exit4） | 单测种子 + sim(5) | 可用（弱） |
| calorie.view.health | 读 | `render/health.ts` | t11 T9：loggedDays≥2 | ✅ t11 | 仅 sim（空库/远窗 exit4） | 单测种子 + sim(3) | 可用（弱） |
| calorie.view.ranking | 读 | `render/ranking.ts` | t11 T9：okCount=5 | ✅ t11 | 仅 sim（topN=0 exit2）；`category` 分支零测试 | 单测种子 + sim(2) | 可用（弱） |
| calorie.view.library | 读 | `render/library.ts` | t11 T9：total=2 | ✅ t11 | 仅 sim（limit=0 exit2）；`category` 零测试 | 单测种子 + sim(2) | 可用（弱） |
| calorie.view.search | 读 | `render/library.ts` | t11 T9：total=1 | ✅ t11 | 仅 sim（缺 keyword exit2、limit=0 exit2） | 单测种子 + sim(2) | 可用（弱） |
| calorie.photo.list | 读 | `render/photo.ts` + `fetch/photos.ts` | t11 T10：total=2、HTML 无 base64 | ✅ t11 | 仅 sim（空库 exit4）；`dateFrom/dateTo/days/limit/today` 过滤零测试 | 单测种子 + sim(items=3) | 可用（弱） |
| calorie.photo.detail | 读 | `render/photo.ts` | t11 T10：photoPath 以 .jpg 结尾 | ✅ t11 | 仅 sim（缺 id/id 非整 exit2、不存在 exit4） | 单测种子 + sim(item) | 可用（弱） |
| calorie.photo.compare | 读 | `render/photo.ts` | t11 T10：total=2 | ✅ t11 | 仅 sim（缺 id2 exit2、不存在 exit4） | 单测种子 + sim(items=2) | 可用（弱） |
| calorie.photo.gif | 读 | `render/photo.ts`（planGif） | t11 T10：summary 含 GIF | ✅ t11 | 仅 sim：**空库 exit0「共 0 张」不阻断**；缺 tag exit2 | 单测种子 + sim(summary 3 张) | **缺口**：空库不阻断 |
| calorie.help.center | 读 | `render/help.ts` + `render/photo.ts` | t11 T10：total≥3、`buildPhotoHelp().length=10`、`lookupPhotoHelp('')` 抛 | ✅ t11 | 库级：空串抛；仅 sim：q 无命中 exit4；**无 q 全量路径 CLI 未断言** | 单测种子 + sim(items=3) | 可用（弱） |
| calorie.help.lookup | 读 | `triggers/index.ts` searchHelp | t11 T2：total≥1、首条 wake_word 命中、**缺 q exit2**；c43：3 组查询 + 首条 cli 可执行 | ✅ t11 | **单测**：缺 q/空串 exit2；仅 sim：无命中 exit4 | 单测种子 + sim(items=1) | 可用 |
| calorie.history | 读 | `fetch/history.ts` | t11 T6：total≥2 | ✅ t11 | 仅 sim（空库 exit4、days=0/999 exit2） | 单测种子 + sim(items=7) | 可用（弱） |
| calorie.view.weight | 读 | `render/weightPlate.ts` | t41s（exit0+metrics 全 number）+ t41r（recordCount≥7、weightGoal=68、HTML 含 ilife-page） | ⚠️ 仅 key/shape/metrics，**无 version/skill** | t41r：空库 missing-data | 单测种子 + sim(10) | 可用 |
| calorie.view.weight-history | 读 | `render/weightPlate.ts` | t41s + t41r（rows≥7） | ⚠️ 同上 | t41r：空库；仅 sim：days=0 exit2；`startDate/endDate` 路径零测试 | 单测种子 + sim(6) | 可用 |
| calorie.view.weight-compare | 读 | `render/weightPlate.ts` | t41s + t41r（avgDiff 为 number） | ⚠️ 同上 | t41r：空库；仅 sim：缺 compareStart exit2、start>end exit2 | 单测种子 + sim(5) | **缺口**：`SKILL.md` 示例 exit 2 |
| calorie.view.weight-review | 读 | `render/weightPlate.ts` | t41s + t41r（weightGoal=68） | ⚠️ 同上 | t41r：空库 | 单测种子 + sim(6) | 可用 |
| calorie.view.volatility | 读 | `render/weightPlate.ts` + `analysis/volatility.ts` | t41s + t41r（baselineValue 为 number） | ⚠️ 同上 | t41r：空库；仅 sim：baselineMode 非法 exit2；`goal` 模式零测试 | 单测种子 + sim(7) | 可用 |
| calorie.view.body-composition | 读 | `render/bodyPlate.ts` + `fetch/body.ts` | t41s + t41r（total=3、latestPct=18.9） | ⚠️ 同上 | t41r：空库；仅 sim：days=0 exit2 | 单测种子 + sim(3) | 可用 |
| calorie.view.body-measure | 读 | `render/bodyPlate.ts` + `fetch/body.ts` | t41s + t41r（total=3、latestVal=84） | ⚠️ 同上 | t41r：空库；**sim：metric 非法 → exit 4（应 2）**；9 个 metric 只测了 1 个 | 单测种子 + sim(3) | **缺口**：错误码误分类 + metric 覆盖 |
| calorie.view.plan | 读 | `render/planPlate.ts` + `fetch/plan.ts` | t41s + t41r（totalSessions=2、totalMovements=2） | ⚠️ 同上 | t41r：空库 | 单测种子 + sim(3) | 可用 |
| calorie.view.plan-wizard | 读 | `render/planPlate.ts` | t41s + t41r（errorCount=0；坏 plan errorCount≥1） | ⚠️ 同上 | t41r：`plan` 非对象 bad-input；**sim：`SKILL.md` 示例 exit 2；`insertedCount` 恒 0（dryRun）** | 单测种子 + sim(3，全 0) | **缺口**：示例不可执行 + 度量恒 0 |
| calorie.view.exercise-goal | 读 | `render/planPlate.ts` | t41s + t41r（dailyGoal=300、actual=620、achieved=true） | ⚠️ 同上 | t41r：空库 | 单测种子 + sim(7) | 可用 |
| calorie.view.goal-expiring | 读 | `render/goalExtra.ts` | t41s + t41r（deadline、daysLeft>14、expiring=false） | ⚠️ 同上 | t41r：空库；仅 sim：withinDays 负 exit2 | 单测种子 + sim(5) | 可用 |
| calorie.view.goal-predict | 读 | `render/goalExtra.ts` | t41s + t41r（targetKg=68、eta 长度 10） | ⚠️ 同上 | t41r：空库/数据不足；**sim：文档默认（无参）恒 exit 4（需 ≥14 天窗）** | 单测种子 + sim(5) | **缺口**：默认调用结构性不可达 |
| calorie.view.goal-vs-actual | 读 | `render/goalExtra.ts` | t41s + t41r（completed+incomplete>0） | ⚠️ 同上 | t41r：空库 | 单测种子 + sim(5) | 可用 |
| calorie.view.predict | 读 | `render/insightPlate.ts` + `analysis/trend.ts` | t41s + t41r（forecastValue 为 number） | ⚠️ 同上 | t41r：空库/数据不足；**sim：文档默认（无参）恒 exit 4（需 ≥14 天窗）** | 单测种子 + sim(6) | **缺口**：默认调用结构性不可达 |
| calorie.view.anomaly | 读 | `render/insightPlate.ts` + `analysis/anomaly/*` | t41s + t41r（findingCount 为 number、`diet_over`、空库 23 kind 全阻断） | ⚠️ 同上 | t41r：空库 23 kind；**sim：`SKILL.md` 示例 exit 2；23 kind 里只有 1 个有非空断言** | 单测种子（1/23 kind）+ sim(23 kind 中 18 exit0) | **缺口**：示例不可执行 + kind 覆盖 1/23 |
| calorie.view.contraindication | 读 | `render/insightPlate.ts` + `analysis/contraindications.ts` | t41s + t41r（scannedSessions=2） | ⚠️ 同上 | t41r：空库；仅 sim：part 非法 exit2；4 个 part 只测了 `all` | 单测种子 + sim(5) | 可用 |
| calorie.view.dedupe | 读 | `render/insightPlate.ts` + `fetch/batch.ts` | t41s + t41r（groupCount=1、totalProducts=3） | ⚠️ 同上 | t41r：空库 | 单测种子 + sim(3；同名不同品牌不去重 → groupCount=0) | 可用 |
| calorie.view.profile | 读 | `render/profilePlate.ts` + `fetch/profile.ts` | t41s + t41r（age=30、hasGoal=true、HTML moderate） | ⚠️ 同上 | t41r：空库 | 单测种子 + sim(5) | 可用 |

### 3.2 写键（35，实现文件一律 `src/cli/write.ts` + 域 fetch 模块）

| key | 读/写 | 实现文件（fetch 域） | 测试覆盖（断言） | envelope 全字段 | 边界与异常断言 | 非空数据证据（回执 + 落库） | 判定 |
|---|---|---|---|---|---|---|---|
| calorie.diet.add | 写 | `fetch/diet.ts` | w40（op=create、recordId、幂等 noChange）；c43（receipt.items、HTML `<li>`） | ✅ w40 runWrite | **单测**：缺 foodName exit2、缺 protein exit2 | 单测种子 + sim（create#89；food_log 88→89） | 可用 |
| calorie.diet.update | 写 | `fetch/diet.ts` | w40（op=update、message 含 #id） | ✅ | **单测**：无字段 exit2、id 不存在 exit4 | 单测种子 + sim（update#1；food_log 内容变化） | 可用 |
| calorie.diet.remove | 写 | `fetch/diet.ts` | w40（op=delete；二次删 exit4） | ✅ | **单测**：缺 id exit2、不存在 exit4 | 单测种子 + sim（delete#1；88→87） | 可用 |
| calorie.diet.batch | 写 | `fetch/diet.ts` | w40（message「新增 1」，空行跳过） | ✅ | 仅 sim：缺 items/空 items exit2 | 单测种子 + sim（create；88→89） | 可用（弱）：无单测边界 |
| calorie.diet.copy | 写 | `fetch/diet.ts` | w40（message「复制 1，跳过 1」） | ✅ | **单测**：源无数据 exit4 | 单测种子 + sim（create；88→89） | 可用 |
| calorie.diet.update-by-date | 写 | `fetch/diet.ts` | w40（message「2 条」） | ✅ | **单测**：无字段 exit2、无数据日 exit4 | 单测种子 + sim（update；内容变化） | 可用 |
| calorie.diet.remove-by-date | 写 | `fetch/diet.ts` | w40（message「2 条」） | ✅ | **单测**：无数据日 exit4 | 单测种子 + sim（delete；88→84） | 可用 |
| calorie.diet.remove-by-range | 写 | `fetch/diet.ts` | w40（message「1 条」） | ✅ | **单测**：start>end exit2 | 单测种子 + sim（delete；88→79） | 可用 |
| calorie.diet.remove-by-type | 写 | `fetch/diet.ts` | w40（message「1 条」、重复删 exit4） | ✅ | **单测**：mealType 非法 exit2、无数据 exit4 | 单测种子 + sim（delete；88→87） | 可用 |
| calorie.water.log | 写 | `fetch/diet.ts`（💧水 行） | w40（300 ml / 累计 300 ml） | ✅ | **单测**：ml=-5 exit2；仅 sim：缺 ml exit2、ml>10000 exit2 | 单测种子 + sim（create#89；88→89） | 可用 |
| calorie.weight.log | 写 | `fetch/weight.ts` | w40（recordId=2、70.2 kg、**缺身高仍记 exit0 + BMI 待补**） | ✅ | **单测**：缺身高边界；仅 sim：缺 kg exit2、kg 负/超 500 exit2 | 单测种子 + sim（create#17；16→17） | 可用 |
| calorie.weight.update | 写 | `fetch/weight.ts` | w40（70.2→70、按 date 改） | ✅ | **单测**：缺参 exit2、id 不存在 exit4 | 单测种子 + sim（update#1；内容变化） | 可用 |
| calorie.weight.remove | 写 | `fetch/weight.ts` | w40（op=delete、按 date/范围） | ✅ | **单测**：缺参 exit2 | 单测种子 + sim（delete#1；16→15） | 可用 |
| calorie.weight.batch | 写 | `fetch/weight.ts` | w40（「写入 1，跳过 1，失败 1」） | ✅ | 仅 sim：缺 items exit2 | 单测种子 + sim（create；**已存在日期被跳过 → 0 变化**） | 可用（弱）：无单测边界；写 0 仍 ok:create |
| calorie.exercise.add | 写 | `fetch/exercise.ts` | w40（create、力量字段、items 批量、copyFrom=yesterday） | ✅ | **单测**：缺 type exit2、负 calories exit2 | 单测种子 + sim（create#10；9→10） | 可用 |
| calorie.exercise.update | 写 | `fetch/exercise.ts` | w40（op=update、按 date 改） | ✅ | **单测**：无字段 exit2、未知字段 exit2、无数据 exit4 | 单测种子 + sim（update#1；内容变化） | 可用 |
| calorie.exercise.remove | 写 | `fetch/exercise.ts` | w40（op=delete、二次删 exit0 幂等、id 不存在 exit4、范围无数据 exit4） | ✅ | **单测**：缺参 exit2、不存在 exit4 | 单测种子 + sim（delete#1；**软删：行数不变、内容变化**） | 可用 |
| calorie.photo.add | 写 | `fetch/photos.ts` | w40（create、源缺失 exit4） | ✅ | **单测**：缺 srcPaths exit2、源不存在 exit4 | 单测种子 + 独立复验（create#4；body_photos 3→4、文件重命名落盘、源文件保留） | 可用（弱）：`SKILL.md` 示例是占位符 `<照片路径>` |
| calorie.photo.remove | 写 | `fetch/photos.ts` | w40（op=delete、二次删 exit4） | ✅ | **单测**：不存在 exit4 | 单测种子 + sim（delete#1；3→2，**并删二进制**） | 可用 |
| calorie.photo.tag | 写 | `fetch/photos.ts` | w40（add/set/remove、幂等 noChange、删不存在 exit4） | ✅ | **单测**：op 非法 exit2、id 不存在 exit4 | 单测种子 + sim（update#1；内容变化） | 可用 |
| calorie.product.add | 写 | `fetch/products.ts` | w40（create；缺 productName exit2） | ✅ | **单测**：缺 productName exit2；仅 sim：缺必填营养 exit2 | 单测种子 + sim（create#7；6→7） | 可用 |
| calorie.product.update | 写 | `fetch/products.ts` | w40（op=update、id 不存在 exit4） | ✅ | **单测**：无字段 exit2、不存在 exit4 | 单测种子 + sim（update#1；内容变化） | 可用 |
| calorie.product.deprecate | 写 | `fetch/products.ts` | w40（message「已下架」、id 不存在 exit4） | ✅ | **单测**：不存在 exit4 | 单测种子 + sim（update#1；内容变化） | 可用 |
| calorie.profile.set | 写 | `fetch/profile.ts` | w40（空库也能设、message 含 175） | ✅ | **单测**：无字段 exit2 | 单测种子 + sim（update#1；user_profile 内容变化） | 可用 |
| calorie.profile.activity | 写 | `fetch/profile.ts` | w40（moderate→active） | ✅ | **单测把 exit 4 钉死**：非法枚举 → exit 4（**应 2**） | 单测种子 + sim（update#1；内容变化） | **缺口**：错误码误分类 |
| calorie.profile.update | 写 | `fetch/profile.ts` | w40（op=update、fields 批量、非法 field exit2） | ✅ | **单测**：非法 field exit2 | 单测种子 + sim（update#1；内容变化） | 可用 |
| calorie.goal.set | 写 | `fetch/nutritionGoal.ts` | w40（create→update、空库可设） | ✅ | **单测**：缺 calorie exit2 | 单测种子 + sim（update#1；daily_goal 内容变化） | 可用 |
| calorie.goal.water | 写 | `fetch/nutritionGoal.ts` | w40（2200 ml、无 daily_goal 行 exit4） | ✅ | **单测**：无行 exit4 | 单测种子 + sim（update#1；内容变化） | 可用 |
| calorie.goal.weight | 写 | `fetch/goal.ts` | w40（68 kg + deadline） | ✅ | **单测**：kg=-1 exit2；仅 sim：kg>500 exit2 | 单测种子 + sim（update#1；内容变化） | 可用 |
| calorie.goal.pause | 写 | `fetch/goal.ts` | w40（message「暂停」） | ✅ | 仅 sim：未知参数被静默接受（exit 0） | 单测种子 + sim（update#1；内容变化） | 可用（弱）：无单测边界 + 无参数白名单 |
| calorie.goal.resume | 写 | `fetch/goal.ts` | w40（message「重启」） | ✅ | 仅 sim：未知参数静默接受 | 单测种子 + sim（update#1；**未暂停时无变化仍报成功**） | 可用（弱）：无单测边界 + 幂等语义未证 |
| calorie.body.composition-add | 写 | `fetch/body.ts` | w40（create、source 白名单） | ✅ | **单测**：source 非法 exit2、缺 bodyFatPct exit2 | 单测种子 + sim（create#5；4→5） | 可用 |
| calorie.body.composition-remove | 写 | `fetch/body.ts` | w40（id 不存在 exit4） | ✅ | **单测**：不存在 exit4 | 单测种子 + sim（delete#1；**软删：内容变化**） | 可用 |
| calorie.body.measure-add | 写 | `fetch/body.ts` | w40（waistCm 85、message 回显） | ✅ | **单测**：无围度 exit2、未知字段 exit2 | 单测种子 + sim（create#9；8→9） | 可用 |
| calorie.body.measure-remove | 写 | `fetch/body.ts` | w40（op=delete） | ✅ | 无单测 exit 断言 | 单测种子 + sim（delete#1；**软删：内容变化**） | 可用（弱）：无边界断言 |

---

## 4. 简陋处清单（缺口 G1–G16，均带实证）

> 每条格式：现象 → 实证 → 影响 → 建议（供刻度拍定后拆票）

**G1 · `SKILL.md` 18 行示例由生成器兜底，5 行直接不可执行**
- 现象：`scripts/build-help.mjs exampleFor()` 只对 T8/T9/T10/#40 的键写了 case，#41 新增的 18 个 view 键落到 `default: return 'calorie-cmd-read ' + key`（无 `--params`）。
- 实证：逐行原样执行 → `calorie.view.anomaly` exit 2（缺参数 kind）、`calorie.view.weight-compare` exit 2（缺参数 start）、`calorie.view.plan-wizard` exit 2（缺参数 plan）、`calorie.view.goal-predict` exit 4（数据不足：需 ≥14 天体重记录，当前只有 7 天）、`calorie.view.predict` exit 4（同上）。
- 影响：速查表是 agent 的第一入口，5/77 行照抄即失败；另 13 行虽 exit 0 但参数不是最佳实践（如 `view.weight` 无窗）。
- 建议：`exampleFor` 补齐 18 个 case，并把示例可执行性做成构建期门（逐行 spawn 断言 exit 0）。

**G2 · `goal-predict` / `predict` 的默认调用结构性不可达**
- 现象：两者都走 `defaultRange()` → 默认窗 `[end-6, end]`（7 天），而 `buildPredictView`/`buildGoalPredictView` 要求窗内 **≥14 天**体重记录。
- 实证：sim 库（16 天体重）无参调用 → exit 4「数据不足:需要 ≥14 天体重记录,当前只有 7 天」；显式 `start=2026-08-23,end=2026-09-07` → exit 0。
- 影响：文档示例 100% 失败；调用方必须知道"要自己传 ≥14 天窗"这一未文档化前提。
- 建议：或默认窗按 key 区分（预测类默认 30d），或把 ≥14 天要求写进示例/错误文案并给 `fix:` 提示。

**G3 · `calorie.view.anomaly` 的 kind 覆盖 1/23**
- 现象：`kind` 是必填参数，23 个合法值；单测只在非空库上跑过 `diet_over`。
- 实证：sim 库 23 kind 全跑 → 18 个 exit 0、5 个 exit 4（`weight_plateau`/`weight_loss_cause`/`why_losing_fast`/`rate_reasonable`/`strategy_check`，均因体重数据天数不足）；单测非空断言只有 `diet_over`。
- 影响："诊断"类键的口径在 22 个 kind 上从未被任何断言看过。
- 建议：补一个 ≥30 天体重+饮食种子的 23-kind 参数化测试（含每个 kind 的 findings 非空/口径断言）。

**G4 · `calorie.view.combined` 的 `window` 无白名单**
- 现象：`resolveWindow()` 接受任意 `Nd` 并**静默**回退 30d（`analysis/series.ts:46-57`）；cmd_read 不校验。
- 实证：`{"pair":"weight_calorie","window":"99d"}` → exit 0，`days=99`；未知串（如 `"abc"`）→ 静默 30 天。`pair` 非法则正确 exit 2。
- 影响：调用方传错窗口不会报错，只会在不同窗口上得到不同数字（口径漂移不可见）。
- 建议：`window` 白名单（7d/14d/30d/90d/本周/…）非法即 bad-input exit 2。

**G5 · 三个键空库不阻断，返回"合成数字"**
- 现象：违反 `SKILL.md`「空库/空窗/无目标一律 missing-data」。
- 实证（空库 exit 0）：
  - `calorie.view.deficit` → `{avgIntake:0, avgBurn:2507, avgDeficit:0, targetIntake:1800, targetTdee:2507}`（把"没吃"当"0 摄入"报）
  - `calorie.view.goal-recommend` → `{weightKg:70, tdee:2555, calorieGoal:2055, ...}`（无档案、无体重，凭空造 70kg）
  - `calorie.photo.gif` → `summary:"GIF 任务：标签 正面 共 0 张（— ~ —）…"`
- 影响：空库调用者拿到"看起来正常"的 stat/analysis，而非 fallback。
- 建议：按政策改 missing-data，或在 envelope 走 `fallback`（reason/degraded:true）显式降级。

**G6 · 错误码误分类：非法参数被判成"取数失败"（exit 4）**
- 实证：`calorie.view.body-measure --params '{"metric":"nope"}'` → exit 4「未知围度项」；`calorie.profile.activity --params '{"activityLevel":"乱填"}'` → exit 4（`cmd-write-40.test.mjs:234` 把这个 4 钉死）。
- 对照：`calorie.view.contraindication part=脚` → 正确 exit 2；`view.anomaly kind=nope` → 正确 exit 2。
- 影响：调用方无法区分"参数错"和"没数据"，重试策略会错。
- 建议：这两个 key 改为 bad-input exit 2，同步改测试断言。

**G7 · 18 个读键的 envelope 缺 `version/skill` 断言**
- 现象：`cli-smoke-t41` 只断言 `env.key`、`env.shape`、`data.metrics` 全 number；`render-t41` 走 dispatch 直调，**根本不构造 envelope**。
- 影响：这 18 键的 `version`/`skill` 字段无任何测试保护（其余 24 读键 + 35 写键有）。
- 建议：`runOk` 抽成公共断言（含 version/skill），t41 两文件复用。

**G8 · 版本漂移单测只钉住 base-render，没钉 skill-calorie**
- 现象：`SKILL.md` 声称「版本 0.1.0（与 link-core/render 同值，漂移单测钉死）」；实际 `RENDER_ENVELOPE_VERSION === ENVELOPE_VERSION` 断言在 `packages/base-render/test/render.test.mjs:64`，skill 侧只有 `assert.equal(env.version,'0.1.0')` 硬编码。
- 影响：link-core 升版本时 skill-calorie 静默漂移。
- 建议：skill-calorie 单测 import `base-link-core` 的 `ENVELOPE_VERSION` 做等值断言。

**G9 · 参数覆盖薄：18 个读键的参数分支从未被跑过**
- 实证（源码有分支、测试零覆盖）：`view.home.windowDays`、`view.ranking.category`、`view.library.category`、`view.weight-history.{startDate,endDate}`、`view.volatility.baselineMode=goal`、`view.goal-recommend.profile∈{maintain,bulk}`、`view.predict.horizonDays`、`view.goal-expiring.withinDays` 变体、`view.contraindication.part∈{腰,膝,肩}`（只测 all）、`view.body-measure` 其余 8 个 metric、`photo.list.{dateFrom,dateTo,days,limit,today}`、`photo.gif.{dateFrom,dateTo,days}`、`help.center` 无 q 全量路径。
- 建议：按 key 建"参数矩阵"用例，每个可选参数至少 1 正 1 负。

**G10 · 读键几乎没有非法参数测试**
- 实证：42 读键里只有 `help.lookup`（缺 q/空串 exit 2）与 `view.diet`（空尾日）有单测级边界；其余 39 键的非法参数只在本次 sim 跑过（exit 码见 `matrix.json`）。
- 建议：把 `--params` 校验做成表驱动测试（每键 ≥1 缺参 + ≥1 越界）。

**G11 · 极端值只覆盖了下界**
- 实证：`ml∈(0,10000]`、`kg∈(0,500]`、`topN 1..50`、`limit 1..100`、`days 1..365`、`windowDays 1..90`、`historyDays 1..365`、`items≤200/365`、`srcPaths≤20` 等边界里，单测只测了 `ml=-5`、`kg=-1`、`days=0`、`start>end`；上界只由本次 sim 验证（ml=20000→2、kg=900→2、days=999→2、topN=0→2、limit=0→2、windowDays=0→2）。
- 建议：上界与恰好边界（如 `kg=500`、`ml=10000`、`items=200`）各补 1 例。

**G12 · 写链"真实落库"证据只到回执 + 间接断言**
- 实证：单测层面，`w40` 断言回执字段与少数后续读（如 diet.remove 二次 exit 4、weight.remove 后 exit 4）；**没有逐键的库内行断言**。本次审计用行数+指纹快照补了这一层，35 键中 34 键有表变化（唯一"无变化"是 `weight.batch` 的重复日期被跳过，属预期）。
- 附带发现：`exercise.remove`、`body.composition-remove`、`body.measure-remove` 是**软删除**（行数不变、内容变化）；只有 `body.composition-remove` 的文案自曝「软删除，可恢复」，`exercise.remove` 只说「已删除」。
- 建议：把"写后读回"断言做成写键公共断言（每键至少 1 条 SELECT 校验），并统一软删文案。

**G13 · 文档示例与探针易被二进制副作用污染（审计方法学提醒）**
- 现象：`photo.remove` 会**删掉照片二进制**（`fetch/photos.ts deletePhoto` 的 `fileDeleted`）。审计时若多个 photo 探针共用同一 `CALORIE_PHOTOS_DIR`，前序 remove 会把后序 add 的源文件删掉 → `photo.add` 误报 exit 4。
- 处置：已用独立 photos 目录 + 独立源文件复验 → `photo.add` exit 0、文件重命名落盘、`body_photos` 3→4，**不是缺陷**。
- 建议：写进测试规范——photo 类探针必须独立目录。

**G14 · 幂等/空操作仍返回成功回执**
- 实证：`calorie.weight.batch` 重复日期 → 回执「写入 0，跳过 1，失败 0」但 `ok:true`、`receipt.op='create'`、`recordId:null`（无 `noChange` 标记）；`calorie.goal.resume` 在未暂停时 → 「已重启所有目标」而库无变化。
- 建议：空操作统一置 `noChange:true`（`diet.add` 已有此字段，口径应拉齐）。

**G15 · `plan-wizard` 的 `insertedCount` 恒 0**
- 实证：`render/planPlate.ts:71` 直接 `insertedCount: 0, dryRun: true`。sim 上合法计划 → metrics 三项全 0。
- 影响：键名"构建向导"暗示可落库，实际只做校验；stat 的 `insertedCount` 是恒零占位。
- 建议：或改名/改文案（校验器），或补真正的插入路径。

**G16 · 唤醒词列与 SoT 脱节（相邻发现，属 HELP 层）**
- 实证（`repr-check.mjs`，59 条 REPR + 18 条 fallback）：
  - 7 条唤醒词在 436 条 SoT 里**零命中**：`看热量缺口`/`看健康盘`/`查高热量排行`/`查食品库`/`看身材照`/`做身材照GIF`/`查热量历史`；
  - 9 条有命中但**首条是 legacy python 命令**（非可执行）：`看体重 vs 摄入`/`今日复盘`/`查食品`/`查身材照`/`对比两张照片`/`记身材照`/`删身材照`/`改照片标签` 等；
  - 18 个 #41 键**没有唤醒词**（唤醒词列就是 key 本身）。
  - 436 条 SoT 里只有 60 条 `main_prompt.cli` 是可执行 `calorie-cmd-read`（覆盖 33 个 key），加 `HELP_EXEC_OVERRIDES`（22 条映射 11 个 key，其中 10 个新增）→ **约 43/77 键有可执行唤醒词入口，34/77 键无**。
- 建议：属 HELP/唤醒词票范畴，但会直接影响本图"逐键可用"的验收口径，建议在刻度里明确"可达性"是否算一维。

---

## 5. 判定计数与 top 缺口

### 5.1 计数

| 判定 | 读 | 写 | 合计 |
|---|---|---|---|
| 可用 | 15 | 29 | **44** |
| 可用（弱） | 17 | 5 | **22** |
| 只在空态验过 | 0 | 0 | **0** |
| 仅代码存在 | 0 | 0 | **0** |
| 缺口 | 10 | 1 | **11** |
| 合计 | 42 | 35 | **77** |

"只在空态验过 = 0 / 仅代码存在 = 0"的依据：**每一个键都至少有一次非空种子库上的执行断言**（读键靠 `t11`/`t41s`/`t41r`/`c43`，写键靠 `w40`）。真正的简陋处不是"没跑过"，而是"跑过但只验了骨架/类型"——这部分记在"可用（弱）22"里。

### 5.2 top 10 缺口键（按影响排序）

1. `calorie.view.anomaly` —— 示例 exit 2；23 kind 只有 1 个有非空断言
2. `calorie.view.predict` —— 文档默认调用恒 exit 4（需 ≥14 天窗，未文档化）
3. `calorie.view.goal-predict` —— 同上
4. `calorie.view.weight-compare` —— 示例 exit 2；无非空边界断言
5. `calorie.view.plan-wizard` —— 示例 exit 2；`insertedCount` 恒 0
6. `calorie.view.combined` —— `window` 无白名单（`99d` 静默生效）
7. `calorie.view.body-measure` —— metric 非法 exit 4（应 2）；9 metric 只测 1 个
8. `calorie.view.deficit` —— 空库 exit 0，返回 0 摄入假报告
9. `calorie.view.goal-recommend` —— 空库 exit 0，凭空 weightKg=70
10. `calorie.photo.gif` —— 空库 exit 0，返回"共 0 张"
- 另：`calorie.profile.activity` 非法枚举 exit 4（应 2，且测试钉死 4）

---

## 6. 阻塞与未决

| # | 阻塞 | 事实 | 需要的动作 |
|---|---|---|---|
| B1 | **真机非空数据证据 = 0** | 真库 `D:\2Study\StudyNotes\.db` 窗口 2026-09-02~09-08 全空（#48 实证 exit 4「无今日数据」），最新数据约 08-25 | 需要维护者授权一种安全取数方式（如：允许把真库**拷贝**到 tmp 后只读跑读键；或提供脱敏导出），否则"真实非空数据下可用"这一维无法在真机上闭环 |
| B2 | 真库不可"只读打开" | `openDb` 必然执行 DDL + `applyMigrations`（含 `ALTER/DROP/UPDATE`） | 若要只读对照，需要新增只读打开路径（`openDbReadOnly`）或改用 sqlite 只读 URI，属代码改动，不在本票范围 |
| B3 | 刻度未拍定 | 本报告的"缺口"按 `SKILL.md` 既有政策（缺失阻断不返空、exit 码冻结）与"每键口径断言"两条判据给出 | 待 #63 拍定"极致"刻度后，本清单可逐条毕业为票 |

---

## 7. 面板可达性（一行结论）

**今天 DSH 面板只调用 `calorie.view.home` 一个键**（`packages/plugin-calorie/src/contract.ts` 与 `bridge.ts` 的 `DEFAULT_READ_KEY = 'calorie.view.home'`；`base-combos` 的 `PRESENT_KEYS` 虽登记全部 77 键，但只是字符串白名单，面板不按它取数）——即 76/77 键当前只能从 CLI/agent 侧进入。

---

## 附：本报告引用的新增文件（均在 `.scratch/t67/`，未改动任何既有文件）

`seed-sim.mjs`（合成库播种）、`run-matrix.mjs`（77 键 × 多探针矩阵）、`write-landing.mjs`（写链落库快照）、`photo-clean.mjs`（photo.add 干净复验）、`crosscheck.mjs`/`crosscheck2.mjs`（键表交叉核对）、`reach.mjs`/`repr-check.mjs`（唤醒词可达性）、`summarize.mjs`/`rich-digest.mjs`/`pick.mjs`（摘要）、`matrix.json`/`write-landing.json`/`digest.txt`/`rich-digest.txt`/`exact-map.txt`（原始证据）。

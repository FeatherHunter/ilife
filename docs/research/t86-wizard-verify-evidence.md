# #86（map #63）wizard 4 页复刻 D1 — 取证

**结论**：3 个配置型 wizard＋1 个 GIF 框选器已落地（静态 HTML＋copyText，不碰 client 控件）：
`calorie.view.measure-wizard`（记围度／补记围度）／`calorie.view.composition-wizard`（记体脂三词）／
`calorie.view.photo-log-wizard`（记身材照，纯配置）／`calorie.view.gif-planner`（查身材照／生成身材照GIF 框选）。
读 60→64，共 99（D2 只许追加）；SoT 436 零改动；M6 正文已回引 4 键（#98 G9 关闭）。

- 票面：`gh issue view 86`（label `wayfinder:task`）；前置 #98／#104／#93 全关，首动作已验。
- 点名依据：`docs/research/t71-old-baseline-inventory.md` §2 #4（体脂）/#6（围度）/#11（身材照）/#9（GIF 框选器）；
  #52 明确不做、#54 新版已有，均不碰。
- B7 边界：实测 0/73 旧模板用 formPrompt／selectList／smartSelect；本票只用静态 HTML＋copyText。
  表单＝B-09 `renderParamForm`（零 JS，行为归宿主）；复制＝B-11＋`render/copy.ts` 接线（Base P0 双通道唯一执行者）；
  无 cropper.js（沿旧 v2.3.5 手动 4 数字坐标）；照片只文件名引用＋存在位（T10 二进制铁则，禁 base64）。

## 1. 落点（新增文件＋接线）

| 层 | 文件 | 内容 |
|---|---|---|
| 数据＋prompt | `packages/skill-calorie/src/render/wizardPort.ts` | 4 视图 builder＋prompt 复刻（旧 buildPrompt/generatePrompt 逐字结构，新 CLI 形态）；recent 取自 `fetch/body.ts`／`fetch/photos.ts`；空库不抛（场景 1 照开）；未知字段 `fail(2,'不支持字段: ')`（与写键同字面） |
| 组装 | `packages/skill-calorie/src/render/wizardPortDocs.ts` | blocks 组装（pageShell＋KPI＋disclosure＋paramForm 预填＋pre prompt＋copy 按钮＋复制数据块），沿 #111–#113 包裹约定 |
| 注册 | `src/cli/keys.ts` | ＋4（stat 形；`围度向导`／`体脂向导`／`身材照向导`／`GIF规划器`） |
| 分发 | `src/cli/cmd_read.ts` | ＋4 case（metrics＋Doc） |
| 路由 | `src/triggers/routing.ts` | `NEW_KEY_ROUTES` ＋4 新拟短名（`看围度向导` 08／`看体脂向导` 08／`看身材照向导` 09／`看GIF规划器` 09） |
| 登记 | `packages/base-combos/combos.yaml`＋`src/present.ts`（生成器重跑） | ＋4 |
| HELP | `scripts/build-help.mjs`（REPR＋exampleFor）→ `SKILL.md` AUTO 块重注 | ＋4 行＋场景行 95→99（幂等 `idempotent-equals-buildHelpBlock=true`） |
| 正文回引 | `SKILL.md` M6 fallback 条 | 命名 4 键＋场景对应（映射表旧 `.html` 名保留，skill-t11 钉死不断） |
| 测试 | `packages/skill-calorie/test/wizard-86.test.mjs`（9 用例） | 唤醒词命中／空页／预填／recent／白名单／口径镜像／命令段新 CLI／空库／CLI 落盘＋复制属性／无自造复制 |
| 规格补注 | `docs/calorie-architecture.md:58` | #86 新拟 4 词一句（沿 #113 体例） |

## 2. 真机证据（tmp 种子库，真库零触碰）

种子（`.tmp-t86-evidence/`，gitignore 草稿区，不进仓）：`daily_goal`（calorieGoal 1850）＋
`body_measurements`（2026-08-19 胸 95／腰 80／臀 96）＋`body_composition`（2026-08-19 gym 19.5%）＋
2 张正面照（真实文件，存在位 true）。`SKILLS_DB_PATH`／`CALORIE_PHOTOS_DIR` 均指 tmp，真库（`D:\2Study\StudyNotes\.db`）全程未碰。

| 步骤 | 命令 | exit | 输出 |
|---|---|---|---|
| 场景 2 围度 | `calorie-cmd-read calorie.view.measure-wizard --params '{"date":"2026-08-19","chestCm":95,"waistCm":80}'` | 0 | `filledCount:2,hasRecent:1`；页含 prompt「请帮我记录围度…上身：胸围 95cm, 腰围 80cm」＋预填 `value="95"`＋复制按钮（36,547 B） |
| 场景 2 体脂 | `… composition-wizard '{"date":"2026-08-19","source":"gym","bodyFatPct":19.5}'` | 0 | 外部测量分支＋体脂率 19.5%（35,955 B） |
| 身材照 | `… photo-log-wizard '{"tag":"正面","srcPaths":[…p1.jpg]}'` | 0 | 命令段 `calorie-cmd-read calorie.photo.add --params '…'`（33,699 B，无 py） |
| GIF 框选 | `… gif-planner '{"tag":"正面"}'` | 0 | `photoCount:2,selectedCount:2,missingCount:0`，文件名引用无 base64（36,444 B） |
| 只读证明 | 4 读前后库 sha256 | — | `511FE92249059735E4D8` → **同值**（读键走 `openDbReadOnly`，零触碰） |
| 先看后写 | `calorie.body.measure-add '{"date":"2026-08-19","chestCm":95,"waistCm":80}'` | 0 | `receipt`（recordId 2「已记围度」）；库 sha 变（预期内，唯一写点） |

## 3. 门禁实测

| 门禁 | 结果 |
|---|---|
| `pnpm build` | exit 0 |
| `pnpm boundaries` | 7/7 OK，PASS |
| `pnpm snapshot:check` | 重写后 OK（sha 覆盖 combos＋present 本票 4 键） |
| `pnpm publish:pre` | PASS |
| 新测 `wizard-86` | 9/9 绿 |
| 包级相关（t11×2／render-t41／cmd-write-40／naming×2／db-readonly-93／113／smoke-t41／copy-90／triggers） | 全绿（含只读 64 键 sweep 全等） |
| 根 `combos-42` | 绿（99） |
| 根 `calorie-routing-81` | 7/8；唯一红＝smoke 快照非零 1 条（见 §4，非本票） |
| smoke 重生成 | 398 条；本票新增 4 条全 exit 0 |

## 4. 冲突登记（以实现为准）

- **C-1（路由层 vs M6，沿 #98 口径）**：5 个配置型词仍 `exec` 直连写键（SoT 冻结不动）；M6「只证明写键可达＋不豁免 verify」继续有效。本票只给 agent 新增 4 个 wizard 入口，不翻转既有词。
- **C-2（换算未移植）**：皮褶钳 7 点→体脂换算仍未移植（`cli/write.ts` 原文）；wizard 页只采集＋呈现总和，直传实测 `bodyFatPct`，prompt 逐字明示。
- **C-3（photo.gif 形参缺口）**：新 `photo.gif` 无 photoIds/crops 形参；框选与裁剪落 prompt 参数段由 AI 承接，命令段只给 tag 窗口合成命令。如实呈现，未虚构参数。
- **C-4（smoke 非零 1 条，既有日期炸弹）**：`复制昨日运动` exit 4（昨日无运动记录）。HEAD 快照已含同一条（`非零 1`），种子运动止于 2026-09-07 而系统日期 2026-09-09，`copyYesterday(today)` 取昨日 09-08 恒空。与本票零因果（diff 面无交集：未碰 fetch/exercise、write、种子）。SoT 冻结不可降级，留待种子／日期票处理。
- **C-5（reason 字面 95 键未改）**：`NON_EXEC_REASONS.*` 与 M6「95 键无…」字面保留（逐字断言冻结；99 键内亦无，语义仍真）。仅结构性计数（键表头注／测试标题／路由注）按 #111–#113 体例同步为 99/64/56/493/398。
- **C-6（版本号，沿 #98 G12）**：不碰版本串与发布窗口。

## 5. 未做／待确认

- 票面进度 95% 待确认；未确认不 close；MAP Decisions 回填待 close 时同批。
- 真机浏览器打开验证（截图＋交互记录）归 #89b（t104 §4 口径：浏览器实测回读归 #89b）；本票只做到 HTML 落盘＋标记断言（doctype／零残留／ilife-page／style／helpers／data-action-id／data-t）。
- 训练计划 wizard（#54 新版已有 `plan-wizard` 纯校验）与营养表 wizard（#52 明确不做）不在本票。

## 附：复跑命令

```powershell
pnpm build
node --test packages/skill-calorie/test/wizard-86.test.mjs
node --test packages/skill-calorie/test/db-readonly-93.test.mjs
node --test test/calorie-routing-81.test.mjs test/combos-42.test.mjs
node docs/research/t81-exec-smoke.mjs --out docs/research/t81-exec-smoke.md
```

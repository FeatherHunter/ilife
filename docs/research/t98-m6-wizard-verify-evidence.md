# #98（map #63）M6 Wizard Verify 铁则正文 — 取证（返修版）

**结论**：`packages/skill-calorie/SKILL.md` 的 `## Wizard Verify 铁则（M6，v2.4.3 复刻）` 章节（落在 `<!-- HELP-AUTO-START/END -->` 块**之外**）已按两路审查（A1 PASS 81／A2 FAIL 68 含 S1）逐项返修：G1 自相矛盾、G2 缺强制力、G3 无 fallback、G4 未覆盖 AUTO 块、G5 唤醒词与前置、G6 词→页映射、G7 行号锚漂移、G8 自检脚本自证式、G9 互引不实、G10 测试零锚点、G11 同步 #87 输出命名补丁；**G12（版本号）按编排者裁定不落地、只登记**。全文锚点一律改为**符号锚**（不再引 `src/**` 行号——并发票在改 `write.ts`／`cmd_read.ts`，行号必腐）。

- 票面：`gh issue view 98`（label `wayfinder:task`）；#86 票面把 #98 列为前置（「前置：M6 铁则正文（#98）…」），故本票只落正文，页面归 #86。
- 铁则原文出处（仓内）：`docs/research/t71-old-baseline-inventory.md:669-679`（§6.4，逐字引旧 `SKILL.md:20-28`）；只读对照 `D:\2Study\StudyNotes\SKILLS\卡路里\SKILL.md:13-28`（§⚠️ 强制性规定 第 2／5 条）。
- 必须复刻清单 M6 行：`docs/research/t71-old-baseline-inventory.md:726`；Q4（wizard 页是否复刻）：`:755`。

## 1. 正文落点（符号锚，不写 `src` 行号）

| 项 | 值 |
|---|---|
| 文件 | `packages/skill-calorie/SKILL.md` |
| 章节 | `## Wizard Verify 铁则（M6，v2.4.3 复刻）`（测试断言：标题索引 < `START` 索引） |
| 结构 | 优先级声明 → 前置（先问测量方式）→ 词→页映射表 → 三场景表（符号锚）→ fallback／non-exec 不可写／AUTO 块覆盖／禁止项／违规回执 |
| AUTO 块 | 块内字节零改动（§2）；正文位于块**之前** |
| 术语 | 沿 `CONTEXT.md` 与票面：配置型 wizard／verify／按场景分流 |

## 2. AUTO 块零破坏自证（三种独立取法互证）

| 项 | 改动前 | 改动后 |
|---|---|---|
| AUTO 块 sha256 | `D884C2D018AB1AD19CA8D303EE1CF10CCEDB0708C2E796EE23AB41494EC00DC0` | 同值 |
| AUTO 块字节数 | 11977 | 11977 |
| 整文件 sha256 | `753C690551A1990D6A63F9B3545210DBCCCA7767D6F4CDBC8E90AD07F6FB6EB0` | `D0BF632C25C9C8E52A68120DCC34C02EB99AE0E9BCF80F547DEBF362D1F30A98` |
| 文件行数（`split('\n').length`） | 167 | 180（+13 全在块外） |
| AUTO 块行区间 | 61-144 | 74-157（整体下移 13 行，内容未动） |

**取法 ①（git 对象库 vs 工作树，本票验收用）**：`git show 14e7872:packages/skill-calorie/SKILL.md`（本票首个提交的父提交）取块 → sha256 与工作树 `readFileSync` 取块逐字节相同。

**取法 ②（生成器现算，不硬编码）**：`node docs/research/t98-auto-block-check.mjs` 把 `scripts/build-help.mjs` 复制到**仓库外**临时目录、把其 dist 导入改绝对路径后 import，调 `buildHelpBlock()` 现算 → 与块内容相同（`idempotent-equals-buildHelpBlock=true`）。**不跑包级 build**（`packages/skill-calorie` 的 `build` = `tsc -b && node scripts/build-help.mjs`，属禁区；只用根 `pnpm build` = `tsc -b`）。

**取法 ③（git 基线，现取不冻结）**：同一脚本 `--ref <gitref>`（默认 `HEAD`）现取 `git show <ref>:packages/skill-calorie/SKILL.md` 的块比对 → `git-block-match=true`。

- `git diff 14e7872 HEAD -- packages/skill-calorie/SKILL.md` 的 hunk 头全部落在块外（旧坐标 `@@ -26`／`@@ -44,14`／`@@ -165`，旧 AUTO 块 61-144；新坐标 `@@ -26`／`@@ -44,14`／`@@ -165`，新 AUTO 块 74-157）→ 只动块外文字。
- 文件属性实测：LF-only（`CR` 计数 0）、无 BOM（首 3 字节 `45,45,45` = `---`）、字面反斜杠n 计数 0。

## 3. 逐条「正文条目 → 实现符号锚」对照

| # | 正文条目 | 实现符号锚（可验，不含行号） | 判定 |
|---|---|---|---|
| 1 | 配置型 wizard ＝ 写库前要用户先看一眼的配置写 | 唯一 wizard 形态键 `calorie.view.plan-wizard`（`cli/keys.ts` `CALORIE_COMBOS` 项：title「构建向导」、shape `stat`） | 一致 |
| 2 | 场景 1：空参被拦 | `fetch/body.ts` `validateMeasurementInput` 的 `fail('围度','empty',…)` → `cli/write.ts` `dispatchWrite` 的 `ValidationError` 分支 → `CalorieRenderError('bad-input')` exit 2 | 一致 |
| 3 | 场景 2：预填键限白名单 | `cli/write.ts` `MEASURE_CAMEL` 白名单循环（非白名单字段 `fail(2,'不支持字段: ')`） | 一致 |
| 4 | 场景 2：皮褶钳须带算好的 `bodyFatPct` | `cli/write.ts` 缺 `bodyFatPct` 即 `fail(2, '缺参数 bodyFatPct（皮褶→体脂自动换算未移植，直传实测值）')` | 一致（换算未移植） |
| 5 | 场景 2：计划类先跑纯校验 | `render/planPlate.ts` `buildPlanWizardView` → `fetch/plan.ts` `validatePlan`；返 `dryRun:true`／`insertedCount:0`，不写库 | 一致 |
| 6 | 场景 3：35 写键一律 `receipt` 形 | `cli/write.ts` 模块头契约 ＋ `out()` 组装 `{ok,message,receipt}` | 一致 |
| 7 | 多步交互配置写词落 `non-exec` | `triggers/routing.ts` `NON_EXEC_REASONS.wizard` ＋ `WAKE_ROUTES` 对应词表项 | 一致 |
| 8 | 训练计划**当前不可写** | `NON_EXEC_REASONS.planWriteMissing` 逐字「命中但不执行：77 键无训练计划写键（旧链 --live-plan-* 系列），本仓执行层不承接计划写入。」；实测 `CALORIE_COMBOS` = **77 键**，plan 相关只有 `calorie.view.plan`／`calorie.view.plan-wizard` 两个**读**键 → 无 plan 写键 | 一致（G1 修法） |
| 9 | 前置：实际唤醒词 ＋ 先问测量方式 | `triggers/routing.ts` `WAKE_ROUTES` 场景 08 的 5 个 `exec` 项：`记体脂（皮褶钳）`／`记体脂（外部测量）`／`补记体脂`／`记围度`／`补记围度`；**无裸「记体脂」** | 一致（G5 修法） |
| 10 | 词 → verify 页映射 | `docs/research/t71-old-baseline-inventory.md` §2 模板清单三行：`body_composition_wizard.html`（记体脂（皮褶钳）／（外部测量）／补记体脂）、`body_measurements_wizard.html`（记围度／补记围度）、`plan_builder_wizard.html`（定训练计划） | 映射一致（页面本体归 #86） |
| 11 | 与 #86 的关系 | 本侧已引用；`gh issue view 86` = OPEN、进度 0%、无回引 → 正文写「本侧已引用，#86 落地后回引」 | 如实登记（G9 修法） |

测试侧既有钉死（与本正文互证，本票未改这些用例）：`packages/skill-calorie/test/render-t41.test.mjs`（空库 `missing-data`、wizard 走 `bad-input`、`buildPlanWizardView(null)` 抛 `plan 必填`）、`cli-smoke-t41.test.mjs`、`fetch-t4.test.mjs`（`writePlan` `dryRun` 断言）、`db-readonly-93.test.mjs`。

## 4. 门禁实测（持 `gate.lock`，sidebar 终端 `98-fix`；一次持锁窗口内串行跑完）

| 门禁 | 命令 | exit | 关键输出 |
|---|---|---|---|
| 构建 | `pnpm build` | **0** | `$ tsc -b`，无编译错误 |
| 边界 | `pnpm boundaries` | **0** | 7 条 `OK:` ＋ `boundaries: PASS` |
| 快照 | `pnpm snapshot:check` | **0** | `OK: 快照 == 实际拉取版（0.1.0@2fc0b42170d9604a）` |
| 发版预检 | `pnpm publish:pre` | **0** | 4 包 `无 workspace: 外泄` ＋ `check-publish --pre：PASS` |
| M6 用例 | `node --test packages/skill-calorie/test/skill-t11.test.mjs` | **0** | `tests 7 / pass 7 / fail 0`（含新 M6 用例 `✔`） |
| AUTO 块自检 | `node docs/research/t98-auto-block-check.mjs` | **0** | `AUTO_BLOCK_CHECK=PASS`（`idempotent-equals-buildHelpBlock=true`／`git-block-match=true`） |
| 测试 delta | `node docs/research/t98-test-delta.mjs` | 0（脚本本身） | 见 §4.1：`ADDED=1 GONE=9 DELTA_EMPTY=false`，**新增 1 条非本票** |

- PowerShell 5.1 会把 `pnpm` 的 stderr 进度行（`$ tsc -b` 等）包成 `NativeCommandError` 打印，属显示噪声；判定以 `$LASTEXITCODE` 为准（上表四条均 **0**）。
- 原始终端记录：`.scratch/t98/g-*.txt`（gitignore 草稿区）。

### 4.1 测试失败集 delta（归属见 §6.2）

`TAP_EXIT=1 PASS=865 FAIL=13 NOTOK=13 UNIQUE=13 BASELINE_HIT=12/21 ADDED=1 GONE=9 DELTA_EMPTY=false`

- **新增 1 条**：「口径 · 删除键数据驱动：prose／items[].status／库内行三源一致（回执 id 定位被删行）」——属 `packages/skill-calorie/test/cmd-write-40-persist.test.mjs`（**#101 在途**文件），且 `src/cli/write.ts` 同时被 #101 在途改动；该测试**不读 `SKILL.md`**（全文件零 `readFileSync`）→ 与 #98 无因果。
- **消失 9 条**：`#48`／`#50`／`#93` 族，是冻结基线取点之后落地的提交修好的。
- **本票可见面零影响**：读 `packages/skill-calorie/SKILL.md` 的测试只有 4 个文件（`test/skills-export-47.test.mjs`、`packages/plugin-calorie/test/skills-provider.test.mjs`、`packages/skill-calorie/test/skill-t11.test.mjs`、`packages/skill-calorie/test/calorie-c43.test.mjs`），其中 `skill-t11` 在本票改动在位时 **7/7 绿**。

## 5. 冲突登记（以实现为准）

- **C-1（路由层 vs 正文的适用范围）**：旧 M6 点名 `记围度`／`记体脂` 为「必须先 verify」；路由层把同族 5 词判为 `exec` 直连写键（`triggers/routing.ts` `WAKE_ROUTES` 场景 08）。**以实现为准**：正文用「AUTO 块与单命令入口只证明**写键可达**，不豁免本表 verify 前置」兜住（`SKILL.md` M6 章节「AUTO 块…」条），并**明确覆盖 AUTO 块**（G4）。**未改任何实现代码**（归 #87／#101）。
- **C-2（命令模板不可移植）**：旧 M6 模板是 `python scripts/render_body_measurements_wizard.py`；新版无该 py → 正文只写词→页映射与前置，页面本体归 #86。
- **C-3（换算未移植）**：皮褶钳 7 点→体脂换算未移植（`cli/write.ts` 原文），故场景 2 预填必须带算好的 `bodyFatPct`——与旧版「wizard 自动换算」不同。
- **C-4（同批铁则不同票）**：旧 M6 与 HTML-First 铁则是同一节第 5／4 条；新版 SKILL.md 无 HTML-First 段（归 #83）→ 本票只落 M6。
- **C-5（verify 页当前不存在）**：#86 OPEN 0% → 正文补「文字 verify」fallback（G3），端到端体验待 #86；本票不写任何页面文件。
- **C-6（版本号不预改 · G12）**：`SKILL.md` 现含 3 处 `skill-calorie@0.1.1`（公共安装器段 2 处 ＋ 「版本钉死登记」1 处）＋ `packages/skill-calorie/package.json` 的 `version`。**按编排者裁定：npm 发布窗口属框架图 #1（本图 out of scope）→ 本票不改版本号**，只登记「**发版时须同步 SKILL.md 3 处版本串与 changeset 消费**」。

## 6. 返修台账（A2 FAIL 68 → 逐项修法 → 证据）

| 项 | 缺陷 | 修法 | 证据（可验） |
|---|---|---|---|
| G1 | 自相矛盾：写「77 键无训练计划写键…计划写入只走 verify」＋场景 2「计划类 → AI 调写键」 | 改为「**训练计划 77 键无写键，当前不可写**；命中回 `non-exec` 并告知用户属二期，**不得**承诺 verify 后写入」 | `SKILL.md` M6 章节 non-exec 条；`NON_EXEC_REASONS.planWriteMissing` 逐字；实测 77 键无 plan 写键（§3 #8） |
| G2 | 缺强制力：旧版「优先级最高」「必须」「违反＝协议 fail mode」全无 | 补优先级声明（本节优先级最高）＋违规回执**逐字口径**＋同轮循环 ≤ 3 次 | `SKILL.md` M6 章节首段「**优先级**」条与末条「**违反 = 协议 fail mode**」；测试断言 `协议 fail mode` |
| G3 | 无 fallback：verify 页归 #86、当前不存在 → 无法端到端执行 | 补「#86 落地前 → **不得直写**；改为**文字 verify**：逐字复述待写字段并请求确认，确认后再调写键；无确认则停在确认步」 | `SKILL.md` M6 章节「**fallback（#86 落地前）**」条 |
| G4 | 兜底未覆盖 AUTO 块：块内直接给出可复制写命令 | 正文补「AUTO 块列出的单命令写键只证明**写键可达**，**不豁免**本表 verify 前置；分流仍按本表」 | `SKILL.md` M6 章节「AUTO 块…」条；测试断言 `不豁免` |
| G5 | 唤醒词不存在／缺前置：正文写「记体脂」，实测只有「记体脂（皮褶钳）」「记体脂（外部测量）」 | 补「**先问测量方式**」前置 ＋ 触发词改实际唤醒词（5 词） | `SKILL.md` M6 章节「**前置**」条与映射表；`WAKE_ROUTES` 场景 08 五项；测试断言 `记体脂（皮褶钳）` |
| G6 | 词→页映射缺失 | 新增映射表（3 个 wizard 页）＋备注 | `SKILL.md` M6 章节映射表；测试断言 3 个页名 |
| G7 | 行号锚全部漂移（`SKILL.md:50/51/52`、changeset `:8`、证据 §3） | 全部改**符号锚**：`validateMeasurementInput`／`dispatchWrite` 的 `ValidationError` 分支／`MEASURE_CAMEL` 白名单循环／`out()`／`buildPlanWizardView`／`validatePlan`／`NON_EXEC_REASONS.*`／`WAKE_ROUTES`；本证据文档同步 | §3 全表；`SKILL.md` 三场景表「CLI 落点（符号锚，可验）」列 |
| G8 | 自检脚本自证式：冻结 AUTO 块 sha → 合法重跑 `build-help.mjs` 必红 | 改为幂等断言：`buildHelpBlock()` 现算比对（仓库外临时副本）＋ `git show <ref>:SKILL.md` 现取比对；**不硬编码当前值** | `docs/research/t98-auto-block-check.mjs`；§2 取法 ②③ |
| G9 | 「两处互相引用」不实（#86 OPEN 0%、无回引） | 改为「**本侧已引用，#86 落地后回引**」 | `SKILL.md` M6 章节 fallback 条；`gh issue view 86` |
| G10 | 测试零锚点（删正文也全绿） | `skill-t11.test.mjs` 新增 M6 用例：标题匹配 ＋ 章节在 `AUTO-START` **之前** ＋ 前置/映射/不可写/不豁免/违规口径关键词 | 新用例；§6.1 变异自证 |
| G11 | 同步 #87 输出命名补丁 | `SKILL.md` 唯一出口段与公共安装器段各一行改为默认落点 `calorie_html/<中文command>_<TS>[_N].html` ＋ `--output` 覆盖（`--html` legacy 别名） | `git show d6e88b5 -- packages/skill-calorie/SKILL.md` |
| G12 | 版本号 | **不落地**（发布窗口属 #1）；只登记 C-6 | §5 C-6 |

### 6.1 变异自证（故意破坏 → 断言变红 → 恢复变绿）

脚本：`.scratch/t98/mutate.mjs`（持锁跑，内含 `node --test`）；实测 `MUTATION_SELFCHECK=PASS`。

| 变异 | 操作 | 期望 | 实测（exit） |
|---|---|---|---|
| M-1 | 临时删除 `SKILL.md` 的整个 M6 章节（标题到下一 `##`） | `skill-t11.test.mjs` 的 M6 用例红 | **exit=1 红**（删正文即红——证明断言不是自证式） |
| M-1b | 恢复 | 文件 sha 回到 `D0BF632C…0A98` | **exit=0**（sha 一致） |
| M-2 | 临时在 AUTO 块内插入一个字符 | `t98-auto-block-check.mjs` 红（幂等＋git 基线双失败） | **exit=1 红** |
| M-3 | 恢复 | M6 用例绿 ＋ 自检绿 ＋ sha 回原值 | **exit=0 / 0 / 0** |

### 6.2 delta 归属

- 脚本产出：`.scratch/t98/test-delta.md`（gitignore 草稿区；命令与 glob 取自根 `package.json` 的 `test` 脚本）。
- 结论见 §4.1：`ADDED=1 GONE=9`。新增的 1 条落在 #101 在途文件（`cmd-write-40-persist.test.mjs`）＋ #101 在途改动（`src/cli/write.ts`），不读 `SKILL.md`；消失的 9 条是基线取点后已修复的 `#48`／`#50`／`#93` 族。**本票路径（`SKILL.md`／`docs/research/t98-*`／`.changeset/t98-*`／M6 用例）零新增失败。**

## 7. 未做／未确证

- **G12 未落地**（版本号）——按裁定属 #1 发布窗口，见 §5 C-6。
- **#86 回引未落地**：#86 仍 OPEN 0%；本票只在正文与本文档登记依赖方向。
- **未跑** `pnpm --filter skill-calorie build`（会重写 AUTO 块，禁区）；只用根 `pnpm build`。
- **未做真机／浏览器取证**：本票是正文票，无 UI 产物。
- 未改任何 `src/**`（归 #87／#101）、`package.json`／`tooling/check-publish.mjs`／`render/index.ts`／`ci.yml`（归 #95）、`packages/base-render/**`（归 #75）。
- `skill-t11.test.mjs` 与 #95 共用：本票只提交自己的 M6 hunk（`git apply --cached` 只暂存本票 hunk），#95 的在途 hunk 未纳入本票提交。

## 8. 风险 top3

1. **路由层与正文的张力仍在**：5 个配置型词在 `WAKE_ROUTES` 是 `exec`，正文靠「只证明写键可达＋不豁免 verify 前置」覆盖（含 AUTO 块）。若后续把 M6 升级为硬门（路由层拒绝无 verify 的写键），需改实现（归 #87／#101）——本票只登记、不动手。
2. **verify 页尚不存在**：三场景表里「出 wizard 页」当前无产物（归 #86）；已有文字 verify fallback，但端到端体验与真机证据待 #86。
3. **版本号与 changeset 消费未同步（G12）**：`SKILL.md` 3 处 `@0.1.1` 与 `package.json` 版本、changeset 消费必须在 #1 发布窗口同批改；漏改则安装说明与已发布包漂移。

## 附：复跑命令

```powershell
# ① AUTO 块完整性（幂等＋git 基线；④ 需 dist，先跑根 pnpm build）
node docs/research/t98-auto-block-check.mjs
node docs/research/t98-auto-block-check.mjs --ref 14e7872   # 与改动前提交的块比对

# ② 门禁四件套（持锁）
pnpm build; pnpm boundaries; pnpm snapshot:check; pnpm publish:pre

# ③ M6 用例（可单独跑）
node --test --test-name-pattern="M6 Wizard Verify" packages/skill-calorie/test/skill-t11.test.mjs

# ④ 测试失败集 delta（持锁；TAP 直写文件规避 pwsh 转码）
node docs/research/t98-test-delta.mjs          # 结果落 .scratch/t98/test-delta.md
node docs/research/t98-test-delta.mjs --reuse  # 复用已有 TAP 重新解析

# ⑤ AUTO 块零破坏（独立取法）
node -e "const {execSync}=require('node:child_process'),{createHash}=require('node:crypto'),fs=require('node:fs');const S='<!-- HELP-AUTO-START -->',E='<!-- HELP-AUTO-END -->';const b=t=>{const s=t.indexOf(S),e=t.indexOf(E);return t.slice(s,e+E.length)};const h=x=>createHash('sha256').update(x,'utf8').digest('hex').toUpperCase();const g=execSync('git show 14e7872:packages/skill-calorie/SKILL.md',{maxBuffer:1e8}).toString('utf8');console.log(h(b(g))===h(b(fs.readFileSync('packages/skill-calorie/SKILL.md','utf8')))?'AUTO_UNCHANGED=true':'AUTO_UNCHANGED=false')"
```

# #98（map #63）M6 Wizard Verify 铁则正文 — 取证

**结论**：`packages/skill-calorie/SKILL.md` 新增 `## Wizard Verify 铁则（M6，v2.4.3 复刻）`（15 行，`SKILL.md:44-57`），落在 `<!-- HELP-AUTO-START/END -->` 块**之外**（块内容 sha256 逐字节未变）；三场景表逐条锚到实现 `file:line`；与 #86 页面互相引用只写本侧。

- 票面：`gh issue view 98`（label `wayfinder:task`，进度 0%）。
- 铁则原文出处（仓内）：`docs/research/t71-old-baseline-inventory.md:669-679`（§6.4「第 5 条 · Wizard Verify 决策铁则（L20-28，v2.4.3）」，逐字引旧 `SKILL.md:20-28`）；只读对照 `D:\2Study\StudyNotes\SKILLS\卡路里\SKILL.md:20-28`。
- 必须复刻清单 M6 行：`docs/research/t71-old-baseline-inventory.md:726`；Q4（wizard 页是否复刻）：`:755`。

## 1. 正文落点

| 项 | 值 |
|---|---|
| 文件 | `packages/skill-calorie/SKILL.md` |
| 新章节 | `## Wizard Verify 铁则（M6，v2.4.3 复刻）` |
| 行号 | 44（标题）／48-52（三场景表）／54-57（要点与禁止项） |
| AUTO 块 | 61-144（改动前 46-129；**内容未变**） |
| 改动量 | `1 file changed, 15 insertions(+)`（commit `e2305ec`） |
| 术语 | 沿 `CONTEXT.md` 与票面用词：配置型 wizard／verify／按场景分流 |

## 2. AUTO 块未破坏证据

| 项 | 改动前 | 改动后 |
|---|---|---|
| AUTO 块 sha256 | `D884C2D018AB1AD19CA8D303EE1CF10CCEDB0708C2E796EE23AB41494EC00DC0` | 同值 |
| AUTO 块字节数 | 11977 | 11977 |
| 整文件 sha256 | `CA8CCF27D64BEC235F300349D87C8F3AB79C9CD2B96603523E5DED611E7BA35D` | `753C690551A1990D6A63F9B3545210DBCCCA7767D6F4CDBC8E90AD07F6FB6EB0` |
| 文件行数 | 151 | 166 |

- 可复跑自检：`node docs/research/t98-auto-block-check.mjs` → 断言 ①块 sha == 冻结值 ②M6 正文行号 < AUTO-START 行号（在块外）③LF-only 无 BOM ④零字面 `\n`。
- **为什么必须这样验**：`packages/skill-calorie/scripts/build-help.mjs:154-161` 会**整文件重写**标记块（`:159` 以标记切片拼回，块外内容原样保留）→ 正文写在块外才不被构建覆盖；本票**未跑** `pnpm --filter skill-calorie build`（约定禁区），只用根 `pnpm build`（`tsc -b`，不跑 build-help）。
- 文件属性实测：LF-only（`CR` 计数 0）、无 BOM（首 3 字节 `45,45,45` = `---`）、字面 `\n` 计数 0。

## 3. 逐条「铁则 → 实现 file:line 对照」

| # | 正文条目 | 实现落点（可验） | 判定 |
|---|---|---|---|
| 1 | 配置型 wizard ＝ 写库前要用户先看一眼的配置写 | 唯一 wizard 形态键 `calorie.view.plan-wizard`（`src/cli/keys.ts:98` 标题「构建向导」；`src/render/envelope.ts:36` 键名、`:74` shape `stat`） | 一致 |
| 2 | 场景 1（主动填）：空参被拦 | `src/fetch/body.ts:96-109` `validateMeasurementInput`，`:107` 无任何围度项即 `fail('围度','empty',…)` → `src/cli/write.ts:205` `ValidationError` → `CalorieRenderError('bad-input')` → exit 2 | 一致 |
| 3 | 场景 2（预填 verify）：预填键限白名单 | `src/cli/write.ts:746-765` `calorie.body.measure-add`；`:754-756` 非 `MEASURE_CAMEL` 字段即 `fail(2,'不支持字段: ')` | 一致 |
| 4 | 场景 2：皮褶钳须带算好的 `bodyFatPct` | `src/cli/write.ts:720-738`；`:732` 缺 `bodyFatPct` 即 `fail(2, …'皮褶→体脂自动换算未移植，直传实测值')` | 一致（换算未移植，页面／调用方算） |
| 5 | 场景 2：计划类先跑纯校验 dry-run | `src/cli/cmd_read.ts:555-562`（缺 `plan` 即 `fail(2,'缺参数 plan（PlanInput 对象）')`）→ `src/render/planPlate.ts:55-72`（`:70` 只调 `validatePlan`；`:52` 接口 `dryRun: true`，`:71` 返回 `{dryRun:true, insertedCount:0}`）→ `src/fetch/plan.ts:71` `validatePlan` 纯校验；写库函数 `:158-160` 的 `dryRun` 短路返回、不落 INSERT | 一致（CLI wizard 键不写库） |
| 6 | 场景 3（直接录）：35 写键一律 `receipt` 形 | `src/cli/write.ts:3-5`（模块头契约）、`:112-115` `out()` 组装 `{ok,message,receipt}`；body 两键回执 `:735-737`／`:762-764` | 一致 |
| 7 | 需多步交互的配置写词落 `non-exec`，reason 逐字 wizard | `src/triggers/routing.ts:74-76` `NON_EXEC_REASONS.wizard`；词表 `:193-194`（批量导入食品／校验批量导入）、`:366-372`（定营养目标(自动算)／定饮水目标(自动算)／一键定全套目标） | 一致 |
| 8 | 77 键无训练计划写键 → 计划写入只走 verify | `src/triggers/routing.ts:97-98` `planWriteMissing`；`:342` `定训练计划` 落 `non-exec` 该 reason | 一致 |
| 9 | `记围度`／`记体脂` 类词有单命令入口（只证明写键可达） | `src/triggers/routing.ts:396-400`（5 词 `kind:'exec'` → `body.measure-add`／`composition-add`） | 一致（见 §5 C-1） |
| 10 | 与 #86 页面互相引用 | 本侧：正文要点 1；#86 票面「4 页可跑；『先给用户看再写』路径有真机证据」「只用静态 HTML ＋ copyText」 | 本侧已写；#86 侧待其落地（§7） |

测试侧既有钉死（与本正文互证，本票未改测试）：`packages/skill-calorie/test/render-t41.test.mjs:225`（空库 18 键 missing-data、wizard 走 bad-input）、`:235`（`buildPlanWizardView(null)` 抛 `plan 必填`）、`:291`；`packages/skill-calorie/test/cli-smoke-t41.test.mjs:84`；`packages/skill-calorie/test/fetch-t4.test.mjs:141-142`（`writePlan` dryRun 断言）；`packages/skill-calorie/test/db-readonly-93.test.mjs:129`。

## 4. 门禁实测（全部持锁执行）

| 门禁 | 命令 | exit | 关键输出 |
|---|---|---|---|
| 构建 | `pnpm build` | **0** | 无输出（`tsc -b` 干净） |
| 边界 | `pnpm boundaries` | **0** | `boundaries: PASS`（7 条 OK） |
| 快照 | `pnpm snapshot:check` | **0** | `OK: 快照 == 实际拉取版（0.1.0@2fc0b42170d9604a）` |
| 发版预检 | `pnpm publish:pre` | **0** | `check-publish --pre：PASS` |
| AUTO 块自检 | `node docs/research/t98-auto-block-check.mjs` | **0** | `AUTO_BLOCK_CHECK=PASS` |
| 测试 delta | `node docs/research/t98-test-delta.mjs` | 0 | `PASS=853 FAIL=16 NOTOK=16 UNIQUE=16 BASELINE_HIT=12/21 ADDED=4 GONE=9 DELTA_EMPTY=false` |

**delta 不为空，但与本票无因果**——归属分析见 §6。冻结基线（`.scratch/t75/baseline-failing.txt`，21 条）取点早于本轮多个已落地提交（如 `526e94e feat(93)…`）与 #101 的在途测试文件，故共享工作区上的全量 delta 天然受并发票污染。

## 5. 冲突登记（以实现为准）

- **C-1（路由层 vs 旧 M6 的适用范围）**：旧 M6 点名 `记围度`／`记体脂` 为「配置型 wizard，必须先 verify」；新版路由层把同族 5 词判为 `exec` 直连写键（`src/triggers/routing.ts:396-400`；判据见 `:14-20`、`:71-72`）。**以实现为准**：正文按「单命令入口只证明写键可达，分流仍按本表」登记（`SKILL.md:56`），verify 体验归 #86 页面层。**未改任何实现代码**（归 #87／#101）。
- **C-2（命令模板不可移植）**：旧 M6 场景 1/2 模板是 `python scripts/render_body_measurements_wizard.py`；新版无该 py，CLI 侧只留「空参被拦／白名单」两个锚点，页面本体归 #86。
- **C-3（换算未移植）**：皮褶钳 7 点→体脂换算未移植（`src/cli/write.ts:732` 原文），故场景 2 预填必须带算好的 `bodyFatPct`——与旧版「wizard 自动换算」不同。
- **C-4（同批铁则不同票）**：旧版 M6 与 HTML-First 铁则是同一节「强制性规定」的第 5／4 条（`docs/research/t71-old-baseline-inventory.md:669-679`／`:649-658`）；新版 SKILL.md 无 HTML-First 段（归 #83，不在本票范围）→ 本票只落 M6，未落 M4。

## 6. 测试失败集 delta 归属

明细见 `.scratch/t98/test-delta.md`（脚本产出）。

- **新增 4 条**全部来自 `packages/skill-calorie/test/cmd-write-40-persist.test.mjs`（文件头 `/** #101 · 写链落库断言… */`，用例在 `:254`／`:564`／`:639`）——**#101 未跟踪的在途测试文件**，不在冻结基线内。
- **消失 9 条**为 `#48`／`#50`／`#93` 三族，是基线取点之后落地的提交修好的，与本票无关。
- **本票可见面隔离（A/B 实测）**：本票只改 ①`packages/skill-calorie/SKILL.md`（AUTO 块外 15 行）②新增 `docs/research/t98-*.mjs` ③新增 `.changeset/t98-*.md`。读 SKILL.md 的测试只有 4 个文件——`test/skills-export-47.test.mjs`、`packages/plugin-calorie/test/skills-provider.test.mjs`、`packages/skill-calorie/test/skill-t11.test.mjs`、`packages/skill-calorie/test/calorie-c43.test.mjs`；同一持锁窗口内 A/B 实测：
  - **AFTER**（本票改动在位）：`# pass 20 / # fail 0`，exit 0。
  - **BEFORE**（临时换回 `e2305ec~1` 的 SKILL.md，sha `CA8CCF27…1E7BA35D`）：`# pass 20 / # fail 0`，exit 0。
  - 结论：**本票对测试结果零影响**；测试后 SKILL.md 已复原（sha 回到 `753C6905…F6FB6EB0`）。
- 其余测试不读本票改动的任何文件：全仓 `.test.mjs` 里读 `docs/research/` 的只有 `test/calorie-routing-81.test.mjs:29`（`t81-exec-smoke.md`）与 `packages/base-render/test/contract-signatures.test.mjs:554`／`:374-388`（`t92`／`t118`／`.changeset/base-paint-contract-freeze.md`），读 `.changeset/` 的只有后者那一处，均非本票文件。

## 7. 未做／未确证

- **未跑** `pnpm --filter skill-calorie build`（会重写 AUTO 块，约定禁区）；只用根 `pnpm build`。
- **未写 #86 的任何文件**（#86 不在前沿且属禁区）→「互相引用」目前只有本侧；#86 侧需在其票内回引 `SKILL.md` 的 M6 章节。
- **未做真机／浏览器取证**：本票是正文票，无 UI 产物。
- 未改任何 `src/**`（归 #87／#101）、`scripts/build-help.mjs`（归 #95）、`packages/base-render/**`（归 #75）。
- AUTO 块冻结 sha 只对本提交成立；后续票合法重生成该块后需更新 `t98-auto-block-check.mjs` 的常量（否则自检会红，见 §8 风险 3）。

## 8. 风险 top3

1. **路由层与正文的张力仍在**：`记围度`／`记体脂` 在 `routing.ts:396-400` 是 `exec`，正文靠一句「分流仍按本表」兜住。若后续把 M6 提升为硬门（路由层拒绝无 verify 的写键），需改实现（归 #87／#101）——本票只登记、不动手。
2. **verify 页尚不存在**：三场景表里「出 wizard 页」这一步当前无产物（归 #86）；正文已用「归 #86」明示，但 #86 落地前该流程不可端到端跑通。
3. **AUTO 块 sha 冻结值易腐**：任何重跑 `packages/skill-calorie/scripts/build-help.mjs` 的票都会合法改块，届时本票自检脚本会红——需按新值更新常量，否则会被误读为「AUTO 块被破坏」。

## 附：复跑命令

```powershell
# ① AUTO 块完整性（纯读，不需持锁）
node docs/research/t98-auto-block-check.mjs

# ② 门禁四件套（持锁）
pnpm build; pnpm boundaries; pnpm snapshot:check; pnpm publish:pre

# ③ 测试失败集 delta（持锁；TAP 直写文件规避 pwsh 转码）
node docs/research/t98-test-delta.mjs          # 结果落 .scratch/t98/test-delta.md
node docs/research/t98-test-delta.mjs --reuse  # 复用已有 TAP 重新解析

# ④ 本票可见面 A/B（持锁；4 个读 SKILL.md 的测试文件）
node --test --test-reporter=tap test/skills-export-47.test.mjs `
  packages/plugin-calorie/test/skills-provider.test.mjs `
  packages/skill-calorie/test/skill-t11.test.mjs `
  packages/skill-calorie/test/calorie-c43.test.mjs
```

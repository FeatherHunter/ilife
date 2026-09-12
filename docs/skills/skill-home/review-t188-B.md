# 票 #188 审查（对抗式 B · 结构纪律与风险）

**裁决：整改后通过（73/100）**　A 结构合规 22/35 ・ B 裁定落实 31/35 ・ C 风险与遗留 20/30
本体成立：内容资产能自证（9/30/73）、双摘要锁＋重跑等值、新用例在 CI 上真跑。扣分全在台账／清单／口径／自制解析器的可证伪性。
取证命令：`[System.IO.File]::ReadAllLines($p,[Text.Encoding]::UTF8).Count`（行数）／`Select-String`（grep）／`Test-Path`／`git status --porcelain` `git diff`。

## 一 行数与告警线（structure.md:70、:97-101；本包线 350＝AGENTS.md:7）

| 件 | 行 | 判定 |
|---|---|---|
| `src/help/helpAssets.ts` | 1164 | 生成物，AGENTS.md:8 单列豁免 ✓ |
| `src/help/scenarios.yaml` | **1283** | 事实源数据件：非生成物、非测试／文档 → 数法**没覆盖**它 ⚠ |
| `src/cli/cmd_read.ts` | 741 | 超 391，AGENTS.md:9 已列并归票 7 #190 ✓ |
| `src/fetch/db.ts` | **434** | **超 84，未列未报** ✗ |
| `scripts/gen-help-assets.mjs` | 51（拆前 409） | 已当场报＋拆法 ✓（t188-impl-notes.md:48） |
| `scripts/lib/help-assets.mjs`／`yaml-subset.mjs` | 192／172 | ✓ |
| `test/help-assets.test.mjs`／`AGENTS.md` | 176／21 | 测试不在管辖（structure.md:9）✓ |

① **有超线未报件**：`src/fetch/db.ts`（434）② 报告那句「已超线，需要根据规则进行重构。」逐字在位（t188-impl-notes.md:48），原因（409>350）＋拆法（51/192/172，并说明两件方案会顶到 ~370）**到位**；但 409 不可复算（件未提交、无基线），只能采信报告。③ 「生成物单列」写清了（AGENTS.md:8 含禁手改＋改事实源）；**没写清**的是非生成物数据件（yaml 1283 行）怎么数。

## 二 AGENTS.md 对票 12／票 4 裁决（t187-decision.md:84 第 13 条）

四条逐条落地、无自创说法：数字 350（AGENTS.md:7）／数法（UTF-8 真实行数、含空行、按文件，:7）／生成物单列（:8）／cmd_read.ts 741 归票 7 #190（:9）；:13 引的「决策 3」实存（t195-decisions-record.md:44）✓。
缺一条：已确认的「骨架 73／列出 70」口径（t189-body.md:33）**未进 AGENTS.md**，只活在代码注释（helpAssets.ts:8、:36、:1100）与票 6 票面。

## 三 门与 CI：新用例跑不跑

- 包内门 ✓：`package.json:32` 已含 `test/help-assets.test.mjs`；用例自检在 `test:159-166`。
- **CI 跑** ✓：仓根 `package.json:13` 的 glob 已含 `"packages/skill-home/test/*.test.mjs"`，`.github/workflows/ci.yml:34` 跑 `pnpm test` → 缺什么：不缺。
- 但报告 §7「今天的洞＝包内用例从不执行」（t188-impl-notes.md:40）**不实**：CI 早经仓根 glob 跑到该目录，真洞只是包级 `test` 串。

## 四 票 13（#196）落法

- 原话＝`status: "deprecated"`（t196-resolution.md:22、t188-body.md:39）；实现在**组级** `deprecated: true`（help-assets.mjs:6、helpAssets.ts:1096），3 条 `status` 仍空串、prompt 空串（test:129-131）→ 字面偏离，但编排方已追认并转为票 6 验收项（t187-decision.md:86）：判**不算偏离，无需回改**。
- 实质三条达成：prompt 不迁 ✓（test:129）／不建域目录 ✓（本票唯一新目录是 `scripts/lib`，见七·1）／HELP 不列 → 票面已接（t189-body.md:32-33「渲染时过滤掉」＋70），但**本票无机械锁**：资产只给 73（helpAssets.ts:1106），列出 70 仅由 `prompt_template !== ''` 代理（test:131）→ 票 6 写死 73 仍全绿。
- 计数口径：73 可自证；「主数 73／列出 70」在资产与本包规矩里都不成文 → 下游只能读注释。

## 五 隐藏耦合与风险

1. **不抢同一处** ✓：生成器只写 `helpAssets.ts`（help-assets.mjs:22、gen-help-assets.mjs:49）；`build-help.mjs:24-29` 只写 `SKILL.md`，两者无交集，build-help.mjs 本次未改（git status 无它）。票 12 担心的「都碰注入块」（t195-structure-design.md:45、:229）未发生。
2. **发包面**：`package.json:16-20` files 仅 dist／SKILL.md／templates → 事实源与三个 scripts 都不发包，发布态**无法复跑** `gen:help-assets:check`（G2 只断 dist/cli/cmd_read.js，故今天不红）。
3. **YAML 子集不支持面**（yaml-subset.mjs）：不支持块标量 `|`／`>`（当字面值）、锚点/别名/tag、多文档、流程集合真解析（`{}`／`[]` 原样返回字符串，:109）、重复键（静默后写赢）、tab 缩进、非 ASCII 键；**最险是 :162**——缩进 ≥4 或缩进 2 起的 `- ` 行**静默跳过**。今天只落在不收的 `html:`／`variants:` 子树（scenarios.yaml:53-69 等）→ 无实害；:168-171 只查字段名白名单，将来必收字段写进嵌套块会被静默丢掉且不报错。
4. **验收是循环的**：`test:93-113` 用同一 `parseScenarioYaml` 的输出对账资产生成结果；唯一独立证据是报告 §2 的一次性 PyYAML oracle（跑完即删，不进 CI）→ 解析器读错「已收字段」时两边一致、仍绿。
5. **导出面**：`helpAssets.ts` 10 个导出（:11-1108）靠生成物豁免；`scripts/lib/help-assets.mjs` **12 个导出**（:15-184：parseScenarioYaml／PKG_DIR／SRC_YAML／OUT_TS／EXPECT／TYPE_WORDS／GROUP_COMMAND_PREFIXES／buildGroups／sceneTypes／assertShape／renderAsset／generate）＞ 铁律五的 5（structure.md:53），scripts/ 与 test/ 都在跨目录用，未报；yaml-subset.mjs 1 个导出 ✓。
6. **跨包直读**：`test:115-121` 直读 `packages/base-render/assets/help-template.html`，而 `package.json:24-26` 依赖只有 base-link-core → 隐藏耦合（有出处注释与等值断言，但未声明依赖，且 `pnpm boundaries` 看不见 fs 读）。
7. **对照表一对二**：`home.care` 同时挂 family 与 setup（help-assets.mjs:40-41；实况 wakewords.ts:14-15）→ 按前缀反查分组有二义，用例用 Set 判等（test:149-153）盖过重复。

## 六 有没有提前做票 6／票 7 的活

没有 ✓：`src/help/manifest.ts`／`helpFile.ts`／`output.ts`／`src/render/helpPaths.ts`／`src/render/helpFile.ts`／`src/output.ts` 盘上**均不在**；`src/help/index.ts` 未改（仅转发 lookup）；`src/cli/cmd_read.ts` 未动（git status 仅 `M packages/skill-home/package.json`，diff 只 test＋两条 gen 脚本）。

## 七 必须整改

1. **补第五步交付对账**（structure.md:105-107；票 12 明确留给实现票，t195-structure-design.md:67、:220）：实到比票 12 清单多出**新目录层级 `scripts/lib/` ＋2 件**（票 12 只列 `scripts/gen-help-assets.mjs` 一件，t195-structure-design.md:26、:32、:95），而报告 §9 写「不新建目录」（t188-impl-notes.md:50）**与实到不符**；按 structure.md:88 新目录层级须用户点头，报告未记该点头。
2. `AGENTS.md:9` 台账补 `src/fetch/db.ts`（434 行，超 84）并点归属票；顺手把 `src/help/scenarios.yaml`（1283 行）计入与否写成一句。
3. `scripts/lib/help-assets.mjs:15-184` 收口到 ≤5 个导出（CLI 所需与 test 所需的另立一件，或收成一个 `genHelpAssets()` 面）。
4. 给解析器静默面加 fail-closed：`yaml-subset.mjs:162` 跳过前记数并断言「被跳过行只在 html／variants 子树内」；或把 PyYAML 等值对账留成仓内可复跑用例。
5. 票 6 开工前把「列出 70」写进资产或 AGENTS.md 并加锁，别只靠 `prompt_template !== ''` 的代理断言。

# #79 审查席 1（红队·契约/对照表面）审查报告（第 2 任）

> 被审：票 #79《base- 组件契约重写与三包统一版本》，提交 `abcde5e`／`40fa1c5`／`47d346c`，证据 `docs/research/t79-base-contract.md`（417 行）。
> 主张：冻结签名面 130 条＝有 130／部分 0／无 0；v1.30 26 项＝有 12／部分 6／无 8；三包统一 0.2.0；CI lockstep（`packages/base-render/test/base-version-lockstep.test.mjs` 5 用例）。
> 本席：前任销毁，只接手两探针（`t79-review-red-probe.mjs`／`t79-review-red-mutate.mjs`，已保命提交 `dc9230a`，读后复用其 `collect()` 取数，结论全部自己跑出）。
> 基线：审读时 HEAD `1832eb1`（被审三提交均在位；其上他席提交与本票无关）；`git show --name-only abcde5e` 确认**零 `src/`／`dist/` 改动**（18 文件＝版本字段＋range＋新测试＋锁文件＋docs＋changeset）。

## 1. 范围合规

- `packages/skill-calorie/**` 本票零改动（`git log` 该包末次 `ca46495` #123）✓；SKILL.md 首 3 字节本席实测 `2D 2D 2D` ✓。
- 被审 P-1（`40fa1c5` 连带他席 `t83-recheck-r2.md` 19 行）／P-2（HEAD 误重置后 10 秒恢复）已自曝；本席核 `git show 40fa1c5 --stat` 确为**内容逐字在位**，证据效力无损，不另记 S（归属裁决留编排者）。
- 禁全量 `pnpm test` ✓（本席只跑单文件 lockstep＋快照门＋自写取数器）；变异全部持锁内完成、sha256 自证、零残留（`MUT-BAK-FILES []`）。

## 2. 逐条攻击

### A. 130 条穷举性（结论：成立，复核不符 0）

- 自写脚本之外，用前任探针独立重算（双实现互证：TS 编译器 API vs 自写 `export *` 文本解析）：契约 7 个标记区共 **130 行**（`#74:25 #75:8 #76:44 #77:24 #78:27 #92:2`）↔ 报告表 B **130 行**，分票计数逐票相等，**漏 0／多 0／重复 0**；声明点与报告 `file:line` 全对上（`declMismatch []`）；出口面双实现零分歧（`TYPE-IMPL-DIFF []`）；种类/票/章节全对上。
- 抽 **10 条**三件套人眼复核（声明点原文＋dist 出口＋测试真使用行），覆盖 #74×2／#76×3／#75×1／#77×1／#78×1／#92×2：

| # | 名字 | 声明点 | 出口面 | 真使用（非注释） | 报告计数 | 复核 |
|---|---|---|---|---|---|---|
| 1 | `TEMPLATE_MARKERS` | spec/template.ts:22 ✓ | runtime ✓ | deepEqual＋逐字断言（22 occ／5 文件） | 22处／5文件 ✓ | 符 |
| 2 | `FillTemplate` | spec/template.ts:362 ✓ | d.ts ✓ | test-d `Expect<Equal<…>>`（2 occ） | 2处／1文件 ✓ | 符 |
| 3 | `TemplateKind` | spec/template.ts:86 ✓ | d.ts ✓ | test-d 联合类型断言（3 occ） | 3处／1文件 ✓ | 符 |
| 4 | `BuildStyleSheet` | spec/style.ts:63 ✓ | d.ts ✓ | test-d 签名断言（2 occ） | 2处／1文件 ✓ | 符 |
| 5 | `COPY_CHANNELS` | spec/controls.ts:32 ✓ | runtime ✓ | import＋deepEqual（3 occ／2 文件） | 3处／2文件 ✓ | 符 |
| 6 | `CopyText` | controls.ts:333 ✓ | runtime ✓ | `await copyText(…)` 真调用（65 occ；`blocks.test.mjs:267` 系同名 prop，属掺杂但真调用充分） | 表B行（高引用） | 符 |
| 7 | `BuildChartsHelpersJs` | spec/charts.ts:273 ✓ | d.ts ✓ | test-d 别名断言（3 occ） | 3处／1文件 ✓ | 符 |
| 8 | `DataProjectionSpec` | spec/text.ts:106 ✓ | d.ts ✓ | test-d 结构断言（2 occ） | 2处／1文件 ✓ | 符 |
| 9 | `SPEC_FROZEN_SURFACE` | spec/index.ts:44 ✓ | runtime ✓ | import（多行 import 块内）＋freeze 断言（7 occ） | 7处 | 符 |
| 10 | `BASE_PAINT_CONTRACT_VERSION` | spec/index.ts:26 ✓ | runtime ✓ | 跨 3 文件真断言（9 occ） | 高引用 | 符 |

- 「有 130／部分 0／无 0」成立：最弱行亦有 ≥2 处真使用（type 行走 test-d 编译期断言，属有效锁定）。

### B. 26 项穷举性（结论：成立，复核不符 0）

- 契约 §2 表头＋**26 数据行**（`§3 §3 §4 §5 §5.1 §6.1 §6.2 §6.2§6.8 §6.3 §6.3§6.7 §6.3×3 §6.3§6.9 §6.4 §6.5 §6.6 §7 §6.5 §6.2§9 §8 §9 §2 §2 §0 §6.5`）↔ 报告表 A 26 行，节号序列一致，**无遗漏无合并**（来源：`t92-old-v130-signatures.md`／`t92-verify-v3-spec.md` 对能力锚点；探针能力集差异仅为反引号格式假阳性）。
- 抽 **6 条**「有/部分/无」独立复核（occurrence 口径重数，与报告机读口径对齐）：

| 行 | 能力 | 报告结论 | 本席复核 |
|---|---|---|---|
| §3 占位符 | 有 | `fillTemplate` 49 occ／7 文件 ✓ | 有成立 |
| §4 payload | 有 | `createEnvelope` 13 occ（3＋根 test/ 2＋8）✓；`parseEnvelope` 8 occ（6＋2）✓；`assertShapeData` 全仓测试面 **0**（仅 src 4 处，G-4 已登记，见 D-5） | 有成立（口径：sibling 覆盖即锁住；偏宽但明示） |
| §5 P0 守卫 | 部分 | `escapeHtml` 在面；`arr` 0、`yes` 0、`val` 仅 JS 片段字符串内 `var val`（controls.ts:906-907，非守卫） | 部分成立 |
| §6.3 formPrompt | 无 | src 唯一命中为 blocks.ts:21 文档注释（禁交互控件名），无实现 | 无成立 |
| §2 领域无关 | 有 | 去注释后 base-* 25 文件中文领域词（卡路里/记账/睡眠/体重/运动/饮食/热量…）**0 命中**；`calorie.today` 类 ASCII 键字面量属契约明示允许（"只认 key 字面量"） | 有成立 |
| §6.5 白名单例外 | 无 | skill src 零 `<svg>`/`<canvas>`；`CHART_KINDS` 15 occ 锁闭集 | 无成立 |

### C. 版本 0.2.0 正确性（结论：成立，附 1 已登记例外）

| 检查 | 实测 |
|---|---|
| 三包 version | `base-link-core`／`base-paint`（base-render 目录）／`base-combos` 均为 **0.2.0** ✓ |
| 内部 range | combos `workspace:^0.2.0` ✓；base-paint devDep `^0.2.0` ✓；5 技能（bill/chef/home/memo/schedule）`^0.2.0` ✓；lockfile importer 一致，`link:../base-link-core` ✓ |
| changeset | `fixed: [[三包]]` ✓；`t79-base-version-lockstep.md` patch 记账 ✓（文字瑕疵见 D-2） |
| 破坏性变更 | 被审零 `src/` 改动 → 无签名变更；版本常量 5 个钉死 `'0.1.0'`（lockstep 用例 5）✓ |
| 发布冲突 | registry 实测：`base-paint [0.1.0,0.2.0]`（报告 §4.2 引 `npm view` 属实）、`base-link-core [0.1.0]`、`base-combos [0.1.0]` → 0.2.0 为**新前进版本**，无重发冲突 ✓ |
| 例外 | `skill-calorie` devDep `^0.1.0`→registry 0.1.0（G-2 已登记；type-only 性本席**未独立复核**，采信＋登记） |

### D. lockstep 鉴别力（本席持锁重跑前任变异脚本，结论：有用例级鉴别力＋1 覆盖盲区）

基线 sha（与报告 §8 步 0 `ce47ff3316f4e139…` **同值**交叉确认）→ 变异 → 必红 → 还原逐字节等 → 绿：

| 变异 | 动作 | 断言 | 还原自证 |
|---|---|---|---|
| MUT-1 | combos version→0.1.0 | **红** exit1 pass4/fail1，消息`实得：…base-combos@0.1.0` | `restored=ce47ff3316f4e139` byteEqual，重建后 5/5 绿 |
| MUT-2 | changeset fixed→[] | **红** exit1，消息`fixed 组必须恰含…` | sha 还原等，5/5 绿 |
| MUT-3 | combos dep→workspace:^0.1.0 | **红** exit1，消息`不同版本线` | sha 还原等 |
| MUT-4（盲区探针） | skill-bill dep→^0.1.0 | **绿**（exit0 5/5 —— 用例 4 只查 2 个包内 range，技能面不在断言面内，见 D-1） | 但 `frozen-lockfile` **红** exit1（specifier mismatch）→ CI 安装门兜底；sha 还原等 |
| 终态 | — | FINAL-BYTE-IDENTICAL true，`.mut-bak` 0 残留，FINAL-TEST 5/5 | 工作区干净（仅他席改动残留） |

## 3. 缺陷（归属＋严重度）

| ID | 严重度 | 归属 | 缺陷 |
|---|---|---|---|
| D-1 | **S2** | #79 | lockstep 用例 4 不覆盖技能包 range：MUT-4 实证 skill-bill 退回 ^0.1.0 时断言仍绿。而交付文本 §4.3 自述的风险正是"不改 range 则运行时来源被静默换成 registry"——**交付机制未覆盖自己陈述的风险面**。缓解：G-2 已登记＋`--frozen-lockfile` 实测兜底（MUT-4 红）。 |
| D-2 | S3 | #79 | changeset `t79-base-version-lockstep.md`"5 个技能包仍声明 ^0.1.0"与实况不符（实况：仅 skill-calorie devDep；另 5 包已 ^0.2.0）。机制无碍，文字 stale。 |
| D-3 | S3 | #79 | 报告 §1"测试引用＝base-render test＋test-d"遗漏根 `test/`（表 A 计数实际含根 test/：createEnvelope 13＝3＋2＋8）。计数偏向更全，结论无碍。 |
| D-4 | S3（方法论注记，非被审） | 前任探针 | `t79-review-red-probe.mjs` 的 import 判定窗口 400 字符，巨型多行 import 内约 51 条（如 SPEC_FROZEN_SURFACE:62）误标未 import；本席人眼纠正，130 条结论无碍。 |
| D-5 | S3（观察＋建议） | #79 | 表 A 第 3 行 `assertShapeData` 零测试仍判"有"（G-4 已登记）。口径明示，成立；建议补一条单测（报告 §9 自已建议）。 |
| G-1／G-3 | 转述（已登记） | 契约维护／发布链 | 契约 §5"三包均为 0.1.0／不升版"文档漂移；`workspace:^` 与 `check-publish` 全量门冲突（本席未独立复核 :102，标未复核）。 |

## 4. 门禁表（本席全部经 `run-locked --ticket 79`）

| 命令 | exit | runId |
|---|---|---|
| presence tick | 0 | `adeb7809-9b00-4684-b70e-d12f0f9001bb` |
| 红探针全量（输出吞，仅 exit） | 0 | `dec038be-2a4f-4a17-bd38-1618c6824a15` |
| 取数 sample/collect | 0 | `f173c8f1-023b-4ee2-95ef-516af1c12883` |
| recheck10 取数 | 0 | `2b45fc43-01b2-416e-b0d7-fbbb5ddd5c14` |
| 缺失文件 typo run | ≠0 | `4dd44b81-149f-4c29-af14-bf459cca0a49`（本席笔误，持锁内失败，无副作用） |
| 表 A 取数 | 0 | `ff34e2c9-e3f4-4745-910c-781043833993` |
| cn-scan 转义失败 run | 1 | `1437e495-5fae-43f7-b767-37269561bef6`（pwsh `$1` 吞噬，持锁内失败，无副作用） |
| cn-scan 取数 | 0 | `6174a065-6f06-4a2e-9b42-6289d9099ed3` |
| occurrence 取数 | 0 | `c6a54ee3-4119-48a2-b53a-53ad2f51ab69` |
| createEnvelope 定向取数 | 0 | `df56e7fb-115f-44fc-b580-fe80207d0272` |
| 变异全序列 MUT-1..4 | 0 | `8ce9e9d0-6c8e-4e23-b946-141935bca83f` |
| 残留扫描 | 0 | `f03e3957-af4e-4acc-9a55-ba91efc56322` |
| `pnpm snapshot:check` 独立复核 | 0 | `5db096d1-9b0c-4212-9e22-522b8f2b6cd6`（`0.1.0@932e7b250d278d50` 同值） |

## 5. 五维评分＋verdict

> 对账：`node tooling/check-gate-audit.mjs --evidence docs/research/t79-review-red.md --ticket 79 --since 2026-09-09T19:43:00Z --allow-undeclared` → **matched=10/10，gate-audit: PASS**（runId `04d2280b-106f-40ae-b5ad-19d89823c4ec`；未声明 10 条由 GATE-RELAX 覆盖：蓝队并发 6 条＋本席 tick/内联/失败 run 4 条）。

| 维（权重） | 分 | 理由 |
|---|---|---|
| 契约 30 | 27 | 130 条机读＋人眼双闭合，口径先行且契约 §4.4 授权；扣 3（D-2／D-3 文字瑕疵） |
| 证据 25 | 22 | runId 全链＋变异自证＋33 条对账（被审）＋缺口诚实；扣 3（MUT-4 盲区交付时未自测） |
| parity 20 | 17 | 快照门本席独立复核绿＋零 src 改动逻辑论证；html 185 件／file sha 采信交付（未独立重跑），扣 3 |
| 红线 15 | 14 | 未改产品代码、未动 calorie、SKILL 自检过、变异全还原；扣 1（§6 未遂裸跑） |
| 文档 10 | 8 | G-1..G-5＋P-1/P-2 自曝完整；扣 2（D-2／D-3／G-1 漂移） |
| **合计** | **88** | **verdict: FAIL**（规则：S2 open 即 FAIL，与 t83/t63 判例一致；FAIL 范围限定于 D-1 覆盖缺口，130/26/0.2.0/渲染不变四项核心主张全部成立） |

## 6. 整改清单（按优先级）

1. **D-1（S2，必修）**：lockstep 用例 4 扩面到 5 技能＋skill-calorie 的 `base-link-core` range（期望：现跑红于 skill-calorie，待 G-2 修后转绿；或文档化声明"技能面由 frozen-lockfile 门覆盖"并给出该门 runId）。
2. D-5（建议）：给 `assertShapeData` 补一条测试（交付 §9 自已建议）。
3. D-2／D-3／G-1（顺手）：changeset 未覆盖面改"仅 skill-calorie"；报告 §1 补"表 A 计数含根 test/"；契约 §5 现状改 0.2.0（契约维护票）。
4. 本席过程自曝：一次**未遂裸跑**——`node -e` 中文扫描未套 run-locked（且语法错，零读写零产物），后改持锁文件取数重跑（`6174a065`）。

```
GATE-RUN runId=f173c8f1-023b-4ee2-95ef-516af1c12883 cmd=node .scratch/t79-red-sample.mjs
GATE-RUN runId=2b45fc43-01b2-416e-b0d7-fbbb5ddd5c14 cmd=node .scratch/t79-red-recheck10.mjs
GATE-RUN runId=ff34e2c9-e3f4-4745-910c-781043833993 cmd=node .scratch/t79-red-26.mjs
GATE-RUN runId=6174a065-6f06-4a2e-9b42-6289d9099ed3 cmd=node .scratch/t79-red-cn.mjs
GATE-RUN runId=c6a54ee3-4119-48a2-b53a-53ad2f51ab69 cmd=node .scratch/t79-red-occ.mjs
GATE-RUN runId=df56e7fb-115f-44fc-b580-fe80207d0272 cmd=node .scratch/t79-red-ce.mjs
GATE-RUN runId=8ce9e9d0-6c8e-4e23-b946-141935bca83f cmd=node docs/research/t79-review-red-mutate.mjs all
GATE-RUN runId=f03e3957-af4e-4acc-9a55-ba91efc56322 cmd=node docs/research/t79-review-red-mutate.mjs residue
GATE-RUN runId=5db096d1-9b0c-4212-9e22-522b8f2b6cd6 cmd=pnpm snapshot:check
GATE-RUN runId=1f096c95-d75b-4a53-8d36-05f51b3c7c00 cmd=node docs/research/t79-review-red-probe.mjs
GATE-RELAX flag=--allow-undeclared reason=同票蓝队并发运行（boundaries／frozen-install／publish:pre／publish:fresh／两条单文件 test）与本席 presence tick／失败 typo run 同窗口交织，时间窗无法切分
```

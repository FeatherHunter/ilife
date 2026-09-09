# #88 蓝队定点复核报告（R1 闭环核验 · 只读）

> 复核者：蓝队 session（#88 初审报告作者）。被审：`.scratch/orchestrator/t88-rework-order-1.md`（R1-1…R1-14）＋ `docs/research/t88-plan.md`（v2，commit `c3ad473`）＋ `docs/research/t88-baseline/BASELINE.md`（`93e27f9`）。
> 口径：本席**独立复跑／独立复算**，不采信 `rework1/rework2` 结论；未跑全量 `pnpm test`（#124 事故纪律），只跑只读探针与靶向脚本。
> 复跑（8/8 exit 0）：`docs/research/t88-probe-{current,sot,contract,shell,shell2,shell3,rework1,rework2}.mjs` → `contract 17/17`、`rework1 21/21`、`rework2 6/6`，余 exit 0。

## ① 逐条闭环结论

| 项 | 结论 | 独立证据 |
|---|---|---|
| **D-1 S4 类名撞 T11**（R1-6） | **闭环** | 我自建判据（从 `style.test.mjs` 解析 `ns:` 得 8 个闭集根 `toast/action/copy-btn/status-badge/empty/error/charts/help-shell`；T11 用 `cls()` 实参＋`startsWith` 容忍）实测：v2 五类 `card-copy/card-mark/tab-search/page-hitcount/btn-backtop` **0 违规**；v1 旧四类**仍 4 违规**（判据有鉴别力）；`ilife-card-*` 撞 T9。S4 门禁已含 `style.test.mjs`＋`help.test.mjs`（存在，已验）＋`contract-signatures.test.mjs`＋`snapshot:check`（v2:132） |
| **D-2 legacy 卡显示不存在串**（R1-7） | **闭环** | 独立复算：22/22 `main_prompt.cli` 非空、**互不重复**、与 414 键**无碰撞**（并集 436/436）；用 v2 模型真渲染：`data-scene-id` **436/436 唯一**、**22/22 卡的 `code.cli` 逐字等于真 CLI**、产物内 `legacy_` 前缀 id **0** |
| **A4 口径**（R1-9） | **闭环** | 基准已入仓 `docs/research/t88-baseline/BASELINE.md`（含四门 exit 0、HEAD `90128d8`、canonical 模式纪律、`changeset:status` 环境红不计入）；白名单 `test-failset.txt` 实为 **34 条**（36 行含 2 行 `;` 注释）；判定工具 `docs/research/t101-fail-set.mjs`（tracked）接口与 v2 写法一致，实测 `base=34 after=31 新增=0 消失=3`、**`新增>0 → exit 1`**（脚本 `:82`）→ 可机判；无「实施者自造基准」口子（基准文件受 git 跟踪，改动必留痕） |
| **A6 证据入仓**（R1-4） | **闭环** | `git ls-files docs/research/t88*` = **30 条**（含 v2 方案、8 探针、baseline 全目录）；8 探针逐个复跑 exit 0 |
| **P-4 零渐变**（改判） | **闭环** | v2:157 明确「按 CSS 区判、禁 `repeating-` 前缀放宽」；我按区解析全 CSS：`gradient` 命中**全部落在 charts 规则内**（唯一块 `.ilife-charts-legend-swatch-dashed`） |
| **R1-2 六标记＋泛化** | **闭环（设计）** | 真渲染产物：6/6 `TEMPLATE_MARKERS` 残留 **0**；泛化 `<!--[A-Z0-9-]+-->` 命中 **0**；`report.markers` 六键 |
| **R1-3 A1 断言化** | **闭环** | 变异复跑：`probe-contract.mjs` 期望 436→435 → **exit 1 / 14-17 fails=3**（断言真会红） |
| **R1-10/11/12/14、R1-13** | **闭环（记账）** | NaN 已修（`probe-shell` 覆盖 6 标记）；`probe-shell2` mark 假阳性改标签级；`probe-shell3` 改 `<article>` 分段度量（卡头按钮 0）；体积权威值 975,038 B＋332 B 归因；`window.matchMedia` 只读已改述；`</script>` 破壳转 #74/#78；变异按 S1/S2/S4 分摊 |
| **R1-5 勘误** | **闭环** | E-1…E-10 逐条显式标注（不静默改写） |

## ② 自设探针（独立口径，红→还原→绿＋sha256）

`blue2-probe-r1.mjs`（sha256 `AE1062D9…2F05`）：**17/17 fails=0，exit 0**。含 4 组独立判据：T9＋T11 双锁镜像（含 v1 反例仍红）、legacy CLI 22 条复算＋**真渲染**验证、6 标记＋泛化残留、gradient 按区判。
- **变异体** `blue2-probe-r1-mut.mjs`（把 v2 类名换回 v1 旧名）→ **15/17 fails=2，exit 1**（红），失败项正是两条 T11 检查。
- **还原**：重跑原探针 → **17/17，exit 0**，sha256 **与跑前逐字相同**。
- 附带：`blue2-contract-mut.mjs`（期望 436→435）→ exit 1（证明 A1 断言有效）。

## ③ 新引入缺陷（无 S1／无 S2）

- **N-1（S3 · 本票范围）**：v2 头注（`:5`）把自证探针指到 `.scratch/t88/probe-{rework1,rework2,contract}.mjs`（**被 gitignore**），而 tracked 正本是 `docs/research/t88-probe-*`（实测两份 sha256 逐字相同，非假指针）。与 R1-4 的立意相悖，建议改为 `docs/research/…`。
- **N-2（S3 · 本票范围）L-18 处置合规**：**不构成第二真相源**——`HELP_GROUPS` 是展示面常量、差异已登记（SoT `index.ts:21`「饮食记录」vs F3「饮食」，实测成立）。但原守卫从 label 轴**退化**为「逐字等于 F3 十组」，失去与 SoT 的漂移联动；建议补 id 轴子集断言（F3 十 id ⊆ `CATEGORIES` 十三 id，实测成立）。
- **N-3（S3 · 本票范围）门禁抖动面**：白名单是三轮并集 34 条，而单轮实测仅 31 条（消失 3）→ 后置门单轮可能因「新抖动名」假红。建议后置门跑 2–3 轮取并集，并附 `git diff 93e27f9 -- docs/research/t88-baseline/test-failset.txt` 为空作为「未改口径」的机械判据。
- **N-4（S3 · 本票范围）**：T11 的 `startsWith` 容忍让运行时类名（`card-copy` 等）借道 `help.ts` 既有实参；S4 新测须显式断言注入按钮**真带**该类名，避免「CSS 有类名、产出者空转」。

## ④ 五维打分

| 维度 | 分 | 依据 |
|---|---|---|
| 契约一致 30 | **27** | 五项契约类问题全闭环（T9/T11 独立实测 0 违规）；扣 N-4 借道（−2）／N-1 指针（−1） |
| 证据真实可复现 25 | **22** | 8 探针 tracked＋全复跑 exit 0＋断言式（变异 exit 1）＋基线 30 件入仓＋delta 工具机判；扣 N-1／N-3 |
| parity 20 | **18** | legacy CLI 真命令、卡级复制可达（F3 缺口收敛）、P-3 徽章带色、L-18 登记 |
| 工程红线 15 | **14** | `git show --stat c3ad473` 仅 8 个 `docs/research/t88-*`，无越界路径；门禁清单补齐可打红的测试 |
| 文档同步 10 | **8** | E-1…E-10 勘误＋「已闭环／未闭环」如实分列；扣头注忽略路径 |
| **均分** | **89.0** | 权重和 100 |

## ⑤ verdict

**PASS**（无 S1、无 S2；均分 **89.0 ≥ 85**）。
条件（S3 记账，不阻断）：S1 实施前顺手修 N-1 指针；S4 前把 N-2 的 id 轴断言与 N-4 的类名产出者断言写进新测；后置门按 N-3 跑 2–3 轮并留「白名单未改」机械证据。
**未复核（诚实登记）**：R1-1／R1-6／R1-7／R1-8／R1-11／R1-12／R1-13 的**实施**仍属 S1–S5，本席只核其**方案可行性与口径**；`pnpm test` 未跑（#124 纪律）。

**复跑命令**：`node .scratch/orchestrator/blue2-probe-r1.mjs`（17/17）／`node docs/research/t88-probe-{rework1,rework2,contract}.mjs`（21/21、6/6、17/17）／`node docs/research/t101-fail-set.mjs docs/research/t88-baseline/test-failset.txt <after.log>`（新增须 0）。**未改动** `src/`／`test/`／`packages/`／`.scratch/t88/**`／tracker；本席只写 `.scratch/orchestrator/blue2-*` 与本报告。

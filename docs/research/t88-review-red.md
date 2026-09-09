# #88 红队定点复核（R1 闭环核验）

> 复核者：红队 subagent session（独立）。被审：`.scratch/orchestrator/t88-rework-order-1.md`（R1-1…R1-14）＋ `docs/research/t88-plan.md`（v2，182 行）＋ `docs/research/t88-probe-*.mjs`（8 个，commit `c3ad473`）。
> 纪律：只读被审文件；变异一律复制到 `.scratch/orchestrator/red2-*.mjs`；未跑 `pnpm test`，只跑靶向 `node --test`（持锁）。基线 `BASELINE.md` 已冻结（`90128d8`）。

## ① 逐条闭环结论

| 项 | 结论 | 我的独立证据 |
|---|---|---|
| **R1-1 P-1 卡级复制按钮** | **闭环** | 自写 `red2-p1.mjs` **9/9 exit 0**：⑤ 静态卡头（Sheet 外）按钮 **0**；② Sheet prompt `data-t` 与 `<pre>` 逐字相等 **436/436**；① 注入后卡头恰 1 按钮 **436/436**；②b 注入按钮 `data-t` 与 Sheet 按钮原始字节相等；④ 二次注入仍 436（幂等）；③ **真跑冻结 helpers**（Node 桩）后点击「无任何 class、只有 `data-action-id`＋`data-t`」的按钮 → 复制文本 === 该卡 `<pre>` 文本；③b 反控无 actionId 不复制。5 条断言**均可成立**。 |
| **R1-2 守卫① 6/6＋泛化** | **闭环（守卫设计）** | `red2-verify.mjs`：`TEMPLATE_MARKERS` 恰 **6** 个且互异、含 `<!--NO-SHARED-->`；产物内 6 标记逐个 = 0；泛化 `<!--[A-Z0-9-]+-->` = 0。 |
| **R1-3 A1 断言化** | **闭环** | `node docs/research/t88-probe-contract.mjs` → **`RESULT: 17/17 fails=0`，exit 0**；复制为 `red2-contract-mut.mjs` 把期望改 436→435 → **`RESULT: 16/17 fails=1`，exit 1**；原文件 sha 未变（`7326B79A…`）。 |
| **R1-4 A6 入仓** | **闭环** | `git ls-files docs/research/t88*` 非空（9 文件）；8 个探针全部受跟踪且我逐个复跑 **8/8 exit 0**；`git show --stat c3ad473` = 9 文件全在声明路径。 |
| **R1-5 两处勘误** | **闭环** | v2 §0 E-1／E-2 显式标注「v1 原表述 → 事实 → 证据」，未静默改写；我复核 F3 `:21` hero 无渐变、`:31` 仅 `.init-banner` 1 处（payload 无 `init_banner`）；F3 payload `types` 为字符串数组。 |
| **R1-6 类名撞 T11** | **闭环** | 独立读 `style.test.mjs:302-315`：判据确为 `literals.has(suffix) || suffix.startsWith(lit)`；`src/help.ts` 的 `cls()` 实参含 `card`／`tab`／`page`／`btn` → 方案 5 个新类名全部通过；T9 根 `ilife-help-shell` 亦满足（`:270-278`）。 |
| **R1-7 legacy CLI 解耦** | **部分闭环** | 前提成立（`red2-verify.mjs`：22/22 非空、互不重复、与 414 键无碰撞；`red2-r17.mjs`：改 id 后仍 **436/436** 唯一；含 `"`/`<` 的那条 CLI 经 `escapeHtml`（`& < > " '` 五字符）正确转义，`data-scene-id`／`<code>` 均安全）。**但**：`red2-r17.mjs` 实测新 id 与 F3 的 id 集合**差 22 条**（v1 口径 436/436 全等）。方案仅在 §5 风险 4 提「台账登记」，**台账无 L-19**。 |
| **R1-8 共享样式面** | **闭环（口径）** | S4 门禁已含 `snapshot:check`＋`contract-signatures`＋`style.test.mjs`＋`help.test.mjs`；我持锁实跑三份靶向测试 **均 exit 0 / fail 0**（`red2-runs/test-*.log`）。 |
| **R1-9 A4 口径** | **闭环** | 基准路径改为 `docs/research/t88-baseline/BASELINE.md`（非 `.scratch/`），与冻结实文一致；实施者不得自判 delta 已写明。 |
| **R1-10 NaN／体积** | **闭环** | `t88-probe-shell.mjs` 现打 6 个标记 = 0 ＋ `RESULT-PLACEHOLDER-GENERIC []`（无 NaN）；体积权威值 975,038 B，332 B 差异由 `rework2` 归因。 |
| **R1-11 DOM 描述** | **闭环** | `probe-shell2.mjs` 仍实测 helpers 含 `window.matchMedia`（只读）；v2 E-6／R1-11 已改述，且 `contract-signatures.test.mjs` 纯度扫描只禁 `node:` 与 `window.<id>=` 赋值（`:190-204`）——我实跑该测试 exit 0。 |
| **R1-12 破壳风险** | **闭环（登记）** | `red2-verify.mjs`：436 条 prompt 无 `</script>`／`<!--`；方案登记为 #74／#78 接缝。 |
| **R1-13 变异分摊** | **部分闭环** | 已分 S1／S2／S4＋1 探针级；但 S2 那处的**变异设计跑不出红**（见 ③-1）。 |
| **R1-14 假阳性／度量窗口** | **闭环** | `probe-shell2.mjs` 改标签级 `HELPERS-HAS-MARKTAG 0`（旧口径另列）；`probe-shell3.mjs` 改按 `<article>` 分段 → `BODY-CARD-COUNT 436`／`BODY-CARD-HEAD-WITH-BTN 0`。 |
| **L-18** | **闭环（登记）** | 前提复核成立：SoT `CATEGORIES` diet 展示名 = **「饮食记录」**（`red2-verify.mjs`），F3 = 「饮食」；守卫由「⊆」改为「逐字 = F3 十组」，E-10 显式登记。 |

## ② 自设探针结果（红/绿 ＋ sha256）

| 探针 | 结果 | exit | sha256（前 16） |
|---|---|---|---|
| `red2-p1.mjs`（R1-1 五断言＋委派前提，真跑冻结 helpers） | **9/9 绿** | 0 | `923ABAAF1A25F78E` |
| `red2-verify.mjs`（R1-2／R1-7／R1-12／L-18 事实前提） | **11/12**（唯一红＝我预期的「CLI 含引号」信息项，非缺陷） | 1 | `80B8157CD9140556` |
| `red2-r17.mjs`（R1-7 id 后果量化） | **4/5**（红＝与 F3 id 差 22 条） | 1 | `F3B2018A0AA704EF` |
| `red2-guardmut.mjs`（R1-2 变异设计检验） | 见 ③-1 | 0 | `81FD684EFFCAF5DC` |
| `red2-contract-mut.mjs`（A1 断言变异） | **16/17 红** | 1 | `CDB667DA3596D6BA` |
| 回归：`red-guards.mjs`／`red-f3-parity.mjs` | **7/7**／**diffs=0** | 0／0 | `EACAD745…`／`C9A1DFFB…` |

## ③ 新引入缺陷

**S2（关闭前必修 · 本票引入）**
1. **R1-2 的变异自证跑不出红**。方案写「builder 某个 `title` 注入 `<!--NO-SHARED-->` → 泛化口径红」。我实测：`red2-guardmut.mjs` 把该标记塞进 `title` 后，产物泛化残留 **`[]`**、6 标记全 0，且产物只含转义形态 `&lt;!--NO-SHARED--&gt;`（`escapeHtml` 转义 `<`）→ **守卫恒绿，A5 的「S2 一处 src 变异」无法成立**。可用替代：置空 `assets.sharedCssText` → `renderHelpShell` 抛 `asset-missing`（我已实测），或直接改注入物来源。

**S3（记账跟进）**
2. **R1-7 的 22 条 id 偏离未入台账**：应补 **L-19**（F3 `legacy_{wake_word}` ↔ 新 `main_prompt.cli`，22 条，理由＝冻结壳 `cliText(scene)=scene.id`（`help.ts:391-393`）导致「展示真 CLI」与「保留 `legacy_*` id」在契约内不可同时成立）。
3. **§3 A1–A8 表把 A2／A3／A5 标「达成」**，与同文件第 6 行「未闭环（S1–S5 实施）」自相矛盾；建议改「方案已定，实施后达成」。
4. `probe-rework1.mjs:95-97` 的 `viol()` 硬切 `ilife-help-shell-` 前缀，对 `ilife-card-*` 备选恒判「违规」，该组断言**空转**（不影响已选方案——我另用 `style.test.mjs` 判据独立验证）。
5. `probe-shell3.mjs` 的残留行仍只列 5 个标记（`probe-shell.mjs` 已列 6）——口径不齐，非缺陷。

**S1：无。**

## ④ 五维打分

| 维度 | 分 | 依据 |
|---|---|---|
| 契约一致 30 | **26** | A1 断言化／A3① 6/6／A6 入仓／A7 提交干净均实核通过；扣分＝A5 有一处变异跑不出红 |
| 证据真实可复现 25 | **22** | 8 探针受跟踪且 8/8 复跑绿；P-1 与 A1 变异我独立重现；扣分＝rework1 空转断言、§3 状态表述 |
| parity 20 | **16** | 数据层 414 条仍 diffs=0；卡级复制已可达；扣分＝22 条 id 偏离未入台账 |
| 工程红线 15 | **13** | `c3ad473` 9 文件全在声明路径、无 push／危险 git；靶向测试持锁全绿、无 SKILL.md 异常 |
| 文档同步 10 | **8** | E-1…E-10 勘误显式、L-18 已登记；扣分＝台账正本未回填、L-19 缺、§3 口径矛盾 |
| **合计／均分** | **85/100** | **= 阈值** |

## ⑤ verdict

# **PASS（临界 · 附条件）**

- **无 S1** → 不触发 S1 否决；**均分 85 ≥ 85** → 不触发分数否决。
- **余量 0 分**：上述 S2 若在实施时按原文执行，A5 会因「一处变异跑不出红」而不达标 → 届时按 §6 仍会 FAIL。**建议编排者在放行 S1 前先裁定 ③-1 的替代变异**（`asset-missing` 路径我已实测可用），并补 L-19。
- 未复核项（如实标注）：四门与 `pnpm test` delta 未跑（本轮纪律只准靶向测试）；`docs/research/t88-baseline/*` 的 34 条白名单我未逐条比对。

# #96 红队审查报告 · 其余 5 技能不回归门（base-paint 变更）

- 席位：红队（独立复跑 ＋ 自设变异）；被审：`a87df7b`／`8727d9d`／`a29f803`；审查时 HEAD `bb212463`（工作区已含他票已提交成果，变异目标无未提交改动）。
- 纪律：全部 build／test／git 经 `tooling/run-locked.mjs`；变异每处**立即**还原 ＋ 重建；只写本报告与 `.scratch/orchestrator/red8-*`；未改源码／`docs/research/t96-*` 原文件／tracker。
- 结论：**PASS**（无 S1-交付缺陷、无 S1-过程违规；S3×5 记账）。均分 **91**。

---

## ① 独立复跑（逐条 exit）

| # | 命令（持锁包装器内） | exit | 关键行 |
| --- | --- | --- | --- |
| 1 | `pnpm snapshot:html:check` | **0** | `RESULT: artifacts=185 changed=0 added=0 removed=0 base-* fingerprint=fd6299e20f72f3bc0b22a74cdea521c1`；`waitedMs=100068`（与 #97 竞争锁） |
| 2 | `pnpm gate:selftest:html` | **0** | `pass 9 / fail 0`（该 script **自身**经包装器，不得再套一层，否则自锁） |
| 3 | `pnpm boundaries` | **0** | `boundaries: PASS`，`OK` **13** 条＝原 7 ＋ 新 6 |
| 4 | `node docs/research/t96-base-impact.mjs` | **0** | `RESULT: skills=5 five_clean=5 positive_control_base_star=1 bad=0` |
| 5 | `pnpm build` | **0** | 无 `error TS` |
| 6 | `pnpm snapshot:check` ／ `pnpm publish:pre` | **0**／**0** | 见 `.scratch/red8/r10/r11` |
| 7 | canonical `pnpm test`（1 轮） | **1** | `tests 1095 / pass 1070 / fail 25`；`t101-fail-set`：`base=34 after=29 新增=0 消失=5`（消失项＝基线抖动 5 条，与实施者所列一致） |
| 8 | `check-gate-audit`（复算） | **0** | `matched=12/12 auditEntries=241 undeclared=0 PASS` |

事故 #124 自检：跑完 `git status --short` 无 `SKILL.md` 改动，`git ls-files --eol` 为 `i/lf w/lf`。

**对账声明（协议 §2.4.2／§2.4.3，runId 均抄自 `.scratch/locks/gate-runs.log`）**：

```
GATE-RUN runId=6efa1876-ed84-43a7-aaa7-ac1c6635a5ee cmd="pnpm snapshot:html:check"            exit=0
GATE-RUN runId=282b3f99-836c-4b24-ac37-9780332ec134 cmd="node --test tooling/test/skill-html-snapshot.test.mjs" exit=0
GATE-RUN runId=40a8aca4-0329-42c0-a302-6d539daed872 cmd="pnpm boundaries"                     exit=0
GATE-RUN runId=e82611a3-cda6-4010-9a91-fe119c344bba cmd="pnpm build"                          exit=0
GATE-RUN runId=ba38409d-3715-4b64-8547-8aece1868991 cmd="pnpm build"                          exit=0
GATE-RUN runId=red8-mut-20260909b cmd="node .scratch/orchestrator/red8-mutations.mjs --expect-run-id red8-mut-20260909b" exit=0
GATE-RUN runId=4350cfd3-6ab8-4a88-aa0a-fca557cbef09 cmd="pnpm test"                           exit=1
GATE-RUN runId=e6ce7909-53e4-4ea6-a7b6-49c0d5346a03 cmd="pnpm snapshot:check"                 exit=0
GATE-RUN runId=b9f3975d-e5a2-4bd6-b00b-b1e7d2d58e34 cmd="pnpm publish:pre"                    exit=0
```

GATE-RELAX flag=--allow-nonzero reason=`pnpm test` 基线态即 exit 1（判据是失败集新增 0，非 exit 0）。
另如实登记：首次变异驱动 `runId=red8-mut-20260909a` **exit=1**，成因是我脚本内 `idsOf()` 对 `+` 未转义的正则自身报错（探针缺陷，非被审对象缺陷）；修复后以 `red8-mut-20260909b` 重跑 exit=0，两轮之间已 `pnpm build` 复位 `dist`。
观察（非缺陷）：门打 `WARN: dist 可能陈旧 → bill/chef/home/memo`。成因是**变异还原后 `tsc -b` 不重写内容未变的 barrel `dist/render/index.js`**，其 mtime 落后于被还原的 src；门内容判据仍绿 → 与证据 §7-3「mtime 判据可能误报、只作 WARN」自洽。

## ② 快照门鉴别力（自设 **15** 处变异；不复用 `t96-mutation-evidence.mjs`）

驱动 `.scratch/orchestrator/red8-mutations.mjs`（锁内自证 `owner.runId`），`RESULT: mutations=15 bad=0 snapshot:html=0 boundaries=0`；每处 红→**逐字节还原**→绿 ＋ sha256 双证 ＋ `git status --porcelain` 干净。

| 探针 | 变异 | 实测 |
| --- | --- | --- |
| **a** 共享 CSS 产物 | `skill-schedule/src/render/html.ts` 的 `SHARED_CSS` 改色值（**非模板**）＋build | **红**，`changed` 恰为 `schedule/shared-css` ＋ 8 件 `schedule/tpl/*`（sha `ed5789aa…`→同） |
| **b** 5 技能实际输出 | `skill-memo-ilife/src/render/html.ts` stat 分支加 `data-mut`（src＋build） | **红**，**定位到** `memo/shape/stat` ＋ `memo/frag/memo.stats`（`6df81ef4…`→同） |
| **c** 手改快照 | 改 `text` ／ 改 `sha256` ／ 删整条 ／ text＋sha256 一致伪造 | **红**（`staleText`／`added`／`changed`）；「重录一件」也红 |
| **c 盲区** | 删条目的 `text` 字段 ／ 改 `bytes` ／ 改顶层 `artifactCount` | **仍绿**（见 ⑦-2） |
| **d** 空态探针 | chef `if (!items.length)` → `if (false)`（src＋build） | **红且只红 `chef/shape/list-empty`**；同一变异下工具自证也红（`hm-empty` 断言有牙） |
| **e** `--write` 原子性 | bill 模板注入 `ilife-` 后跑 `--write` | exit **1** 且命中影响面断言，**但受跟踪快照已被写脏**（⑦-1） |
| **f/g** 归一化盲区 | `chef/templates/help.html` 整文件转 CRLF ／ 加 BOM | **仍绿**（⑦-4） |
| **h** fail-closed | 移走 `skill-chef/dist/render/index.js` | **红**，`FAIL: dist 缺失…`（未静默跳过） |

**d 的独立佐证**：5 件 `shape/list-empty` 产物均含 `hm-empty`，且**不含任何夹具数据**（`餐饮／支付宝／2026-01-02` 命中 0）→ 空态分支是真打到，非假覆盖。

## ③ 覆盖集合 vs 声称集合（自己枚举）

`185 ＝ 5×11 结构件 ＋ 63 frag ＋ 59 tpl ＋ 8 shared`（11 ＝ keys／templates／escape／shape-throw ＋ 6 形状 ＋ list-empty）。逐技能实测：keys **16/8/21/8/10＝63**、`templates/*.html` 文件数 **16/8/21/8/6＝59**，与 `*_KEY_SHAPES`／`*_TEMPLATES` **逐项相等**（missingKeys／missingTpl／extra 全空）。5 技能 `src/**` 中产出 HTML 字面量的文件**只有 `render/html.ts`**（memo 的 `help/lookup.ts` 仅 `<id>`／`<值>` 占位符，非 HTML）→「渲染层全部 HTML 产物」成立。`fallback` 无 key 分配，仅由 `shape/fallback` 覆盖（设计正确）。**未发现漏项。**

## ④ 前提更正核验

独立 grep：5 包 `dependencies` **仅** `base-link-core`；5 包 `*.ts/*.html/*.json` 中 `base-paint|base-render` 命中 **0**；`token(` 命中 **0**；全仓仅 `skill-calorie` 的 **10 个 src 文件（11 处）** import `base-paint` → `t96-base-impact.mjs` 的正对照是真的，探针有鉴别力。故「base-* 变更 → 差异 0」确属**结构性推论**（非活体实验），结论成立。
**对未来的迁移能否红（设计层面）**：能。① 结构面（依赖声明／import 扫描）与命名空间无关，必红；② 实测 base-paint 的 `buildStyleSheet`／`buildChartsHelpersJs`／`buildSharedHelpersJs`／`renderStatusBadge`／`renderErrorReceipt`／`cx` 输出**均含 `ilife-`**，标记断言会红，且 `--write` 拒绝落盘（exit 1）。仅当迁移只消费 `token()`／`escapeHtml()`／`recoDescriptor()`（实测**不含** `ilife-`）时标记断言不红——但产物 sha256 仍变，门照样红。

## ⑤ 边界断言

`git show a87df7b -- tooling/check-boundaries.mjs` 为**纯追加**（`@@ -26,5 +26,34 @@`），原 7 条一字未改 → **只加不放宽**成立（复跑 13 条 OK）。`MARKER_ALLOW` 留空合理：base-render `STYLE_PREFIX='ilife-'`（`style.ts:30`）＋ 37 处 `ilife-` → 标记与真实命名空间对齐。残余绕过路径（均 S3）：`SRC_RE` 不匹配动态 `import()`（正则要求 `import` 后紧跟引号）；「依赖闭包」实为**直接声明依赖**。实测补偿：`packages/skill-bill/node_modules` 只链接 `base-link-core`、根 `node_modules` 无 `base-*` → 未声明依赖的动态导入会运行期 `ERR_MODULE_NOT_FOUND`，由各技能自身测试暴露，**不构成静默变绿路径**。

## ⑥ 健壮性

`normalize`（去 BOM ＋ CRLF→LF）确实让**行尾／BOM 级真实差异不可见**（f/g 实测仍绿）；该取舍对跨 3 OS 同值是必要的（本仓无 `.gitattributes`），但应写明「行尾／BOM 不在门内」。`textOmitted` 6 件（memo 大模板）**不构成盲区**：sha256 仍逐件比对、检出不受影响，仅定位需 `--show <id>`／`src` 字段；其 `bytes` 同样不被校验（并入 ⑦-2）。

## ⑦ 缺陷清单（无 S1／S2）

1. **[S3·本票引入] `--write` 先落盘后校验**：`tooling/skill-html-snapshot.mjs:346-348` 在标记校验（`:349`）之前 `writeFileSync`；e 探针实测 exit 1 但快照已被写脏。修：先 `compare` 判标记，有标记即 exit 1 **不落盘**。
2. **[S3·本票引入] 快照自洽性只覆盖 `text`↔`sha256`**：c 盲区实测手删 `text`／改 `bytes`／改 `artifactCount` 均**仍绿**。证据 §2.1「反手改快照即红」应收窄为「改 `text` 或 `sha256` 即红」；建议补 `bytes`／`artifactCount` 校验。
3. **[S3·本票范围] CI 缺「新快照只许由工具写」守卫**：`ci.yml:46-59` 的 snapshot-guard 只覆盖 `packages/ilife-skills/skill.snapshot.json`；`pnpm snapshot:html` 可随手重录并提交、CI 全绿，与验收②「每处差异有解释与批准」无机械约束。建议加 `--write && git diff --exit-code -- tooling/skill-html.snapshot.json`。
4. **[S3·本票范围] 措辞**：注释／证据称「依赖闭包」，实现只读直接依赖；`SRC_RE` 不含动态 `import()`。
5. **[S3·本票范围] 文档 nit**：证据 §2.1 称脚本「406 行」（实际 412）、「113 KB」（实际 114 273 B）。
6. 归属与临时动作：变异目标（schedule／chef／memo 的 src、bill／chef 模板、chef `dist`）在 5 技能包内、属本票路径所有权之外——协议 §5 允许的**临时**动作，全程持锁 ＋ 逐字节还原 ＋ sha256 双证 ＋ `git status` 收尾干净，无残留。未跑作者自己的 `t96-mutation-evidence.mjs`（我的 15 处探针覆盖同一门路径且更广）；`changeset:status` 环境红未跑（协议 §2.1）。

## ⑧ 五维打分

| 维度 | 分 | 依据 |
| --- | --- | --- |
| 契约一致 30 | **28** | 门／CI／断言落地与票面、协议一致；`--write` 原子性、自洽面收窄各扣 1 |
| 证据真实可复现 25 | **23** | 12/12 对账、15 探针可复跑；「手改即红」「全部 HTML 产物」表述需收窄 |
| parity 20 | **18** | 5 技能零 base-* 耦合 ＋ 正对照成立；不含 calorie 属票面口径 |
| 工程红线 15 | **14** | 持锁、逐字节还原、fail-closed；变异触及他包为已记账临时动作 |
| 文档同步 10 | **8** | file:line 抽查全对；行数／体积／自洽面措辞偏差 |

**均分 91／100**（28+23+18+14+8）。**verdict：PASS**（无 S1-交付缺陷、无 S1-过程违规；S3×5 记账跟进）。

# #106 蓝队审查报告（蓝13 席）

> 被审：`867536b`（feat）＋ `1b3924a`（docs）。审查时 HEAD = `8244445`。
> 依据：`docs/subagent-concurrency-protocol.md` §2.4／§3／§5.1／§6＋§6.1；`.scratch/orchestrator/dispatch-rules.md` §4.5／§4.6；`docs/research/t88-delta-flake-ruling.md` §2／§5／§6／§7／§8；`gh issue view 106 --comments`。
> 本席只读＋只写本报告与 `.scratch/orchestrator/blue13-*`；未改源码／证据／tracker。

## ① 路径／禁区

`git show --name-only 867536b 1b3924a` ＝ 7 文件：`packages/skill-calorie/src/render/helpCenter.ts`、`packages/skill-calorie/test/help-center-106.test.mjs`、`.changeset/t106-help-cli-backfill.md`、`docs/research/t106-{help-cli-backfill.md,probe-cli.mjs,mutate.mjs,gate-runs.log}`。

- **全部落在声明路径**（派单 `src/render/helpCenter.ts`／`test/help-center-106.test.mjs`／`docs/research/t106-*`／`.changeset/t106-*`；实际带 `packages/skill-calorie/` 前缀）。
- **禁区 0 命中**：`packages/base-render/**`／`src/cli/**`／`SKILL.md`／`scripts/**`／`templates/**`／`tooling/**`／`plugin-*`／`test/skill-t11.test.mjs` 均不在 name-only 内；`git diff --stat -- packages/skill-calorie/SKILL.md` 空。

## ② 契约面（关键）

- `Scene.editable_fields` **是既有冻结槽位**：`git show 867536b^:packages/base-render/src/spec/help.ts` 已含 `interface SceneEditableField` 与 `readonly editable_fields?`。本票零扩面成立。
- `SPEC_FROZEN_SURFACE` ＝ **130**、`Scene` 机读属性集**恒七键**、`'cli' in props === false`（我经 `dist/spec/index.js` 独立取值，不读实施者探针）。
- 无新增契约面 → 不触发 #92 追加流程。`renderHelpCenterHtml`／`HelpCenterRenderOptions`／`HelpCenterRenderResult` 签名 pre/post **逐字未变**；三态语义不变：file／inline 各 341 条 `data-field="cli"`、text **0** 条且场景行恒 436。
- 新导出 `HELP_CLI_FIELD_NAME`／`HELP_CLI_FIELD_LABEL`／`helpSceneCli` 只在 `render/helpCenter.ts`，**未进 `render/index.ts` 公共面**（§⑧-6）。

## ③ 「不补变体」裁决链（逐条自验）

| # | 依据 | 我的独立复核 | 判 |
|---|---|---|---|
| 1 | 31 变体数据不存在 | 当前 SoT 变体 **5 条／3 宿主**（查健康报告 1／查热量趋势 3／查营养结构 1）；F1 的 31 变体属 `t71-help-dissect.md` §C.2 的 81 唤醒词旧快照；SoT 由 `test/calorie-sot.snapshot.json`（`sot=scripts/_triggers.py`、`total=436`）parity 钉死 | **成立** |
| 2 | 5 条 label 不可路由 | 逐条 `routesFor=0`／非唤醒词，**并补两口径**：`HELP_LOOKUP` 零命中、`WAKE_TABLE` 零命中、file／text 产物零出现（被审探针只查 routesFor） | **成立** |
| 3 | 已由 CLI 行 `--params` 承载 | `查热量趋势 → calorie-cmd-read calorie.history --params '{"days":7}'`，与变体「上周（`--days 7`）」同窗口语义 | **成立** |
| 4 | 纳入需扩冻结面 | **措辞过强**：冻结槽位 `editable_fields` 本身即可承载变体示例行（本票即先例）；严格说法是「新增结构化 `Scene.variants` 才需 #92」 | **S3** |

结论：Q11 的 CLI 一半**已落地**、变体一半**登记不补**（数据属死数据）。依据 ①②③ 独立成立，「不补」站得住；④ 非承重。实施者**只登记并请求裁定**，未自行扩面、未自行豁免——属需编排者裁定的范围偏离，**非 S1**。

## ④ 门禁／对账（逐条自跑）

| 项 | 命令 | 结果 |
|---|---|---|
| 四门（持锁 ticket=106-review） | `pnpm build`／`boundaries`／`snapshot:check`／`publish:pre` | **exit 0／0／0／0** |
| 靶向 | `node --test` 88／91／106／t11 | **exit 0** |
| #121 单文件 | `node --test packages/base-render/test/copy-copied-121.test.mjs` | **exit 0** |
| 实施者探针 | `node docs/research/t106-probe-cli.mjs` | **11/11 fails=0** |
| 我的新探针 | `.scratch/orchestrator/blue13-probe.mjs` | **13/13 fails=0** |
| canonical（**仅 1 轮**） | `pnpm test` | exit 1，`ℹ fail 26`；fail-set `base=34 after=31 新增=2 消失=5` |
| 白名单 | `git diff 93e27f9 -- docs/research/t88-baseline/test-failset.txt` | **0 行** |
| 机械对账 | `check-gate-audit --evidence … --log docs/research/t106-gate-runs.log --ticket 106 --since 14:45:00Z --until 14:55:30Z --allow-nonzero` | **matched=17/17 scoped=17 undeclared=0 PASS**；`GATE-RELAX flag=--allow-nonzero reason=…` 见证据 `:230`；导出源与 live 窗口 17 条 `RUN` **逐字相同** |

- 我的 canonical 2 条新增**与实施者的不是同一对**：落在 `packages/skill-home/test/fetch.test.mjs`（`6a79202`／#17），非本票路径；单独复跑 **2× → 3/3 pass exit 0**（跨 session 污染，§⑧-8）。
- 复算实施者两轮日志：轮 1 新增 2（#121 `--blue`/`--ok`）→ 轮 2 **新增 0**（`after=29`）。证据表「轮 2 fail 25」是 node `ℹ fail` 口径，轮 1 的「fail 31」是 ✖ 口径——同列混用两种度量（§⑧-3）。

## ⑤ 提交／tracker

- 无 `git add -A`／`git add .`／危险 git（`gate-runs.log` 全量扫描 0 命中；reflog 窗口内 0）；两笔均 `git commit --only <显式路径>`；中文提交信息完好。
- 证据 6 文件**全部受跟踪**；本票路径下无未提交改动。
- #106 票面：state **OPEN**（未提前 close）；正文与回贴 **CR=0／无 BOM／无字面 `\n`**；`### 进度历史` 保留 `## 进度：0%` 旧块；进度 90%。
- **认领先于一切写操作**：timeline `assigned` 14:41:38Z 早于 `.scratch/t106/` 首个文件（22:42:54）与首笔 commit（14:50:25Z）。认领与回贴同一 GitHub 账号，无法用 actor 区分 session。

## ⑥ 并发污染判定（只核事实，不主张豁免）

- 2 条新增对象＝**#121-owned** `copy-copied-121.test.mjs:240`，被测对象 `base-render/src/style.ts`，**不在本票路径内**；签名 `actual 'var(--blue)' / expected 'var(--ok)'`（我自 `canonical-1.log` 逐字取出）与 #121 红队脚本 `.scratch/orchestrator/red12-gate.mjs:100-103` 的 **M2 变异**（`.copied` 背景 `var(--ok)`→`var(--blue)`）**逐字相同**。
- 锁日志实测窗口：`121-review-blue` 变异周期 22:47:36–**22:48:07**（M-B restore-build 收尾）；`121-review-red` clean 22:51:51–22:52:28、M2 22:52:53–22:53:14、M3 22:53:14–22:53:32、M1 22:54:29–22:54:47。
- **重叠判定**：#106 轮 1（22:51:10–22:51:44）**与红队 M2/M3 不重叠**（红队首个 M 在 22:52:53），蓝队周期 22:48:07 已收尾 → 证据「轮 1 时 #121 正在变异」**在锁日志上不可证**（§⑧-4）。可证的是：签名与 #121 M2 逐字相同、对象属 #121、轮 2 干净重建新增 0、单文件复跑 10/10 绿，且我本轮独立复现了**另一对**跨 session 污染。是否豁免**归编排者**（§6／§5.2-1）。

## ⑦ 自设新探针（13 项 · 专打被审脚本盲区）

`.scratch/orchestrator/blue13-probe.mjs`（**未入仓**：派单限定只写本报告与 `blue13-*`，见 §⑧-9；断言逐条如下，可逐行复刻）：

1. 字段行守恒：`<li class="ilife-help-shell-field"`＝341 **且** `<ul class="ilife-help-shell-fields"`＝341（被审只数 `data-field="cli"`，漏检空容器／别名字段行）。
2. 95 条 non-exec **产物层**零占位：卡内无 fields 容器、无 `N/A`／`—`／`暂无`／`不可执行` 等文案（被审只断数据层 `undefined`）。
3. 转义面：`data-t="` 1308 次全闭合；341 个 field-value 无裸 `<`／`&`。
4. 第二口径交叉：`EXEC_ROUTES=341`／`HIT_NOT_EXEC_ROUTES=95`／`WAKE_ROUTES=436`，与 `helpSceneCli` 的 exec 集合逐条相等。
5. non-exec 细分 **10／85**；`data-scene-id=436`／`data-subgroup-id=54`／`data-action-id=1308`；non-exec 的 `复制参数` 回落 `Scene.id`。
6. 变体第二口径：`HELP_LOOKUP`／`WAKE_TABLE` 零命中。
7. 卡面遗留死命令 **22** 条（其中 **18** 条同时拿到详情层真 CLI）。
8. 「恰 1 行」断言**鉴别力实证**：合成 2 行必红 + 1 行正对照。

## ⑧ 缺陷清单

**S1-交付缺陷 0；S1-过程违规 0；S2 0。** S3（记账，不阻断关闭）：

1. 证据 §4.4「纳入需扩冻结面」措辞过强（既有槽位可承载；结论靠 ①②③）。
2. `help-center-106.test.mjs:5` 头注释仍写「**353/436** 死命令」，同票已在源码注释订正为 **376/436**（实测 376）。
3. 证据「fail N」列混用两种度量（轮 1 ✖=31／轮 2 `ℹ fail`=25）；判据「新增=0」不受影响。
4. 并发窗口措辞强于锁日志可证（见 §⑥）。
5. 提交后另有 **5 次 ticket=106 运行**（14:57:40–45：build／boundaries／snapshot／publish／靶向，全 exit 0）落在对账窗口外、未声明、未被引用——窗口内 17/17 仍成立，但「本票全部运行已声明」的隐含口径不成立。
6. 新导出未进 `render/index.ts` 公共面，且无 index 一致性守卫。
7. 体积：绝对体积 **1,264,822 B 逐字节复现**（默认 `updatedAt`），CLI 行直接贡献 **122,502 B**；「+231,168 B（1,033,654→…）」的基线数未独立复现（需重建 pre-#106 树）。
8. 范围外：`packages/skill-home/test/fetch.test.mjs` 本轮 canonical 红、单独 2× 全绿 → 转 #17／#115 owner 复核。
9. 探针未入仓（派单限定写路径所致，非实施者问题）——如编排者要求，可授权我把 `blue13-probe.mjs` 复制进 `docs/research/t106-review-blue-probe.mjs`。

## ⑨ 五维＋均分＋verdict

| 维 | 满分 | 得分 | 扣分理由 |
|---|---|---|---|
| 契约一致 | 30 | **30** | 零新增面、签名与三态未变、既有槽位 |
| 证据真实可复现 | 25 | **23** | S3-3／4／5／7 |
| parity | 20 | **19** | S3-1／2 |
| 工程红线 | 15 | **14** | S3-5／6 |
| 文档同步 | 10 | **8** | S3-1／2／7 |

**均分 = 94／100。verdict：PASS**（S1＝0；均分 ≥85）。附条件：S3 逐条跟进；§⑥ 的豁免权归编排者。

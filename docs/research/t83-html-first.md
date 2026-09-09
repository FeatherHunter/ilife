# #83 证据：HTML-First 工作流与渲染失败回执落地（三态交付契约）

- 票：wayfinder 地图 #63 / 票 #83《HTML-First 工作流与渲染失败回执落地》
- 认领（第一笔写操作）：`gh issue edit 83 --add-assignee FeatherHunter` → `assignees: FeatherHunter`
- 基准：`.scratch/t88/baseline/BASELINE.md`（四门 exit 0；`pnpm test` 判据＝具名失败集**新增 0**，白名单 34 条）
- 可复跑证据：`node docs/research/t83-evidence.mjs`（真机 **21/21 PASS**）／`node docs/research/t83-mutation.mjs`（变异 **10/10 PASS**）
- 新测试：`packages/skill-calorie/test/delivery-83.test.mjs`（13 用例）
- commit：`8439976`（实现＋测试＋探针）／收尾 commit 见 §9

---

## 1. 现状诊断（变更前，逐条 `file:line`）

| 项 | 事实（变更前） |
|---|---|
| 落点由调用方给 | `cli/cmd_read.ts:1037`（改前）`htmlTarget = o.output ?? o.html ?? resolveDefaultHtmlPath(...)`；`:1043` `writeFileSync(resolveExplicitHtmlPath(htmlTarget), out.html, 'utf8')` |
| 写盘失败 | `:1045` `fail(5, 'HTML 写盘失败：…')` —— 只有「失败」一条路，**没有**「写不进去也要把产物交出去」的通道 |
| 落点解析失败 | `:1039` `fail(5, '渲染失败：HTML 落点解析失败（…）')`（#87 返修 F4 加的） |
| envelope | `:249` `buildEnvelope` 恒 `{version,skill,shape,key,data}`（五字段）；`:1047` 追加 `data.output`（additive） |
| #91 的 `mode` 三态 | `:784` `mode = modeRaw ?? 'file'`；`:789` `renderHelpCenterHtml({mode, sceneData})`；`:795` `text` 态把文本放 `data.text`——**它是「产物形态」三态（完整文档／片段／纯文本），与「交付通道」无关**；三态都走同一条落盘路径 |
| 渲染失败回执 | 只有 `ERR 5: …` 一行文字；`render/receipt.ts:209 buildErrorReceipt` 与 `render/html.ts:252 renderErrorHtml` 早已存在（旧 `render_error_receipt.py` 的等价物），但**出口从未调用** |
| 无对应模板 | 97 个读键**全部**有渲染器（`dispatch` 每分支都返回 html），99 键含写键 receipt —— 新架构下「无对应模板」**没有真机可达的 key** |

## 2. 三态契约与落点

**落点（本票全部新增逻辑）**：`render/envelope.ts`（交付信号＋产物族判定）／`output.ts`（`deliverHtml` 落盘与只读回退）／`cli/cmd_read.ts`（`buildDeliveredEnvelope` 装配 ＋ `failWithReceipt`）。**未碰** `base-render/**`／`render/helpCenter.ts`／`render/receipt.ts`／`render/html.ts`／`SKILL.md`／`templates/**`／`tooling/**`。

| 态 | 触发 | 产物与 envelope |
|---|---|---|
| ① 文件态（默认） | 有 HTML 产物 ＋ 可写文件系统 | 落 `<SKILLS_DB_PATH>/calorie_html/<中文command>_<TS>[_N].html`；`data.output` ＝ `delivery.path`（同值同源） |
| ② 内联态 | 写盘/落点解析抛 `EACCES｜EPERM｜EROFS｜EBUSY`（只读／沙箱） | **不落盘**；产物进 `data.html`；`delivery.mode='inline'`、无 `path` |
| ③ 文本态 | 渲染层已定文本（`help.center` `mode:'text'`）／用户明确要文本（`--params '{"delivery":"text"}'`）／无 HTML 产物（结构缝） | `data.text` ＝ 同一份 `data` 的 #77 `buildDataText` 投影；渲染层已定文本者**保留 #91 落盘** |

- **结构错不回退**：`EEXIST｜ENOTDIR｜EISDIR` 等（落点本身非法）**不**转内联，仍走渲染失败回执 exit 5 —— 保住 `output-naming-87.test.mjs:301-313` 的既有断言（exit 5 ＋ stdout 空 ＋ 占位文件不被改写）。
- **交付信号**：envelope **顶层追加** `delivery{mode,path?,template?,bytes?}`；`template` 为**结构判定**的产物族（`help-shell`／`doc-shell`／`receipt`／`fragment`／`text`），零配置表、零第二套取数。既有五字段与序一字未改；stdout 仍守 P9 一行 JSON。
- **渲染失败回执**（旧 `SKILL.md:18-19` 渲染失败契约）：`buildErrorReceipt` ＋ `renderErrorHtml` 的**模板化**回执（原因／建议／建议命令），stderr 一行 `RECEIPT {…}`（stdout 保持纯净），exit 5 不变；回执自身也走三态（可写则落 `操作失败_<TS>.html`，否则内联随 `RECEIPT` 回传）。**零手写 HTML 兜底**。
- **回执口径（R-2 · D-1 取口径 ②，编排者裁决）**：`RECEIPT` ＝**渲染／落盘失败（exit 5）专属**；`exit 2`＝参数失败、`exit 4`＝取数／缺失阻断，**各自已有独立文案**（`ERR 2: 参数失败：…`／`ERR 4: 取数失败（缺失阻断）…`），**不发回执**（`cmd_read.ts:1170-1176` 只在 exit 5 分支发 `RECEIPT`）。理由：给 exit 2／4 追加 `RECEIPT` 会改动 97 读键＋35 写键的失败态 stderr，而既有测试对 exit 2／4 有大量 exit-code 与文案断言（`cmd-write-40.test.mjs` 30＋处 `status===2|4`、`cmd-read-t11.test.mjs:146/202/205`）＝**新能力**，不并入本票；若未来需要，**另票承接**。旧铁则正本「退出码非 0 → 回执」的字面缺口由此**显式记口径**而非改行为（蓝队 D-1 判据 ②）。

## 3. `delivery` 冲突的裁定与偏离账

**冲突**：#91 的接线口径（`docs/research/t88-final.md §7.3-③`）写着「**不新增 `delivery` 字段**（本票不得新增契约面，A2）」；本票拍定「扩 envelope 加 `delivery`」。**实测三条冻结**（`packages/skill-calorie/test/help-center-91.test.mjs`）：`:33/:81` `Object.keys(env)` 恒五字段（顶层放 → 打红 1 处）；`:114-115` `strip` 只删 `data.output`（`data.delivery` 带 `path` → 打红）；`:189` 照片路径 `Object.keys(data)` 恒 `items/total/output`（`data.delivery` → 打红）。

**裁定（编排者 2026-09-09 授权）**：按拍定 (a) —— **顶层 `delivery`**。理由：拍定（2026-09-08 方案 A）晚于 #91 的口径，且 `§7.3-③` 自身就写「若确需新增 delivery 须走追加流程」；顶层放只须改 1 处断言、纯追加不弱化。

**授权范围与实测改动**（仅 2 个 token，其余断言零改动）：
- `:33` `ENVELOPE_FIELDS` 5 项 → 6 项（追加 `delivery`）；
- `:81` 断言文案「恒五字段」→「恒六字段（Q8：无 status；delivery 由 #83 追加）」。
- `:114-115`（`strip` 比较）与 `:189`（照片路径 data 键集）**原样通过**（顶层放置不触碰 `data`）；#91 五个用例全绿（见 §5 靶向）。

**注入范围**：`delivery` 只在**该次交付有 HTML／文本交付决策**时注入；97 读键＋99 键（含写键 receipt）**全部**产出产物，故每次成功交付都有 `delivery` —— **当前不存在「不产出 HTML 的键」**（逐键核对：`cmd_read.ts` `dispatch` 全分支 `html:` 非空 ＋ `write.ts` `WriteOut.html` 恒非空）。

**偏离账**：
1. `deliveryTemplateOf` 用**结构判定**而非模板清单（新架构无 key→模板 映射表；不新造配置面）。
2. `delivery.bytes` ＝ 产物 UTF-8 字节数（`help.center` text 态 24,989 B 与 `data.bytes` 同值；中文文本的字符数≠字节数，实测 17,792 字符）。
3. ③ 文本态的「**无对应模板**」分支**真机不可达**（97 键全有渲染器）—— 只作结构缝存在，证据里如实标注、**不编造**真机场景；真机可达的文本态是「用户明确要文本」。
4. `render/index.ts` 未再导出本票新增符号（不在路径所有权内）；调用方读 envelope JSON 即可，测试走深路径 import。

## 4. 真机证据（`node docs/research/t83-evidence.mjs` → **RESULT: 21/21 PASS**，exit 0）

| 场景 | 实测 |
|---|---|
| ① 成功渲染并落盘＋回传落点（4 键 × 4 产物族） | `help.lookup` fragment 20,665 B／`view.diet` doc-shell 62,335 B／`help.center` help-shell 1,264,822 B／`water.log` receipt 272 B；`mode=file`、`path` 绝对、`path===data.output`、`bytes===statSync().size`、无 `data.html`／`data.text` |
| ② 渲染失败回执 | `calorie_html` 被同名文件占位 → exit 5 ＋ stdout **空** ＋ `ERR 5: 渲染失败…` ＋ `RECEIPT{…}`（`ok:false`／`sceneName:渲染`／`suggestions:3`／`fixPrompt` 含 `calorie-cmd-read`／`delivery.template=receipt`／`html` 含 `<section>`＋「渲染失败回执」）；占位文件未被改写 |
| ③ 无对应模板时文字答 | **如实标注**：97 键全有渲染器 → 真机不可达；结构缝探针（`buildDeliveredEnvelope` 传 `html:''`）→ `mode=text`／`template=text`／`data.text` 有值。真机文本态用「用户明确要文本」取证 |
| ② 内联态（只读目录） | `icacls <DB>/calorie_html /deny Everyone:(W,AD,WD)` 后新建文件被拒 → exit 0、`mode=inline`、无 `path`、无 `data.output`、`data.html` 20,665 B、**与 ① 落盘产物逐字相同**、无 `data.text`、stdout 一行 JSON（21,081 B） |
| ③ 文本态（两种触发） | `help.center mode:text` → `mode=text`／`template=text`／`path` 有值／落盘文本＝`data.text`（24,989 B，零标签）；`delivery:'text'` → 不落盘、`data.text` **逐字等于** 同一份 data 的 `buildDataText` 投影 |
| ④ 与 #81 联动（命中即渲染） | `看今日主页`／`看今日饮食概览`／`看今日体重概览`／`看今日目标进度`／`看今日热量预算` → exec 路由 → CLI → 全部 `mode=file` ＋ 产物存在 ＋ 无 `data.text`／`data.html` |
| ⑥ envelope 契约 | 顶层恒 `version,skill,shape,key,data,delivery`（序不变）；形状覆盖 `stat／list／detail／analysis／receipt`（`fallback` 无 CLI 出口，见 #93）；`delivery.mode` 闭集 |
| ⑨ P9 | 成功态与内联态 stdout 均**一行 JSON**；失败态 stdout 空 |

## 5. 门禁实测（全部持锁；`runId` 逐条见 §8）

| 门 | 命令 | exit |
|---|---|---|
| 四门 | `pnpm build`／`pnpm boundaries`／`pnpm snapshot:check`／`pnpm publish:pre`（`node .scratch/t83/gates.mjs`，单锁串行） | **0／0／0／0** |
| 靶向 | `node --test` delivery-83／cmd-read-t11／render-copy-90／help-center-91／skill-t11／output-naming-87 | **0**（**56 pass／0 fail**；#91 五用例含改动后全绿） |
| canonical | `pnpm test`（1 轮） | 1（既有红）→ `t101-fail-set`：**base=34 after=29 新增=0**，消失 5 条全部是基线 §4 已登记的**抖动项**（`#41 M3 真 CLI 串行冒烟`／`#76 无宿主证据`／`#80 HELP 生成`／`helpers ≤820px`／`③ check-combos`） |
| 白名单 diff | `git diff --stat -- docs/research/t88-baseline/test-failset.txt .scratch/t88/baseline/test-failset.txt` | **0 行** |
| 其它 envelope 消费方 | `test/link-core.test.mjs` **4/4**；`test/skills-export-47.test.mjs` **3/3**；`packages/plugin-calorie/test/smoke.test.mjs` **10/10**；`pnpm publish:fresh`（安装态 CONTRACT_KEY `calorie.help.center`）**exit 0** | 全绿 |
| 自检 | `git status --short` 仅本票路径（＋他票未跟踪目录）；`SKILL.md` **无** `Bin … -> …`（#124 未复现） | — |

## 6. 变异自证（src 级 2 处，单锁内「变异→重建→红→还原→重建→绿」＋ sha256）

| 变异 | 落点 | 变异轮 | 还原 sha256 | 还原后 |
|---|---|---|---|---|
| **M1** 摘掉只读/沙箱回退 | `output.ts:deliverHtml` 的 `isReadOnlyWriteFailure → {mode:'inline'}` | **红 fail=1**（② 内联态） | `279EE294…1A9A0` → 同值 | 绿 pass=10 |
| **M2** 摘掉 `delivery` 注入 | `cmd_read.ts:buildDeliveredEnvelope` 的 `withDelivery(...)` | **红 fail=5**（交付信号断言） | `9B5D9548…B61785` → 同值 | 绿 pass=10 |

`RESULT-MUT: 10/10 PASS`。

## 7. 未做／未确证（风险 top3）

1. **「打开（唤起查看器）」未确证**（R-2 · D-2）：本票唯一出口只负责**落盘＋回传落点**（`delivery.path`／`data.output`），**没有任何**「唤起浏览器／查看器／宿主 tab」的观测（`t83-evidence.mjs` 全文无 open／打开类观测）。验收①的原字面「渲染并**打开**」中的「打开」**不构成本票已达成项**，已从 §4 表标题移除。归属：**#64 打通图／地图 Out of scope**（安装／双路实证归打通图）。
2. **「无对应模板」无真机场景**（结构缝＋单元探针覆盖）：新架构 97 键全有渲染器；若要真机取证，须先有「注册但无渲染器」的键（新能力，另票）。
3. **`help-center-91.test.mjs` 文件头注释仍写「envelope 全字段＝五字段」**（`:8`）：授权只限 `:33`／`:81` 两个 token，**注释未改**（S3 文档漂移，转编排者决定是否另改）。
4. **开发期裸跑（自认，协议 §2.4）**：实现轮为快速迭代跑了 `npx tsc -b`（约 4 次）与 `node --test packages/skill-calorie/test/delivery-83.test.mjs`（2 次）**未经持锁包装器** —— 属 §2.4.5 的 S1-过程违规，主动自认；其结论已由持锁轮（`runId` f493b6ce／598e891a／764e8a3e）独立复现，未写共享面、未与他票冲突。

## 8. 机械门禁对账（协议 §2.4）

对账窗口：`--ticket 83 --since 2026-09-09T15:11:00.000Z --until 2026-09-09T15:15:31.000Z`（窗口内 14 条 `RUN` 全部为本票持锁运行；本文件提交与其后的 `git add`／`git commit`／导出运行在窗口之外，不入声明）。对账源：`docs/research/t83-gate-runs.log`。

GATE-RUN runId=f493b6ce-f94f-4f36-b955-bfbabe90332e cmd=node --test packages/skill-calorie/test/delivery-83.test.mjs packages/skill-calorie/test/cmd-read-t11.test.mjs packages/skill-calorie/test/render-copy-90.test.mjs packages/skill-calorie/test/help-center-91.test.mjs packages/skill-calorie/test/skill-t11.test.mjs packages/skill-calorie/test/output-naming-87.test.mjs
GATE-RUN runId=26eb0744-78c6-4994-891e-1a051af863a9 cmd=node docs/research/t83-evidence.mjs
GATE-RUN runId=2f5cebc4-376f-4bbb-97ec-447b6b478fc6 cmd=node docs/research/t83-evidence.mjs
GATE-RUN runId=e7e40e94-1daa-4137-8cd9-1b20d75ef63a cmd=node docs/research/t83-evidence.mjs
GATE-RUN runId=c09cf3fc-2b18-4937-b02a-9d91b9752c8c cmd=git commit --only packages/skill-calorie/src/cli/cmd_read.ts packages/skill-calorie/src/output.ts packages/skill-calorie/src/render/envelope.ts packages/skill-calorie/test/help-center-91.test.mjs packages/skill-calorie/test/delivery-83.test.mjs docs/research/t83-evidence.mjs -F .scratch/t83/commit-msg.txt
GATE-RUN runId=9c9fd643-0e88-4faf-a7c9-61b395d60787 cmd=pwsh -NoProfile -Command "git add packages/skill-calorie/test/delivery-83.test.mjs docs/research/t83-evidence.mjs; git commit --only packages/skill-calorie/src/cli/cmd_read.ts packages/skill-calorie/src/output.ts packages/skill-calorie/src/render/envelope.ts packages/skill-calorie/test/help-center-91.test.mjs packages/skill-calorie/test/delivery-83.test.mjs docs/research/t83-evidence.mjs -F .scratch/t83/commit-msg.txt"
GATE-RUN runId=b59820f3-809c-4157-9b6e-eb8102312f63 cmd=git add packages/skill-calorie/test/delivery-83.test.mjs docs/research/t83-evidence.mjs
GATE-RUN runId=e3a7d2c8-39d6-42c2-bf4d-a225ade0db7c cmd=git commit --only packages/skill-calorie/src/cli/cmd_read.ts packages/skill-calorie/src/output.ts packages/skill-calorie/src/render/envelope.ts packages/skill-calorie/test/help-center-91.test.mjs packages/skill-calorie/test/delivery-83.test.mjs docs/research/t83-evidence.mjs -F .scratch/t83/commit-msg.txt
GATE-RUN runId=483f7192-bd36-42ed-97e9-32ab84184a93 cmd=node docs/research/t83-mutation.mjs
GATE-RUN runId=598e891a-1b0c-4f5e-9352-cbc3c9d3d916 cmd=node .scratch/t83/gates.mjs
GATE-RUN runId=d389cdfe-c9e3-4695-b568-40e4afb7f64f cmd=node .scratch/t83/consumers.mjs
GATE-RUN runId=c18d6f9a-1d69-4c67-a2c4-0796e5b36069 cmd=pnpm publish:fresh
GATE-RUN runId=e5a12300-eef5-43e7-862e-3219300197c3 cmd=pnpm test
GATE-RUN runId=764e8a3e-e738-45fe-b6fb-f4ff42630619 cmd=node docs/research/t83-mutation.mjs

GATE-RELAX flag=--allow-nonzero reason=本窗口内 5 条 exit≠0 均为**过程轮**、非门禁证据：`26eb0744` 证据脚本首跑因 `base-paint` 解析路径错（已改相对路径，`2f5cebc4` 起绿）；`c09cf3fc`／`9c9fd643` 两次 `git commit` 失败（未跟踪文件不能 `--only`／包装器内无 `pwsh`，随后 `b59820f3`＋`e3a7d2c8` 成功）；`d389cdfe` 消费方脚本用**收窄作用域**跑 `check-publish --fresh-tmp`（缺 base-paint 实包 → registry 偏斜），改用 canonical `pnpm publish:fresh`（`c18d6f9a` exit 0）；`e5a12300` canonical `pnpm test` exit 1 系**基线既有红**（判据＝具名失败集新增 0，实测 `base=34 after=29 新增=0`）。

对账命令（逐字复跑）：

```
node tooling/check-gate-audit.mjs --evidence docs/research/t83-html-first.md \
  --ticket 83 --since 2026-09-09T15:11:00.000Z --until 2026-09-09T15:15:31.000Z \
  --allow-nonzero --export docs/research/t83-gate-runs.log
```

---

## 10. 返修 R-1（红队 S1-交付缺陷 · 相对落点）— 2026-09-09 追加

- 审查：`docs/research/t83-review-red.md`（红队席，本 session 自任；独立探针 `docs/research/t83-review-red.mjs`）。**审查轮 verdict FAIL（五维 82）**，S1-交付缺陷 ×1（R-1）＋ S3×5。
- **R-1**：`deliverHtml` 把落点**原样字符串**当 `delivery.path` 回传，而 `buildDelivery` 有「绝对路径」不变量 → `SKILLS_DB_PATH` 或 `--output` 给**相对路径**时**产物已写盘却 exit 2**（`参数失败`）、stdout 无 envelope；**写键更危险**（库已写入仍报失败，按 M4 判据会被当成写失败而重试）。
- **修复**：`output.ts:deliverHtml` 内 `const written = resolve(target)`——写的就是它、回传的也是它。**只改回传值**：落盘行为、命名（#87／#119）、只读回退、回执、`delivery` 契约全部逐字不变；`cmd_read.ts`／`envelope.ts`／`base-render/**`／`SKILL.md`／`tooling/**` **零改动**。
- **回归测试**：`test/delivery-83.test.mjs` ⑥ 三例（相对 `SKILLS_DB_PATH`／相对 `--output`／相对 `SKILLS_DB_PATH` ＋ 写键）。
- **复核实测**：红队探针 **33/33**、靶向 **59/59（0 fail）**、四门 **0/0/0/0**、变异 **15/15**（新增 **M3** 还原「原样回传」→ `delivery-83` **fail=3**，还原 sha256 逐字节相同）、canonical `pnpm test` 失败集 **base=34 after=29 新增=0**、`check-gate-audit` **11/11 matched／undeclared 0**。
- **未做**：蓝队第二席（见审查报告 §8-1）。

---

## 11. 返修 R-2（蓝队 S2／S3）— 2026-09-09 追加

- 依据：蓝队 `docs/research/t83-review-blue.md`（commit `7ed94c5`）**verdict PASS（五维 85）**：S1-交付缺陷 0／**S2 ×2**（D-1／D-2）／S3 ×9，并给 §7「最小整改清单」。**编排者裁决**＝票内返修 **R-2**，只做 7 条，**不得扩大范围**。
- **改动面（4 文件）**：`packages/skill-calorie/test/delivery-83.test.mjs`／`docs/research/t83-html-first.md`／`.changeset/t83-html-first-delivery.md`／`packages/skill-calorie/SKILL.md:31`（仅该行）。**`src/**` 产品代码零改动**（`git diff --numstat -- packages/skill-calorie/src` = 0 行）、`tooling/**` 零改动、他人文件零改动。

### 11.1 逐条（改了什么／判据／证据 runId）

| 项 | 改了什么（file:line） | 判据／实测 | 证据 runId |
|---|---|---|---|
| **D-1（S2）· 取口径 ②** | `t83-html-first.md` §2 新增「**回执口径（R-2 · D-1 取口径 ②）**」：`RECEIPT` ＝**渲染／落盘失败（exit 5）专属**；`exit 2`＝参数失败、`exit 4`＝取数／缺失阻断，**各自已有独立文案、不发回执**；理由＝给 exit 2／4 追加 `RECEIPT` 会改 97 读键＋35 写键失败态 stderr＝**新能力**，不并入本票，**若未来需要另票承接**。**行为零改动**（`cmd_read.ts:1170-1176` 一字未动） | 实测 `exit4 receiptLines=0`／`exit2-缺参=0`／`exit2-写键未知字段=0`／`exit5=1`，四例 stdout 均 0 B | `cba87050-91fa-40d0-8762-d9d5d00c3d26` |
| **D-2（S2）** | `t83-html-first.md:62`（**R-6 订正行号**：原引 `:61` 系 §2 插入新条目后漂移）表标题「成功渲染并**打开**」→「成功渲染并**落盘＋回传落点**」；§7 新增第 1 条「**「打开（唤起查看器）」未确证**」，标注**归 #64 打通图／地图 Out of scope** | 证据表无「打开」已达成字样；`t83-evidence.mjs` 全文无 open／打开观测 | 文档 diff（本文件） |
| **D-4（S3）** | `delivery-83.test.mjs:246` 恒真断言 `assert.equal(html, rec.html === undefined ? html : rec.html, …)` → `assert.equal(rec.html, undefined, …)` | **MUT-83B-6 由全绿 → 红 fail=1** | `f16cded2-089c-4197-8a88-91350c656035` |
| **D-5（S3）** | `delivery-83.test.mjs:282-285` 新增 **1 条断言** `deliveryTemplateOf('receipt', '<!DOCTYPE html>…') === 'doc-shell'`（钉判定次序）。**注明：当前 99 键实测 0 例**（`OBS B8c` 无「receipt 形全文档」真机产物），钉的是**次序**本身 | **MUT-83B-3 由全绿 → 红 fail=1** | 同上 |
| **D-6（S3 · 文档）** | `.changeset/t83-html-first-delivery.md:9` 补写键覆盖面说明。**初版表述（「对写键不适用／35 写键一律拒」）已被定点复核证伪 → 见 §11.5 R-6 订正**；现表述＝「`--params '{"delivery":"text"}'` 是**交付层通用开关**（`cmd_read.ts:1040`），对读键与**多数写键同样生效**；**例外**＝对**原始 `params` 键**做白名单校验的 3 个写键（`write.ts:600/740/881`）→ exit 2 `不支持字段: delivery`」 | 探针 6 例：3 个写键 exit 0 ＋ `delivery.mode=text`／3 个写键 exit 2 拒未知字段 → `RESULT-R6-DELIVERY-SCOPE: PASS` | `59fd4ecd-425a-4f3b-b43f-2778a8e0b469`（R-6；原 `cba87050…` 只覆盖 1 个白名单键、未覆盖生效面） |
| **D-8（S3 · 文档）** | `t83-html-first.md:7`「新测试（**10 用例**）」→「**13 用例**」（实测 13 个 `test()`；本轮**只加断言不加用例**，故仍 13）；`SKILL.md:31` 补「`data.output`（**恒绝对路径**，相对 `SKILLS_DB_PATH`／`--output` 亦按 cwd 归一后回传）」 | `TEST-CASES=13`；`pnpm build` 后该行仍在（生成器 `packages/skill-calorie/scripts/build-help.mjs` 只重写 `HELP-AUTO` 块，块起点＝`SKILL.md:79`，本行在块**外**） | `53445b2c…`／`160ed1c7-edc3-4316-ab61-43cd711db612` |
| **不修（编排者已记账）** | D-3／D-7／D-9（行为面）／D-10／D-11 —— 本轮**不动** | — | — |

### 11.2 蓝队变异复跑（判据＝蓝队 §7：MUT-83B-3／-6 必须由「全绿」变「红」）

`node docs/research/t83-review-blue-mut.mjs`（单锁内「变异→重建→靶向→还原→重建→靶向 ＋ src／dist 双向 sha256 自证」）：

| 变异 | 变异轮 exit／counts | 变化 | 还原轮 | src／dist sha256 |
|---|---|---|---|---|
| MUT-83B-1 | 1 ／ `{tests:59,pass:56,fail:3}` | 仍红（R-1 三条） | 0 ／ 59-59-0 | 逐字节回原 |
| MUT-83B-2 | 1 ／ `{pass:55,fail:4}` | 仍红（`--html` 别名） | 0 ／ 59-59-0 | 逐字节回原 |
| **MUT-83B-3** | **1 ／ `{pass:58,fail:1}`** | **全绿 → 红**（D-5 断言钉住） | 0 ／ 59-59-0 | 逐字节回原 |
| MUT-83B-4 | 1 ／ `{pass:58,fail:1}` | 仍红（只读回退） | 0 ／ 59-59-0 | 逐字节回原 |
| MUT-83B-5 | 1 ／ `{pass:47,fail:12}` | 仍红（`delivery` 注入） | 0 ／ 59-59-0 | 逐字节回原 |
| **MUT-83B-6** | **1 ／ `{pass:58,fail:1}`** | **全绿 → 红**（D-4 断言钉住） | 0 ／ 59-59-0 | 逐字节回原 |

- **6 支变异轮全部 exit=1**；-3／-6 由审查轮 `{fail:0}` 变 `{fail:1}`，红行分别为 `#83 delivery 契约单元…`（-3）与 `#83 ④ 回执自身也走三态…`（-6）。每支还原后靶向 **59/59 绿**、`src`＋`dist` sha256 **逐字节回原**（脚本内自证）。
- **登记（不改）**：脚本内 -3／-6 的 `expectRed` 旗标仍为 `false`（蓝队审查期预期＝全绿），故脚本自身 `RESULT-MUT-BLUE` 行仍打印 `ALL OK`；**判定须读变异轮 exit／fail 计数**。该旗标属**蓝队审查物**、不在本席改动面 → **登记不动**（如需改，由蓝队／复核席定）。

### 11.3 门禁／回归（全部持锁）

| 门 | 命令 | exit | 关键行 | runId |
|---|---|---|---|---|
| 四门 | `pnpm build` | 0 | `tsc -b` 无 error | `53445b2c-01e0-4f17-91a9-37e369f82e41` |
| | `pnpm boundaries` | 0 | `boundaries: PASS` | `6e9eb223-380a-46f4-9f5f-73aa6bfbd0a2` |
| | `pnpm snapshot:check` | 0 | 快照一致 | `2f4b4150-db5c-4579-bcbe-ffdb15b78931` |
| | `pnpm publish:pre` | 0 | `check-publish --pre：PASS` | `50b8de6c-b30c-4959-8816-ac711f44be1e` |
| 靶向 | `node --test` delivery-83／cmd-read-t11／render-copy-90／help-center-91／skill-t11／output-naming-87 | 0 | `tests 59／pass 59／fail 0` | `ea5d4eda-5419-4732-a2b5-86f437cf62b0` |
| 蓝队变异 | `node docs/research/t83-review-blue-mut.mjs` | 0 | 6 支变异轮全红（见 §11.2） | `f16cded2-089c-4197-8a88-91350c656035` |
| D-1 口径实证 | `node .scratch/t83/r2-receipt-scope.mjs` | 0 | `RESULT-R2-SCOPE: PASS` | `cba87050-91fa-40d0-8762-d9d5d00c3d26` |
| canonical | `pnpm test` | 1（基线既有红） | `tests 1142／suites 134／pass 1117／fail 25` | `7600dc90-9554-4604-94c1-4bcec595044e` |
| 失败集 | `node docs/research/t101-fail-set.mjs docs/research/t88-baseline/test-failset.txt .scratch/t83/r2-canonical.log` | 0 | **base=34 after=29 新增=0** 消失=5（均为基线已登记抖动项） | `ccef0bab-928f-4308-8367-11aa939d1c47` |
| 自检 | `node .scratch/t83/r2-selfcheck.mjs` | 0 | `TEST-CASES=13`／`SKILL-BYTES3=2d 2d 2d`／`SKILL-L31-HAS-ABSOLUTE=true`／`SRC-DIFF-LINES=0`／`MUT-RESIDUE=0` | `160ed1c7-edc3-4316-ab61-43cd711db612` |

- **canonical 计数附注**：`tests 1142／suites 134` 较蓝队轮（1137／133）＋5／＋1，系**并发他席 #79** 新增 `packages/base-render/test/base-version-lockstep.test.mjs`（`git status` 可见）；本席**零新增 `test()`**（只加 1 条断言）。判据＝t88 白名单**新增 0**。
- **写盘事故自检（#124）**：`packages/skill-calorie/SKILL.md` 首 3 字节 `2d 2d 2d`；`MUT-\d` 残留 **0**。

### 11.4 机械门禁对账（协议 §2.4）

- **本席 R-2 段**：`--since 2026-09-09T15:50:47.805Z --until 2026-09-09T15:54:37.000Z` → 本席 `RUN` **11 条**（10 门禁＋1 过程轮）。
- **本席 R-6 段**：`--since 2026-09-09T16:16:00.000Z --until 2026-09-09T16:19:10.000Z` → 本席 `RUN` **6 条**（探针 2＋一致性自检 4，见 §11.5）。
- **对账窗口须取并集**（`--since 2026-09-09T15:11:00.000Z --until 2026-09-09T16:19:10.000Z`）：`check-gate-audit` 的**条目池按窗口过滤**，而本文件同时含 §8（R-1 前实现轮）／§10（R-1）／§11.1-11.3（R-2）／§11.5（R-6）四段声明，故单一窗口必须覆盖 15:11–15:15、15:50–15:55、16:16–16:19 三段；窗口内**他席 `RUN`**（蓝队审查轮 `f680a57a`／`adcdfff1` 等、并发 `cmd_read.js` 探针、**定点复核席 R-6 探针**）非本席执行、不得作为本席证据声明 → 按 `--allow-undeclared` 放宽并留痕（见下 GATE-RELAX）。对账源：`.scratch/locks/gate-runs.log`。

GATE-RUN runId=53445b2c-01e0-4f17-91a9-37e369f82e41 cmd=pnpm build
GATE-RUN runId=ea5d4eda-5419-4732-a2b5-86f437cf62b0 cmd=node --test packages/skill-calorie/test/delivery-83.test.mjs packages/skill-calorie/test/cmd-read-t11.test.mjs packages/skill-calorie/test/render-copy-90.test.mjs packages/skill-calorie/test/help-center-91.test.mjs packages/skill-calorie/test/skill-t11.test.mjs packages/skill-calorie/test/output-naming-87.test.mjs
GATE-RUN runId=f16cded2-089c-4197-8a88-91350c656035 cmd=node docs/research/t83-review-blue-mut.mjs
GATE-RUN runId=6e9eb223-380a-46f4-9f5f-73aa6bfbd0a2 cmd=pnpm boundaries
GATE-RUN runId=2f4b4150-db5c-4579-bcbe-ffdb15b78931 cmd=pnpm snapshot:check
GATE-RUN runId=50b8de6c-b30c-4959-8816-ac711f44be1e cmd=pnpm publish:pre
GATE-RUN runId=cba87050-91fa-40d0-8762-d9d5d00c3d26 cmd=node .scratch/t83/r2-receipt-scope.mjs
GATE-RUN runId=7600dc90-9554-4604-94c1-4bcec595044e cmd=pnpm test
GATE-RUN runId=ccef0bab-928f-4308-8367-11aa939d1c47 cmd=node docs/research/t101-fail-set.mjs docs/research/t88-baseline/test-failset.txt .scratch/t83/r2-canonical.log
GATE-RUN runId=160ed1c7-edc3-4316-ab61-43cd711db612 cmd=node .scratch/t83/r2-selfcheck.mjs
GATE-RUN runId=435f5462-43b0-48b5-9cac-057dde8c6e9b cmd=node tooling/check-gate-audit.mjs
GATE-RUN runId=64181c6d-5174-4162-a90a-e2ba376b4058 cmd=git commit --only
GATE-RUN runId=59fd4ecd-425a-4f3b-b43f-2778a8e0b469 cmd=node .scratch/t83/r2b-delivery-scope.mjs
GATE-RUN runId=c8ed0d87-2bfe-4150-8afd-6f910e7f5e99 cmd=node .scratch/t83/r2b-consistency.mjs
GATE-RUN runId=726568be-5f4a-42e2-b33d-da7ca1492659 cmd=node .scratch/t83/r2b-consistency.mjs

**过程轮（非门禁证据，逐条声明）**

GATE-RUN runId=392c0fab-771d-474d-958b-a510b4129f69 cmd=node -e
GATE-RUN runId=8d8e5fcd-b9d9-4bd7-9be3-f8168efbb2b6 cmd=node tooling/check-gate-audit.mjs
GATE-RUN runId=05370212-10df-4d46-b67f-94b27d006c38 cmd=node tooling/check-gate-audit.mjs
GATE-RUN runId=742a413b-3fee-43e7-a4c0-e45cd5505652 cmd=node .scratch/t83/r2b-delivery-scope.mjs
GATE-RUN runId=690a3b3f-f6fd-4aa1-a34f-cb80467d6330 cmd=node .scratch/t83/r2b-consistency.mjs
GATE-RUN runId=a6570f29-de6f-4be8-87c0-54bc0f6bf5d1 cmd=node .scratch/t83/r2b-consistency.mjs

（逐条说明：`392c0fab`＝`node -e` 内联自检首跑，嵌套引号语法错 → 改用 `.scratch/t83/r2-selfcheck.mjs`，`160ed1c7` 复跑 exit 0；`8d8e5fcd`＝对账窗口只取 R-2 段致 §8／§10 的 14 条声明判 missing（**窗口选法**问题，非门禁失败）→ 改并集窗口；`05370212`＝缺 `GATE-RELAX --allow-undeclared` 留痕 → 补留痕后 `435f5462` PASS；`742a413b`＝R-6 探针首跑，探针自身参数不全（`calorie.diet.add` 缺 `protein`、`calorie.profile.update` 期望值写错）→ 修正后 `59fd4ecd` PASS；`690a3b3f`／`a6570f29`＝R-6 一致性自检前两轮（① 未把 §11.5「改前」引文排除 ② 未排除「被证伪的原句」引文）→ 修正后 `c8ed0d87` PASS。）

GATE-RELAX flag=--allow-nonzero reason=`7600dc90` canonical `pnpm test` exit 1 系**基线既有红**（判据＝具名失败集**新增 0**，实测 `base=34 after=29 新增=0`）；上列**过程轮** 5 条 exit≠0（`392c0fab`／`8d8e5fcd`／`05370212`／`742a413b`／`690a3b3f`／`a6570f29`）均为脚本／窗口自身缺陷的修复轮，非门禁证据。

GATE-RELAX flag=--allow-undeclared reason=对账窗口取并集后（15:11–16:18）窗口内含**他席** `RUN`（蓝队审查轮 `f680a57a`／`adcdfff1` 等 ＋ 并发 `cmd_read.js calorie.help.center` 探针 ＋ **定点复核席 R-6 探针**，见 `.scratch/locks/gate-runs.log`），非本席执行、不得作为本席证据声明；本席四段声明共 **35 条全部 matched**。

对账命令（逐字复跑）：

```
node tooling/check-gate-audit.mjs --evidence docs/research/t83-html-first.md \
  --ticket 83 --since 2026-09-09T15:11:00.000Z --until 2026-09-09T16:19:10.000Z \
  --allow-nonzero --allow-undeclared
```

实测：`RESULT: matched=35/35 auditEntries=891 scoped=123 undeclared=88` → **gate-audit: PASS**（exit 0；runId `4087864b-df38-4de7-86d1-b48ef29fd9ad`）。快照说明：`auditEntries`／`scoped`／`undeclared` 随并发他席运行持续增长，数值以该 runId 轮次为准（`undeclared` 含**定点复核席**以 `--ticket 83` 运行的 `341c69eb`／`50817376` 等）。

### 11.5 R-6 订正（定点复核 R2N-1）— 2026-09-09 追加

- **定点复核结论**：R-2 其余 4 条声称成立（D-1 真机 5 例＋`src` 零改动／D-2 在位／D-4／D-5 在位且 **MUT-83B-3／-6 变异轮 exit=1 fail=1**、还原 59/59、sha256 逐字节回原／四门 0/0/0/0、靶向 59/59、canonical 新增 0）；**唯一阻断项 R2N-1（S2）＝文档事实错误**。
- **被证伪的原句**（R-2 写入 `.changeset/t83-html-first-delivery.md:9` 与本文件 §11.1 D-6 行）：「`--params '{"delivery":"text"}'` **对写键不适用** —— 35 个写键各有参数白名单、未知字段一律拒」。错因：把「**遍历原始 `params` 键**的 3 处白名单」误推成「35 写键全拒」，且与本段首句「用户明确要文本（`--params '{"delivery":"text"}'`）」**自相矛盾**。
- **改前 → 改后（逐字）**：
  - 改前：`--params '{"delivery":"text"}'` **对写键不适用** —— 35 个写键各有参数白名单、未知字段一律拒（实测 `calorie.exercise.update …` → exit 2 `不支持字段: delivery`）。
  - 改后：`--params '{"delivery":"text"}'` 是**交付层通用开关**（`cmd_read.ts:1040` `params['delivery'] === 'text'`），对读键与**多数写键同样生效**（实测 10 个写键中 **7 个** exit 0 ＋ `delivery.mode=text`）；**例外**＝对**原始 `params` 键**做白名单校验的 3 个写键 `calorie.exercise.update`／`calorie.product.update`／`calorie.body.measure-add`（`write.ts:600/740/881`）→ 未知字段被拒、**exit 2 `不支持字段: delivery`**（`calorie.profile.update` 的白名单只遍历**已过滤字段** `picked`，`write.ts:779`，`delivery` 被忽略、仍生效）。
- **真机证据**（`node .scratch/t83/r2b-delivery-scope.mjs`，6 例 6 PASS；runId `59fd4ecd-425a-4f3b-b43f-2778a8e0b469`，exit 0）：

```
# 非白名单写键（delivery 生效）
node packages/skill-calorie/dist/cli/cmd_read.js calorie.water.log  --params '{"ml":250,"delivery":"text"}'            → exit 0 · delivery.mode=text · template=text · data.text ✓
node packages/skill-calorie/dist/cli/cmd_read.js calorie.diet.add  --params '{"foodName":"鸡胸","calories":200,"protein":35,"delivery":"text"}' → exit 0 · delivery.mode=text · data.text ✓
node packages/skill-calorie/dist/cli/cmd_read.js calorie.profile.update --params '{"field":"age","value":30,"delivery":"text"}' → exit 0 · delivery.mode=text · data.text ✓（白名单只遍历 picked）
# 遍历原始 params 的白名单写键（delivery 被拒）
node packages/skill-calorie/dist/cli/cmd_read.js calorie.exercise.update --params '{"id":1,"calories":10,"delivery":"text"}'    → exit 2 · ERR 2: 不支持字段: delivery
node packages/skill-calorie/dist/cli/cmd_read.js calorie.product.update  --params '{"id":1,"note":"x","delivery":"text"}'      → exit 2 · ERR 2: 不支持字段: delivery
node packages/skill-calorie/dist/cli/cmd_read.js calorie.body.measure-add --params '{"waistCm":85,"delivery":"text"}'          → exit 2 · ERR 2: 不支持字段: delivery
```

- **引用漂移一并更正**：§11.1 D-2 行的 `t83-html-first.md:61` → **`:62`**（§2 插入新条目后行号漂移；表行现位于 `:62`）。其余引用复核实测：`delivery-83.test.mjs:246`（D-4 断言）／`:282-285`（D-5 断言）／`SKILL.md:31`／`SKILL.md:79`（AUTO 块起点）／`cmd_read.ts:1040`／`cmd_read.ts:1170-1176`／`write.ts:600/740/779/881` 全部在位。
- **一致性自检**（`node .scratch/t83/r2b-consistency.mjs`，runId `c8ed0d87-2bfe-4150-8afd-6f910e7f5e99`，exit 0）：断言 `.changeset:9` 与本文件 §11.1 D-6／§11.5 的表述**一致**、被证伪句**只以历史引文形式**存在、且 8 处 src／test 锚点**逐字相符**（`RESULT-R6-CONSISTENCY: PASS`）。过程轮 `690a3b3f`／`a6570f29` 为自检脚本自身两轮缺陷（未排除历史引文），已在 §11.4 逐条声明。
- **范围**：只改这**一句话**（两处同源表述）＋行号引用；**不动代码／测试**（`git diff --name-only` 仅 `.changeset/t83-html-first-delivery.md`＋本文件）。



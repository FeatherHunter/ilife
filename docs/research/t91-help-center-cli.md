# #91 证据：`calorie.help.center` 承载全量速查台（Q9）＋ `mode` 显式三态（D6）＋ 照片 10 键兼容

- 票：wayfinder 地图 #63 / 票 #91《help.center 承载全量速查台》（`blocked_by #88`）
- 认领：`gh issue edit 91 --add-assignee FeatherHunter` → `assignees: FeatherHunter (王辰浩)`（第一笔写操作）
- 基准：`docs/research/t88-baseline/BASELINE.md`（四门 exit 0；`pnpm test` 判据＝具名失败集**新增 0**）
- 接缝契约：`docs/research/t88-final.md` §7.1–§7.3（#88 收尾的 #91 接线口径；本票实现与之逐条一致，见 §4）
- 可复跑探针：`node docs/research/t91-probe.mjs`（CLI 出口 28/28，**不 import dist**，反证单测非自证满足）
- 单测：`packages/skill-calorie/test/help-center-91.test.mjs`（5 用例）

## 1. 现状诊断（变更前）

| 项 | 事实（`file:line`） |
|---|---|
| 键注册 | `packages/skill-calorie/src/cli/keys.ts:87` `'calorie.help.center': { shape: 'list', title: '身材照HELP' }`（**本票未改**：`title` 与 `packages/base-combos/combos.yaml` 逐键同值由 `test/output-naming-87.test.mjs:124` 钉死，改它须同步非本票路径 → 见 §7-1） |
| 分发 | `packages/skill-calorie/src/cli/cmd_read.ts:732`（改前）`case 'calorie.help.center'`：`q ? lookupPhotoHelp(q) : buildPhotoHelp()` → `data={items,total}`＋`renderPhotoHelpHtml(hits,q)`；**完全不读 `mode`** |
| 照片 10 键实现 | `packages/skill-calorie/src/render/help.ts:52` `buildPhotoHelp()`（10 键，`SCENE_09_PHOTO` SoT 序）／`:70` `lookupPhotoHelp()`（空串抛） |
| 出口落盘 | `cmd_read.ts:988`（改前编号）`env = buildEnvelope(key, shape, {...out.data, output: htmlTarget})`；HTML 恒落 `<SKILLS_DB_PATH>/calorie_html/<title>_<TS>[_N].html`（`src/output.ts:106`） |
| 全量速查台 | `packages/skill-calorie/src/render/helpCenter.ts`（#88，339 行）：`HELP_CENTER_MODES=['file','inline','text']`／`renderHelpCenterHtml({mode})`／`buildHelpSceneData()`；**本票只读消费，零改动** |
| envelope 契约 | `cmd_read.ts:243` `buildEnvelope` 恒 `{version,skill,shape,key,data}`（**无 `status`**，Q8） |

**变更前实测**（`.scratch/t91/before.mjs`，`SKILLS_DB_PATH=.scratch/t91/db`）：

| 调用 | exit | items／total | 落盘字节 | 说明 |
|---|---|---|---|---|
| 无参 | 0 | 10／10 | 31,110 B | 照片 10 键片段（无 `<!DOCTYPE>`） |
| `{"q":"记身材照"}` | 0 | 3／3 | 23,075 B | 照片现找 |
| `{"q":""}` | 0 | 10／10 | 31,110 B | 照片全量 10 键 |
| `{"mode":"file"}`／`inline`／`text`／`bogus` | 0 | 10／10 | 31,110 B | **`mode` 被静默忽略**（D6 未落地，四种取值产出逐字相同） |

**两条既有测试锁了什么**（本票原样通过，零改动）：

| 测试 | 锁的事实 |
|---|---|
| `packages/skill-calorie/test/cmd-read-t11.test.mjs:182-191` | `runOk(dir,'calorie.help.center',{q:'记身材照'})` → `data.total>=3`；`lookupPhotoHelp('')` 抛；`buildPhotoHelp().length===10` |
| `packages/skill-calorie/test/render-copy-90.test.mjs:254-266` | spawn `{q:'记身材照'}`＋`--html` → exit 0；产物至少 1 个复制按钮、`actionId`＝`HELP_COPY_ACTIONS.prompt`、`data-t` 逐字等于该行 `exec`、含 `COPY_RUNTIME_JS`、零内联事件处理器 |

→ 两条测试**只锁 `q` 路径**（非空 q 的照片现找）；无参语义无测试覆盖（`plugin-calorie/test/smoke.test.mjs:54` 的无参用例是**冻结基线红**：`SyntaxError: Unexpected end of JSON input`＝spawn 空 stdout 环境抖动，两轮 canonical 均红，见 `docs/research/t88-baseline/09c-pnpm-test-canonical-2.log:1337-1347`）。

## 2. 设计与落点

**唯一落点**：`packages/skill-calorie/src/cli/cmd_read.ts` 的 `help.center` 分支 ＋ 该分支所需 helper `helpCenterIndex()`；只读 import `../render/helpCenter.js`（#88）。**未改** `render/helpCenter.ts`／`base-render/**`／`output.ts`／`keys.ts`／`routing.ts`／`render/help.ts`（照片 10 键实现零改动）。

**参数契约**（D6「显式 `mode`」的落地方式：与既有 CLI 风格一致——所有参数一律走 `--params` JSON 对象，`parseArgs` 对未知 `--flag` 一律 `fail(2)`，故**不新增 `--mode` 顶层开关**，避免改动全局 argv 解析）：

| 参数 | 语义 |
|---|---|
| `mode` ∈ `file`／`inline`／`text` | **显式**选择全量速查台交付形态；缺省 `file`（#88 §7.2 的缺省同值）。非法值／非字符串 → `exit 2`（不再静默忽略） |
| `q`／`keyword` | **照片 10 键**：非空＝现找（无命中 `exit 4`）；`q:""`＝全量 10 键。**逐字保留改前行为** |
| 无 `q` 且无 `mode` | 全量速查台 `file` 态（Q9「承载全量速查台」的默认语义） |
| `q`（非空）＋ `mode` | **互斥** → `exit 2`（不隐式择一） |

**照片 10 键走哪条路**：走 `q`（**不是** `mode` 的取值）。理由：`HELP_CENTER_MODES` 由 #88 冻结为 `file|inline|text`（本票不得改），且两条既有测试、唤醒词路由（`routing.ts:632` `看身材照HELP` → `--params '{"q":"记身材照"}'`）、`combos.yaml` 的 REPR 全部经 `q` 进来 —— 让照片走 `q` 即**零回归**。

**三态落点**（同一 `renderHelpCenterHtml({mode, sceneData})`，不存在第二套数据路径）：

| mode | 产物（落 `data.output`） | envelope `data` |
|---|---|---|
| `file` | 完整 HTML 文档 | `{items:10 分组索引, total:10, sceneTotal:436, subgroupTotal:54, mode:'file', bytes}` |
| `inline` | `<style>`＋壳 `<section>`＋helpers 片段 | 同上（`mode:'inline'`）；**片段不入 envelope** |
| `text` | 纯文本索引 | 同上（`mode:'text'`）＋ `text`（文本即交付物，≈24 KB） |

**envelope 新契约**：恒五字段 `version/skill/shape/key/data`（**无 `status`**，Q8）；`data` 只回索引＋元信息，**1 MB 产物只落盘**（与 `t88-final.md` §7.3-①／-③ 推荐口径逐条一致：保持 `list`、不新增 `delivery` 字段、`text` 态放 `data.text`）。

## 3. 实跑证据（三态 ＋ 照片兼容）

`node docs/research/t91-probe.mjs` → **RESULT: 28/28**（exit 0；`docs/research/t91-probe.mjs` 逐条 PASS 行可复跑）：

| 断言 | 实测 |
|---|---|
| 默认（无参）＝ `file` 态 | `mode=file`、`bytes=1,028,317`（＝改前 31,110 B 的 33 倍） |
| `file` 产物 | `<!DOCTYPE html>` ＋ `<meta charset="utf-8">`；`data-scene-id` **436**、`data-subgroup-id` **54**、复制按钮 **1,308** |
| `inline` 产物 | 819,941 B；`<style>` 开头、含 `<section class="ilife-help-shell" id="ilife-help-shell">`、零 `<!DOCTYPE`；`stdout` 仅 **1,059 B**（片段不入 envelope） |
| `text` 产物 | 24,391 B／513 行；零标签；`data.text` 逐字等于产物；`stdout` **18,848 B** |
| 三态同源 | `file` 与 `inline` 的 436 个 `data-scene-id` **序逐字相同**；`text` 覆盖 436 个 id 且序相同（＝模块级 `SceneData` 序） |
| 索引口径 | `items=10`／`total=10`／`sceneTotal=436`／`subgroupTotal=54`；分组 `sceneCount` 求和＝436 |
| envelope | 三态均 `version,skill,shape,key,data` 五字段；`status` 命中 0 |
| 落点 | `身材照HELP_20260909_221305.html`（#87 命名，`data.output` 回传） |
| 照片兼容 | `{q:'记身材照'}` → `total=3`、`data` 键集恒 `items,total,output`、item 字段恒 `wakeWord,key,desc,exec`、产物片段＋3 个复制按钮＋helpers marker；`{q:''}` → `total=10` |
| 参数纪律 | `q`+`mode` → exit 2（含「互斥」文案、stdout 空）；`mode:'bogus'` → exit 2；`mode:1` → exit 2 |

**既有两条测试原样通过**（持锁靶向，见 §5 `GATE-RUN 440d51a7`）：`cmd-read-t11.test.mjs`＋`render-copy-90.test.mjs`＋`render-t10.test.mjs`＋`skill-t11.test.mjs`＋`output-naming-87.test.mjs`＋`db-readonly-93.test.mjs` **6 文件 56/56 pass／fail 0／exit 0**（其中 `#93 ① 64 读键` 在本组内为绿：本票改后 `help.center` 在只读句柄上照常可用）。

**新单测**：`packages/skill-calorie/test/help-center-91.test.mjs` **5/5 pass／fail 0／exit 0**（`GATE-RUN 5f86cec3`）。

## 4. 与 #88 接线口径对齐（`t88-final.md` §7.3）

| #88 口径 | 本票实现 |
|---|---|
| 新增显式 `--params '{"mode":"file|inline|text"}'` | ✅ 同 |
| `q`／`keyword` 仍走照片 10 键（非空＝现找、`q:""`＝全量 10 键） | ✅ 逐字保留 |
| `q` 与 `mode` 互斥 → exit 2 | ✅ 同 |
| 不得用「有没有 mode」以外的隐式推断（D6） | ✅ `mode` 缺省恒 `file`，无其他推断 |
| `file`／`inline` 不塞回 envelope；`data` 只回索引＋元信息 | ✅ `stdout` 1,059 B（inline）／1,059 B（file 同量级） |
| 保持 `list`；`text` 态可放 `data.text`；不新增 `delivery` 字段（#83 面） | ✅ 未新增任何 envelope 顶层字段 |

## 5. 门禁实测（四门 ＋ canonical delta）

四门逐条持锁（`node tooling/run-locked.mjs --ticket 91 -- …`）：

| 门 | exit | 关键行 | runId |
|---|---|---|---|
| `pnpm build` | **0** | 无 `error TS` | `acd6af12-60db-4e26-b930-dbb76ec725d7` |
| `pnpm boundaries` | **0** | `boundaries: PASS` | `1afe8667-9863-42aa-9ad4-85de4a2aed71` |
| `pnpm snapshot:check` | **0** | `OK: 快照 == 实际拉取版（0.1.0@932e7b250d278d50）` | `da8a89be-2dca-4566-99da-caee4b1ec96f` |
| `pnpm publish:pre` | **0** | `check-publish --pre：PASS` | `80453eeb-78e9-4f38-aa2c-6ca2ea1d53cb` |

**canonical `pnpm test` 1 轮**（`GATE-RUN 516c3705`，日志 `docs/research/t91-canonical-test.log`）：`tests 1102／suites 131／pass 1076／fail 26`，exit 1（＝冻结基线既有红）。

**delta 判定**（`node docs/research/t101-fail-set.mjs docs/research/t88-baseline/test-failset.txt docs/research/t91-canonical-test.log`）：`base=34 after=30 新增=1 消失=5`。

| 轮 | 新增测试名 | 失败签名 | 分类（`t88-delta-flake-ruling.md`） |
|---|---|---|---|
| canonical #1 | `#109 命名底座可用：运动总览落点＋回传一致＋产物为全文档`（`packages/skill-calorie/test/sport-homogeneity-109.test.mjs:283`） | `AssertionError: stderr=`（空）＋ `3221225477 !== 0`（＝`0xC0000005` NTSTATUS 访问违例，来自 `spawnSync` 子进程） | **B 类（环境抖动）→ 不计入新增，真 delta 0** |

B 类五要件逐条（§5.1 ＋ §5.2 反滥用守卫）：

1. §5.1 签名：`spawnSync` 子进程以 NTSTATUS 异常终止（`3221225477`）、**stderr 无断言差异信息**、**干净重建后单独复跑 ≥2 次全绿** → `58586875-5ac9-4526-b027-d9d3eb56f584`／`e8618cd9-fb1f-4491-b750-5540cf86116a`（各 12/12 pass／exit 0，前置 `pnpm build` `d6f24450-297f-458b-a239-095711d79d2b` exit 0）。
2. §5.2-1（本票路径所有权／被测对象）：该测试文件**不在本票路径所有权内**；崩溃点所在的 CLI 调用是 `calorie.view.exercise`（运动总览），**不经**本票改动的 `case 'calorie.help.center'` 分支（本票改动面＝该分支 ＋ 其 helper ＋ 新增测试）。
3. §5.2-2：stderr 空，非业务语义错误。
4. §5.2-3：该测试名在冻结基线**两轮 canonical 均为 ✔**（`09b-…log:956`／`09c-…log:954`）。
5. §5.2-4：本票仅 1 轮 canonical，不存在「连续 ≥3 轮」。
6. §5.2-5：单独复跑命令与输出已入 `.scratch/t91/rerun-109-{1,2}.log`（现场）＋本表 runId。

**并发上下文（当轮）**：canonical 运行窗口 `14:12:03Z–14:12:33Z`；同期 #88 收尾 session 在本工作区提交（`c78cb8b` 14:1xZ 前后）并跑收尾门禁，另有 #96 收尾 session（`5d6adb6`／`83ebad4` 时段）在跑；**无 headless 浏览器实证并行**。锁保证全量测试互斥，但**不降低残余负载**（`t88-delta-flake-ruling.md` §3）。

**白名单**：`git diff 93e27f9 -- docs/research/t88-baseline/test-failset.txt` → **0 行**（未改口径）。

**`pnpm gate:selftest`**：按 §2.4-6 须单独触发；本票未跑（不在派单门禁清单内，且 `tooling/**` 属他票在飞面）→ §7 未确证登记。

## 6. 变异自证（2 处，均 src 级 `cmd_read.ts`，逐处「变异→重建→红→立即还原→重建→绿」＋sha256）

- 还原前 sha256：`893D34EB4FABA2FF3A3D79A2F84B262A0F5457ACCEC5EB447A5B773083390469`（`packages/skill-calorie/src/cli/cmd_read.ts`）

| 变异 | 改动 | 红点 | 还原自证 |
|---|---|---|---|
| **MUT-91-1** | `const mode = (modeRaw ?? 'file')` → `?? 'inline'` | 新测 ① 红：`AssertionError: 缺省交付形态＝file`（`runId bb5e613b`，build `213351bf` exit 0） | sha256 复算＝`893D34EB…90469` 逐字相同；build `b507e543` exit 0；新测 `9d8dfd79` **exit 0**（5/5） |
| **MUT-91-2** | 照片分支守卫 `if (q !== undefined && modeRaw === undefined)` → `if (false && …)` | 新测 ③ 红：`AssertionError: 照片路径 data 键集不回归（output 由出口追加）`（`runId e06871f9`，build `a8d6091b` exit 0） | sha256 复算同上逐字相同；build `1c46eb37` exit 0；新测 `0f9b929f` **exit 0**（5/5） |

- 两处变异覆盖本票两条核心语义：**默认交付形态**与**照片 10 键兼容分支**；还原后 `git status --short -- packages/skill-calorie` 无残留。
- 变异期间未与其他 session 的变异重叠（`.scratch/locks/gate-runs.log` 同窗口 `ticket=91` 独占 RUN 条目）。

## 7. 偏离记账 / 未做 / 未确证

1. **`keys.ts` 的 `title` 未改（偏离「顺带改名」的直觉）**：`'身材照HELP'` 已不能概括全量速查台，且它决定默认落盘文件名（`身材照HELP_<TS>.html`）。改它须同步 `packages/base-combos/combos.yaml`（`output-naming-87.test.mjs:124` 逐键同值断言）——**该路径不在本票所有权内** → 本票不改，登记为 **S3 交接**（归属：#87/#119 命名面或后续票）。
2. **`SKILL.md:184` 的文档口径已过时**（「`calorie.help.center`（全量 10 键…）」）：`SKILL.md` 不在本票路径所有权内（且 `pnpm test` 会重写其 AUTO 块）→ 未改，登记 **S3 交接**（需 `writing-for-agents` 口径同步，建议随唤醒词接线票一并做）。
3. **唤醒词接线未做**：`routing.ts:632` 的 `看身材照HELP` 仍指向 `--params '{"q":"记身材照"}'`（照片现找）；全量速查台的唤醒词入口（map 验收②「`卡路里HELP` 打开完整速查台」）需要新增/改 `routing.ts`（**不在本票所有权内**）→ 登记交接。本票只保证 **CLI 键**可用（`calorie-cmd-read calorie.help.center --params '{"mode":"file"}'`）。
4. **`data.text` 的 18.8 KB stdout**：`text` 态把文本随 envelope 回传（#88 §7.3-③ 明许），其余两态不回产物。若后续 #83 定 `delivery` 契约要求「文本也走文件」，属 #83 面调整。
5. **未确证**：`pnpm gate:selftest` 未跑（§5 末）；`changeset:status` 环境红（`Cannot find module '@changesets/errors'`）未跑，同基线 §6.2；`publish:tarball`／`publish:fresh`（会真装包）未跑，不属四门。
6. **共享 index 归属（§4.6 如实补注）**：提交 `a245431` 的 `git diff --cached` 里混入 **#88 的 `docs/research/t88-gate-runs.log`**（他席已 `git add`、尚未提交的对账源导出），被本票 commit 连带提交 —— 本票**未改动该文件内容**，#88 收尾证据 `t88-final.md:144` 已同条登记。后续提交改用 `git add <本票路径>` ＋ `git commit --only <本票路径>`。

## 8. 风险 top3

1. **无参语义改变的用户可见面**：改前无参＝照片 10 键表，改后＝全量速查台（Q9 默认语义；照片 10 键仍经 `q` 可用、`q:""` 得全表）。**风险**＝外部若有脚本依赖无参输出（本仓无：`plugin-calorie` 面板默认读键是 `calorie.view.home`；`smoke.test.mjs:54` 的无参用例是冻结基线红且只断言 `shape/key/data.total>=1`）。**缓解**＝`data` 新增字段全为 additive、`shape` 仍 `list`、`total>=1` 仍成立。
2. **1 MB 产物 × 每次调用**：`file`／`inline` 态每次落一个 0.8–1.0 MB 文件到 `calorie_html/`（#87 命名、同秒加后缀）。**风险**＝磁盘增长／同秒多调用堆积。**缓解**＝`--output` 可覆盖；是否要「复用同秒文件」属 #87/#83 面，本票不擅自改。
3. **默认落盘文件名仍叫 `身材照HELP_*.html`**（§7-1 的连带后果）：全量速查台落盘名与语义不符。**风险**＝用户/审查误判产物归属。**缓解**＝`data.mode`／`bytes`／`sceneTotal` 在 envelope 内自证；改名须跨票同步 `combos.yaml`。

## 9. 机械门禁对账（协议 §2.4）

对账窗口：`--ticket 91 --since 2026-09-09T14:09:30Z --until 2026-09-09T14:13:00Z`。对账源导出：`docs/research/t91-gate-runs.log`（受 git 跟踪）。

GATE-RELAX flag=--allow-nonzero reason=canonical `pnpm test` 因冻结基线白名单既有红必然 exit=1（判据＝失败集新增=0，非 exit 码）；本票口径同 `BASELINE.md` §5

GATE-RELAX flag=--allow-undeclared reason=对账窗口内 7 条无人声明的 RUN 条目全部是**过程运行**：① 测试文件成型期的 3 次红跑（`a92a36ff`／`38a60227`／`f2f0e8a6`，断言口径自身笔误修正）；② 2 次**变异红**跑（`bb5e613b`／`e06871f9`，变异自证的红半，故意 exit=1）；③ 2 次 commit 命令形态失败（`7034c73f` `--only` 不认未跟踪路径／`80f76b2e` `pwsh` 不在 PATH）。按 §2.4-4「只认领 exit=0 的条目」，这些条目**不得**充作门禁证据，故不声明；已在 §9 末「过程运行」逐条列明 runId 与成因

GATE-RUN runId=3c3c067d-1051-49a4-9f30-26bd2c443704 cmd="pnpm build"
GATE-RUN runId=acd6af12-60db-4e26-b930-dbb76ec725d7 cmd="pnpm build"
GATE-RUN runId=1afe8667-9863-42aa-9ad4-85de4a2aed71 cmd="pnpm boundaries"
GATE-RUN runId=da8a89be-2dca-4566-99da-caee4b1ec96f cmd="pnpm snapshot:check"
GATE-RUN runId=80453eeb-78e9-4f38-aa2c-6ca2ea1d53cb cmd="pnpm publish:pre"
GATE-RUN runId=516c3705-609f-426d-88f8-05bf994a4644 cmd="pnpm test"
GATE-RUN runId=5f86cec3-9e24-4268-b862-9f9dbccff07e cmd="node --test packages/skill-calorie/test/help-center-91.test.mjs"
GATE-RUN runId=440d51a7-2908-43c7-ab05-03af2abb3628 cmd="node --test packages/skill-calorie/test/cmd-read-t11.test.mjs packages/skill-calorie/test/render-copy-90.test.mjs packages/skill-calorie/test/render-t10.test.mjs packages/skill-calorie/test/skill-t11.test.mjs packages/skill-calorie/test/output-naming-87.test.mjs packages/skill-calorie/test/db-readonly-93.test.mjs"
GATE-RUN runId=e8332510-e169-4c69-ae5e-feb4a6de0549 cmd="powershell -NoProfile -Command \"git add packages/skill-calorie/src/cli/cmd_read.ts packages/skill-calorie/test/help-center-91.test.mjs; git diff --cached --name-only; git commit -F .scratch/t91/commit-1.txt\""
GATE-RUN runId=d6f24450-297f-458b-a239-095711d79d2b cmd="pnpm build"
GATE-RUN runId=58586875-5ac9-4526-b027-d9d3eb56f584 cmd="node --test packages/skill-calorie/test/sport-homogeneity-109.test.mjs"
GATE-RUN runId=e8618cd9-fb1f-4491-b750-5540cf86116a cmd="node --test packages/skill-calorie/test/sport-homogeneity-109.test.mjs"
GATE-RUN runId=213351bf-5301-4c57-a594-7330c0b156f0 cmd="pnpm build"
GATE-RUN runId=b507e543-47d9-4116-b5fe-f936d88576c4 cmd="pnpm build"
GATE-RUN runId=9d8dfd79-ce10-4390-ac17-447cf0053daa cmd="node --test packages/skill-calorie/test/help-center-91.test.mjs"
GATE-RUN runId=a8d6091b-ae93-4dfb-b24e-c6e34fe98dae cmd="pnpm build"
GATE-RUN runId=1c46eb37-65c3-4f59-9d36-ea10ef572e7e cmd="pnpm build"
GATE-RUN runId=0f9b929f-e230-461d-93ff-fdd10cb53e66 cmd="node --test packages/skill-calorie/test/help-center-91.test.mjs"

**过程运行（非门禁证据，仅供追溯）**：`3c3c067d`／`a92a36ff`／`38a60227`／`f2f0e8a6`（首轮 build ＋ 新测三次红：断言口径自身笔误修正，见 §3 与提交 `a245431` 前的过程）、`bb5e613b`／`e06871f9`（两处**变异红**，非门禁证据）、`7034c73f`／`80f76b2e`（两次 `git commit` 命令形态失败：`--only` 对未跟踪文件不认路径／`pwsh` 不在 PATH）、`e8332510`（成功提交）。

# #107 · HELP：6 个死模板并入重建 —— 证据（可复跑）

> 票：https://github.com/FeatherHunter/ilife/issues/107（父图 #63，D4「6 个死模板并入 HELP」）
> 结论：**6 件模板全部「并入 HELP 重建」并真被渲染**（不留死文件、不删除）；`skill-t11.test.mjs`
> 断言由「文件存在」升级为「存在 ＋ 被速查台渲染」；四门 exit 0、canonical 新增 0、白名单 diff 0 行。

## 1. 逐模板诊断与处置

诊断口径：逐文件读全文（各 41 行），按「内容是否已被新 HELP（`helpCenter.ts` ＋ base-paint `renderHelpShell`）
覆盖」判定。6 件同为 **#118 分类的 `legacy`**（无 `<!--CONTENT-->`／`<!--INJECT-DATA-->`，仅双共享标记）。

| 模板 | 内容摘要（唯一信息） | 已被新 HELP 覆盖？ | 处置 | 理由 |
|---|---|---|---|---|
| `home.html` | 页名「今日总览」＋取数 `calorie.view.home` ＋ `#kpi` 容器 ＋ 复制数据面板 | 唤醒词/键已在 436 场景（「看今日主页」）；**页面壳**由 `html.ts pageShell` 渲染 ⇒ 壳已覆盖；**「看板页入口」（页名＋命令＋一句说明）未被覆盖** | **并入** | 取数命令是「看板页」入口，速查台 436 卡按**唤醒词**索引、不按**页面**索引 |
| `diet.html` | 「饮食总览」＋`calorie.view.diet`＋`#meals` | 同上（「看今日饮食概览」） | **并入** | 同上 |
| `exercise.html` | 「运动总览」＋`calorie.view.exercise`＋`#burn` | 同上（「看今日运动概览」） | **并入** | 同上 |
| `goal.html` | 「目标分析」＋`calorie.view.goal`＋`#goal` | 同上（「看今日目标进度」） | **并入** | 同上 |
| `photo-gallery.html` | 「看身材照」＋`calorie.photo.list`＋`#photos`＋二进制原样说明 | 同上（「看身材照」）；二进制原样口径亦见 `SKILL.md:163` | **并入** | 同上 |
| `help.html` | 「HELP 速查」＋`calorie.help.lookup`＋照片 HELP 模块说明 | 同上（「看今日主页」）；照片模块口径见 `SKILL.md:156,162` | **并入** | 同上 |

**共同事实**：6 件的**静态壳**（`.wrap/.hero/.grid/pre` ＋ 空容器）与 `src/render/html.ts` 的 `pageShell`
重复且**不可填充**（无 `<!--CONTENT-->`／`<!--INJECT-DATA-->`）；6 件的**取数命令**都在 77 键注册表内
（`calorie.view.home`／`view.diet`／`view.exercise`／`view.goal`／`photo.list`／`help.lookup`）。

## 2. 为什么本票不选「删除」（跨路径耦合实证，非偏好）

删除 6 件会**直接打红第 4 门**，而这两处消费方**都不在本票路径所有权内**（`tooling/**` 更在禁改名单内）：

- `packages/skill-calorie/src/render/templates.ts:7-14`：`CALORIE_TEMPLATES` 仍列 6 名 → `loadTemplate` 必抛 `missing-data`；
- `tooling/check-publish.mjs:58-60`（`WITH_TEMPLATES`／`TEMPLATE_NAMES`）、`:126-135`（G2 tarball 逐件点名）、
  `:207-242`（G3 安装态逐件 `loadTemplate` 真读）：6 件缺席即 `FAIL: tarball 缺模板`／`安装态无 templates/ 目录` → `pnpm publish:pre` 非 0。

⇒ 在「四门逐条 exit 0」的硬约束下，**唯一可行且符合 D4 的路径是「并入」**（把死文件变成承重件）。

## 3. 落点与被渲染证据

**落点**：`packages/skill-calorie/src/render/helpCenter.ts` 新增 **S3 段**（`buildHelpViewEntries`／
`renderViewEntriesHtml`／`helpViewEntriesMetaBlock`），经 **base-paint 契约既有槽位 `SceneData.meta_blocks`**
（`spec/help.ts:61-66,97`；`help.ts:653-656` 渲染进 `<section id="ilife-help-shell">` 内）渲染。

- 抽取契约：每件模板**恰 1 处** `<h1>`（页名）／`<p class="lead">`（一句说明）／`<pre class="view-cli">`（取数命令）；
  缺失／重复／空值 → `missing-data`，命令非 `calorie-cmd-read` 开头 → `bad-input`（不返空、不静默跳过）。
- **三态同源**：`file`／`inline` 走 `meta_blocks`，`text` 走文本段 `[看板页入口]`（同一份 entries）；
  `renderHelpCenterHtml` **签名与三态语义未改**（只多传一份 `meta_blocks`）。
- **生产可达**：`src/cli/cmd_read.ts:91` 的 `calorie.help.center` 直接调 `renderHelpCenterHtml`
  ⇒ `calorie-cmd-read calorie.help.center --params '{"mode":"file"}'` 的产物即含该块（非仅测试可见）。

**实测**（只读探针 `docs/research/t107-probe-render.mjs` → `.scratch/t107/ev-probe-tracked.log`，**25/25 PASS**）：

| 断言 | file | inline | text |
|---|---|---|---|
| `data-meta-id="view-entries"` | 1 | 1 | — |
| `data-view-entry="` 条目 | 6 | 6 | — |
| 6 件标题/命令逐条落地 | ✓ | ✓ | ✓（`[看板页入口]` 段 6 行） |
| 不回归：`data-scene-id`／`data-subgroup-id`／`data-action-id` | 436／54／1308 | 436／54／1308 | 436 条 4 空格行 |
| 元素 id 全唯一／标记残留 0 | ✓／✓ | ✓／✓ | 零标签 ✓ |

产物 SHA-256 前 16 位：file `02a39c7a9f3bde2c`（1,032,345 B）／inline `8598f1eb3f96baf5`（821,908 B）／
text `92425e0abb47e626`（24,989 B）。**改模板一个字 → 产物即变**（§5 M3 实测：改 `home.html` 的 `<h1>` 后
file 态产物 SHA 变化且新标题出现在产物中，还原后 SHA 回原）。

## 4. `test/skill-t11.test.mjs` 断言改动

| 位置 | 旧 | 新 |
|---|---|---|
| `:56-57` 文件名硬断言 | `deepEqual(files, [6 个文件名])` | **保留**（6 件仍在，事实未变）＋ 逐件新增三锚点计数断言（`<h1>`／`<p class="lead">`／`<pre class="view-cli">` 各恰 1，`:65-68`） |
| 新增 `模板 6 件被 HELP 速查台真正渲染（#107）`（`:74-106`） | — | entries＝6 且序＝`CALORIE_TEMPLATES`；抽取值逐字来自磁盘原文（含 `<title>` 与 `<h1>` 一致）；file／inline 各 1 个 meta 块 ＋ 6 条目 ＋ 6 标题/命令落地；text 含入口段且 4 空格场景行恒 436 |
| 新增 `入口块自负转义`（`:108-115`） | — | `meta_blocks.html` 原样透传 ⇒ 标题/说明必须实体化（防模板内容注入标签） |

## 5. 变异自证（src 级 ＋ 模板级 · 单锁内 · sha256）

脚本 `docs/research/t107-mutate.mjs` → `.scratch/t107/run-tracked-mutate2.log`（`RESULT: PASS`）。还原用**内存原文写回 ＋ sha256 自校**
（本文件尚未提交，`git checkout HEAD --` 会连本票改动一起丢，故不采用）。

| 变异 | 级别 | 内容 | 期望／实测 | 还原 sha256 | 绿（重建后） |
|---|---|---|---|---|---|
| M1 | src | 锚点漂移 `<h1>` → `<h2>` | `skill-t11` exit 1，`fail=1` | `a9468c31…` **match=true** | exit 0，`fail=0` |
| M2 | src | 摘掉入口块（`meta_blocks` 不再追加） | `skill-t11` exit 1，`fail=1` | `a9468c31…` **match=true** | exit 0，`fail=0` |
| M3 | 模板 | 改 `templates/home.html` 的 `<h1>` | 产物 SHA **变** ＋ 产物含新标题 | `38900703…` **match=true**，产物 SHA 回原 | — |

`helpCenter.ts`：SHA-BEFORE ＝ SHA-AFTER ＝ `a9468c316147c6e94245442f4065cc534ac740087f8ea16e7e2b549b9690ef29`；
`templates/home.html`：SHA-TPL-AFTER ＝ `3890070325be1d8406ca4f4f6d21d578a5093d4b519461253b951b1500706c0d`（＝改前值）。
M3 是「模板**承重**」的直接证据：模板不是被搬进代码的副本，而是渲染期真读的唯一源。

**#88 三守卫复跑**：`packages/skill-calorie/test/help-center-88.test.mjs` 25 条全绿（含守卫①标记残留／
`report.markers` 六键、守卫② 436/54 ＋ HTML id 全唯一、守卫③ 复制单实现与源码零复制通道）；
`help-center-91.test.mjs` 5 条全绿（三态同源 436 序、`data-action-id` 1308、bytes 如实）。

## 6. 门禁实测

| 门 | 命令 | exit | runId（审计日志） |
|---|---|---|---|
| G1 | `pnpm build` | **0** | `a6209728` |
| G2 | `pnpm boundaries` | **0** | `a6209728` |
| G3 | `pnpm snapshot:check` | **0** | `a6209728` |
| G4 | `pnpm publish:pre` | **0** | `a6209728` |
| 靶向 | `node --test skill-t11 ／ help-center-88 ／ help-center-91` | **0**（39/39） | `b0b624e6` |
| canonical | `pnpm test` | 1（既有红：`tests 1104／pass 1079／fail 25`） | `294f061a` |

四门与靶向均经 `node tooling/run-locked.mjs --ticket 107 -- node docs/research/t107-run.mjs <mode>`（协议 §2.4）。

**delta 判定**（`node docs/research/t101-fail-set.mjs docs/research/t88-baseline/test-failset.txt .scratch/t107/run-tracked-canonical.log`
→ `base=34 after=29 新增=0 消失=5`）：**新增 0 条** ⇒ 按 `t88-delta-flake-ruling.md` §2／§5 无需分类；
消失 5 条均为**他票落地所致**（基线冻结于 #99 修复前）：

- `#41 M3：真 CLI 串行冒烟 18 新键`、`#80 HELP 生成与键名一致性` → #99 `2775822`（`exampleFor()` 补 18 键）
- `③ check-combos 全绿` → #113／#86 键追加
- `#76 无宿主可执行证据`、`helpers JS 在 ≤820px 视口把反馈栈收窄为 3` → base-paint 侧他票

**并发上下文**（§3 纪律）：本席运行窗口 `14:24:02Z–14:29:20Z` 内**三次抢锁等待**＝20,026 ms（`fdd6e6a6`）／
**50,065 ms**（`b0b624e6`）／**40,017 ms**（`a6209728`）⇒ 同一时刻至少另有一个 session 在跑 build／test；
同窗口内 **#99 在飞**（其 `RUN` 见 `14:24:34Z`），#91 审查 session 亦有提交。本席**未**跑 headless 浏览器实证
⇒ 无「全量 ＋ 浏览器」组合。

**白名单 diff**：`git diff --numstat HEAD -- docs/research/t88-baseline/` → **0 行**（未改冻结白名单）。

## 7. 机械门禁对账（协议 §2.4）

对账窗口：`--ticket 107 --since 2026-09-09T14:24:00Z`。对账源导出：`docs/research/t107-gate-runs.log`。
**窗口内本席全部 10 次运行逐条声明**（含 2 次 exit≠0 的过程／canonical 运行，故用 `--allow-nonzero`）。

GATE-RELAX flag=--allow-nonzero reason=① canonical `pnpm test` 因冻结基线既有红必然 exit=1（判据＝失败集新增=0，非 exit 码，见 §6）；② 首跑一条过程运行因包装器内 `pwsh` 不在 PATH 而 exit=1（非门禁证据，仅为如实留痕）

GATE-RUN runId=391a52f7-f3dc-4e56-b1dd-a00122fe02b4 cmd="pwsh -NoProfile -Command"
GATE-RUN runId=5117399a-7f35-4ab4-b029-07dbd91a7416 cmd="node .scratch/t107/run-targeted.mjs"
GATE-RUN runId=fdd6e6a6-a439-49ef-b83e-4d4c704f02e4 cmd="node .scratch/t107/mutate.mjs"
GATE-RUN runId=3d9d42a1-9490-40e1-9c8d-dc23239031be cmd="node .scratch/t107/run-gates.mjs"
GATE-RUN runId=a3bf3c9d-91a0-42c5-9974-e795aa3c3da6 cmd="pnpm test"
GATE-RUN runId=b0b624e6-dd59-4786-bb88-efcc0e6296be cmd="node docs/research/t107-run.mjs targeted"
GATE-RUN runId=e45898dc-3bdd-48e9-908d-57535151afb0 cmd="node docs/research/t107-mutate.mjs"
GATE-RUN runId=a6209728-8dee-4a0e-9d46-3ef98acbfe1a cmd="node docs/research/t107-run.mjs gates"
GATE-RUN runId=294f061a-5993-483c-b0dd-01d16b9527aa cmd="node docs/research/t107-run.mjs canonical"
GATE-RUN runId=fc1b1d78-f319-488a-bf75-5fa9ded14db8 cmd="node docs/research/t107-mutate.mjs"

对账结果：`matched=10/10 scoped=10 undeclared=0 → gate-audit: PASS`。

## 8. 复跑入口

```sh
node docs/research/t107-probe-render.mjs                       # 三态渲染 ＋ 不变量 25/25（只读，需先 pnpm build）
node tooling/run-locked.mjs --ticket 107 -- node docs/research/t107-run.mjs targeted   # build ＋ 三份靶向测试（39/39）
node tooling/run-locked.mjs --ticket 107 -- node docs/research/t107-mutate.mjs         # 两处 src 级变异自证
node tooling/run-locked.mjs --ticket 107 -- node docs/research/t107-run.mjs gates      # 四门逐条 exit
node tooling/run-locked.mjs --ticket 107 -- node docs/research/t107-run.mjs canonical  # canonical（1 轮）
node docs/research/t101-fail-set.mjs docs/research/t88-baseline/test-failset.txt <canonical.log>
node tooling/check-gate-audit.mjs --evidence docs/research/t107-merge-into-help.md --ticket 107 --since 2026-09-09T14:24:00Z --allow-nonzero --export docs/research/t107-gate-runs.log
```

## 9. 未做／风险 top3

1. **未从包公开出口导出新函数**：`buildHelpViewEntries` 等只在 `dist/render/helpCenter.js` 可见
   （`src/render/index.ts` 不在本票路径所有权内，未改）⇒ 测试与探针走深路径 import。若需对外暴露，请扩权或转票。
2. **速查台产物字节变化**：file ＋≈5.2 KB（1,027,870 B → 1,032,345 B 量级），`t88-final.md` 的体积登记值随之陈旧
   （该文件在本票禁改名单内，未改；按 S3 记账，请由 #88 侧或后续票同步）。
3. **`#118` 分型快照仍标 6 件为 `legacy`**：本票**未改标记形态**（保持 `<!--SHARED-CSS-->`／`<!--SHARED-HELPERS-->`、
   行号不变），故 `t118-template-inventory.md` 逐条仍准；但「legacy＝无消费方」的隐含读法已被本票推翻，
   建议后续票在分类口径里区分「形态 legacy」与「零引用」。

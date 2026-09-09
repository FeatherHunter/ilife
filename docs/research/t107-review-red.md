# #107 红队审查报告 —— HELP：6 个死模板并入重建

> 被审：`d812dac`（实现）＋ `1fcc0f1`（对账封口）。审查口径：**不采信实施者任何结论**，不 import 被审脚本
> （自写模板抽取正则 ＋ 真 CLI 三态 ＋ 自写变异）。结论：**PASS（初审）**，五维均分 **93**，S1 0／S2 0／S3 5。
> 复跑入口（工作稿在 `.scratch/orchestrator/red11-review/`，不入仓）：
> `verify.mjs`（80 断言）／`mutate.mjs [src|tpl]`／`probe-struct.mjs`，后二者经 `run-locked.mjs --ticket 107`。

## ① 复跑清单（逐条独立执行）

| 项 | 命令 | 结果 |
|---|---|---|
| 探针 | `node docs/research/t107-probe-render.mjs` | **25/25 PASS**，exit 0 |
| 靶向 | `--ticket 107 -- node docs/research/t107-run.mjs targeted`（`527e622d`） | build 0 ＋ **39/39** |
| 四门 | `… t107-run.mjs gates`（`4e42f5d3`） | G1–G4 **逐条 exit 0** |
| 真 CLI 三态 | `calorie-cmd-read calorie.help.center --params {"mode":…}` ×3 | exit 0；1,032,345／821,908／24,989 B；自写断言 **80/80 PASS** |
| canonical 1 轮 | `… t107-run.mjs canonical`（`381eb407`） | tests 1104／pass 1075／fail 29；delta 见 ⑦-S3-a |
| 对账复核 | `check-gate-audit --ticket 107 --since 14:24:00Z --until 14:30:40Z --allow-nonzero` | **matched=10/10 scoped=10 undeclared=0 PASS** |
| 白名单 | `git diff 93e27f9 -- docs/research/t88-baseline/test-failset.txt` | **0 行** |

## ② 「真被渲染」独立验证（核心）

自写正则**从磁盘模板独立抽取**（不调 `buildHelpViewEntries`），再与真 CLI 产物逐项对账：

- file／inline：`data-meta-id="view-entries"`＝1、`data-view-entry="`＝**6**（name 序＝`CALORIE_TEMPLATES`）、
  6 标题（`<b>`）＋6 命令＋6 说明逐条落地；块落在 `<section id="ilife-help-shell">` 内。
- text：`[看板页入口]` 段 ＋ 6 行 `  title · cli`；4 空格场景行**恒 436**；零标签。
- 6 条命令均为注册表真键（`keys.ts:67-70,83,88`）。
- **不是硬编码在 `helpCenter.ts`（模板承重 · 三态 sha256）**：改 `home.html` 的 `<h1>今日总览</h1>` →
  真 CLI file `66ed6f64…→37be3c1a…`、text `92425e0a…→8da3669b…`，新标题两态各落地；还原后**模板 sha 与产物 sha 双回原**。
  **全程不重建 dist** 即传播 ⇒ 模板是渲染期唯一源（`loadTemplate` 真读盘），非代码内副本。

## ③ 不回归

`data-scene-id` 436／`data-subgroup-id` 54／`data-action-id` 1308／元素 id 全唯一／`<!--[A-Z0-9-]+-->` 残留 0
—— 三态逐一自证通过。`renderHelpCenterHtml` 签名：`git show d812dac^` 与现文件 `^export` 比对＝**只增、不减、不改**；
`HelpCenterRenderOptions` 未变；三态载体语义未变（file／inline→`meta_blocks`，text→文本段）。
`meta_blocks` 系 base-paint **既有**契约槽（`spec/help.ts:61-66,97`；`help.ts:595-601` 原样透传 ⇒ 技能自负转义，
`escapeHtml` 已覆盖；产物内 `--params '{"…"}'` 的引号确已实体化）。

## ④ 模板 in-place 改动安全性

两处改动（`lead` 由重复命令→说明句、取数 `<pre>` 加 `class="view-cli"`）只改文本：**每件仍 40 行、标记形态与行号未变**。
消费方逐一核：`templates.ts:22` 只按名读全文；`check-publish.mjs:126-135`（G2 tarball 逐件点名）与 `:207-242`
（G3 安装态逐件 `loadTemplate`）只判「装载成功」不解析内容；`skill-html-snapshot.mjs` 的 `SKILLS` **不含 calorie**
（`:43-49`，`:21-22` 有显式理由）⇒ 模板内容不进该快照。`pnpm publish:pre` 独立复跑 **exit 0**（`4e42f5d3`）。
全仓 grep 无其他消费方断言这两处原文（仅命中 #107 自身测试）。

## ⑤ 变异复核（自写脚本 · 单锁内 · 红→还原→绿＋sha256）

- M1（`<h1>`→`<h2>` 锚点漂移）：build 0／`skill-t11` exit 1 `fail=1` → 还原 **sha-match=true** → 重建后 exit 0 `fail=0`。
- M2（`meta_blocks` 不再追加）：同样红→还原→绿。
- `helpCenter.ts` SHA-BEFORE＝SHA-AFTER＝`a9468c31…`（与实施者一致，独立算出）。
- M3（模板承重）：见 ②；file／text 双态 sha 变＋新标题落地＋双回原。
- 按裁定 §7-4：**每个 src 变异还原后立即重建 dist 并自证**，不留到批末。

## ⑥ 自设新探针（打被审脚本盲区）

- **a** 模板**多一个 `<h1>`** → `missing-data`「必须恰 1 处，实测 2」**真红**（非静默跳过）。
- **b** `<pre class="view-cli">` 内容改为 `python scripts/render_…` → 抛 **`bad-input`**（前缀门生效）。
- **c** lead 写入**实体** `&lt;script&gt;alert(1)&lt;/script&gt;` → 产物入口块内为 `&amp;lt;script&amp;gt;…` 且块内**零 `<script`**。
- d 重复 `<pre class="view-cli">` → `missing-data`；e lead 写入**字面** `<script>` → `missing-data`（锚点 `[^<]*` 使注入无法静默通过）。
- f 结构：`<ol>`1／`<li>`6／`</li>`6／name 唯一；内嵌 `<script id="payload">` JSON 可解析、`meta_blocks` 恰 1 块 6 条目、
  原文 `<`→`\u003c`、无裸 `</script>`。
- 观察（不判红）：`<h1 class="t">` 或注释内 `<h1>` 均触发 `missing-data` ⇒ 抽取口径偏严但**大声失败**；建议后续放宽为 `<h1[^>]*>`。

## ⑦ 缺陷清单（含归属）

**S1-交付缺陷 0；S1-过程违规 0**（对账 undeclared=0；提交未碰 `tooling/`／`spec/`／`t88-baseline`）。

- **S3-a（本票范围 · 证据时效）**：「canonical 新增 0」在实施者窗口（14:29Z）成立；本席 14:36Z 复跑＝**base=34 after=36 新增 7 消失 5**。
  7 条全在**本票范围外**：4 条为 `packages/base-render/**` 的 `AssertionError: 不得操作 classList`（该目录当时有**他席未提交 WIP**：
  `style.ts` 14:34:54Z／`controls.ts` 14:37:22Z 改动，**晚于**实施者窗口）；3 条为 `0xC0000005`（`status 3221225477`）spawn 崩溃
  （`scaffold`／`#97 M5`，他票文件，裁定 §5.1 B 类签名）。按裁定 §6，跨票 WIP 豁免**只能由编排者裁**——本席只登记事实并建议转
  #75／#88／#97／#121 owner。该轮 canonical 中 **#107 自身相关测试全绿**（`模板 6 件被 HELP 速查台真正渲染`／`入口块自负转义`／
  `守卫① 泛化`／`A2 file 态`／`#91 ①`／`三态同源` 均 ✔）。
- **S3-b（证据口径）**：§3 的产物 SHA（file `02a39c7a…`）**不是跨会话稳定标识**：本席 22:33／22:34 复跑逐字命中该值，22:35 后漂移为
  `66ed6f64…`，根因是**他席 base-render CSS WIP 被并发 build 编入 dist**（436/54/1308/6/1 计数不变）。建议改「结构计数＋内容断言」口径。
- **S3-c（表述）**：证据 §1「各 41 行」实测为 **40 行**（`LF=40`、末字节 `\n`，`t118` 亦记 40）；「77 键注册表」与 `keys.ts:3`
  「读 64＋写 35＝99」不符（6 键本身均真实存在）。
- **S3-d（文档同步）**：`t118-template-inventory.md` 的「仅测试引用」列已陈旧（本票使其成为生产消费方）——实施者已在风险 #3 自认。
- **S3-e（文档同步）**：`t88-final.md:198` file 态体积 1,027,870 B → 实测 1,032,345 B——实施者已在风险 #2 自认。
- 范围外观察：`#48 calorie.help.center`／`dsh-calorie 烟囱` 本轮仍红，但**在冻结白名单内**（基线行 4／21），非本票引入；
  `plugin-calorie` 经 `createRequire('skill-calorie/package.json')` 定位、不复制 dist ⇒ 新增的「渲染期读 templates」不会打空。
- 范围外观察（共享工作区 · **非 #124 事故**）：收尾自检时 `git status` 见 `M packages/skill-calorie/SKILL.md`（22:38:29Z，晚于本席全部
  写操作；本席最后一次 build 约 22:34:40Z）。核查：**0 个 NUL 字节**（30,052 B，首字节 `---`）＝非零填充；只读比对其 AUTO 块与
  `buildHelpBlock()` **一致**（`skill-freshness.mjs`）⇒ 属他席 build 的合法产物。本席**未触碰、未提交**该文件（`commit --only` 仅含本报告）。

## ⑧ 五维与裁决

契约一致 **28**／30（槽位与自负转义正确；抽取口径偏严 −2）｜证据真实可复现 **22**／25（四门／39-39／25-25／10-10 全复现、
M1–M3 独立复现；SHA 不稳定＋两处数字不准 −3）｜parity **20**／20｜工程红线 **15**／15｜文档同步 **8**／10。
**均分 93 → verdict PASS（初审）**；附 ⑦-S3-a 的编排者裁定请求（跨票 WIP 归类），S3-b～e 不阻断关闭。

GATE-RELAX flag=--allow-nonzero reason=本席窗口含 3 次自写脚本自身缺陷造成的 exit=1 过程运行（import 路径／断言过严，已修并重跑绿），非门禁证据
（本席窗口自证：`check-gate-audit --evidence docs/research/t107-review-red.md --ticket 107 --since 2026-09-09T14:33:00Z --until 2026-09-09T14:37:30Z --allow-nonzero` → `matched=8/8 scoped=8 undeclared=0 PASS`。受派单路径所有权限制（只写本报告＋`.scratch/orchestrator/red11-*`），未另建 `--export` 对账源文件；复核请按上述窗口对 `.scratch/locks/gate-runs.log` 重跑。）
GATE-RUN runId=527e622d-c3e4-4164-8e14-26a436f8c15d cmd=node docs/research/t107-run.mjs targeted
GATE-RUN runId=4e42f5d3-e802-4864-a9c6-cfe995316299 cmd=node docs/research/t107-run.mjs gates
GATE-RUN runId=b1b00560-a6c8-48cf-a198-5283ea3e978f cmd=node .scratch/orchestrator/red11-review/mutate.mjs
GATE-RUN runId=0eb93adb-9149-4dcf-9758-ab5ef61c3301 cmd=node .scratch/orchestrator/red11-review/mutate.mjs tpl
GATE-RUN runId=8d3b33bb-cfea-4045-a36c-c83a3c1d683c cmd=node .scratch/orchestrator/red11-review/mutate.mjs tpl
GATE-RUN runId=6789461c-0895-4cb3-a3a0-c866086fe815 cmd=node .scratch/orchestrator/red11-review/probe-struct.mjs
GATE-RUN runId=ced9359b-7ed4-4b7a-b55f-f5ec6f5b4277 cmd=node .scratch/orchestrator/red11-review/probe-struct.mjs
GATE-RUN runId=381eb407-eeb6-4bd5-9806-2dc9fbb5f9cf cmd=node docs/research/t107-run.mjs canonical

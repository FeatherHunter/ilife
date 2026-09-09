# #89 返修席 R-9 · H-06／H-10 按规格修＋回归报告

- 票：`#89`（89b 收尾返修）· 裁决 **D-22**：H-06 未达＋H-10 FAIL 按规格修（不记偏离）
- 依据：`docs/research/t89-visual-lock.md` §4（G-1／G-2 最小修复方案）＋ `docs/visual-spec-help.md` H-06／H-10 条文
- 本席不关票；`SKILL.md`（`packages/skill-calorie/SKILL.md`）首 3 字节 `2d 2d 2d` 非零已自检
- 改动面（3 件）：`packages/base-render/src/style.ts`（helpShell 区，3 hunk）＋
  `packages/base-render/test/help-visual-lock-89.test.mjs`（新）＋ 本报告。
  未碰：冻结 `packages/base-render/src/spec/`、技能包、`tooling/**`、他席文件

## 1. 改了哪行（前→后逐字）

### H-06 正文栈（`style.ts`，2 hunk）

hunk 1（`BLUE_RGB` 后新增局部常量，非 token——D-5 不新增 token 名）：

```ts
// 前：无（`const BLUE_RGB = '0, 122, 255';` 后直接是 focusRing 注释）
```

```ts
// 后：
/** 正文栈（H-06：首位 `"SF Pro Display"`，后接系统兜底＋`"Noto Sans SC"`）。
 *  **局部 CSS 常量**、不是 token（D-5 纪律：不新增 token 名）；等宽栈不动（D-13，各 `font-family: "SF Mono", monospace` 原样保留）。
 *  B1 原栈见 `docs/research/benchmark-visual-spec.md:105`（`body`）；按 #89 返修方案把 `"SF Pro Display"` 提首位、
 *  尾部补 `"Noto Sans SC"`（修前正文 computed 回落实测，CJK 渲染不变）；落点仅 `.ilife-help-shell`（T22：壳层样式归 #104，不得产 `body` 规则）。 */
const BODY_FONT_STACK = '"SF Pro Display", -apple-system, BlinkMacSystemFont, "PingFang SC", "Microsoft YaHei", "Noto Sans SC", sans-serif';
```

hunk 2（`.ilife-help-shell` 基座规则，加 2 行；`body` 规则不产——既有 `style.test.mjs` T22 禁 `body{`，落点只取报告方案的「壳」一半）：

```ts
// 前：
    '  color: var(--fg);',
    '  font-feature-settings: "tnum";',
```

```ts
// 后：
    '  color: var(--fg);',
    // H-06 正文栈（局部常量 BODY_FONT_STACK，首位 "SF Pro Display"；不新增 token 名，等宽栈不动）。
    '  font-family: ' + BODY_FONT_STACK + ';',
    '  font-feature-settings: "tnum";',
```

### H-10 圆角（`style.ts`，1 hunk；`4px`→允许集合 `{8,14,20,999,50%}` 内最近的 `8px`，D-5 直写常量）

```ts
// 前：
    '  border-radius: 4px;',
```

```ts
// 后：
    // H-10：`4px` ∉ {8,14,20,999px,50%} → 取集合内最近的 `8px`（D-5：CSS 常量直写，不新增 token 名）。
    '  border-radius: 8px;',
```

全表唯一 `border-radius: 4px`（`help.ts` 零内联样式已核）；等宽 4 处 `"SF Mono", monospace` 逐字未动。

## 2. 回归断言位置（`packages/base-render/test/help-visual-lock-89.test.mjs`，随 `pnpm test` 跑）

- H-06-①「`.ilife-help-shell` 基座含正文栈且首位 `"SF Pro Display"`」：规则块级取 `font-family`，
  `startsWith('"SF Pro Display"')`（computed 首位即此）＋ 含 `-apple-system`／`"Noto Sans SC"` ＋
  以 `sans-serif` 收尾 ＋ 栈值无 `--`（非 token 引用）。
- H-06-②「等宽栈不动」：全表含 `SF Mono` 的声明恰 4 处且逐字 `"SF Mono", monospace` ＋ `Consolas` 0 命中 ＋ `SF Pro Display` >0 命中。
- H-10-①「HELP 区圆角全集 ⊆ 允许集合」（charts 区按 D-10 除外，口径与 `t89-probe-help-static.mjs` 同源）。
- H-10-②「`card-mark` 逐字 `8px`」＋ HELP 区无 `border-radius: 4px`。

## 3. 浏览器 computed 复验值（Chrome/152.0.7977.83，`--ticket 89`，新产物 sha16=`0743519A470975F6`）

- H-06.2 → PASS：`shell` computed =
  `"SF Pro Display", -apple-system, BlinkMacSystemFont, "PingFang SC", "Microsoft YaHei", "Noto Sans SC", sans-serif`
  （首位即 `"SF Pro Display"`）；`lead` 继承同值；`body` 仍 `"Noto Sans SC"`（T22 禁 body 规则，CJK 回落不变，符合设计）；
  H-06.1 等宽面 PASS（`pre`=`"SF Mono", monospace`，Consolas=0）。
- H-10.1 → PASS（`cssBad:[]`）；H-10.2 computed `badCount:0`。
- 静态探针 `26/27`（唯一红 H-17.1＝HELP 页无 `<table>`， verdict N-A，修前即如此）；
  shots 探针 **`36/36 PASS`**（修前 34/36，红的正是 H-06.2／H-10.1）。
- 抽验已 PASS 项（shots 全绿覆盖，远超 3 条）：H-01（`--blue` 根/壳 `#007aff`）、H-09（32/20/20/80＋960px，留白 211/211）、
  H-15（PRE／12px／行高比 1.55／pre-wrap／auto／8px）、H-05（h2 17/600＋正文 15＋h1 32/700）、H-12（640/400→20/16/16/60）、
  H-16（copied＋单 toast）、H-19（42×42／50%／24,24）、H-20（10 控件 10 环＋reduced-motion 归零）全 PASS 未回归。

## 4. 门禁 exit 一览（GATE-RUN，`--ticket 89`）

| runId | cmd | exit | 结论 |
|---|---|---|---|
| `79ef2f39` | `pnpm test`（改前基线） | 1 | 1145/1119/26，失败集见 §5 |
| `dface4a0` | `pnpm build` | 0 | 全绿 |
| `5f046fd0` | 新回归文件 | 0 | 4/4 |
| `cdc4c11a` | base-render 全套件 | 1 | 并发 #79 变异窗污染（`base-combos/package.json` 瞬断＋`.mutbak-t79` 为证），非本席；见 §7 |
| `c92e7716` | skill-calorie 全套件 | 1 | 并行 sqlite flake（单文件＋重跑双绿），非本席；见 §7 |
| `ce90042a` | `cmd-write-40-persist` 单跑 | 0 | 17/17 |
| `c81815be` | skill-calorie 全套件重跑 | 0 | **371/371** |
| `e52eb6fb` | `check-boundaries.mjs` | 0 | PASS |
| `93f1f739` | `write-snapshot.mjs --check` | 0 | `0.1.0@932e7b250d278d50` 不变 |
| `b9ab681e` | `skill-html-snapshot.mjs --check` | 0 | 185 件 changed=0 |
| `6b811d92` | `pnpm test`（改后） | 1 | 1149/1124/25，**新增 0**（§5） |
| `2c256f78` | `cmd_read` 直调 | 2 | PowerShell 引号坑（t89 §3 已载同坑），改走 `cmdA.mjs` |
| `5b42eef8` | `pnpm build`（变异 1 重建） | 0 | — |
| `d8671760` | 新回归文件（MUT-H-10 摘 `8px`→`4px`） | 1 | **H-10 双红／H-06 双绿**（意向红） |
| `80f9279c` | `pnpm build`（变异 2 重建） | 0 | — |
| `4b09d3a9` | 新回归文件（MUT-H-06 摘正文栈行） | 1 | **H-06 双红／H-10 双绿**（意向红） |
| `e2158a09` | `pnpm build`（MUT-H-06 重建，持锁补跑） | 0 | — |
| `d11a1513` | `pnpm build`（最终恢复重建） | 0 | — |
| `b51bb284` | base-render 全套件（持锁终态） | 0 | **487/487** |
| `52438d75` | `.scratch/t89/cmdA.mjs`（产物重生成） | 0 | 1,264,952 B（§6） |
| `4d3e01e1` | `t89-probe-help-static.mjs` | 1 | 26/27（唯一红 H-17.1＝N-A 项，意向内） |
| `3ab6b974` | `t89-probe-shots.mjs` | 0 | **36/36** |

GATE-RELAX：`--allow-nonzero`（上表 5 个非零：2 个 canonical 基线/终态 flop 集、1 个并发污染、1 个并行 flake、2 个意向变异红、1 个引号坑 exit 2、1 个 N-A 项探针红——无一冒领为 pass）；
反向对账若报他席条目（共享锁下 #79 并行，例 `base-combos/package.json.mutbak-t79` 瞬时文件），需 `--allow-undeclared`。
对账命令：`node tooling/check-gate-audit.mjs --evidence docs/research/t89-recheck-h06-h10.md --ticket 89 --since 2026-09-09T19:57:00Z --allow-nonzero --allow-undeclared`
（`--since` 起点＝本席首跑；19:51–19:52 三条 blocks 系并发他席，非本席声明）。

本席 GATE-RUN 声明（23 条，与门禁日志逐条对账；`--since 2026-09-09T19:57:00Z` 口径）：

- GATE-RUN runId=79ef2f39-7c92-442a-9deb-1b283dec8984 cmd="pnpm test"
- GATE-RUN runId=dface4a0-6f9a-4845-aca3-97c82254e0b7 cmd="pnpm build"
- GATE-RUN runId=5f046fd0-f7b3-4f28-8e68-0801c12ff37e cmd="node --test packages/base-render/test/help-visual-lock-89.test.mjs"
- GATE-RUN runId=cdc4c11a-9008-4eb2-a14c-a7e8c00ac5bc cmd="node --test packages/base-render/test/*.test.mjs"
- GATE-RUN runId=c92e7716-75bb-4828-8698-362b67fc4d05 cmd="node --test packages/skill-calorie/test/*.test.mjs"
- GATE-RUN runId=ce90042a-4d31-4669-9c8f-26018f65014e cmd="node --test packages/skill-calorie/test/cmd-write-40-persist.test.mjs"
- GATE-RUN runId=c81815be-4662-4729-b5a0-e1faa4d33983 cmd="node --test packages/skill-calorie/test/*.test.mjs"
- GATE-RUN runId=e52eb6fb-844d-40a0-8cc7-74e427e1153f cmd="node tooling/check-boundaries.mjs"
- GATE-RUN runId=93f1f739-a2d5-4e7f-b450-44a1ba6d9d52 cmd="node tooling/write-snapshot.mjs --check"
- GATE-RUN runId=b9ab681e-bbac-44ed-a4e1-535f18b00ec8 cmd="node tooling/skill-html-snapshot.mjs --check"
- GATE-RUN runId=6b811d92-7185-4483-9099-c3f000789c58 cmd="pnpm test"
- GATE-RUN runId=2c256f78-432a-4c2a-9a9f-f92af39a7234 cmd="node packages/skill-calorie/dist/cli/cmd_read.js calorie.help.center --params {mode:file} --output .scratch/t89/help-file.html"
- GATE-RUN runId=5b42eef8-8cd3-4cbe-b37e-b47965a3db6b cmd="pnpm build"
- GATE-RUN runId=d8671760-12f0-4a93-aac4-89fa8d7bffda cmd="node --test packages/base-render/test/help-visual-lock-89.test.mjs"
- GATE-RUN runId=80f9279c-bfef-4e2a-a115-74bff0bebc0c cmd="pnpm build"
- GATE-RUN runId=e2158a09-b68b-4cdf-88d6-6bdfb7247079 cmd="pnpm build"
- GATE-RUN runId=4b09d3a9-b9c8-413a-a2ee-b1a7ca6636fa cmd="node --test packages/base-render/test/help-visual-lock-89.test.mjs"
- GATE-RUN runId=d11a1513-e142-4cd8-9095-3d5ad2e984da cmd="pnpm build"
- GATE-RUN runId=b51bb284-7179-4236-9f1e-5f5c9b10ea92 cmd="node --test packages/base-render/test/*.test.mjs"
- GATE-RUN runId=52438d75-8033-4a8f-a4d2-2f64332d88bf cmd="node .scratch/t89/cmdA.mjs"
- GATE-RUN runId=4d3e01e1-67ee-4033-991e-5b5c9192ea4a cmd="node docs/research/t89-probe-help-static.mjs --out .scratch/t89-recheck/S"
- GATE-RUN runId=3ab6b974-0e93-4f4d-854f-f2402d05df8e cmd="node docs/research/t89-probe-shots.mjs --out .scratch/t89-recheck/shots"
- GATE-RUN runId=dcaed2fb-97bf-4e80-b0d9-0d92bff5a2df cmd="pnpm build"

- GATE-RELAX flag=--allow-nonzero reason=7 类非零全系如实记录（canonical 基线/终态 flop 集／并发污染／并行 flake／MUT-H-10 与 MUT-H-06 意向红／引号坑 exit2／N-A 项探针红），无 pass 冒领
- GATE-RELAX flag=--allow-undeclared reason=共享门禁日志下 #79 并行持锁条目非本席执行、不得作本席证据

## 5. canonical `pnpm test` 失败集对比：**新增 0**

- 改前（`79ef2f39`）：tests 1145／pass 1119／**fail 26**（`.scratch/t89-fails-before.txt`）。
- 改后（`6b811d92`）：tests 1149（＋4＝本席新断言）／pass 1124／**fail 25**（`.scratch/t89-fails-after.txt`）。
- `Compare-Object` 差集：after−before＝**空**；唯一差异是改前红 `T10 照片 parity` 改后自愈——
  根因为 `calorie.photo.gif exit 3221225477`（0xC0000005 本地崩溃，照片原生链环境 flake，与 CSS 无关；靶向 skill-calorie 套件两次 371/371 亦证）。
- 改前 26 失败面（envelope 空库 JSON／client-bundle ESM 纯度／dsh-* 烟囱／#81／#93／FX-81-5）无一在 base-render／skill-calorie-CSS 面；
  无提交测试硬编码旧 HELP sha/字节（`packages/**`＋`test/**` grep `f380ef…`／`1264822` 零命中）。

## 6. 新 HELP 产物 sha256＋字节（旧 `f380ef68…`／1,264,822 B 作废）

- 生成：`node tooling/run-locked.mjs --ticket 89 -- node .scratch/t89/cmdA.mjs`（`52438d75`，exit 0；
  沿用前席 `.scratch/t89/cmdA.mjs` wrapper 绕 PowerShell 引号坑；产物不入库）。
- **新 bytes＝`1,264,952`（＋130）**；**新 sha256＝`0743519a470975f6abf5ced73457b79a0f874f847d3f7b2290eee3077e09a913`**
  （sha16=`0743519A470975F6`）；envelope：`total=10／sceneTotal=436／subgroupTotal=54`。
- 字节归因闭合：新增 CSS 声明行 `  font-family: "SF Pro Display", …sans-serif;` 恰 129 字符＋LF＝**130 B**；
  `4px`→`8px` 等长、TS 注释不进产物——产物增量恒等于该行，无他因。
- 结构逐条未变（新旧同口径正则复算）：`data-group-id` 446／`data-subgroup-id` 54／`data-scene-id` 436／
  `data-field="cli"` 341／`<pre` 439——与旧产物逐值相同；`help-center-88.test.mjs`（10／54／436 断言）随套件绿。

## 7. 受影响的台账行清单（只改字节/sha 行；结构行未变；本席不改任何台账文件，只列）

字节/sha 行（旧值引用，新值见 §6）：
- `docs/research/t-help-parity-ledger.md:41`（file 行：1,264,822＋`f380ef68…b79c2`）
- `docs/research/t-help-parity-ledger.md:306`（文件清单行：1,264,822＋同 sha）
- `docs/research/t-help-parity-review-a-probe.mjs:173`（`claimed: { bytes: 1264822, sha: 'f380ef…' }` 硬编码——重跑即红，编排者定夺是否跟进）
- `docs/research/t79-review-blue-probe.mjs:25`（`EXPECT_HELP_SHA = 'f380ef…'`，同上）
- `docs/research/t89-evidence/536e8b9c-…/` 内 `MANIFEST.json:5-7`、`A-artifact.json:3-5` 及 S／I／shots 内 `sha256_16=F380EF685065A1E9` 行——
  系旧轮冻结证据（历史记录，永不改；新轮证据为本报告 §3–§4）
- `docs/research/t89-visual-lock.md:5`、`t89-evidence-plan.md:31,322`、`t89-visual-lock-partial.md:37` 的旧产物行（同上，历史记录）
- `docs/research/t79-base-contract.md:12,272`「HELP sha 前后同值」主张——系 #79 时点真值，本次返修后由 §6 取代（属 D-22 授权变更，非偏离）

结构行（逐条确认未变，无需改）：分组 10／子功能 54／场景 436／prompt 436 逐字／CLI 展示 341／`<pre>` 439——见 §6。

## 附：变异即还原自证＋纪律

- MUT-H-10（`d8671760`）：`8px`→`4px` → 新文件 H-10 双红、H-06 双绿；恢复后终态 `style.ts` sha256=`a0f7e7f3a58741f9ab824fa73234cde9114114864e821b01371aae266554303c`。
- MUT-H-06（`4b09d3a9` 持锁）：摘正文栈行 → 新文件 H-06 双红、H-10 双绿；恢复后同 sha（`git diff` 仅 §1 三 hunk，10＋1−）。
- 并发说明：`cdc4c11a`（exit 1）系 #79 席变异窗内 `packages/base-combos/package.json` 瞬断所致——
  同窗 `M packages/base-combos/package.json`＋`package.json.mutbak-t79` 目击，窗闭后持锁重跑 `b51bb284` 487/487；
  `c92e7716`（exit 1）系套件并行 sqlite flake——单跑 `ce90042a` 17/17＋重跑 `c81815be` 371/371 双绿。
- 未关票；未 push（`git commit --only` 3 件：`packages/base-render/src/style.ts`、
  `packages/base-render/test/help-visual-lock-89.test.mjs`、`docs/research/t89-recheck-h06-h10.md`）。

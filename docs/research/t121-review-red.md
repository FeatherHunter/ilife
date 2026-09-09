# #121 红队审查报告（独立复跑 · H-16 复制按钮 `copied` 态 JS 侧）

> 红队席（独立 session）。被审 `d0e0546`／`04968f5`，基线 HEAD `94f1785`。我方可复跑脚本（**不引用**被审脚本）：`.scratch/orchestrator/red12-probe-min.mjs`（独立 CDP 探针 27 断言）／`red12-gate.mjs`（持锁复合）／`red12-purity.mjs`。锁内 runId：`bd4745e6`(clean)／`d07dda99`(M1)／`29663ba0`(M2)／`3149c90b`(M3)／`a5be27a9`(canonical)／`03de70fa`(r4)／`dec16284`(r5)。

## 0. 前置结论

产品行为**正确且经独立方法证实**（真手势 → `copied` 类 → computed `rgb(52,199,89)` → **450.0ms** 回落；失败路径零变绿）。但本票交付的实证脚本在干净 dist 上**不可稳定复跑**（6 次中 3 次 exit 1）。→ **verdict FAIL**（无 S1，五维 84 < 85）。

## 1. 复跑清单（全部我自己跑）

| 项 | 结果 |
|---|---|
| `tsc -b --force`（锁内，先断言 src 干净） | exit 0；产出 CSS helpShell `.copied`=`var(--ok)` ✔ |
| `node --test copy-copied-121 ＋ contract-signatures ＋ help-center-js-88 ＋ controls ＋ style` | **157/157 pass, fail 0, exit 0** |
| canonical `pnpm test`（1 轮，锁内） | tests 1124 / pass 1099 / **fail 25** / exit 1；delta **base=34 after=29 新增=0 消失=5**；25 条全在 plugin/envelope 面，`base-render` 零失败 |
| 被审脚本首轮 ＋ `r1..r5` | **3 PASS**(436/401/434ms)／**3 FAIL**(394/395/398ms)，失败项均 A6 |
| 我的独立探针（锁内＋锁外各 1 次） | **27/27 PASS, exit 0** |

## 2. 「真的变绿」独立验证

驱动侧逐点采样（页面时钟，~0.25ms/点，**非**被审脚本的 ~31ms 粒度）：① 真手势点击后获 `copied` 类；② `[firstOn+260, lastOn-15]` 内背景**逐点** `rgb(52,199,89)`；③ 存活 **450.0／450.1／450.0ms**（三次），之后类名移除、背景**逐点**回 `rgb(255,255,255)`；④ 基座 `transition-duration=0.45s, 0.2s`。

→ H-16「变绿＋450ms 弹簧」成立；A6 的 394–398ms 是**采样滞后伪影**（`samples=31/950ms`，首点系统性滞后 ~30–55ms，下界只留 50ms 余量）。

## 3. 失败路径（最易漏的一半）

`clipboard.writeText` reject ＋ `execCommand` 返回 false，真手势点击后采样 900ms：全程 **0 点含 `copied`**、**0 点成功色**；恰 1 枚 toast，`class="ilife-toast ilife-toast-danger"`、标题 `复制失败`（冻结 failMessage）。→ 不静默变绿、显式失败 ✔

## 4. 纯度／契约

- 两常量均模块内 `const`、**未导出**；`d0e0546` 未触碰 `src/index.ts`／`src/spec/**` → **零新契约面** ✔
- 签名未改；产出面**只增不改**：仅 `copy(text)→copy(text,btn)`、`fallback(text)→fallback(text,btn)` 两处 `-` 行（余为注释），`style.ts` **零删除行** ✔
- 产出文本：`classList=false`、`<canvas`=0、`function boot()`×1、`boot()`×1、`querySelector(MARKER_SEL)`×1、`markCopied` **1 定义＋3 调用**、无 `window./globalThis.` 赋值、无 `node:`、无内联 `on*` ✔
- 类名仍走 `className`；`contract-signatures.test.mjs` 全绿 ✔

## 5. 变异复核（独立重跑，src 级，单锁窗口）

| 变异 | 变异 sha | 目标测试（红） | 还原 sha 相等 | 还原后 |
|---|---|---|---|---|
| M1 摘三处 `markCopied` | `3400fdd4` | fail **5**（首条 `S4 … 1 !== 4`） | ✔ | **157/0 绿** |
| M2 `.copied` `--ok`→`--blue` | `c81c4905` | fail **1**（`S3 … var(--blue) vs var(--ok)`） | ✔ | **157/0 绿** |
| M3 `COPIED_MS 450→0` | `018b1304` | fail **5**（`S2 … 0 !== 450`） | ✔ | **157/0 绿** |

基线 sha 与实施者声称一致（`controls.ts 82575c21…`／`style.ts 04182d2d…`）；事后 `git diff src` 为空 ✔

## 6. 自设探针 a–d

- **a 连点两次**：两击 → 恰 **2 枚** toast（每击 1 枚、委派不倍增）、期间恒 `copied`、之后 className **逐字复原**；但第二击落在首窗末端（t≈400ms）时，第二次反馈的绿仅 **~48ms**。
- **b 非复制按钮**：HELP 页 12 个委派元素**全带 `data-t`** → 合成按钮 ＋ 真实产品面 `renderActionBar` 主按钮（`hasT=false`）点击后均**不加 `copied`、不出 toast** ✔
- **c `prefers-reduced-motion`**：`transition-duration=0s`（弹簧归零），**类名仍加**、仍变绿、仍 450ms 回落 ✔
- **d 重复 `boot()`／离场**：删 marker 后重注入 helpers → marker 仍 **1**、`copied` 只落在被点按钮（`hits=[1]/3`）、一击仍 **1 枚** toast；点击后移出 DOM，450ms 后类名已清除 ✔

## 7. 缺陷清单

- **S2-1（本票引入 · 证据面，关闭前必须修）**：A6「copied 类存活 400–600ms」在干净 dist 上 6 次复跑 **3 次 exit 1**（394/395/398 < 400），票面与证据 §3「21/21 PASS exit 0」**不可稳定复现**；根因＝采样粒度/首点滞后，**非产品缺陷**。修法：提高采样率或改页面侧 `MutationObserver` 时间戳，**不得放宽阈值**。
- **S3-1（本票引入 · 证据面）**：脚本指纹只含 `dist/index.js`＋`dist/controls.js`，**不含 `dist/style.js`**。实测他席 `121-review-blue` 14:47:57Z 变异构建把 `dist/style.js` 写成 `var(--blue)`（src 已还原、dist 未重建），我随后两次复跑读到蓝底（A3/B3 红），指纹却与干净轮**完全一致**。
- **S3-2（范围外发现 · 过程）**：变异在锁内、读 dist 的实证脚本不在锁内 → 他席变异窗口污染他人实证（本次已发生）；建议此类实证一律经持锁包装器跑。
- **S3-3（本票范围 · 已记账）**：连点第二击的绿窗＝首击剩余窗口（末端仅 ~48ms）；证据 §8.3 已记账、单测 B4 钉死现状，H-16 未规定连点语义 → 记账／另开票。

## 8. 五维 ＋ verdict

| 维 | 得分 | 依据 |
|---|---|---|
| 契约一致 30 | **29** | 零新导出／签名不变／只增不改／单 boot 单 marker／className 口径全绿 |
| 证据真实可复现 25 | **15** | 干净 dist 3/6 次 exit 1；指纹对 CSS 面失明；污染窗口可读变异产物 |
| parity 20 | **19** | H-16 双反馈三面＋失败面＋reduced-motion 独立证实；连点窗口语义未入规格（-1） |
| 工程红线 15 | **14** | 我方全程持锁、src 零残留；本票实证脚本作门禁证据不可复跑（-1） |
| 文档同步 10 | **7** | 「21/21 exit 0」「copiedMs=435」为单次样本，未登记 A6 抖动 |

**加权合计 84**（归一化均分 83）→ **无 S1**，但 **<85 → FAIL**。修掉 S2-1＋S3-1 后复跑即可复审，产品面无需改动。

## 9. 复跑命令

```
node tooling/run-locked.mjs --ticket 121-review-red -- node .scratch/orchestrator/red12-gate.mjs clean
node .scratch/orchestrator/red12-probe-min.mjs      # 27/27，含 a–d 四支新探针
node .scratch/orchestrator/red12-purity.mjs         # 纯度／契约面
```

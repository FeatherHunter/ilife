# #78 图表 helpers JS —— 真实浏览器实证快照

> 对象：`packages/base-render/dist/charts.js` 的 `buildChartsHelpersJs(input?)`（#78 冻结面「图表 helpers JS 唯一产出者」）
> 手段：headless Chromium ＋ `file://` 自包含页面 ＋ `--dump-dom` 回读 ＋ `--enable-logging=stderr --v=1` 抓控制台
> 复跑：仓根 `node .scratch/t78/browser-evidence.mjs`（退出码 0=全绿／1=有断言红／2=找不到浏览器）

---

## 0. 结论（前置）

| 项 | 结果 |
|---|---|
| 浏览器是否可用 | **可用**：Chrome `152.0.7977.83`（主）；Edge `152.0.4191.66`（备，同一套断言同样全绿） |
| 断言总数 | **22 条，22 PASS / 0 FAIL，退出码 0** |
| 页面 A（单次注入） | `<style id="ilife-charts">` **恰 1 个**，内容非空（2543 字符），含 `.ilife-chart{` 规则 |
| 页面 B（双次注入＝幂等） | 仍**恰 1 个** —— 幂等成立 |
| 页面 C（helpers ＋ 8 类图表） | `data-chart-kind` **8 个不同值**；`<canvas>` **0 个**；`<script>` **1 个**（＝注入的 helpers 数）；带 `viewBox=` 的 svg **8 个** |
| 控制台错误 | 页面 A/B/C/负样本页：页面 console 行 0、Uncaught 0、SEVERE 0、浏览器内部 ERROR/FATAL 0 |
| 负样本（删掉幂等判据） | **红**：页面 B 出现 **2 个** style，标准断言 `count == 1` 返回 `false`（鉴别力自证成立） |
| 错误通道是否有效 | **有效**（阳性对照页抓到 `console.error` 与 `Uncaught` 各 1 行）——「零错误」不是恒真 |
| 可复跑 | **达到**：同一产物下连续两次运行输出**逐字节相同**（`byte-identical = True`，两次退出码均 0） |
| 被验产物指纹 | `dist/charts.js` size=87257 `sha256=34602a7d5fd0e361a9b28529d63686154bb070b4f93a90a830836c6fa8171385` |

---

## 1. 浏览器：路径与版本

发现顺序按票面要求：先 `DSH_BROWSER_CANDIDATES`，再常见安装路径。

| 顺序 | 来源 | 路径 | 是否存在 |
|---|---|---|---|
| 1 | `DSH_BROWSER_CANDIDATES` | （未设置时跳过；实测设为 Edge 路径后被正确优先选中） | — |
| 2 | chrome (Program Files) | `C:\Program Files\Google\Chrome\Application\chrome.exe` | **存在** |
| 3 | chrome (Program Files x86) | `C:\Program Files (x86)\Google\Chrome\Application\chrome.exe` | 不存在 |
| 4 | chrome (LocalAppData) | `%LOCALAPPDATA%\Google\Chrome\Application\chrome.exe` | 不存在 |
| 5 | msedge (Program Files) | `C:\Program Files\Microsoft\Edge\Application\msedge.exe` | 不存在 |
| 6 | msedge (Program Files x86) | `C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe` | **存在** |
| 7 | chromium (Program Files / x86 / LocalAppData) | `C:\Program Files\Chromium\Application\chrome.exe` 等 | 不存在 |
| 8 | PATH | `chrome` / `msedge` / `chromium` | 均不在 PATH |

- 版本探测：Windows 上 `chrome.exe` 是 **GUI 子系统程序**，`--version` 的 stdout 拿不到版本号（只回一段本地代码页提示文案，非 ASCII，已压成 `<non-ascii:21chars>`）；脚本自动退化为读安装目录里的版本号子目录 → `152.0.7977.83`。
- 备选浏览器实测（`DSH_BROWSER_CANDIDATES` 指向 Edge）：
  ```
  [BROWSER] exe     = C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe
  [BROWSER] source  = DSH_BROWSER_CANDIDATES
  [BROWSER] version = 152.0.4191.66 (from install-dir name)
  TOTAL 22 assertions: 22 PASS, 0 FAIL
  VERDICT: GREEN (all assertions passed)   exit=0
  ```

**浏览器不可用时脚本行为**：不静默跳过、不算通过——打印 `实证未完成：找不到可用浏览器` ＋ 逐一列出试过的路径，写 `evidence-run.txt`，`process.exit(2)`。

---

## 2. 被验产物指纹（证据自证）

| 产物 | size | sha256 | mtime (UTC) |
|---|---|---|---|
| `packages/base-render/dist/charts.js` | 87257 | `34602a7d5fd0e361a9b28529d63686154bb070b4f93a90a830836c6fa8171385` | 2026-09-08T20:46:32.521Z |
| `packages/base-render/dist/spec/index.js` | 28109 | `1d79d84ad579f51013ab4e405594a2c993840a43fbaa18454f3f365a4cf1c3a0` | 2026-09-08T20:46:32.480Z |

- 脚本在开跑前、跑完后各算一次指纹，并断言 **S1「本次运行期间被验产物未变」**；S1 只比 `size + sha256`（不比 mtime：`tsc` 重写同样内容只会动 mtime，不影响证据有效性）。产物内容中途被改写 → S1 红 → 退出码 1（证据不自洽时不会被误当绿）。
- 记录指纹的原因：本实证期间 `dist/charts.js` 被**并发重建**（82026 → 87238 → 87255 → 87257 字节，helpers 文本 2347 → 3013 字符）。因此「这份证据验的是哪一份字节」必须随证据落盘，否则无法复现。

---

## 3. 夹具（`.scratch/t78/browser/`）

生成脚本：`.scratch/t78/browser/generate-fixtures.mjs`（可单独跑；被 `browser-evidence.mjs` import）。
输入：`buildChartsHelpersJs()` 的产出文本 ＋ `charts.line/bar/donut/progress/combo/sparkline/gauge/scatter` 的产出 HTML。

| 文件 | 注入 helpers | 用途 | 页面字节 | 外部引用核验 |
|---|---|---|---|---|
| `page-a.html` | 1 次 | 单次注入基线 | 3208 | `http(s)://` 0 个、`<img>/<link>/src=/href=` 0 个、页面自带 `<style>` 0 个 |
| `page-b.html` | 2 次 | 幂等 | 6239 | 同上 |
| `page-c.html` | 1 次 | helpers ＋ 8 类图表 HTML | 13408 | 同上 |
| `page-b-neg.html` | 2 次（判据已删） | 负样本自证鉴别力 | 6238 | 同上 |
| `page-d-err.html` | 1 次 | 错误通道阳性对照（故意 `console.error` ＋ 同步 `throw`） | 3327 | 同上（多 2 个自写内联脚本） |

- 无服务、无宿主注入、无 CDN：全部 `file://` 静态页面，零外部引用。
- 编码：UTF-8 **无 BOM**（首字节 `3C 21 64` / `2F 2A 2A`），换行纯 LF（CRLF 计数 0）。
- 页面 C 的 8 个容器（回读自 DOM dump，`page-c.dom.html`）：
  ```
  <div class="ilife-chart ilife-chart-line"    data-chart-kind="line">      <svg ... viewBox="0 0 320.0 210.0">
  <div class="ilife-chart ilife-chart-bar"     data-chart-kind="bar">       <svg ... viewBox="0 0 320.0 170.0">
  <div class="ilife-chart ilife-chart-donut"   data-chart-kind="donut">     <svg ... viewBox="0 0 150.0 150.0">
  <div class="ilife-chart ilife-chart-progress" data-chart-kind="progress"> <svg ... viewBox="0 0 100.0 8.0">
  <div class="ilife-chart ilife-chart-combo"   data-chart-kind="combo">     <svg ... viewBox="0 0 320.0 170.0">
  <div class="ilife-chart ilife-chart-spark"   data-chart-kind="sparkline"> <svg ... viewBox="0 0 90.0 30.0">
  <div class="ilife-chart ilife-chart-gauge"   data-chart-kind="gauge">     <svg ... viewBox="0 0 170.0 105.0">
  <div class="ilife-chart ilife-chart-scatter" data-chart-kind="scatter">   <svg ... viewBox="0 0 320.0 180.0">
  ```

---

## 4. 每条断言的实际输出

浏览器调用：`chrome.exe --headless=new --disable-gpu --no-first-run --disable-extensions --allow-file-access-from-files --enable-logging=stderr --v=1 --virtual-time-budget=1500 --user-data-dir=<scratch> --dump-dom file:///.../<page>.html`
（`--headless=new` 产出空 DOM 时自动回退 `--headless`；本次 5 个页面均未触发回退）

```
[RUN] page-a      status=0 domLen=5802  headless=--headless=new consoleLines=0
[RUN] page-b      status=0 domLen=8851  headless=--headless=new consoleLines=0
[RUN] page-c      status=0 domLen=16114 headless=--headless=new consoleLines=0
[RUN] page-b-neg  status=0 domLen=11416 headless=--headless=new consoleLines=0
[RUN] page-d-err  status=0 domLen=5919  headless=--headless=new consoleLines=2

[ASSERT] A1   page-a: <style id="ilife-charts"> count == 1            PASS  actual=1
[ASSERT] A2   page-a: injected style content non-empty                PASS  actual=len=2543
[ASSERT] A3   page-a: injected style contains .ilife-chart rule       PASS  actual=hasRule=true
[ASSERT] A4   page-a: <script> count == injected helpers (1)          PASS  actual=1
[ASSERT] A5   page-a: page console output + Uncaught == 0             PASS  actual=console=0 uncaught=0 severe=0
[ASSERT] B1   page-b: <style id="ilife-charts"> count == 1 (idempotent)PASS  actual=1
[ASSERT] B2   page-b: <script> count == injected helpers (2)          PASS  actual=2
[ASSERT] B3   page-b: page console output + Uncaught == 0             PASS  actual=console=0 uncaught=0 severe=0
[ASSERT] C1   page-c: distinct data-chart-kind values == 8            PASS  actual=8 [bar,combo,donut,gauge,line,progress,scatter,sparkline]
[ASSERT] C2   page-c: data-chart-kind set == CHART_KINDS              PASS  actual=bar,combo,donut,gauge,line,progress,scatter,sparkline
[ASSERT] C3   page-c: data-chart-kind occurrences == 8                PASS  actual=8
[ASSERT] C4   page-c: <canvas> count == 0                             PASS  actual=0
[ASSERT] C5   page-c: <script> count == injected helpers (1)          PASS  actual=1
[ASSERT] C6   page-c: svg[viewBox] count >= 8                         PASS  actual=8
[ASSERT] C7   page-c: <style id="ilife-charts"> count == 1            PASS  actual=1
[ASSERT] C8   page-c: page console output + Uncaught == 0             PASS  actual=console=0 uncaught=0 severe=0
[ASSERT] N1   negative sample: guard removed -> style count == 2      PASS  actual=2
[ASSERT] N2   negative sample: standard assertion (count == 1) turns REDPASS  actual=standardAssertion(2)=false
[ASSERT] N3   negative sample: <script> count == 2 (both ran)         PASS  actual=2
[ASSERT] D1   error-channel control: detector sees deliberate console.errorPASS  actual=1
[ASSERT] D2   error-channel control: detector sees Uncaught throw     PASS  actual=1
[ASSERT] S1   artifacts under test unchanged during this run          PASS  actual=stable (content hash unchanged)
TOTAL 22 assertions: 22 PASS, 0 FAIL
VERDICT: GREEN (all assertions passed)
```

逐条落点：
- **A1/A2/A3** ← 票面「页面 A：DOM 中 `<style id="ilife-charts">` 恰 1 个，且其内容非空（含 `.ilife-chart` 规则）」
- **B1** ← 票面「页面 B：注入两次后仍恰 1 个（幂等）」
- **C1..C3** ← 票面「8 类图表容器都在（`data-chart-kind` 8 个不同值）」；**C4** ←「`<canvas>` 0 个」；**C5** ←「`<script>` 数量 = 注入的 helpers 数量（不多出脚本）」；**C6** ←「出现 `viewBox=` 的 svg 数 ≥ 8」
- **A5/B3/C8** ← 票面「三次运行都无 SEVERE／Uncaught 级控制台错误」
- **N1/N2/N3** ← 票面「负样本自证鉴别力」；**D1/D2** ← 错误通道阳性对照；**S1** ← 证据自洽性

---

## 5. 负样本：红 / 绿证据

| | 页面 | 注入 helpers | `<style id="ilife-charts">` 实测 | 标准断言 `count == 1` |
|---|---|---|---|---|
| 绿 | `page-b.html` | 2 次（判据完好） | **1** | `true`（B1 PASS） |
| 红 | `page-b-neg.html` | 2 次（**幂等判据已删**） | **2** | `false`（N2 PASS） |

- 负样本做法：把 helpers 文本里这一行删掉 —— `if (document.getElementById(STYLE_ID)) return;` —— 再生成一份页面注入两次。**只在内存里改字符串副本**，落盘的是另一份 html，仓内 `packages/**` 零改动。
- 页面 B 上第二个 `<script>` **确实执行了**：负样本页与它结构完全相同（两个同文本 script 标签），负样本页产出 2 个 style 即证明两个脚本都跑了；页面 B 上第二个脚本执行后命中判据早退，故只剩 1 个。
- 结论：A1/B1/C7 用的口径（`count == 1`）在判据被删时**会变红**，所以「幂等成立」不是恒真断言。
- 还原：无需还原——仓内源码从未被改（见 §7 佐证）。

---

## 6. 控制台错误通道（含诚实的边界）

| 页面 | 页面来源 console 行 | Uncaught | SEVERE | 浏览器内部 ERROR/FATAL |
|---|---|---|---|---|
| page-a | 0 | 0 | 0 | 0 |
| page-b | 0 | 0 | 0 | 0 |
| page-c | 0 | 0 | 0 | 0 |
| page-b-neg | 0 | 0 | 0 | 0 |
| page-d-err（对照） | **2** | **1** | 0 | 0 |

对照页实际抓到的两行（已抹掉 pid/时间戳）：

```
[CONSOLE:27] "PROBE-CONSOLE-ERROR", source: file:///D:/ilife/.scratch/t78/browser/page-d-err.html (27)
[CONSOLE:28] "Uncaught Error: PROBE-UNCAUGHT-THROW", source: file:///D:/ilife/.scratch/t78/browser/page-d-err.html (28)
```

**边界（必须说明，不能假装）**：Chrome 的 stderr 日志把**所有** console 消息一律标成 `INFO:CONSOLE:`，**不带 console 级别**（`console.error` 与 `console.log` 格式一致）。因此：

- 本实证断言的不是「零 SEVERE 级错误」，而是更严的**「页面来源 console 输出 0 行 ＋ Uncaught 0 行 ＋ SEVERE 0 行」**——页面 A/B/C 连一条 `console.log` 都没有，自然不可能有 SEVERE 级 console 错误；
- 通道鉴别力由对照页 D 证明：`console.error` 与未捕获 `throw` 都能被抓到（D1/D2 PASS）。若通道抓不到，D1/D2 会红，A5/B3/C8 的绿也就不足为凭。

---

## 7. 只读纪律佐证

- 本实证只写 `.scratch/t78/browser-evidence.mjs`、`.scratch/t78/browser-evidence.md` 与 `.scratch/t78/browser/**`；未执行任何 git 写命令。
- `git status --porcelain` 里 `M packages/**`、`M docs/**`、`?? .changeset/**` 等条目是 **#78 工单自身的在飞改动（并发重建 dist 的就是它）**，时间戳与本次实证并行，不是本实证产生的；本实证对这些文件只做过读与哈希。
- 负样本改的是内存字符串副本，不是磁盘源码。

---

## 8. 可复跑标准

| 项 | 状态 |
|---|---|
| 单命令复跑 | ✅ 仓根 `node .scratch/t78/browser-evidence.mjs` |
| 依赖 | ✅ 只用仓内文件（`packages/base-render/dist/*`）＋本机浏览器；无未入仓临时文件、无网络、无服务 |
| 退出码语义 | ✅ 0 全绿 / 1 有断言红或产物中途变动 / 2 找不到浏览器 |
| 输出确定性 | ✅ 同一产物下连续两次运行 `evidence-run.txt` **逐字节相同**（`byte-identical = True`，两次 `exit=0`）；Chrome 日志里的 pid/时间戳已在落盘前抹平 |
| 产物可辨认 | ✅ 每次运行打印被验 `dist` 的 size/sha256/mtime，并断言运行期间未变（S1） |

产出物清单：

```
.scratch/t78/browser-evidence.mjs        实证驱动（22 条断言，含负样本与对照）
.scratch/t78/browser-evidence.md         本文件（证据快照）
.scratch/t78/browser/generate-fixtures.mjs  夹具生成脚本
.scratch/t78/browser/page-a.html         页面 A：helpers ×1
.scratch/t78/browser/page-b.html         页面 B：helpers ×2（幂等）
.scratch/t78/browser/page-c.html         页面 C：helpers ＋ 8 类图表
.scratch/t78/browser/page-b-neg.html     负样本页：判据已删 ×2
.scratch/t78/browser/page-d-err.html     错误通道对照页
.scratch/t78/browser/page-*.dom.html     各页 --dump-dom 回读快照
.scratch/t78/browser/page-*.console.txt  各页控制台分类结果
.scratch/t78/browser/evidence-run.txt    完整运行转录（本文件 §4 的来源）
.scratch/t78/browser/evidence-summary.json  机读汇总（断言/指纹/页面）
```

---

## 9. 已知限制

1. **单内核**：只验了 Chromium 系（Chrome 152 主、Edge 152 备）。本机未安装 Firefox，未做跨内核验证。
2. **产物在飞**：实证期间 `dist/charts.js` 被并发重建 4 次（82026 → 87238 → 87255 → 87257 字节，helpers 文本 2347 → 3013 字符）。本快照固定 `sha256=34602a7d…`；**换一份 dist 字节，`helpers JS len`/`domLen`/指纹行会变**，这是被验对象变了而不是脚本不稳定。其中一次实例在 dist 被反复重写的时间窗内退出码为 1，其失败行未保留（下一次运行覆盖了转录）；稳定产物下的连续两次运行均 `exit=0` 且 `evidence-run.txt` 逐字节相同。S1 就是为此设的闸门，且已收敛为**内容哈希**比较（同字节重写不算变）。
3. **console 级别不可区分**：见 §6。已用「零 console 输出」这一更严口径 ＋ 对照页补偿。
4. **快照时机**：`--dump-dom` 在 load 后回读。helpers 在解析期同步执行（`if (document.head || document.body) boot()`），故快照足以覆盖；`document.head` 与 `body` 同时为空的 `DOMContentLoaded` 分支在整页 `file://` 场景下不可达，未覆盖。
5. **幂等范围**：只验「同页、同文本、两次注入」。不同 `styleId`/`prefix` 的交叉注入、以及多 iframe 场景未验（后者不在票面要求内）。
6. **只验 DOM 结构**：断言的是 DOM 里有没有、有几个、标签与属性如何；不验视觉布局/像素/动画（`--virtual-time-budget=1500` 对 CSS 过渡无影响，不影响上述断言）。
7. **负样本口径**：只删了「DOM 判据」这一种实现方式。若未来实现改用全局哨兵（`SHARED_HELPERS_JS_RULE` 明令禁止）或其它机制，本负样本不适用，需另设负样本。
8. **`--v=1` 日志量**：每页约 600 KB stderr，只在内存里分类，落盘的是分类后的少量行；需要原始日志时设 `T78_KEEP_RAW_LOGS=1`。

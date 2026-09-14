# #154 公共层版式返工 · 证据件（三处版式 ＋ 页内静态提示形态）

- 票：#154（交付页肉眼返工的第 4／5／6／2／1 条的**公共层面**）
- 落点：`packages/base-render/src/blocks.ts`（12 区块样式区 ＋ `renderFeedbackBlock`）、
  `packages/base-render/src/controls.ts`（字形表加一个 `export`，**不动实现**）、
  `packages/base-render/test/ui-fix-154.test.mjs`（新判据 20 条）
- 纪律：**没碰** `packages/skill-calorie/` 任何源码（页面侧改用它由另一工作面做）；
  **没碰** 12 区块闭集（`BLOCK_STYLE_SECTIONS` 仍 12 项）、**没碰** 11 个冻结 token（`CSS_VAR_TOKENS` 未动）、
  **没碰** 运行时瞬时 toast 的深色卡面（`.ilife-toast` 一字未改）。
- 日期：2026-09-14

> **落点更正（与派单的一句话差异）**：派单写「落到 `style.ts` 的 feedback 区」，实测**区块样式不住 `style.ts`**——
> `src/style.ts` 只产 8 个**控件**样式区（toast／actionBar／copyButton／statusBadge／emptyState／errorReceipt／charts／helpShell），
> 12 个区块的 CSS 唯一产出者是 `src/blocks.ts` 的 `BLOCK_SECTION_BUILDERS`（`blocksCss()`）。
> 故三处版式与静态提示的样式全部落在 `blocks.ts` 的 `kpiCard`／`dataTable`／`listRows`／`feedbackBlock` 四区；
> `style.ts` **一个字节都没动**（读数：`buildStyleSheet().css` sha 改前改后同为 `15e3e3cc834dc9b1364872aabf5851f6`／23631 B）。

---

## 一、三处版式：改前 → 改后（规则逐条）

口径：下列文本由 `.scratch/t154-ui-fix/read154.mjs` 从 `dist/blocks.js` 的 `blocksCss()` 里**原样抽出**（`pre`＝改前、`post`＝改后两枚读数落 `.scratch/t154-ui-fix/readings/{pre,post}.json`）。

### ① 区块间距（用户第 4／5／6 条：「表格和上下卡片完全贴在一起」「其他所有 HTML 都或多或少有这些问题」）

| 区块类 | 改前 | 改后 |
|---|---|---|
| `.ilife-block-kpi-card-grid` | `display:grid; grid-template-columns:repeat(auto-fit, minmax(150px,1fr)); gap:12px;`（**无任何 margin**） | 同上 ＋ `grid-auto-rows: 1fr;` ＋ **`margin: 16px 0;`** |
| `.ilife-block-data-table` | `overflow-x:auto; border:1px solid var(--line); border-radius:14px; background:var(--card);`（**块级无 margin**） | **`margin: 16px 0;`** ＋ 其余不变 |
| `.ilife-block-list-rows` | `border:1px solid var(--line); border-radius:14px; background:var(--card);`（**块级无 margin**） | **`margin: 16px 0;`** ＋ 其余不变 |
| 同族参照（未动） | `.ilife-block-chart-block`／`-detail-section`／`-empty-block`／`-copy-block`／`-feedback-block` 都是 `margin:16px 0`；`-disclosure`／`-pre-block` 是 `12px 0`；`-caliber` 是 `0 0 8px` | 不变 |

**为什么是 `16px 0`**：与同族五个块**同值同向**（新增判据「与同族五个已有 margin 的块同值同向」钉死），
不另立一档；相邻外边距按 CSS 折叠规则取 `max()`，不会翻倍（实测见 §四）。

### ② KPI 卡：四张等高 ＋ 主数字 22px（用户第 2 条）

| 规矩 | 改前 | 改后 |
|---|---|---|
| `.ilife-block-kpi-card-grid` | 无行轨道约束 ⇒ `auto-fit` 网格**逐行各自量高** | ＋ `grid-auto-rows: 1fr`（全部隐式行取同一高） |
| `.ilife-block-kpi-card-value` | `font-size: 28px`（`line-height:1.2`、`overflow-wrap:anywhere`） | **`font-size: 22px`**（行高／折行规则保留，`unit` 13px 不动） |
| 阶梯自检 | 28 与 17（`detail-section-title`／`h2`）差 11px | 22 − 17 ＝ **5px ≥ 4px**（C1:349「相邻级差 ≥4px」）；22 − 13（unit）＝ **9px ≥ 8px**（本尺 B-02）；22 < 28 满足「不要内容太大了」 |
| 卡片自身 | `padding:14px; border:1px solid var(--line); border-radius:14px; background:var(--card); box-shadow:var(--shadow)` | **一字未改**（**不写死高度**，避免截断长文本；等高交给行轨道） |

### ③ 页内静态提示（用户第 1 条：「顶部有个奇怪的弹窗这是什么？」）

**根因**：页顶那条「本窗只有 1 条记录…」由 `renderFeedbackBlock({toast})` 经**冻结控件 `renderToast`** 产出
（实测 13 种真实形态，全部是 `<div class="ilife-toast" role="status" aria-live="polite" data-max="5">` ＋ 深色毛玻璃卡 ＋
`<button class="ilife-toast-close">✓ 知道了</button>`）——穿的是**运行时瞬时 toast** 的外衣。深色卡面是
2026-09-12 用户亲自裁定的**运行时 toast** 形态（`docs/visual-spec-blocks.md` §B-12），与「页面流里的一段静态块」不是一回事。

**修法（能力，缺省不开）**：`FeedbackBlockInput` 加一个显式开关

```js
renderFeedbackBlock({ toast: { msg, detail, icon: 'warn' }, staticNotice: true })   // ← 唯一开法
```

`staticNotice === true` 时 `toast` 改渲染为**浅色静态提示**（新产出器 `renderStaticNotice`，`blocks.ts`）；
**其余任何值（不给／`false`／`0`／串）→ 老行为一行不差**（判据「给 false／非 true 值 → 与不给逐字节相同」钉死）。

新增 11 条规则（`feedbackBlock` 区，**不新增样式区**）：

| 类 | 规则要点 |
|---|---|
| `.ilife-block-feedback-block-note` | `display:flex; gap:10px; margin:16px 0; padding:12px 14px; **border:1px solid var(--line)**; **border-radius:14px**; **background:var(--soft)**; color:var(--fg2); font-size:13px; line-height:1.5` |
| `..-note-icon` | 22×22 底盘（`display:inline-flex` 居中、`border-radius:8px`、默认 `background:var(--card)`／`color:var(--fg2)`） |
| `..-note-icon-ok` | `background:#e6f7ec; color:#1f8c3d` |
| `..-note-icon-warn` | `background:#fff5e0; color:#a25b00` |
| `..-note-icon-danger` | `background:#fff0ee; color:#a83228` |
| `..-note-icon-info` | `background:var(--card); color:var(--blue2)` |
| `..-note-icon-copy` | `background:var(--card); color:var(--fg2)` |
| `..-note-body` | `flex:1 1 auto; min-width:0` |
| `..-note-title` | `color:var(--fg); font-weight:600` |
| `..-note-detail` | `margin-top:2px; color:var(--fg2)` |
| `..-note-lines` | `margin-top:2px; color:var(--fg2); white-space:pre-wrap` |
| `..-note-code` | `margin:6px 0 0; padding:8px 10px; border-radius:8px; background:var(--card); "SF Mono",monospace; 12px/1.55; pre-wrap; overflow-x:auto` |

**三条口径说明（都在代码注释里同款写着）**：

1. **图标字形与 toast 同源**：字形取冻结控件里那份 `TOAST_ICON_GLYPHS`（本次只给它加 `export`，**实现零改动**；
   该表**不进** `src/index.ts` 冻结出口面）。语义色落在**底盘底色**上——彩色 emoji 的 `color` 对它无效，
   `color` 只对无彩色字形生效，两处都写、缺一不可（实测见 §四ⓑ）。
2. **三档实色逐值取同仓既有的状态徽章**（`src/style.ts` 的 `statusBadge` 区：`#e6f7ec/#1f8c3d`、`#fff5e0/#a25b00`、
   `#fff0ee/#a83228`，原样取自旧层 `.hm-status.*`），`info`／`copy` 两档走冻结 token ⇒ **一个色值都没新发明**。
3. **静态提示不出可点控件**：`toast.actions`／`badge`／`count` 给了即抛 `bad-input`（fail-fast，不静默丢内容）；
   `timeoutMs`／`maxStack` 只关乎 toast 栈，静态形态下无意义、静默忽略；产物**不带** `role`／`aria-live`
   （静态提示是页面内容，不是实时区），也不带关闭按钮（点不掉，文档级委派也找不到它）。

---

## 二、既有产物「逐字节不变」的证明（新形态只在显式打开时出现）

### 2.1 纯产出器读数（决定性）

`.scratch/t154-ui-fix/read154.mjs` 对 **13 组输入**取 sha256（前 32 hex），改前／改后各跑一次：

| 组 | 输入 | 改前 sha | 改后 sha | 逐字节 |
|---|---|---|---|---|
| `B12-toast-msg` | `renderFeedbackBlock({toast:{msg:'本窗只有 1 条记录（比较变化要 2 条以上）'}})` | `7318cb45241ef356ae523440f25bafc5` | 同左 | ✅ 相同 |
| `B12-toast-detail` | ＋`detail` | `890baf7ff18bb1b4378d0e0fc42d9a81` | 同左 | ✅ |
| `B12-toast-icon-info` | ＋`icon:'info'` | `d3821cb26bf3d6cfb15c8afa0ee71a7c` | 同左 | ✅ |
| `B12-toast-badge` | ＋`badge` | `f66657d11c27550c5724e54176051400` | 同左 | ✅ |
| `B12-toast-count` | ＋`count` | `a98b5e32c0e35f994b4ae8a4f5b15413` | 同左 | ✅ |
| `B12-toast-lines-code` | ＋`lines`／`code` | `3b90c9a285c5291570616b7bf3635c9c` | 同左 | ✅ |
| `B12-toast-actions` | ＋`actions` | `f1307572770dc5a281277e730a7d14aa` | 同左 | ✅ |
| `B12-title-toast` | ＋`title` | `7a4204a813b25b345014c3fe78ad7aa1` | 同左 | ✅ |
| `B12-error-only` | 只给 `error` | `a2873a9d6b493aa608364fc791ff9e70` | 同左 | ✅ |
| `B12-toast-error` | `toast`＋`error` | `390f7839afc4c683f6d0e3fd8e6cfd05` | 同左 | ✅ |
| `toast-msg` | 冻结 `renderToast({msg:'m'})` | `cae00117279814753b3025598339dd66` | 同左 | ✅ |
| `toast-full` | 冻结 `renderToast` 全字段 | `d0f9ad83315261db316dba8925d64bd5` | 同左 | ✅ |
| `blocksCss-prefix-x` | `blocksCss({prefix:'x-'})` | `57303d5c3834e289ccf5bf2831b4b1ee` | `730683da476703c805a7db096c744dd1` | ❌ **预期改**（样式资产本身，就是本次要改的东西） |

> 13 组里 **12 组逐字节相同**，唯一变的是**样式资产文本**（`blocksCss()`）——这正是本次的改动面。
> 另：`buildStyleSheet().css`（控件样式表，含深色 `.ilife-toast`）sha 改前改后同为
> `15e3e3cc834dc9b1364872aabf5851f6` ⇒ 运行时瞬时 toast 一格未动。

**开／不开的对照读数**（同一份 `toast` 输入，只差开关）：

- 改前（dist 尚无该字段，未知字段被忽略）：`staticNotice:true` → `sha=fdbbcd5299e8d9defe5822c0f480a6fa bytes=449
  has_toast=true has_close=true`（仍是深色 toast，`✓ 知道了` 在）。
- 改后：`sha=caed20798afc5c48c28285ed3df99800 bytes=412 has_toast=false has_close=false
  classes=…note / …note-icon …note-icon-warn / …note-body / …note-title`（浅色块，无按钮）。

### 2.2 既有调用方真产物：58 张交付页 A／B（`.scratch/t154-ui-fix/compare2.mjs`）

复现器 `.scratch/t154-ui-fix/regen154.mjs` 是上级交付跑 `deliver58.mjs` 的**参数化副本**（同一张冻结命令表、
同一富种子库、同一条 `dist/cli/cmd_read.js` 真出口），先证它能复现上级的交付件：与我改前的产物相比，
**样式段逐字节相同**、正文差异只有写后回执页的**渲染时刻**（`2026-09-14 21:34:17` vs `22:31:12`）。

改前／改后各 58 张对账：

| 读法 | 结果 | 读法 |
|---|---|---|
| 整页逐字节相同 | **0 / 58** | 预期：样式段变了（就是本次的修复面） |
| 样式段逐字节相同 | 0 / 58；**样式段各自只有 1 种文本**（pre 1 种／post 1 种） | 58 张页共用同一份样式文本，差异是**全页统一**的，与页面内容无关 |
| 样式段字节 | 34268 → 36453 B | |
| 规则块级集合差 | **新增 21 条**（本次 #154 **16** 条 ＋ 同席 #457 **5** 条）／**消失 4 条**（逐条＝被改写的旧版同选择器） | 逐条明细见 `readings/compare.json`；与 §一 表逐条对得上 |
| 正文结构（标签／类名／属性名，剥文本与 script、`data-t` 值置空）逐字节相同 | 33 / 58 | 见下面的**归因** |
| 正文全文（时钟归一后）逐字节相同 | 15 / 58 | 同上 |

**归因（这两栏的差异不是本次改动造成的，逐条点名）**：同一窗口里另有**两个工作面在飞**，
它们的改动经我这里的 `pnpm build` 编进了同一份 `dist`，于是混进了页面正文：

1. **页面侧工作面**（票面已预告「页面侧会把长文本挪出 value 槽」）：`packages/skill-calorie/src` 有 **26 个文件／
   +1950 −1027 行**未提交改动，其中就有值槽搬迁——`src/weight/history.ts` 的 hunk 注释原话「值槽只放**短数字或数字＋单位**：
   单位走 `unit` 槽（小字），长信息一律进 `detail`」。实测差异窗口正是它：
   `value>2026-08-09 ~ 2026-09-07<` → `value>30<` ＋ `unit>条<`（04 页）、`基线 70.37 kg` → `70.37`＋`kg`（05 页）、
   `里程碑 n／2 达成` → `n`＋`个`（44 页）。结构不同（25 页）也是它加了/删了 KPI 卡。
2. **同席 #457**（`.scratch/t160f`）：`blocks.ts` 里 38 行未提交 hunk（见 §三），本次**一字未动**。
3. **写后回执页的渲染时刻**：`YYYY-MM-DD HH:MM:SS` 由 `new Date()` 取得（`CALORIE_TODAY` 只钉日期），
   任何两次生成都不可能相同；把该串归一后，15 张页的正文**逐字节相同**。

**把两个变量摘掉之后的干净判据**就是 §2.1：base-render 的**纯产出器**改前改后逐字节相同（12/12），
故 58 张页正文里任何差异都不可能由本次改动产生；本次改动在既有调用方产物里的**唯一**足迹＝样式段，
且这份样式段的差分**已被逐条枚举**（21 新增／4 改写）。

---

## 三、与同席 #457 的分工（两套规则叠加不翻倍 · 上级加派自证）

### 3.1 两条规则的特异度与取值

| 规则 | 选择器 | 特异度 | 声明 |
|---|---|---|---|
| 同席 #457（已在工作树，未提交） | `.ilife-block-page-shell-body > * + .ilife-block` | **(0,2,0)** | `margin-top: 16px` |
| 本次 #154 | `.ilife-block-kpi-card-grid`／`.ilife-block-data-table`／`.ilife-block-list-rows` | **(0,1,0)** | `margin: 16px 0` |

**同一个盒子同时命中两条时**（页面正文里非首个的表格／列表）：特异度高的 #457 那条胜，`margin-top` 取 **16px**；
本席写的是同一个值 ⇒ **used value 仍是 16px，不是 32px**（两条命中同一个 `margin-top` 属性，不是两个盒子相加）。
**块的另一侧**（前一块的 `margin-bottom`）只有本席的规则给 16px。

### 3.2 两套规则为什么都要在（互补边界）

- #457 那条**匹配不到 KPI 网格**：网格根类是 `ilife-block-kpi-card-grid`，**不带** `ilife-block` 类 ⇒
  它只在「上一个兄弟之后的 `.ilife-block`」上生效，网格只能靠自己的 margin 站位（也与「块是首个子元素」这一格无关）。
- #457 那条也**盖不到「非 `.ilife-block` 的相邻元素」**（例：`.ilife-block-caliber` 口径行、
  `.ilife-block-mini-bar` 等页面级件）。
- 本席三条**不管相邻是谁**：块自己带 `16px 0`，任何位置都有间距。

### 3.3 静态推演（折叠规则：相邻同向边距取 `max()`）

| 相邻 | 前块 `margin-bottom` | 后块 `margin-top` | 折叠后间距 |
|---|---|---|---|
| 表格 → 表格 | 16（本席） | 16（#457 胜，同值） | **16** |
| 表格 → KPI 网格 | 16（本席） | 16（本席；#457 匹配不到） | **16** |
| KPI 网格 → 表格 | 16（本席） | 16（#457 胜，同值） | **16** |
| 网格是首个子元素 | —（body 的上方由 `page-shell-body` 的 `margin-top:16px` 承担） | 16（本席；#457 要求有兄弟才命中） | **16** |
| 表格 → 口径行 | 16（本席） | 8（口径行自身 `0 0 8px`） | **16** |

### 3.4 实测（headless Chrome，真产出器拼页）

探针：`.scratch/t154-ui-fix/margin-probe.mjs` → `probe.html`（真 `buildStyleSheet().css` ＋ 真 `blocksCss()` ＋
`renderPageShell`／`renderDataTable`／`renderKpiGrid`／`renderListRows`／`renderCaliberLine` 拼页，页内脚本量
`getBoundingClientRect()`／`getComputedStyle()`），截图
`D:\ilife\.dsh-vision-router\artifacts\probe.html-7675b4f2-shot-1200x900-fullpage.png`（1200 宽）。实测原文：

```
=== 正文直接子级逐对间距（gap = 后一个 top − 前一个 bottom，px） ===
#1 ilife-block-kpi-card-grid             | mt=16px mb=16px h=167.58 | gap_from_prev=n/a(首个) | body顶部到它=0
#2 ilife-block ilife-block-data-table    | mt=16px mb=16px h=124    | gap_from_prev=16
#3 ilife-block ilife-block-data-table    | mt=16px mb=16px h=124    | gap_from_prev=16
#4 ilife-block ilife-block-data-table    | mt=16px mb=16px h=124    | gap_from_prev=16
#5 ilife-block-kpi-card-grid             | mt=16px mb=16px h=167.58 | gap_from_prev=16
#6 ilife-block ilife-block-list-rows      | mt=16px mb=16px h=41.5   | gap_from_prev=16
#7 ilife-block-caliber                   | mt=0px  mb=8px  h=18     | gap_from_prev=16
#8 ilife-block ilife-block-data-table    | mt=16px mb=16px h=124    | gap_from_prev=16
=== KPI 四张卡（五号网格） ===
card heights: 167.58 / 167.58 / 167.58 / 167.58  全等=true
主数字 computed font-size=22px line-height=26.4px 值文字宽=201 高=52.78
unit computed font-size=13px
```

- **八对相邻，间距全是 16px**（含「表格→表格」这种两套规则都命中的格）⇒ **不翻倍**，实测坐实 §3.3。
- 每个块的 computed `margin-top`／`margin-bottom` 都是 `16px`（#457 那条把头一块的 `margin-top` 也钉在同一值）。
- **四张卡高全等**（167.58 × 4，首张卡的值是日期区间、折了两行 ⇒ 等高不是靠内容相等，是靠 `grid-auto-rows:1fr`）。
- 主数字 22px／unit 13px 实测落定。

**页内静态提示的形态实测**（`.scratch/t154-ui-fix/notice-probe.mjs` → `notice-probe.html`，截图
`…\notice-probe.html-0a2d80a9-shot-1200x900-fullpage.png`）：

```
ⓐ 缺省 toast：background=rgba(28, 28, 30, 0.94) borderRadius=14px backdrop=blur(20px) saturate(1.8)
   关闭按钮文案="✓ 知道了" role=status aria-live=polite            ← 深色卡面一字未动
ⓑ 静态提示：background=rgb(245, 248, 255)=(--soft) border=1px solid rgb(210,210,215)=(--line) borderRadius=14px 字体=13px
   含关闭按钮=false 含 data-action-id=false role=null aria-live=null
   图标字形="⚠️" 底盘=rgb(255, 245, 224)
ⓒ 五档 kind 底盘色：warn bg=rgb(255,245,224) ／ copy bg=rgb(255,255,255) ／ ok bg=rgb(230,247,236)
   ／ danger bg=rgb(255,240,238) ／ info bg=rgb(255,255,255)
```

---

## 四、测试与门禁读数

| 命令（一律走锁：`node tooling/run-locked.mjs --ticket 154 -- <命令>`） | 读数 |
|---|---|
| `pnpm build` | **exit 0**（`RESULT: ticket=154 … exit=0`） |
| `node --test packages/base-render/test/{ui-fix-154,blocks,controls,style,render}.test.mjs` | **173 tests / 37 suites / pass 173 / fail 0**，exit 0 |
| `node --test "packages/base-render/test/*.test.mjs"`（全包面，防别处样式快照被带红） | **608 tests / 101 suites / pass 608 / fail 0**，exit 0 |
| `node packages/skill-calorie/scripts/check-warning-line.mjs` | **exit 1**，且红面**全在 `packages/skill-calorie/src/**`**（`SCAN-ROOT: D:\ilife\packages\skill-calorie`，5 条「台账陈化」：trendDocs 824→826、history 670→681、review 590→599、compare 547→555、commands 437→443）——**红在别人的件，照实报、不代改**；base-render **不在该台账扫描面内**，故台账不用动（派单口径已预告）。 |

新判据 20 条（`test/ui-fix-154.test.mjs`，全绿）覆盖：三块补齐同族值＋与同族同值同向＋#457 规则仍在且互补；
`grid-auto-rows:1fr`＋22px＋阶梯自检＋不写死卡高；缺省路径逐字含 `renderToast`／非 `true` 值逐字节相同／
`title`／`error` 不受影响／浅色块无 toast 类名与按钮与 `aria-live`／五档字形同源＋语义色类／非法 icon 回落／
`lines`／`code`＋转义／`actions`／`badge`／`count` 抛 `bad-input`／产出类名与 CSS 双向对齐／浅色口径（`--soft`
＋1px `--line`＋圆角闭集）／只读冻结 token＋12 区闭集不动／深色 toast 卡面仍在。

---

## 五、交付对账（碰了什么）

| 路径 | 动作 |
|---|---|
| `packages/base-render/src/blocks.ts` | 四区 CSS（`kpiCard`／`dataTable`／`listRows`／`feedbackBlock`）＋ `FeedbackBlockInput.staticNotice` ＋ 新产出器 `renderStaticNotice` ＋ 一条 import |
| `packages/base-render/src/controls.ts` | 只给 `TOAST_ICON_GLYPHS` 加 `export`（＋注释），**实现零改动** |
| `packages/base-render/test/ui-fix-154.test.mjs` | 新建（20 条判据） |
| `docs/base/base-render/t154-ui-fix-公共层-证据.md` | 本件 |
| `packages/skill-calorie/**` | **未碰**（源码、台账、测试全未动） |
| `docs/visual-spec-blocks.md`／`packages/base-render/src/spec/*` | **未碰**（12 区块闭集与 11 冻结 token 原样） |

**行数告警（350 行线，LF 口径）**：`packages/base-render/src/blocks.ts` 实测 **1880 行**、`src/controls.ts` 实测 **1472 行**
——**已超线，需要根据规则进行重构。** 超因：`blocks.ts` 是 12 区块「产出函数 ＋ 样式唯一产出者」两件事同住一个文件
（本次只新增 179 行、改写 4 行；同一次 diff 里另有同席 #457 的 38 行）；`controls.ts` 是控件层「产出器 ＋ 复制编排 ＋
helpers JS」同住（本次只加 4 行／改 2 行）。
**拆法建议**（本次先不拆，理由在下一句）：① `blocks.ts` 按区块切成 `src/blocks/<区>.ts` ＋ 一个装配器
（样式区各自一处，`BLOCK_SECTION_BUILDERS` 变成装配表）；② `controls.ts` 把 `buildSharedHelpersJs` 的 JS 文本
搬去 `src/controls/helpers.ts`。**本次不拆的理由**：两文件都在**多席同改**中（#457 正改 `blocks.ts`、页面侧正改 calorie），
此时搬文件会把两席的在途改动搅成冲突；建议由 owner 在并发窗口结束后单独开票。`test/*.mjs` 不在结构纪律管辖面内
（`docs/agents/structure.md` §管辖「不管测试文件」），故 329 行的新判据件不触线。

**未决（交回上级）**：

1. **页面侧怎么开**：页面只需把那条提示的 `renderFeedbackBlock({toast})` 改成
   `renderFeedbackBlock({toast, staticNotice: true})`（同一次调用，别的字段不动）。若那条 `toast` 里带了
   `badge`／`count`／`actions`，要先把它们挪去别处（本形态**不静默丢**、直接抛 `bad-input`）——13 种真实形态无一使用这三件。
2. **嵌套位也要 16px**：本席给的是**块自己的边距**，故「表格／列表嵌在折叠区正文里」也会带 16px 内外边距——
   与同族区块（`chart-block`／`empty-block` 本来就是这样）口径一致；若页面侧要求折叠区内零留白，需另裁（属另一题材）。
3. **提交含同席 hunk**：按上级裁定，`blocks.ts` 按路径整份提交，commit message 里具名写明
   「本文件含 #457（`.scratch/t160f`）同席未提交 hunk」；同席那 38 行**一字未动**（全程字面替换编辑）。
4. **changeset**：本次未加 `.changeset/*.md`——同区近票（#424／#421）也没加，发布节奏归发布链安排；若要补，请告知。

---

## 六、复现命令（只读，可重跑）

```powershell
# 读数（改前/改后各一份，落 .scratch/t154-ui-fix/readings/<tag>.json）
node .scratch/t154-ui-fix/read154.mjs post
# 58 张交付页真产物（各写各的目录，不覆盖上级交付件）
node .scratch/t154-ui-fix/regen154.mjs --out post
# 对账（整页／样式段／结构／规则块级归因）
node .scratch/t154-ui-fix/compare2.mjs
# 版式实测探针（headless Chrome 截图后读数字）
node .scratch/t154-ui-fix/margin-probe.mjs     # → probe.html
node .scratch/t154-ui-fix/notice-probe.mjs     # → notice-probe.html
# 门禁（都要走锁）
node tooling/run-locked.mjs --ticket 154 -- pnpm build
node tooling/run-locked.mjs --ticket 154 -- node --test "packages/base-render/test/*.test.mjs"
```

---

## 七、编排者接手收尾（实施代理遇网络中断后）

**经过**：本件的实施代理在跑完实施、写完上面六节之后**遇网络中断退出**，未及执行「页面侧开启」与提交。编排者接手完成以下三步，**读数均为接手后当场实测**。

### 7.1 页面侧开启（本件 3.3 与「未决 1」写的那一步）

`packages/skill-calorie/src/shared/copyArea.ts` 的 `notice()` 已改为传 `staticNotice: true`（**同一处调用，别的字段不动**）；`NoticeInput` 只有 `title／msg／detail／icon`，**不含 `badge／count／actions`**，故不触发本形态的 `bad-input` 拒绝面。函数注释同步改口径并写明「为什么」。
**没动**：`renderToast` 与复制成功／失败的瞬时反馈（用户 2026-09-12 裁定的深色卡面）。

### 7.2 收尾读数（接手后实测）

| 项 | 读数 |
|---|---|
| `pnpm build` | **exit 0**（0 个 TS 错误） |
| `packages/base-render/test/*` 七个文件 | **tests 248 ／ pass 248 ／ fail 0** |
| 卡路里侧十个用例文件 | **tests 124 ／ pass 123 ／ fail 1** —— 那 1 条是 **`profile-doc-179` 的 `#239`，早先就红**（`actual` 多一颗 `ilife-copy-log`）。**归因复核**：把本次 `staticNotice: true` **临时移除后复跑同一条，仍然 8 过 1 红** ⇒ 与本件无关（复跑后已还原）。该红已登记 `t154-体重页面-老新融合规范.md` §9 的 1g。 |
| 告警线台账门 | **RESULT: 56/56 PASS** |
| 交付包重出 | **58/58 通过**、清单页已重生成、**59 个 `.html`**、非 `.html` 混入 **0** |
| 横向扫描 | **57/58** —— 唯一例外是第 48 条目标域页无页脚来源行（**#436** 挂号） |
| **58 页「穿 toast 衣服」的静态提示总数** | **74 → 0**；仍有 toast 的页数 **57 → 0** |

### 7.3 逐图复核（编排者亲眼看，用户原话逐条对）

| 页 | 用户问题 | 复核结论 |
|---|---|---|
| `03-看本周体重` | ①「顶部那个奇怪的弹窗」 | 已成**浅色页内提示**（浅底＋1px 描边＋橙色警示图标），**无深色卡、无「知道了」**；四卡等高；首卡值槽 `1 条` |
| `04-看体重曲线` | ②「时间换行／卡片不等高／内容太大」 | **四卡等高**；首卡值槽 `30 条` ＋单位槽，区间进副说明；值槽字号 28→22px；网格与下方图表有 16px 间距 |
| `05-看体重稳不稳(增强版)` | ③「把颜色变成了文字」 | 阈值卡值槽 `±0.098`，副说明 `黄线 ±0.073kg · σ=0.049kg · rolling 基线 · σ 对照 5 点`；**颜色词已出值槽**；预警卡值槽 `±0.03`、档位只留徽章 |
| `07-对比体重-最近-30-天-vs-之前-30-天` | ⑤「两期对比与上面没距离」 | 「两期对比」表格与上方卡片**已有间距**，不再贴死 |

### 7.4 提交口径（本文件含同席 #457 未提交 hunk）

按编排者裁定：**按路径提交整份 `blocks.ts`／`controls.ts`，并在提交信息里具名写明「本文件含 #457（`.scratch/t160f`）同席未提交 hunk」**，同时写清两套规则的分工（它管「上一个兄弟之后的 `.ilife-block`」、本件管「三类不带 `.ilife-block` 的块根 ＋ 首个子元素」），免得后人当重复劳动合并掉。

### 7.5 仍留给下一轮的（很小）

- 波动页「近期异常」卡的**副说明**写 `黄 0 · 红 0 · 共 7 点`（**不在值槽**，可读作黄级／红级各几个点）；建议改成「黄线 0 · 红线 0」与图上标注同词，属措辞项。
- `goalsee` 域两处（值槽 `还差 2.4 kg`、缺页脚来源行）按地图裁定 3 不越界，已在 **#436** 挂号。

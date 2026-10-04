# #1133 票据族「主数字脚行 9px」按形状分档 · 落地证据

**票**：#1133（Lead 裁定＝**乙案 按形状分档**）　**执行席**：query-caliber　**日期**：2026-10-04
**写集**：`packages/base-render/src/components/summary-head/render.ts`（判别子）＋ `…/style/ticket-family.ts`（样式段收窄）＋ 一件测试件（见 §五）＋ 本件。**页面件一字未动**（`src/account`／`src/goal`／`src/analysis`／`src/write` 都没碰）。

## 一、基线（#1133 只读勘察 · 五域抽样 ＋ 全量扫）

**判地五域同构**：主数字段那句说明一律是 `.summary-head` 内的 `p.summary-note`（`position:static`／`display:block`／`margin-top:10px`，**在流内**）；有印章的页（write／analysis）那枚 `.stamp` 一律 `position:absolute`（**不占位**）⇒ 判地本来就没有那 9px 的空隙。

**产物侧三类页**（那 9px 只作用在 A 类上）：

| 类 | 页 | 数 | `-foot` 里装什么 | 改前 Δ（产物−判地） |
|---|---|---|---|---|
| **A** | write 16 ＋ analysis 25 ＋ acct 5（b02／b04／b06／g02／g04） | **46** | 只有印章（绝对定位，槽是空的） | **+9.00**（块高） |
| **B** | setup s01／s02／s03／s04／s05／s06 | 6 | **说明句**（＋s03 另有印章） | 0（s03 +5.00／s04 +4.00 是别的残差） |
| **C** | query 17 ＋ acct 8 ＋ setup 2（h02／w09） | 27 | 没有 `-foot` | 0（那条规则不作用） |

**反事实（勘察期）**：只在草稿副本里把那条 `margin-top:9px` 改 0 ⇒ write x02 176.19→**167.19＝判地逐值**（修好）／setup s01 145.59→**136.59＝判地 −9**（弄坏）⇒ 不能一刀切。

## 二、改法（一处实现，判别子由渲染器给）

1. **`components/summary-head/render.ts`**：脚行里**有说明句**时挂 `has-note`，只有印章时**不挂**——`'<span class="ilife-block-summary-head-foot' + (note === undefined ? '' : ' has-note') + '">'`。**没有说明句那一路的产物与加这一支之前逐字节相同**。
2. **`components/style/ticket-family.ts`**：那 9px 收窄到有判别子的行，并对无判别子的行**显式压 0**（压过公共层那条 10px）：
   - `.…-foot.has-note { margin-top: 9px; }`（B 类保持原样）
   - `.…-foot:not(.has-note) { margin-top: 0; }`（A 类收 9px；`:not()` 把特异性提到 0,5,0，胜过公共层那 0,4,0 的 10px）

## 三、读数（79 页逐页；页高＝`getBoundingClientRect` 小数口径，390 视口）

| 判据 | 读数 |
|---|---|
| **① 那 46 页各收 9px** | summary 块高 **逐页 −9.00（46/46）**；页高：acct **b02 1274.64→1265.64＝判地逐值**、**g02／g04 1211.36→1202.36＝判地逐值**、b06 1269.55→**1260.55**（+1.00＝已知落点残差）；write x02 965.63→958.98（判地 956.39，余 +2.59 旧残差）；analysis 各 −9～−11（页高比被手绘样本的数据量主导，见口径） |
| **差异比** | x02 0.1279→**0.0680**｜x28 0.1262→**0.0642**｜b02 0.1063→**0.0207**｜b06 0.1097→**0.0229**｜g02 0.1068→**0.0169**｜g04 0.1091→**0.0241**｜a01 0.4900→0.4826｜a14 0.4241→0.4185（**八页全降**） |
| **② B 类 setup 6 页不动** | 页高**逐页 0.00 变化**、summary 块高 0.00 变化；对照格 s01 差异比 **0.0887→0.0887**（逐值不变） |
| **③ 其余页不升** | **79/79 页「比不升」**（C 类 27 页 0.00 变化；A 类全降；无一页升） |

口径：analysis 的页高比远大于 1 是**手绘样本 vs 真实数据**（#1120 起登记：页高比 ≈ 行数比），本票只保证「各收 9px、比不升」。

## 四、变异两行（判据④）

变异点（一行）：`render.ts` 的判别子改成**永远挂** `has-note`。

| 行 | 读数 |
|---|---|
| **改坏必红** | write／analysis／acct 三域重渲：**46 页逐页 +9.00**（回到改前值）并点名——`write:x02 958.98→967.98`、`acct:b02 1265.64→1274.64`（＝判地 +9.00）；同域里 8 个 C 类页 0 变化 |
| **还原必绿** | 还原后重编重渲：**54 件产物与修复态快照逐字节相同**（write 那 16 件只差一行渲染时刻戳，归一化时间戳后逐字节相同） |

## 五、门禁

| 门 | 读数 |
|---|---|
| `tsc -b packages/base-render packages/skill-bill` | **exit 0** |
| `skill-bill` 全量 | **456／457**——唯一红＝`t689-page-fingerprint.test.mjs:25` 指纹门（本票按 Lead 令**不 `--write`**，留红） |
| `base-render` 全量 | `tests 4113／pass 4106／fail 7`：**本票的 `summary-head` 与 `sheet-family` 两组全绿**（`sheet-family.test.mjs` 单跑 35／35）；7 条红全与本票无关——**4 条真机件 CDP 起不来**（`command-palette`／`confirm-strip`／`editable-value`／`skeleton`，`Error: CDP 未就绪（headless Chrome 起不来）`，共享机上多席并发时的环境面）＋**3 条 `shape-567.test.mjs` 图表标签**（别席在途的 `charts/`） |
| 测试件一处同步（**在声明写集之外，如实报**） | `packages/base-render/test/sheet-family.test.mjs:123` 原钉 `/-foot">/`；改后说明句那一路是 `-foot has-note">` ⇒ 该正则同步为两路，并**补一条负向**（只有印章时不许含 `has-note`）。意图不变（仍是「给一种槽就出脚行／两槽都缺不出」） |

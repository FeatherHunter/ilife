# sheet-frame · 纸面页框

**一句话**：把一整页内容放进**一张纸**里——纸面、纸边，可选的两枚撕口（打孔）与页尾裁切线。

## 何时用它（选型三条）

| 你要的 | 用 |
|---|---|
| 「整页是一张单据／一份文件」——纸是**页本身** | **本件** |
| 「页里的一块内容要单独框起来」——纸是**页里的块** | `renderDetailSection`／`renderProseBlock`（区块层） |
| 只要页头三件套（eyebrow／标题／副标题） | `renderPageShell`（区块层） |

## 入参

| 字段 | 类型 | 缺省 | 说明 |
|---|---|---|---|
| `content` | `string` | 必填 | 纸里的正文（**已装配好的标记**，受信透传、不再转义） |
| `variant` | `'plain' \| 'receipt' \| 'ticket'` | `'plain'` | `plain`＝素纸（中性卡片纸）／`receipt`＝小票纸（暖白＋纸边＋方角）／`ticket`＝**票据纸**（圆角卡片纸＋柔和投影＋左右贯穿齿边＋页尾锯齿，见下） |
| `notch` | `boolean` | `false` | 左右两枚撕口（打孔）。`ticket` 不看这一格——它的左右齿边是纸本身 |
| `cutLine` | `boolean` | `false` | 页尾裁切线（虚线＋两端小孔；`ticket` 下是"虚线穿中间那句话"） |
| `cutLineText` | `string` | — | 裁切线中间那句话（**受信文本、会转义**）；给了才出中间那一格。`ticket` 的「✂ 裁切线」走这里 |
| `id` | `string` | — | 版面锚点（页内导航指过来用） |
| `extraClass` | `string` | — | 附加类名（空格分隔，逐个过类名正则） |

出口还有 `sheetFrameCss()`（本件样式段）与 **`sheetCss()`（本族样式汇总：纸 ＋ 主数字头 ＋ 刻度条 ＋ 账目行 ＋ 明细行）**。

## `ticket` 票据纸（#993 原型 v5／v7）

与 `receipt` 的差别**全在结构**，颜色与圆角值仍走皮肤：

| | `receipt` | `ticket` |
|---|---|---|
| 角 | 6px 方角 | 皮肤 `radius`（票据纸皮肤下 16px） |
| 投影 | 无（皮肤 `shadow`） | 皮肤 `shadow`（票据纸皮肤下两层柔和投影） |
| 撕口 | 两枚打孔（`top: 34px` 的半圆，左右各外探 9px） | **左右一整条贯穿齿边**（14px 宽的一列半圆，圆心落在纸边线上） |
| 页尾 | 一条虚线裁切线 | 一条"虚线穿「✂ 裁切线」"的裁切行 ＋ 纸底**锯齿边** |
| 内距 | `18px 20px 16px` | `22px 28px 10px` |

两个新元素 `ilife-block-sheet-edge`（齿边，`is-left`／`is-right`）与 `ilife-block-sheet-zigzag`（锯齿）**只在 `ticket` 下出**；
`plain`／`receipt` 的产物逐字节不变（判据 `test/sheet-family.test.mjs` ①）。

## 契约与不变量

- **桌面由页面给、纸由本件给**：撕口与裁线的小孔用 `skinVar('ground')`（＝皮肤作用域内的 `--bg`，桌面色）挖出来 ⇒ 换页面底色它们自己跟着走；纸面／纸边／圆角／投影同样经 `skinVar('surface'／'edge'／'radius'／'shadow')` 读皮肤。**本件样式里不出现颜色字面量**（判据 `test/组件样式纪律.test.mjs` ②）。
- **撕口不占版面宽度**：两枚半圆的圆心落在纸边线上（左右各外探 9px），开关它不改任何列的 x。`ticket` 的贯穿齿边同理——14px 宽压在纸边线上，不挤内容。
- **裁切线不占高度**：它是纸底一条虚线，下面的内容不会因为开它而下移超过自身高度。
- **样式 scope 在 `.ilife-page-ui` 下**：不开 `pageUi` 的页零命中（加法式的机械保证）。
- 本件**不管**页头、来源口径行、复制区——那三件的落点与文案归调用方。

## 常见错法

- 每张同族页各写一套 `background／border／border-radius／box-shadow`（纸边逐页不同）；
- 拿"卡片"当"纸"：卡里再套卡，出现双层边框与双重阴影；
- 撕口／裁线用图片或伪元素各页自造，与纸边对不齐；
- 用本件当**块**的容器（那是 `renderDetailSection` 的活）。

## 关系

- 本族其余四件：`summary-head`／`scale-bar`／`ledger-rows`／`entry-rows`（样式随 `sheetCss()` 一起挂）。
- 复用 `shared/validate.ts` 的入参校验与 `shared/escape.ts` 的转义（本层唯一转义入口）。

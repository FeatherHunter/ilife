# components/ · 公共层组件（可演进的组合层）

这一层住**组件**：一个组件一个目录、目录内自足。它**不进**冻结签名面（`SPEC_FROZEN_SURFACE`）、
**不从根出口**（`src/index.ts`）导出；消费方走 `base-paint/blocks`（`src/blocks.ts` 末尾一行 `export *`）。

## 目录长什么样
```
src/components/
  index.ts                 ← 组件层总出口：**每新增一个组件只在这里加一行**
  README.md                ← 本文件
  shared/                  ← 组件之间共用的小件（转义／入参校验；**不放组件本身**）
    escape.ts
    validate.ts
  <组件名>/
    index.ts               ← 该组件对外的唯一出口（名字面）
    attrs.ts               ← 标记契约：类名／data-* 属性／事件名／闭集／入参类型（渲染与运行时共用的唯一事实）
    render.ts              ← 渲染（纯函数产 HTML 字符串）
    style.ts               ← 样式段（该组件唯一的样式来源）
    runtime.ts             ← 运行时（**产出 JS 文本**；DOM 只允许出现在产出文本里）
    README.md              ← 说明书（给别的 AI 用）：何时用／入参表／契约／不变量／错法
```

## 为什么按目录分家
公共层由多个席位并行改：一个组件一个目录 ⇒ 新增组件只碰「自己目录 ＋ `index.ts` 一行」，
不会跟别人的改动在同一段代码里打结。**别把新组件塞进 `blocks.ts`／`controls.ts` 的大函数堆里。**

## 现有组件
| 组件 | 一句话 | 目录 | 说明书 |
|---|---|---|---|
| `editableValue` | 就地可编辑值（"值即入口"）：值＋铅笔 → 同格变编辑器，进出编辑不变形 | `editable-value/` | [README](editable-value/README.md) |
| `sheet-frame` | 纸面页框：整页是一张纸（素纸／小票纸，可选撕口与裁切线）＋**本族样式汇总 `sheetCss()`** | `sheet-frame/` | [README](sheet-frame/README.md) |
| `summary-head` | 主数字头：一页唯一的"主要读数"（大数字＋分母＋副语＋印章），三档字号 × 两种字面 | `summary-head/` | [README](summary-head/README.md) |
| `scale-bar` | 刻度条：值／目标的比例形状，`cells` 条形码／`line` 细线两形态 | `scale-bar/` | [README](scale-bar/README.md) |
| `ledger-rows` | 账目行：一页的读数逐项列成账（标签 →点线→ 值，右对齐等宽数字） | `ledger-rows/` | [README](ledger-rows/README.md) |
| `entry-rows` | 明细行：一条记录一行（时间／类别／名称／数量／值＋备注） | `entry-rows/` | [README](entry-rows/README.md) |
| `punch-strip` | 打孔格带：一格一天，有数填深色（原型那排「这 7 天」） | `punch-strip/` | [README](punch-strip/README.md) |

## 加一个新组件（照这五步）
1. **先定形状，再定名字**：写清楚它替掉的是哪几种错法（见各组件 README 的"常见错法"），
   以及它和既有件的关系（复用谁、不复用谁）。
2. 建目录：`attrs.ts`（契约常量与类型）／`render.ts`（纯函数）／`style.ts`（样式段）／`runtime.ts`
   （要 DOM 就产出 JS 文本）／`index.ts`（出口）／`README.md`（说明书）。
3. **样式段不进闭集**：新的 `xxCss()` 由页面按需注入（`renderDocShell` 的 opt-in 参数），
   只读冻结 token（`src/spec/style.ts` 的 `CSS_VAR_TOKENS`），不新增 token 名、不写 `:root`／`!important`。
4. **加法式**：不用它的页产物**逐字节不变**——挂载一律 opt-in（照 `charts`／`pageUi` 的先例）。
5. **测试**（`test/<组件名>.test.mjs`）：渲染契约（含转义与全部 `bad-input` 分支）／样式与零 DOM 纪律／
   加法式（不开＝零变化）／**真机**（几何不变量与交互，headless Chrome ＋ CDP，照 `test/editable-value.test.mjs`）。

## 红线（违反即红）
- 模块代码零 DOM：`dist/components/**` 剥离字面量与注释后不得出现 `document.`／`window.`／`navigator.`。
- 零内联脚本／零内联事件处理器：标记只带 `data-*`，激活走各自运行时（事件委派）。
- 不得反向被 `controls.ts` 依赖；不得改 `CONTROLS_*`／`STATUS_*`／`COPY_*` 冻结常量。
- 动到冻结签名面（`src/spec/**`／根出口）的改动**不属本层**，另开票走契约三处同步。

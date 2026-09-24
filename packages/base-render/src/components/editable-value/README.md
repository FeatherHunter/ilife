# editableValue · 就地可编辑值（"值即入口"）

> 组件层第一件（`base-paint/blocks` 出手）。**不用它的页产物逐字节不变**；用了它的页才付它的样式与运行时字节。

## 一句话
把一个**已经算好的值**变成可点的编辑入口：常态是「文本 ＋ 铅笔」，编辑态在**同一格里**换成输入框／下拉，
两种状态**同一盒模型**——进出编辑**不改版面**。

## 什么时候用它 / 不用它
| 场景 | 用哪件 |
|---|---|
| 「先给我看一眼、顺手改一处」——预检确认页、目标预检、批量导入预览、编辑器参数面 | **editableValue** |
| 「用户从头填一张表」——每字段一行标签＋输入框 | `renderParamForm`（表单优先） |
| 「只读对比，不许改」——回执的改前→改后 | `renderChangeRows` / `renderDataTable` |

判据一句话：**值的来源在系统这边、人只需要确认或微调** → 用它；**值的来源在人这边、系统要收全** → 用表单。

## 快速上手（三段）

```js
// ① 服务端渲染（Node）
import { renderEditableValue } from 'base-paint/blocks';

const html = renderEditableValue({
  name: 'heightCm',        // 机器键：提交事件与载荷按它定位
  value: '177',            // 机器值：提交时原样送出
  display: '177',          // 显示字（缺省＝value；可与机器值不同，如 男/male、1,800/1800）
  unit: 'cm',              // 单位（小号；不参与机器值）
  label: '身高',            // 人类可读字段名（aria-label ＋ 事件 detail.label）
  kind: 'text',            // text | number | select | date
});
// → <span class="ilife-edit-value ilife-edit-value--text" data-ilife-edit="heightCm" …><button …>177<span>cm</span><svg …/></button></span>
```

```js
// ② 整页装配：把样式段与运行时一并挂上（**只在这一页**）
import { renderDocShell } from 'base-paint/docShell';
const page = renderDocShell({ docTitle: '档案变更单', bodyHtml, extraCss, editableValue: true });
```

```js
// ③ 页面脚本：接自己的重算（不引入任何全局，纯 DOM 事件）
document.addEventListener('ilife:edit-commit', (e) => {
  const { name, value, prev, label, unit } = e.detail;   // 值已就地更新完毕，这里只做"改了之后要联动什么"
  if (name === 'activityLevel') repaintImpact(value);
  refreshPrimaryButtonPayload();
});
document.addEventListener('ilife:edit-cancel', (e) => { /* 可选：Esc 取消后要联动什么 */ });
```

> 页面脚本若要自己发命令，用 `renderActionBar({ copyLog: { actionId, label: '签发并写入', text: 那句话 } })`：
> 那颗按钮点下去就是复制 `data-t`（走公共层既有的复制运行时），不用另造按钮。

## 入参（`EditableValueInput`）
| 字段 | 类型 | 缺省 | 说明 |
|---|---|---|---|
| `name` | string | 必填 | 机器键；同页内应唯一（运行时按它定位） |
| `value` | string | 必填 | 机器值。**可空串，但那时必须给 `display`**（见"显式空态"） |
| `display` | string | `value` | 显示字；机器值与显示字**两码事**（`男`/`male`、`1,800`/`1800`） |
| `unit` | string | — | 单位（小号，不参与机器值） |
| `label` | string | — | 人类可读名（`aria-label="改身高"` ＋ 事件 `detail.label`） |
| `kind` | `text`｜`number`｜`select`｜`date` | `text` | 闭集外的值 → `bad-input`（**不静默降级**） |
| `options` | `(string｜{value,label})[]` | — | 仅 `select`；字符串项＝机器值与显示字同值。`value` 必须命中一项 |
| `placeholder` | string | — | 编辑器占位 |
| `required` | boolean | `false` | 空值提交被拦（留在编辑态，不派发事件） |
| `min`／`max`／`step` | string｜number | — | 仅 `number`；给了别的 `kind` → `bad-input`；`step` 须 >0、`min` ≤ `max` |
| `affordance` | `always`｜`hover`｜`none` | `always` | 铅笔形态（`none` 直接不渲染铅笔） |
| `disabled` | boolean | `false` | 命中区落 `disabled` ＋ `aria-disabled`；点不开、不给铅笔 |
| `align` | `left`｜`right` | `left` | 值位对齐（数值列常用右对齐） |
| `extraClass` | string | — | 附加类名（空格分隔；逐个过类名正则，防选择器注入） |

**入参违规一律抛 `BlocksError`（`bad-input`）**，不静默兜底：静默降级会让调用方以为已经生效。

## 标记契约（`data-*`，运行时与测试都只认这些名字）
`attrs.ts` 是唯一事实源；改名字两边一起改。

| 属性 | 含义 |
|---|---|
| `data-ilife-edit` | 机器键（**运行时的发现锚**；`[data-ilife-edit]`） |
| `data-ilife-edit-kind` | `text`｜`number`｜`select`｜`date` |
| `data-ilife-edit-value` | 机器值（提交后就地改写它） |
| `data-ilife-edit-display` | 显示字 |
| `data-ilife-edit-unit` | 单位 |
| `data-ilife-edit-label` | 字段名（aria-label） |
| `data-ilife-edit-options` | 候选项 JSON（仅 select） |
| `data-ilife-edit-affordance` | 铅笔形态 |
| `data-ilife-edit-required` / `-placeholder` / `-min` / `-max` / `-step` | 约束 |
| `data-ilife-edit-hit` | 命中区（运行时按它找可点控件） |
| `data-ilife-edit-bound` / `data-ilife-edit-disabled` | 已绑定 / 禁用 |

## 交互契约（运行时，`buildEditableValueJs()`）
| 动作 | 行为 |
|---|---|
| 点命中区 / `Enter`（按钮聚焦时） | 同一格换上 `input`／`select`，聚焦并全选 |
| `Enter`（编辑中） | 提交：校验 → 就地改写显示与 `data-ilife-edit-value` → 焦点回命中区 → 派发 `ilife:edit-commit` |
| 失焦 | 同上（提交），焦点不回位（避免抢走用户的下一步） |
| `Esc` | 取消：还原原值 → 焦点回命中区 → 派发 `ilife:edit-cancel` |
| `select` 的 `change` | 立即提交（下拉没有"确认键"这回事） |
| 校验不过 | **留在编辑态** ＋ `--invalid` ＋ `aria-invalid`，**不派发**事件（失败不许静默） |
| 值没变 | 不派发事件（避免"改了但其实没改"触发联动） |
| 重复注入 | 只绑定一次（根上 `data-ilife-edit-runtime`）——页面同时挂 helpers 与其它运行时也安全 |

事件（冒泡 `CustomEvent`，`detail`）：
```ts
'ilife:edit-commit' → { name, label, value, prev, unit }
'ilife:edit-cancel' → { name, value }
```

## 不变量（测试与真机都钉住）
1. **编辑不变形**：命中区与编辑器同 `min-height`（44px）／同内距／同字号；宿主用定宽列（`table-layout: fixed`）时，
   进出编辑**不得**改变任何列的 x 与行高（编辑器宽度上限 250px）。
2. **命中区 ≥44×44**（全宽口径，不只窄屏）；本组件**不提供**密集档——低于 44 的命中区就是不许留的中间档。
3. **无脚本可读**：不跑运行时，值照常可读（就是文本）；只是不可改。SSR／打印／纯静态页皆成立。
4. **零 DOM 的模块**：`dist/components/**` 的**代码**里没有 `document.`／`window.`／`navigator.`
   （DOM 只出现在产出文本里）。
5. **加法式**：不用它 ⇒ 页产物逐字节不变；样式只在 `editableValue: true` 时挂。

## 常见错法（别这么干）
- ❌ 把值渲染成常驻 `<input>`："未改"与"可改"失去区分，密集表会退化成一张表单 → ✅ 用本组件。
- ❌ 在值旁边另挂一颗「改」按钮：控件噪声 ×N，且按钮与值的语义打架 → ✅ 值本身即入口（铅笔只是记号）。
- ❌ 编辑态用一个 `width:100%` 的输入框：`table-layout:auto` 的表格会重算列宽，把邻列挤走（实测过）→ ✅ 定宽列 ＋ 宽度上限。
- ❌ 在页面里对提交事件做**重算之外**的事（写库、发请求）：重算与载荷刷新归页面脚本，**落库归技能命令**。
- ❌ 给 `value=''` 却不给 `display`：上屏一片空白，读的人分不出"没有值"与"没渲染"→ ✅ 显式空态：`value:''` ＋ `display:'未设置'`。

## 显式空态
档案里的"未设置"就是空值。要让空值可读、且仍可编辑：`{ name:'note', value:'', display:'未设置', required:true }`
——机器面留空串（序列化由调用方定），可见面写人话。

## 相关
- 层说明与"怎么再加一个组件"：`packages/base-render/src/components/README.md`
- 挂载点：`packages/base-render/src/docShell.ts`（`renderDocShell({ editableValue: true })`）
- 薄转出：`packages/base-render/src/blocks.ts` 末尾一行（消费方 `import … from 'base-paint/blocks'`）
- 契约测试：`packages/base-render/test/editable-value.test.mjs`（渲染／样式纪律／零 DOM／加法式／真机几何与交互）

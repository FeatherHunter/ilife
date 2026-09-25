# popover-menu · 浮出菜单（形态 A 贴着按钮）

> 组件层「容器与浮层」族第三件。**不用它的页产物逐字节不变**。
> 落地路线＝**`popover` 属性**：开／关／`Esc`／点外面关全是浏览器给的，**脚本坏了也开得出来**。

## 一句话
把几条动作**贴着触发它的那颗键**弹出来：分组头、快捷键、当前项打勾、危险项垫最后。
定位两道：**支持锚定 API 的引擎**走 CSS 锚定（贴不下自动翻边），**其余**退回普通定位（运行时算边距）。

## 什么时候用它 / 不用它
| 场景 | 用哪件 |
|---|---|
| 「贴着一颗键弹出几条动作」——复制格式、更多操作、快捷切换 | **popover-menu** |
| 「页面里摆一排常态可见的动作」 | `action-bar` |
| 「给一个词补一句口径解释」 | `tooltip` |
| 「确认一件破坏性的事」 | `dialog` |

判据一句话：**动作是这一颗键的从属**（不属于页面主流程）→ 用它。

## 快速上手

```js
import { renderPopoverMenu, popoverMenuCss, buildPopoverMenuJs } from 'base-paint/blocks';

const menu = renderPopoverMenu({
  id: 'menu-copy',
  trigger: '复制为',          // 记号 ▾ 由组件补
  align: 'end',               // 'end'＝贴右（缺省）／'start'＝贴左
  menuLabel: '复制成哪种格式',
  items: [
    { value: 'text', label: '纯文本', group: '文字', shortcut: '⌘⇧T' },
    { value: 'markdown', label: 'Markdown', note: '带标题与表格', shortcut: '⌘⇧M' },
    { value: 'csv', label: 'CSV', group: '数据', shortcut: '⌘⇧C' },
    { value: 'md-view', label: '按天', kind: 'check', checked: true, group: '排布' },
    { value: 'week', label: '按周', kind: 'check' },
    { value: 'delete', label: '删掉这一条', kind: 'danger', sep: true },
  ],
});
// 触发键带 popovertarget ⇒ **一行脚本都没有也开得出来**
```

```js
document.addEventListener('ilife:menu-select', (e) => {
  const { id, value, checked } = e.detail;   // 面板已关、焦点已还给触发键
  if (id === 'menu-copy' && value === 'markdown') copyAsMarkdown();
});
```

## 入参（`PopoverMenuInput`）
| 字段 | 类型 | 缺省 | 说明 |
|---|---|---|---|
| `id` | `string` | 必填 | 菜单 `id`（`popovertarget` 指它）；同页唯一，只许标识符字符 |
| `trigger` | `string` | 必填 | 触发键上的字（记号 `▾` 组件补） |
| `items[]` | `PopoverMenuItem[]` | 必填 | 菜单项，至少一枚 |
| `items[].value` | `string` | 必填 | 机器值；菜单内唯一 |
| `items[].label` | `string` | 必填 | 主文字（许换行，不许 `…` 截断） |
| `items[].note` | `string` | — | 次文字（如「带标题与表格」） |
| `items[].shortcut` | `string` | — | 快捷键**字**（绑定归页面，组件不绑） |
| `items[].group` | `string` | — | 分组头：与上一项不同时出一行 |
| `items[].sep` | `boolean` | `false` | 这一项之前来一条发丝线 |
| `items[].kind` | `action`｜`check`｜`danger` | `action` | 档：普通／当前项打勾／危险项 |
| `items[].checked` | `boolean` | `false` | 只对 `kind=check` 有效（别的档给了报错） |
| `menuLabel` | `string` | `trigger` | 菜单的无障碍名（`aria-label`） |
| `align` | `start`｜`end` | `end` | 贴左／贴右 |
| `form` | `hug` | `hug` | 形态键（闭集外 → `BlocksError`） |
| `extraClass` | `string` | — | 附加类名 |

## 示例入参

本件**唯一一份**示例入参（皮肤矩阵判据拿它渲染本件、必须能**直接**渲染成功）：
`id` 只许**标识符字符**（字母／数字／下划线／连字符／汉字——它同时是面板 `id` 与触发键的 `popovertarget`）；
每一项的 `value` 菜单内唯一，`checked` **只对 `kind: "check"` 有效**。

<!-- 示例入参：皮肤矩阵判据拿它渲染本件，必须能直接渲染成功 -->
```json 示例入参
{
  "id": "menu-copy",
  "trigger": "复制为",
  "align": "end",
  "menuLabel": "复制成哪种格式",
  "items": [
    { "value": "text", "label": "纯文本", "group": "文字" },
    { "value": "markdown", "label": "Markdown", "note": "带标题与表格" },
    { "value": "csv", "label": "CSV", "group": "数据" },
    { "value": "md-view", "label": "按天", "kind": "check", "checked": true, "group": "排布" },
    { "value": "week", "label": "按周", "kind": "check" },
    { "value": "delete", "label": "删掉这一条", "kind": "danger", "sep": true }
  ]
}
```

**示例里不给 `shortcut`**：本件支持这个字段，但手机上它没有意义，而仓库那条「零键盘语汇」门只扫**用户看得见**的字——示例入参是要被渲染出来扫一遍的，所以示例里一律不写键盘记号（`⌘`／`⇧`／`Esc` 这类）。

记号 `▾` 由本件补，`trigger` 里不用写；分组头（`文字`／`数据`／`排布`）与发丝线（`sep`）都从项上的字段来。

## 标记契约（`data-*` ＋ 那两处 `style`）
| 位置 | 含义 |
|---|---|
| `data-ilife-popover-menu` | 容器发现锚（值＝菜单 `id`） |
| `data-ilife-menu-trigger` | 触发键：值＝菜单 `id` |
| `data-ilife-menu-panel` | 面板：值＝`end`／`start`（**降级路按它算贴哪边**） |
| `data-ilife-menu-item` | 一枚项：值＝机器值 |
| `data-ilife-menu-bound` | 运行时记账（幂等） |
| 触发键／面板上的 `style="anchor-name:--ilife-menu-<id>"` / `position-anchor:…` | **逐实例锚名**（静态 CSS 认不出逐实例名字，只能从 `id` 算，由标记写进 `style`） |

## 交互契约（`buildPopoverMenuJs()`）
| 动作 | 行为 |
|---|---|
| 点触发键 | **原生** `popovertarget` 开／关（本段不拦）；`aria-expanded` 跟着同步 |
| `Esc` / 点外面 | **原生**关；焦点还给触发键 |
| 打开时 | 焦点落到第一枚项；派发 `ilife:menu-toggle`（`phase:'open'`） |
| `↑`／`↓`／`Home`／`End` | 在项之间搬焦点（`Tab` 不拦） |
| 点／回车一枚项 | 派发 `ilife:menu-select` ＋ 关面板 ＋ 焦点还给触发键 |
| `kind=check` 的项 | 就地翻 `aria-checked`（同族只留一个勾） |
| 锚定 API 不可用 | 打开时按触发键矩形算 `left`／`top`，贴不下往上翻、左右夹进容器 |
| 重复注入 | 只绑一次（根上 `data-ilife-popover-menu-runtime`） |

事件（冒泡 `CustomEvent`）：
```ts
'ilife:menu-select' → { id, value, label, checked }
'ilife:menu-toggle' → { id, phase: 'open' | 'close' }
```

## 不变量（测试与真机都钉住）
1. **零脚本可开**：触发键带 `popovertarget`（脚本坏了菜单照样开得出来）。
2. **层次不靠投影**：全段**零 `box-shadow`**——2px 粗边 ＋ 3px 外圈晕 ＋ `popover` 的顶层。
3. **贴住且不越界**：390／1280 两档下面板都在容器内；贴不下时翻边（`flip-block` / `flip-inline`）。
4. **命中区 ≥44×44**，相邻两枚项留 8px 缝。
5. **零 DOM 的模块**／**加法式**／**各套皮肤下标记逐字节相同**。

## 常见错法（别这么干）
- ❌ 拿 `<div>` ＋ 手搓「点外面关」：漏一条就把用户关在菜单里 ⇒ 用原生 `popover`。
- ❌ 用 `@media (max-width:…)` 决定贴左还是贴右：那是**形态**，归 `align` 参数。
- ❌ 把面板钉死在一个绝对坐标上：贴不下时越界 ⇒ 走 `position-try-fallbacks` 翻边。
- ❌ 在菜单里塞输入框：菜单是「选一条」的地方，输入归表单。
- ❌ 让 `checked` 出现在 `kind='action'` 的项上：读的人分不清「当前项」还是「选中项」⇒ 本件报错。

## 相关
- 契约：`docs/base/base-render/公共组件契约.md`
- 同族：`dialog`／`drawer-sheet`／`tooltip`
- 契约测试：`packages/base-render/test/popover-menu.test.mjs`

# drawer-sheet · 底部弹层（形态 C 多选 ＋ 完成 N 项）

> 组件层「容器与浮层」族第二件。**不用它的页产物逐字节不变**。
> 落地路线与 `dialog` 同一条：**真 `<dialog>` ＋ `showModal()`**——多选弹层自己搓焦点锁与 `Esc` 必漏。

## 一句话
从一长串里**勾几个**，勾的过程随时看得见「勾了几个」，最后按一颗键收工。
骨架＝**抓手 ＋ 标题 ＋ 副语 ＋ 可滚的候选项清单 ＋ 钉住的脚条**（已选 N 个 ＋ 完成 N 项）。

## 什么时候用它 / 不用它
| 场景 | 用哪件 |
|---|---|
| 「从一组里挑一个／挑几个」——记账选账户、卡路里选餐别／选食物、大厨选份量、备忘录选分类 | **drawer-sheet** |
| 「页面里就地挑一个、不打断页面」 | `radio-cards`（单选卡组） |
| 「确认一件破坏性的事」 | `dialog` |
| 「贴着一颗键弹几条动作」 | `popover-menu` |

判据一句话：**候选很多、要在一屏里比** → 用它（弹层把纵轴全给你）；**候选两三个** → 卡片组就够。

## 快速上手

```js
import { renderDrawerSheet, renderDrawerOpener, drawerSheetCss, buildDrawerSheetJs } from 'base-paint/blocks';

const panel = renderDrawerSheet({
  id: 'dw-account',
  title: '这笔记到哪个账户',
  sub: '可多选',
  options: [
    { value: 'cmb', label: '招行储蓄卡', note: '常用', meta: '¥12,480.00' },
    { value: 'alipay', label: '支付宝', meta: '¥860.00' },
    { value: 'cash', label: '现金', meta: '—' },              // null ＝ 缺值（写成 —）
    { value: 'old', label: '已注销的卡', note: '卡已注销，记上去也对不上账', disabled: true },
  ],
  hint: '勾几个都行；一条记录可以同时算两个账户。',
  summary: '覆盖 7 条记录',
});   // doneLabel 缺省 '完成 {n} 项'（必须含 {n} 记号——键上的数是活的）
const trigger = renderDrawerOpener({ sheetId: 'dw-account', text: '选账户' });
```

```js
document.addEventListener('ilife:drawer-done', (e) => {
  const { id, values } = e.detail;   // 面板已关、焦点已归还
  if (id === 'dw-account') setAccounts(values);
});
document.addEventListener('ilife:drawer-change', (e) => {
  const { values, count } = e.detail;  // 每勾一下就报一次（预览联动用）
});
```

## 入参（`DrawerSheetInput`）
| 字段 | 类型 | 缺省 | 说明 |
|---|---|---|---|
| `id` | `string` | 必填 | 面板 `id`；同页唯一，只许标识符字符 |
| `title` | `string` | 必填 | 标题（`aria-labelledby` 指它） |
| `options[]` | `DrawerOption[]` | 必填 | 候选项；**空数组＝设计过的空态**（出 `emptyLine`） |
| `options[].value` | `string` | 必填 | 机器值；面板内唯一 |
| `options[].label` | `string` | 必填 | 主文字（许换行，不许 `…` 截断） |
| `options[].note` | `string` | — | 次文字（如「7 条里 3 条像餐费」）；**禁用项必须给**（说明为什么按不动） |
| `options[].meta` | `string \| null` | — | 右端读数位；`null` ＝ 缺值（写成 `—`） |
| `options[].checked` | `boolean` | `false` | 开面板时就勾上 |
| `options[].disabled` | `boolean` | `false` | 按不动（必须同时给 `note`，否则 `BlocksError`） |
| `sub` | `string` | — | 标题后那行副语（如「可多选」） |
| `emptyLine` | `string` | `这里还没有可选项` | 空态那句现成话 |
| `hint` | `string` | — | 清单尾部说明行 |
| `summary` | `string` | — | 脚条计数后的说明（如「覆盖 7 条记录」） |
| `doneLabel` | `string` | `完成 {n} 项` | 完成键模板，**必须含 `{n}`** |
| `edge` | `bottom`｜`side` | `bottom` | 贴底（底部弹层）／贴右（侧抽屉）——**形态参数，不是媒体查询** |
| `form` | `multi` | `multi` | 形态键（闭集外 → `BlocksError`） |
| `open` | `boolean` | `false` | 渲染时就打开（非模态；静态样张用） |
| `extraClass` | `string` | — | 附加类名 |

`renderDrawerOpener({ sheetId, text, label?, extraClass? })`：产触发键（焦点归还回路的另一头）。

## 示例入参

本件**唯一一份**示例入参（皮肤矩阵判据拿它渲染本件、必须能**直接**渲染成功）：
`id` 只许**标识符字符**（字母／数字／下划线／连字符／汉字）；`options[].value` 面板内唯一；
**禁用项必须同时给 `note`**（说不出为什么按不动＝拒）；`doneLabel` 必须含 `{n}` 记号。

<!-- 示例入参：皮肤矩阵判据拿它渲染本件，必须能直接渲染成功 -->
```json 示例入参
{
  "id": "dw-account",
  "title": "这笔记到哪个账户",
  "sub": "可多选",
  "options": [
    { "value": "cmb", "label": "招行储蓄卡", "note": "常用", "meta": "¥12,480.00", "checked": true },
    { "value": "alipay", "label": "支付宝", "meta": "¥860.00" },
    { "value": "cash", "label": "现金", "meta": null },
    { "value": "old", "label": "已注销的卡", "note": "卡已注销，记上去也对不上账", "disabled": true }
  ],
  "hint": "勾几个都行；一条记录可以同时算两个账户。",
  "summary": "覆盖 7 条记录",
  "doneLabel": "完成 {n} 项"
}
```

`meta: null` 是**缺值**（右端读数位写成 `—`）。

## 标记契约（`data-*`）
| 属性 | 含义 |
|---|---|
| `data-ilife-drawer-sheet` | 面板发现锚（值＝面板 `id`） |
| `data-ilife-drawer-open` | 触发键：值＝面板 `id` |
| `data-ilife-drawer-opt` | 一枚候选项：值＝机器值 |
| `data-ilife-drawer-done` / `-close` | 完成键／关闭键 |
| `data-ilife-drawer-count` | 计数位（运行期只改这一个数） |
| `data-ilife-drawer-template` | 完成键模板（含 `{n}`） |
| `data-ilife-drawer-note` / `-zero` | 两句脚注（`hidden` 切换显隐） |
| `data-ilife-drawer-bound` | 运行时记账（幂等） |

## 交互契约（`buildDrawerSheetJs()`）
| 动作 | 行为 |
|---|---|
| 点触发键 | `showModal()` ＋ 重画脚条（数、键上的字、可用档），派发 `ilife:drawer-open` |
| 勾／取消一项 | **一次全部重画**：计数、完成键的字与可用档、两句脚注的显隐 → 派发 `ilife:drawer-change` |
| 一个都没勾 | 完成键 `disabled`（`cursor:not-allowed`），脚条上写着「一个都没勾」 |
| 点完成键 | 派发 `ilife:drawer-done` ＋ 关面板（`reason='done'`） |
| 关闭键／点遮罩 | `reason='dismiss'`；`Esc` → `'esc'`；脚本关 → `'programmatic'` |
| 关闭之后 | 焦点回到按它的那颗按钮 |
| 重复注入 | 只绑一次（根上 `data-ilife-drawer-runtime`） |

事件（冒泡 `CustomEvent`）：
```ts
'ilife:drawer-open'   → { id, picked }
'ilife:drawer-change' → { id, values, count }
'ilife:drawer-done'   → { id, values }
'ilife:drawer-close'  → { id, reason, values }
```

## 不变量（测试与真机都钉住）
1. **清单滚、脚条不动**：高过视口时清单那一格滚，**完成键始终看得见**。
2. **窄档 16px 边距**：390 档面板左右各留 ≥16px；贴底档底边贴齐（这是「底部弹层」的形）。
3. **层次不靠投影**：全段**零 `box-shadow`**——2px 粗边 ＋ 3px 外圈晕 ＋ 46% 压暗的 `::backdrop`。
4. **候选项 ≥52px 高，相邻两行留 8px 缝**；关闭键与完成键 ≥44×44。
5. **空态是设计过的**：一项都没有时出 `emptyLine`，不留空壳。
6. **零 DOM 的模块**／**加法式**／**各套皮肤下标记逐字节相同**（同族其余件同一条）。

## 常见错法（别这么干）
- ❌ 拿一串 `window.prompt`／逐条确认顶事：7 条记录要点十几次。
- ❌ 自己搓 `<div>` 弹层管焦点：焦点锁与 `Esc` 手搓必漏。
- ❌ 把「完成」写成固定「确 定」：读的人不知道将写几条 ⇒ 用 `{n}` 模板（本件强制）。
- ❌ 拿 `@media (max-width:…)` 决定「贴底还是贴右」：视口宽 ≠ 组件宽（弹层会被嵌进侧栏）⇒ 用 `edge` 参数。
- ❌ 给禁用项不留理由：`disabled` 且没有 `note` 会被 `BlocksError` 拦下（这是故意的）。

## 相关
- 契约：`docs/base/base-render/公共组件契约.md`
- 同族：`dialog`／`popover-menu`／`tooltip`
- 契约测试：`packages/base-render/test/drawer-sheet.test.mjs`

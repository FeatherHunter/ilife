# task-list · 勾选清单

**一句话**：一条一行、**整行是命中区**（≥44 高）——`勾选框 ・ 名称 ……… 右侧读数`，组头与表头现数「勾了几样」。

## 何时用它（选型四条）

| 你要的 | 用 |
|---|---|
| 一行一条、要能勾，且勾了什么当场看得出来（划线 ＋ 实心框） | **本件** |
| 只是读一串行、不给勾 | `entry-rows`（明细行） |
| 多选一次、勾完再确认（批量改分类／批量改） | `multi-checks`（多选清单） |
| 一笔事有阶段（已还 3 期 / 本期待扣） | `status-row`（状态台账行） |

## 入参

| 字段 | 类型 | 缺省 | 说明 |
|---|---|---|---|
| `rows` | `TaskListRow[]` | 必填 | 清单逐行（**平铺**：归组靠每行的 `group`）；空数组且无 `absentLine` ⇒ 空串 |
| `rows[].key` | `string` | 必填 | 机器键（同页唯一；运行时按它派发与回写） |
| `rows[].label` | `string` | 必填 | 这一条是什么（`螺丝椒 250g`） |
| `rows[].group` | `string` | — | 组名（`已买`／`待买`）；不填的行归到"无组"那一档（不出组头） |
| `rows[].note` | `string` | — | 行下小字（`家里还有 5g，只买 10g`） |
| `rows[].amount` | `string` | — | 右侧读数（`¥6.5`）：等宽 ＋ 永不截断 |
| `rows[].done` | `boolean` | `false` | 初始勾选态（勾选后的事实住 `data-ilife-task-done`） |
| `rows[].disabled` | `boolean` | `false` | 锁定这一行（不许勾）：**必须同时给 `note`** 说明为什么 |
| `rows[].error` | `string` | — | 这一行没存上的错：写在框旁 ＋ `aria-describedby` 指过去 |
| `key` | `string` | `tasks` | 清单键（一页多张清单时用来分辨；事件里原样带回） |
| `title` | `string` | — | 清单标题（`买菜清单 · 今天 17:20`） |
| `progressLabel` | `string` | — | 整单进度里那个词（`已买`） |
| `progressUnit` | `string` | — | 整单进度里的量词（`样`） |
| `absentLine` | `string` | — | 空态那一句（`清单是空的`）：它是"没什么"，不是一行 |
| `foot` | `string \| string[]` | — | 脚注（`合计 ¥57.4`）：数组＝逐段一枚 |
| `busy` | `boolean` | `false` | 整单正在写：勾选被挡住、复选框回弹、不派发（`aria-busy="true"`） |
| `form` | `'checklist'` | `checklist` | 形态键（闭集；本件只落地形态 A「纯勾选 ＋ 组内进度」） |
| `extraClass` | `string` | — | 附加类名（空格分隔） |

## 契约与不变量

- **勾选态是唯一事实**：`data-ilife-task-done`（`1`＝已勾）。渲染按它出 `checked` 与 `is-done` 类，
  运行时只改它，页面读它——三处不许各存一份。
- **勾一下就重数**：表头与组头的计数节点（`data-ilife-task-counts`，格式恒为 `<done> / <total>`）
  与进度条（`scaleX`）当场刷新，页面上不留"数字不动"的中间态。
- **整行是命中区**（`<label>` ≥44 高）：真 `<input type=checkbox>` 隐身留在原地（可 Tab、可读屏、
  空格可勾），视觉框形是它的兄弟节点（`input:checked + .box`）。
- **忙态挡写**：`busy` 或页面把 `data-ilife-task-busy="1"` 打开时，勾选不落账、不派发，
  复选框回弹到 `data-ilife-task-done` 记着的态（界面不许显示一个没存上的勾）。
- **禁用要写清为什么**：`disabled` 为真的行必须给 `note`，否则 `badInput`——含糊地禁掉是不许留的中间档。
- **错态写在控件旁边**：`rows[].error` 渲染在勾选框下、并挂 `aria-describedby`（不只染色）。
- 事件是**冒泡**的 `CustomEvent ilife:task-toggle`，`detail = { list, key, label, group, done, doneCount, totalCount }`；
  运行时幂等（重复注入只绑一次）。
- 样式 scope 在 `.ilife-page-ui` 下、只经 `skinVar()` 读皮肤；只动 `transform`／`opacity`；
  `prefers-reduced-motion` 下过渡关掉、状态照落。
- 窄档由**容器**决定（`@container ilife-task-list`，断点 `TASK_LIST_NARROW_MAX_PX`＝420）。

## 常见错法

- 勾上只变个颜色（不换框形、不划线）⇒ 黑白打印与色盲下分不出勾没勾（本件：实心框 ＋ ✓ ＋ 划线）。
- 只让那 22×22 的框能点（触控目标 <44 且手指够不到）⇒ 整行必须是 `<label>`。
- 把「已买 5 / 11 样」写死在文案里（勾了数字不动）⇒ 计数交给运行时现数。
- 用 `click` 当勾选通路 ⇒ 键盘空格与读屏走的是 `change`，会漏掉一路。
- 禁用了却不说为什么 ⇒ 调用方必须补 `note`（本件在归一化期就拦）。
- 让页面自己维护一份勾选数组再重渲染整块 ⇒ 会和 `data-ilife-task-done` 走散；就地改它、从事件里取数。

# dialog · 对话框（形态 A 确认型）

> 组件层「容器与浮层」族第一件（`base-paint/blocks` 出手）。**不用它的页产物逐字节不变**；用了它的页才付它的样式与运行时字节。
> 落地路线＝**浏览器原生 `<dialog>` ＋ `showModal()`**：遮罩、焦点锁、`Esc`、背景 `inert`、顶层都是浏览器给的。

## 一句话
把「这一步要不要做」摆到页面正中间：**图标 ＋ 标题 ＋ 副语 ＋ 正文 ＋ 两条动作**（最后一条是主动作）。
关掉的时候焦点**回到按它的那颗按钮**——这一段是运行时兜的（原生通常已经还了，兜的是「落在 body／还给了别人」那一种）。

## 什么时候用它 / 不用它
| 场景 | 用哪件 |
|---|---|
| 「一件破坏性的事，做完不好撤，得先问一句」——覆盖确认、删记录、写库确认 | **dialog** |
| 「从一组里挑一个／挑几个，不打断页面」——选账户、选餐别、选分类 | `drawer-sheet` |
| 「贴着一颗键弹出几条动作」——复制格式、更多操作 | `popover-menu` |
| 「用户从头填一张表」——每字段一行标签＋输入框 | `renderParamForm`（表单优先） |

判据一句话：**这一步做完不好撤** → 用它；**只是想换个值** → 别用它（那不是确认，是挑选）。

## 快速上手（三段）

```js
// ① 服务端渲染（Node）：面板 ＋ 触发键各一次
import { renderDialog, renderDialogOpener } from 'base-paint/blocks';

const panel = renderDialog({
  id: 'dlg-overwrite',                       // 面板 id：触发键靠它找面板
  title: '覆盖今天的记录？',
  sub: '这一步做完不能撤销',
  body: ['今天已经有 2 条记录。继续会先把它们删掉，再写入新的 3 条。'],
  tone: 'danger',                            // plain | warn | danger（缺省 danger）
  actions: [                                 // 1～2 枚；**最后一枚是主动作**
    { label: '先不写', value: 'cancel' },
    { label: '覆盖', value: 'cover' },
  ],
});
const trigger = renderDialogOpener({ dialogId: 'dlg-overwrite', text: '写入今天' });
// → <dialog class="ilife-block-dialog is-confirm tone-danger" id="dlg-overwrite" data-ilife-dialog="dlg-overwrite" …>…</dialog>
//   <button class="ilife-block-dialog-opener" type="button" data-ilife-dialog-open="dlg-overwrite" …>写入今天</button>
```

```js
// ② 整页装配：样式段与运行时一并挂上（**只在这一页**）
import { renderDocShell } from 'base-paint/docShell';
const page = renderDocShell({ docTitle: '覆盖确认', bodyHtml, extraCss: panelCss + dialogCss() , … });
// 运行时段拼进共享 helpers 槽：buildDialogJs()
```

```js
// ③ 页面脚本：接自己的逻辑（不引入任何全局，纯 DOM 事件）
document.addEventListener('ilife:dialog-close', (e) => {
  const { id, reason, value } = e.detail;   // 面板已关、焦点已归还
  if (id === 'dlg-overwrite' && reason === 'action' && value === 'cover') writeInstead();
});
```

## 入参（`DialogInput`）
| 字段 | 类型 | 缺省 | 说明 |
|---|---|---|---|
| `id` | `string` | 必填 | 面板 `id`；同页唯一，**只许标识符字符**（它同时喂 `id=`／`aria-labelledby=`） |
| `title` | `string` | 必填 | 标题（`aria-labelledby` 指它） |
| `body` | `string \| string[]` | 必填 | 正文；串＝一段，数组＝逐段一枚 `<p>`（**滚的是这一格**） |
| `actions[]` | `DialogAction[]` | 必填 | 1～2 枚动作；**最后一枚是主动作** |
| `actions[].label` | `string` | 必填 | 键上的字（许换行，不许 `…` 截断） |
| `actions[].value` | `string` | 必填 | 机器值；面板内唯一，随 `ilife:dialog-close` 送出 |
| `sub` | `string` | — | 标题后那行副语（如「这一步做完不能撤销」） |
| `tone` | `plain`｜`warn`｜`danger` | `danger` | 语气：决定图标位与主动作的档 |
| `note` | `string` | — | 动作条上方的脚注小字 |
| `status` | `{ kind?: 'error'｜'busy'; text: string }` | — | 状态行：写在动作条上方，并挂进 `aria-describedby` |
| `form` | `confirm` | `confirm` | 形态键（闭集外的值 → `BlocksError`） |
| `open` | `boolean` | `false` | 渲染时就打开（**非模态**；静态样张／打印快照用） |
| `extraClass` | `string` | — | 附加类名（空格分隔，逐个过类名正则） |

`renderDialogOpener({ dialogId, text, label?, extraClass? })`：产那枚触发键（**焦点归还回路的另一头**）。

**入参违规一律抛 `BlocksError`**（不静默降级）：`id` 非法字符、`title` 空、`body` 空段、
`actions` 空／超过两枚／`value` 重、闭集外的 `tone`／`form`／`status.kind`——逐条都报。

## 标记契约（`data-*`；运行时与判据都只认这些名字）
| 属性 | 含义 |
|---|---|
| `data-ilife-dialog` | 面板的**发现锚**（值＝面板 `id`） |
| `data-ilife-dialog-open` | 触发键：值＝它开的面板 `id`（**焦点归还的锚**） |
| `data-ilife-dialog-act` | 动作键：值＝该动作的机器值 |
| `data-ilife-dialog-status` | 状态行档（`error`／`busy`） |
| `data-ilife-dialog-bound` | 运行时记账（幂等） |

## 交互契约（`buildDialogJs()`）
| 动作 | 行为 |
|---|---|
| 点触发键 | `showModal()`（老引擎退回 `open` 属性），派发 `ilife:dialog-open` |
| 点动作键 | `close(value)`；`detail.reason='action'`、`detail.value=机器值` |
| `Esc` | 原生关掉；`detail.reason='esc'` |
| 点遮罩 | 只在点落在**面板矩形之外**时关；`detail.reason='backdrop'` |
| 脚本 `close()` | `detail.reason='programmatic'` |
| 关闭之后 | 焦点回到**按它的那颗按钮**（触发键已不在文档里就不抢） |
| 重复注入 | 只绑一次（根上 `data-ilife-dialog-runtime`） |

事件（冒泡 `CustomEvent`）：
```ts
'ilife:dialog-open'  → { id, modal }
'ilife:dialog-close' → { id, reason, value }   // value 只有 reason='action' 才有，其余是 null
```

## 不变量（测试与真机都钉住）
1. **窄档不贴边**：390 档面板左右各留 ≥16px（宽 `min(344px, 100% - 32px)`）。
2. **高过视口内部滚**：正文那一格滚，**动作条始终看得见**（面板是 flex 竖列）。
3. **层次不靠投影**：全段**一条 `box-shadow` 都没有**——零阴影皮肤（小票纸／大字报刊）下靠
   **2px 粗边 ＋ 3px 外圈晕 ＋ 46% 压暗的 `::backdrop`** 三样读作「浮在上面」。
4. **命中区 ≥44×44**（动作键与触发键，全宽口径）；相邻命中区间距 ≥8px。
5. **零 DOM 的模块**：`dist/components/dialog/**` 的**代码**里没有 `document.`／`window.`／`navigator.`
   （DOM 只出现在产出的 JS 文本里）。
6. **加法式**：不用它 ⇒ 页产物逐字节不变；样式段与运行时都由页面 opt-in 注入。
7. **各套皮肤下标记逐字节相同**（皮肤只改取值）。

## 常见错法（别这么干）
- ❌ 拿 `window.confirm` 顶事：字符串拼不出要点、样式不可控、窄屏按钮位置随浏览器跑。
- ❌ 拿 `<div>` 叠 `z-index` 手搓模态：焦点锁、`Esc`、背景不可点，手搓必漏一条 ⇒ 键盘用户被锁在页面上。
- ❌ **把唯一一份信息放进对话框**：没有脚本时 `<dialog>` 不开（这是原生语义），那份信息等于没写 ⇒
  会读的那份留在正文里，对话框只是「再确认一次」。
- ❌ 给主动作挂 `autofocus`：破坏性动作不许吃回车。本件把焦点放在**第一枚动作**（通常是取消）。
- ❌ 用对话框做「挑选」：一页十几次确认。那件事归 `drawer-sheet`／`radio-cards`。

## 相关
- 契约：`docs/base/base-render/公共组件契约.md`（四条地基 ＋ 判据四类）
- 同族：`drawer-sheet`（底部弹层）／`popover-menu`（浮出菜单）／`tooltip`（气泡说明）
- 契约测试：`packages/base-render/test/dialog.test.mjs`（渲染／样式纪律／加法式／皮肤矩阵／真机两档）

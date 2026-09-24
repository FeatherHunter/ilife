# toast-card · 提示卡片

**一句话**：一件刚做完的事的回执（「写入 3 条」「没能写入」）——**另一件 toast**。它**不替代**冻结面那件 `renderToast`（住 `src/controls.ts`），两者**并存、各是一种样式**，由开发者按场景选用。

**这一件是重做件**（原型墙 3/3/3）。改掉的是什么：**深色盒子**那个骨架——它在暖纸与大字报刊两套语言里像外来户。现在的骨架只用**零阴影、零圆角下也成立**的三样立层次：`surface` 面 ＋ `line` 发丝线 ＋ **左侧一条语义色竖条**；层次不靠"浮起来"。三样一起给：**形**（左竖条 ＋ 图标底盘）＋**字**（标题与细节各司其职）＋**色**（语义色只当第三样）。

## 何时用它（选型三条）

| 你要的 | 用 |
|---|---|
| 刚做完一件事的回执（浮层、几秒后自己走、可带一个动词） | **本件** |
| 页内**常驻**的一块提示（不消失、可读第二遍） | 冻结的 `renderFeedbackBlock` / `blocks.staticNotice` |
| 老页面既有的那套「深色毛玻璃卡 ＋ ✓ 知道了」 | 冻结的 `renderToast`（**一字未改，照旧可用**） |

**两件并存的意思**：本件不是 `renderToast` 的下一版，也不是它的封装——它的类名面（`ilife-block-toast-card-*`）、入参面、运行时段都是自己一套。同一页可以只用其中一件，也可以各用各的（两件的类名零交集）。

## 入参

| 字段 | 类型 | 缺省 | 说明 |
|---|---|---|---|
| `title` | `string` | 必填 | 标题：这条提示**做完了什么**（「写入 3 条」）。**非空**（只有空白字符也拒） |
| `tone` | `'ok' \| 'warn' \| 'danger'` | `'ok'` | 语气档（闭集，闭集外一律 `badInput`）：竖条粗细（3／4／6px）＋ 图标字形（✓／!／✕）＋ 语气字（已完成／请注意／没成功）＋ `role` 都由它算 |
| `detail` | `string` | — | 一句细节（写进哪儿了／出了什么事）。**`danger` 档必填** |
| `action` | `ToastCardAction` | — | **至多一枚**动作键；不给＝只有「关闭」一条出口。给数组一律 `badInput` |
| `closeLabel` | `string` | `'关闭这条提示'` | 关闭键的**可读名字**（走 `aria-label`） |
| `durationMs` | `number` | `4000` | 自动消失的时长：只许 `3000`～`5000`（3–5 秒）。要更久就让用户点关闭 |
| `extraClass` | `string` | — | 附加类名（空格分隔，逐个过类名正则） |

**动作键（`action`）的字段**：

| 字段 | 类型 | 缺省 | 说明 |
|---|---|---|---|
| `id` | `string` | 必填 | 动作名：小写字母开头，小写字母／数字／横线。事件里原样回给调用方 |
| `label` | `string` | 必填 | 键面上的**动词**（「撤销」／「看详情」）：它同时是这枚键的可读名字 |

**堆栈（`renderToastCardStack`）的入参**：

| 字段 | 类型 | 缺省 | 说明 |
|---|---|---|---|
| `max` | `number` | `3` | 同一时刻最多堆几条：1～3；第 N+1 条来时挤掉最旧的一条 |
| `extraClass` | `string` | — | 附加类名（空格分隔，逐个过类名正则） |

## 契约与不变量（判据逐条断）

1. **状态不只靠色**：语气档同时给**竖条粗细**（`TOAST_CARD_TONE_RULES`：3／4／6px）＋ **图标字形**（`TOAST_CARD_TONE_GLYPHS`：✓／!／✕）＋ **语气字**（`TOAST_CARD_TONE_WORDS`：已完成／请注意／没成功）。把三档色压成同一个墨黑（大字报刊的强调色就是墨黑），三档照样分得开。
2. **结构固定**：`图标 ＋ 标题 ＋ 一句细节 ＋ 至多一个动作 ＋ 关闭`。动作写**动词**；「至多一个」由入参面守住（`action` 是一个对象，给数组即抛）。
3. **危险档必须说得清**：`tone: 'danger'` 而不给 `detail` ⇒ `badInput`。
4. **自动消失有时限**：缺省 4 秒、可配 3–5 秒（`TOAST_CARD_DEFAULT_MS`／`_MIN_MS`／`_MAX_MS`）；超范围的 `durationMs` 一律拒。**落点**：关键信息（写库失败这类）**不许只活在这条会自动消失的提示里**——它必须同时写在页面上一个常驻的位置（错误行／台账行），提示只是那件事的回执。
5. **最多堆 3 条**：`TOAST_CARD_MAX_STACK`；第 4 条来时挤掉**最旧的一条**（DOM 顺序即先后）。
6. **拖得住**：指针停在这条上、或键盘焦点落在里面 ⇒ **停表**（`TOAST_CARD_PAUSED_ATTR`）；移开／焦点离开后**重新计满**。WCAG 2.2.1：自动消失的内容要能被用户拖住再读一遍。
7. **零投影、零圆角也立得住**：样式段里不出现 `box-shadow`；层次只用面／发丝线／竖条／字重字级。
8. **样式只经 `skinVar()`**：不写手抄的 `var(--ilife-…)`、不写 `:root`／`!important`、不新增 token 名；全部规则 scope 在 `.<prefix>page-ui` 之下（**一条选择器里 scope 只出现一次**）；宽度只判容器（`@container` ＋ `container-type: inline-size`），媒体查询只判设备能力（`hover`／`pointer`／`prefers-reduced-motion`）。
9. **位置与宽度归页面**：本件**不写 `position`**（浮在底部还是右下角、贴哪个面板，是页面的决定）；堆栈是普通流内区块，所以量得准的是「件的宽度」而不是视口。**宿主给的宽度别超过 ~480px**：提示这类内容铺满 1280px 时，正文在最左、动作键在最右，中间一整片空——那是宿主的宽度问题，不是本件的（本件在窄档会把动作排落到第二行，不会挤字）。
10. **加法式**：不调 `toastCardCss()`／`buildToastCardJs()` 的页，产物**逐字节不变**；标记里不带皮肤类（`ilife-skin-`），换皮只换取值。
11. **零 DOM 在模块里**：`render.ts` 是纯函数产 HTML 字符串；`runtime.ts` 只**产出 JS 文本**——`dist/components/toast-card/**` 剥掉字面量与注释后不出现 `document.`／`window.`／`navigator.`。

## 无障碍口径（判据按它断）

- **`role`**：普通两档 `role="status"`；**危险档 `role="alert"`**（`TOAST_CARD_TONE_ROLES`，由 `tone` 算，调用方不许给）。
- **`aria-live`**：`polite`／危险档 `assertive`（`TOAST_CARD_TONE_LIVE`，同样显式写在标记上）。**live region 挂在每条提示自己身上**，堆栈容器不挂——挂在容器上会让一条提示被念两遍。
- **可读名字**：关闭键有 `aria-label`（缺省「关闭这条提示」），键面上的 `×` 是 `aria-hidden` 的装饰；动作键的名字就是键面上的动词。图标位的字形同样是装饰（`aria-hidden`），语气由**语气字**承担——屏读器读到的是「已完成 写入 3 条」，不是「✓ 写入 3 条」。
- **命中盒**：动作键与关闭键都不小于 `TOAST_CARD_TOUCH_PX`（44px）；`:focus-visible` 给 2px 可见描边。
- **不许 `…` 截断关键语义**：标题与细节都换行（`overflow-wrap: anywhere`），不写 `text-overflow`。

## 运行时契约（`buildToastCardJs()`）

| 事项 | 口径 |
|---|---|
| 安装 | 经典 script（不是模块）；装一次（`documentElement` 上的 `TOAST_CARD_RUNTIME_ATTR` 记号），重复注入是 no-op |
| 绑定 | 初始全扫一遍 ＋ `MutationObserver` 守后来 append 进来的（每条只绑一次：`TOAST_CARD_BOUND_ATTR`） |
| 计时 | 每条按自己的 `TOAST_CARD_DURATION_ATTR` 独立计时；到点**真删**（不是留个隐形壳） |
| 拖住 | `mouseover`／`focusin` 停表并留 `TOAST_CARD_PAUSED_ATTR`；`mouseout`／`focusout` 重新计满 |
| 容量 | 堆栈（或提示的父节点）上的 `TOAST_CARD_MAX_ATTR`；只认 ≤ 3；挤掉最旧的一条 |
| 动作 | 动作键按一下 → 派发 `TOAST_CARD_EVENT_ACTION`（冒泡，`detail = { action, tone }`）→ 这条提示自己走 |
| 关闭 | 关闭键按一下 → 这条提示立刻走 |
| 降级 | 这段不跑时提示照常可读（语气字、标题、细节、两枚原生按钮都在标记里），只是不会自己走、也不挤容量 |

```js
import { renderToastCard, renderToastCardStack, toastCardCss, buildToastCardJs, TOAST_CARD_EVENT_ACTION } from 'base-paint/blocks';
// ① 挂样式（opt-in）；② 把 buildToastCardJs() 拼进页面的共享 helpers 槽
// ③ 放一个宿主，把提示往里 append：
//    <div id="toasts">renderToastCardStack()</div>
//    toasts.insertAdjacentHTML('beforeend', renderToastCard({ title: '写入 3 条', detail: '记账与备忘已写进「九月」多维表。', action: { id: 'undo', label: '撤销' } }));
// ④ 监听动作：
//    document.addEventListener(TOAST_CARD_EVENT_ACTION, (e) => {
//      if (e.detail.action === 'undo') undo();
//    });
```

## 常见错法

- **把关键信息只放进会自动消失的提示**（「写库失败」只活在 toast 里）——提示只是回执，失败必须同时写在页面上的常驻位置（错误行／台账行）；本件在 `danger` 档用「必须给 `detail`」把这条往前推了一步，但**落点仍要页面自己给**。
- **语气只染一个色**——换到零阴影、强调色是墨黑的皮肤，读者读不出这是成功还是失败；本件靠竖条粗细 ＋ 字形 ＋ 语气字三样。
- **用深色盒子加投影把它"抬"起来**——小票纸与大字报刊的投影是 `none`，一换皮就塌。
- **把 `position: fixed` 写进本件**——那会让宽度听视口而不是听容器（件会被嵌进侧栏／面板／卡片），也会让「两档几何」量错东西；浮在哪交给页面的宿主。
- **一条提示里塞两个动作**——「至多一个」是本件的形态约束；要两个入口，请把它们放回页面上。
- **把 `durationMs` 调成 30 秒**——不许：要更久就让用户点关闭，或者把这条信息搬到常驻位置。
- **给本件再配一套图标字形表**——语气字形住 `TOAST_CARD_TONE_GLYPHS`（唯一出处），别在页面里另抄一份。

## 关系

- 用在哪：六个技能里「刚做完一件事」的回执（记账写入、同步完成、导入结果）。
- 与冻结的 `renderToast` **并存**：老页面照旧走那一件，一个字没动；新页面按场景选用。
- 样式由页面按需挂 `toastCardCss()`；运行时段由页面拼进共享 helpers 槽（加法式：不挂＝零命中）。

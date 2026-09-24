# tooltip · 气泡说明（形态 B 宽气泡 · 带「为什么重要」）

> 组件层「容器与浮层」族第四件。**不用它的页产物逐字节不变**。
> 落地路线＝**`popover` 属性**：`Esc` 关、点外面关、顶层都是浏览器给的，**脚本坏了也点得开**。

## 一句话
正文里那个**看不懂的词**后面补一句解释——点它／聚焦它／悬停它，弹出一条**宽气泡**：
眉标（口径／字段说明）＋ 小标题 ＋ 解释 ＋ **「为什么重要」那一段**。

## 什么时候用它 / 不用它
| 场景 | 用哪件 |
|---|---|
| 「给一个词补一句口径解释」——周均摄入、均摊、缺值 | **tooltip** |
| 「一页统一交代口径」 | `page-head` 的口径行 |
| 「贴着一颗键弹几条动作」 | `popover-menu`（那是动作，不是说明） |
| 「这一段本身是正文的一部分」 | 直接写进正文（别藏进气泡） |

判据一句话：**不点也不影响把话读完、点了能少一次误读** → 用它；**不点就读不懂** → 那句话该写在正文里。

## 快速上手

```js
import { renderTooltip, tooltipCss, buildTooltipJs } from 'base-paint/blocks';

const tip = renderTooltip({
  id: 'tip-share',
  word: '均摊',
  title: '「均摊」是怎么算的',
  text: '一笔年费按 12 个月摊开，每月只进 20 元，不是把 240 元整笔压在买的那一个月。',
  why: '不这么算，月度对比会把「年费那个月」当成失控的月份。',
  badge: 'caliber',        // caliber（口径）｜field（字段说明）
});
// → <span class="ilife-block-tooltip is-wide" data-ilife-tooltip="tip-share">
//     <button … popovertarget="tip-share" aria-describedby="tip-share" …>均摊<i aria-hidden="true">?</i></button>
//     <span … popover="auto" role="tooltip">…</span></span>
```

三条通路都在：**点击**（原生 `popovertarget`）／**聚焦**（键盘）／**悬停**（细指针设备）。

## 入参（`TooltipInput`）
| 字段 | 类型 | 缺省 | 说明 |
|---|---|---|---|
| `id` | `string` | 必填 | 气泡 `id`（`popovertarget`／`aria-describedby` 指它）；同页唯一，只许标识符字符 |
| `word` | `string` | 必填 | 被解释的那个词（页面正文里那两个字） |
| `title` | `string` | 必填 | 小标题（如「「均摊」是怎么算的」） |
| `text` | `string` | 必填 | 解释那一段 |
| `why` | `string` | 必填 | 「为什么重要」：不这么算会读错什么——**形态 B 的识别特征** |
| `badge` | `caliber`｜`field` | `caliber` | 眉标档（闭集外 → `BlocksError`） |
| `badgeText` | `string` | 按 `badge` 档取现成话 | 眉标上的字 |
| `hint` | `string` | `Esc 关掉` | 关掉的提示；**给空串＝不出这一格** |
| `form` | `wide` | `wide` | 形态键（闭集外 → `BlocksError`） |
| `extraClass` | `string` | — | 附加类名 |

## 标记契约（`data-*` ＋ 那两处 `style`）
| 位置 | 含义 |
|---|---|
| `data-ilife-tooltip` | 容器发现锚（值＝气泡 `id`） |
| `data-ilife-tooltip-word` | 那个词：值＝气泡 `id` |
| `data-ilife-tooltip-bubble` | 气泡：值＝气泡 `id` |
| `data-ilife-tooltip-bound` | 运行时记账（幂等） |
| 词／气泡上的 `style="anchor-name:--ilife-tooltip-<id>"` / `position-anchor:…` | **逐实例锚名**（从 `id` 算，标记写进 `style`） |

## 交互契约（`buildTooltipJs()`）
| 动作 | 行为 |
|---|---|
| 点那个词 | **原生** `popovertarget` 开／关（本段不拦） |
| 聚焦那个词／`Tab` 走过去 | 打开（**键盘通路**） |
| 悬停那个词 | 打开（**只在 `hover:hover` 的设备上**；打开**不移动焦点**） |
| 指针／焦点离开 | 延 140ms 收；落进气泡里就撤掉这次收（气泡可以读、可以滚） |
| `Esc` / 点外面 | **原生**关；焦点原地不动 |
| 锚定 API 不可用 | 打开时按词的位置算 `top`（贴不下翻到词上方）；横轴与宽度归 CSS |

## 不变量（测试与真机都钉住）
1. **命中盒 ≥44×44**：词在行里不撑行，命中盒由一圈**看不见的** `::after`（`inset:-12px -8px`）撑出来
   ——真机判据用 `elementFromPoint` 在词中心上下各 21px 处量到它。
2. **宽气泡不越界**：横轴夹在容器里（`left: max(12px, calc(50% - 280px))`、
   `width: min(560px, 100% - 24px)`），390 档也读得全。
3. **层次不靠投影**：全段**零 `box-shadow`**——2px 粗边 ＋ 3px 外圈晕 ＋ `popover` 的顶层。
4. **零脚本可开**／**零 DOM 的模块**／**加法式**／**三套皮肤下标记逐字节相同**。

## 常见错法（别这么干）
- ❌ 用 `title` 属性顶事：手机上根本弹不出来、样式不可控、一屏只给一行的纯文本。
- ❌ 只做悬停：触屏与键盘用户永远看不到 ⇒ 三条通路都要在（本件默认三条都开）。
- ❌ 把长句塞进气泡：气泡是**补一句**，不是承载正文 ⇒ 太长就写进正文或改用具名的小节。
- ❌ 让气泡吃掉焦点（`autofocus`）：悬停打开时抢焦点＝把键盘用户的位置弄丢。
- ❌ 省掉「为什么重要」：那一段正是这一形态被选中的理由（读的人拿不到新信息）⇒ 本件必填。

## 相关
- 契约：`docs/base/base-render/公共组件契约.md`
- 同族：`dialog`／`drawer-sheet`／`popover-menu`
- 契约测试：`packages/base-render/test/tooltip.test.mjs`

# calendar-month · 月历格

**一格一天、七列一周**：最上面一排**星期表头**，每格自上而下是「日期（今天多一枚「今」字）／
当天读数（缺值写 `—`）／底部一条小柱」。小柱的高度与深浅一起随档位变 ⇒ 扫一眼就知道
**哪几天多、哪几天少**；今天靠**墨圈 ＋「今」字**认出来（形与字两路，不只靠颜色）。
出处＝原型墙 `.scratch/ui-组件墙/parts-05-时间与分组.mjs` 的形态 A（2026-09 用户裁定）。

## 什么时候用它

| 你要的 | 用谁 |
|---|---|
| 一个月里**每天的量和分布**（记账日支出、卡路里日摄入、心愿排期） | **本件** `renderCalendarMonth` |
| 一排格只说**哪天有／哪天没有**（7～14 天窗口，值进格） | `renderPunchStrip` |
| 一列账：**标签 → 值**，行数不定（整窗逐日） | `renderLedgerRows` |
| 一条轨：**值／目标**的比例形状 | `renderScaleBar` |

## 用法

```js
import { renderCalendarMonth, calendarMonthCss } from 'base-paint/blocks';

renderCalendarMonth({
  title: '2026 年 5 月',
  use: '记账 · 每日支出',            // 不给＝不出
  summary: { label: '本月合计', value: '¥12,340' },   // 不给＝不出
  cells: [                            // **必须是 7 的倍数**（一周七格，按行排满）
    null, null, null, null,           // 月首空位：显式给 null（本件不替你推算星期）
    { day: '1', value: '¥128', level: 1 },
    { day: '2', value: '¥46', level: 0 },
    { day: '3', value: null },        // 缺值 ⇒ 格内写 `—`、档位压到 0（**不是 0 元**）
    ...
    { day: '14', value: '¥92', level: 1, today: true },
  ],
  legend: [{ level: 1, label: '≤¥100' }, { level: 4, label: '>¥900' }],  // 不给＝不出
  note: '今天 14 日 · 3 笔 · ¥92',   // 不给＝不出
});
calendarMonthCss();                   // 样式段（页面自己按需注入；不挂＝零命中）
```

| 入参 | 类型 | 必填 | 说明 |
|---|---|---|---|
| `title` | `string` | ✅ | 月份标题（不截断，长了换行） |
| `cells` | `(CalendarMonthDayInput \| null)[]` | ✅ | 逐格；长度是 7 的倍数、最多 6 行；`null`＝空位 |
| `cells[].day` | `string` | ✅ | 格里的日期字（如 `14`） |
| `cells[].value` | `string \| null` | ✅ | 当天读数（**已是给人看的样子**）；缺值**必须显式给 `null`**（写成 `—`；整个键省掉＝错） |
| `cells[].level` | `0 \| 1 \| 2 \| 3 \| 4` | — | 深浅档，缺省 `0`；`value` 为 `null` 时一律按 `0` |
| `cells[].today` | `boolean` | — | 今天那一格（墨圈＋「今」字）；一个月至多一格 |
| `use` | `string` | — | 用途说明（如「记账 · 每日支出」） |
| `weekdays` | `string[]`（恰好 7 枚） | — | 星期表头；缺省周一至周日 |
| `summary` | `{ label, value }` | — | 头部右端合计位 |
| `legend` | `{ level, label }[]` | — | 深浅图例（0 条＝不出） |
| `note` | `string` | — | 脚注（弱文字，可很长、能换行） |
| `form` | `'grid'` | — | 形态键（闭集，本件只有这一格） |
| `extraClass` | `string` | — | 附加类名（空格分隔、逐个过类名正则） |

## 示例入参

本件**唯一一份**示例入参（皮肤矩阵判据拿它渲染本件、必须能**直接**渲染成功）：
`cells` 的长度必须是 7 的倍数（一周七格、最多 6 行），空位显式给 `null`——2026 年 5 月 1 日是周五，
故月首排 4 格空位，`4 ＋ 31 ＝ 35` 格正好 5 行。

<!-- 示例入参：皮肤矩阵判据拿它渲染本件，必须能直接渲染成功 -->
```json 示例入参
{
  "title": "2026 年 5 月",
  "use": "记账 · 每日支出",
  "summary": { "label": "本月合计", "value": "¥8,546" },
  "cells": [
    null, null, null, null,
    { "day": "1", "value": "¥128", "level": 2 },
    { "day": "2", "value": "¥46", "level": 1 },
    { "day": "3", "value": null },
    { "day": "4", "value": "¥312", "level": 2 },
    { "day": "5", "value": "¥88", "level": 1 },
    { "day": "6", "value": "¥1,240", "level": 4 },
    { "day": "7", "value": "¥205", "level": 2 },
    { "day": "8", "value": "¥64", "level": 1 },
    { "day": "9", "value": null },
    { "day": "10", "value": "¥158", "level": 2 },
    { "day": "11", "value": "¥620", "level": 3 },
    { "day": "12", "value": "¥92", "level": 1 },
    { "day": "13", "value": "¥76", "level": 1 },
    { "day": "14", "value": "¥92", "level": 1, "today": true },
    { "day": "15", "value": "¥430", "level": 2 },
    { "day": "16", "value": "¥58", "level": 1 },
    { "day": "17", "value": null },
    { "day": "18", "value": "¥214", "level": 2 },
    { "day": "19", "value": "¥1,860", "level": 4 },
    { "day": "20", "value": "¥132", "level": 2 },
    { "day": "21", "value": "¥88", "level": 1 },
    { "day": "22", "value": "¥46", "level": 1 },
    { "day": "23", "value": "¥305", "level": 2 },
    { "day": "24", "value": "¥118", "level": 2 },
    { "day": "25", "value": null },
    { "day": "26", "value": "¥540", "level": 3 },
    { "day": "27", "value": "¥96", "level": 1 },
    { "day": "28", "value": "¥72", "level": 1 },
    { "day": "29", "value": "¥260", "level": 2 },
    { "day": "30", "value": "¥1,120", "level": 4 },
    { "day": "31", "value": "¥86", "level": 1 }
  ],
  "legend": [{ "level": 1, "label": "≤¥100" }, { "level": 4, "label": ">¥900" }],
  "note": "今天 14 日 · 3 笔 · ¥92"
}
```

那 4 格 `null` 是**月首空位**（本件不替你推算星期）；3 日、9 日、17 日、25 日那四格 `value: null` 是**当天没记**
（写成 `—`、档位压到 0——不是"那天花了 0 元"）。一个月里 `today: true` 至多一格。

档位与图例是同一套口径：`≤¥100` → 1、`¥101–500` → 2、`¥501–900` → 3、`>¥900` → 4（图例只列头尾两档）；
`summary.value` 是那 27 天的合计，与逐格读数对得上。

## 契约与不变量

- **零 DOM**：只产标记，无脚本、无内联事件；样式只走 `calendarMonthCss()`。
- **缺值不写 0**：`value: null` ⇒ 格内 `—`、档位压到 0。`0` 是"那天花了 0 元"，两者不是一回事。
- **格盘必须排满**：长度非 7 的倍数、或超过 6 行 ⇒ `badInput`（错位一格会被读成另一天）。
- **七列是份数**：`repeat(7, minmax(0,1fr))` ⇒ 总宽恒等于容器宽，390 档**不横滑**；读数**换行不截断**。
- **深浅从 token 算**：五档＝`color-mix(in srgb, accent N%, surface-2)`，不写死颜色 ⇒ 各套皮肤（含强调＝墨黑）下都是同一条"浅 → 深"。
- **本件是自己的容器**（`container-type: inline-size`）：给它一个**确定的宽度**（块级流、grid 轨道，或 flex 里带 `flex-basis`）；不要在 shrink-to-fit 的 flex 项里用 `auto` 宽度，那会被 inline-size containment 收成 0。
- 值位只吃"已经是给人看的样子"的串（取整、千分位、单位口径归调用方），与全层同口径。**金额请给短形**（如 `¥1.2k`）——本件不替你缩略数字。

## 常见错法

- 拿它当**日历控件**用：本件是读数形状，不含选中／翻月／点选某天（那些是交互件）。
- 缺值写成 `'0'`：读的人会以为那天真的花了 0 元 ⇒ 给 `null`。
- 只给 30 格排 5 行零 2 列：格盘会错位（第 31 天落到下一行第 1 格）⇒ 空位给 `null` 排满 35／42 格。
- 拿它画**单点趋势**：31 天生图表用图表；本件讲的是"分布"。
- 一个月里放两枚 `today: true`：一页只该有一个"今天"。

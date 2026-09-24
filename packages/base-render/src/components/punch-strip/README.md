# punch-strip · 打孔格带

**一格一天**：日期在上、格在下；那天有数就**填深色、值写在盒里**，缺数留空心盒；
"当前正在细看的那天"套一圈朱红描边（一页至多一格）。出处＝原型 `.scratch/diet-ui-proto/v2-小票.html`
的 `.punch` 一族（用户点名那件「这 7 天」控件），"像纸边的打孔"。

## 什么时候用它

| 你要的 | 用谁 |
|---|---|
| 一排格：**哪天有、哪天没有**，值进格（7 天／14 天窗口的日级读数） | **本件** `renderPunchStrip` |
| 一列账：**标签 → 值**，行数不定（整窗逐日、30 天窗口） | `renderLedgerRows` |
| 一条轨：**值／目标**的比例形状 | `renderScaleBar` |
| 一行提要：**哪几天有记录**（日期＋圆点＋值，带一行事实） | `renderDayStrip`（根出口，`page-bars`） |

## 用法

```js
import { renderPunchStrip } from 'base-paint/blocks';

renderPunchStrip({
  heading: '这 7 天',                       // 小标题（不给＝不出）；字距由样式段统一
  days: [                                   // 顺序＝时间顺序；0 格＝空串
    { label: '09-17', value: null },                        // 缺数 ⇒ 空心盒 ＋ `—`
    { label: '09-18', value: '1500' },
    { label: '09-23', value: '860', selected: true },       // 正在细看的那天 ⇒ 朱红描边
  ],
});
```

| 入参 | 类型 | 必填 | 说明 |
|---|---|---|---|
| `days` | `PunchCellInput[]` | ✅ | 一格一天；**最多 `PUNCH_STRIP_MAX_CELLS`（14）格**，0 格＝空串 |
| `days[].label` | `string` | ✅ | 格上那串（如 `09-17`） |
| `days[].value` | `string \| null` | ✅ | 那天的读数（**已是给人看的样子**）；`null`＝缺数 |
| `days[].selected` | `boolean` | — | 朱红描边；一页至多一格 |
| `heading` | `string` | — | 小标题（如「这 7 天」）；不给＝不出 |
| `emptyMark` | `string` | — | 缺数格里的占位，缺省 `—`（全仓"缺数一律写 —"）；给空串＝空格（原型缺数格就是空的） |
| `extraClass` | `string` | — | 附加类名（空格分隔） |

## 契约与不变量

- **零 DOM**：只产标记，无脚本、无内联事件；样式只走 `punchStripCss()`（本族由 `sheetCss()` 一并挂）。
- **份数宽**：格宽是 `flex: 1 1 0` ⇒ 总宽恒等于容器宽，**不横滑**（390 档无横滚；`is-on` 与空心盒同盒模型）。
- **数字走等宽**：日期位与盒内小字用 `PAPER_MONO_STACK`（原型 `.punch .d`／`.b.on` 同款）。
- **一页至多一格 `selected`**：它是"这一格是这一页正在细看的那天"，不是多选。
- 值位只吃"已经是给人看的样子"的串（取整与单位口径归调用方），与本族其余四件同口径。

## 常见错法

- 拿它当**表格**用：>14 天还排格子 ⇒ 格窄到读不出值（本件直接 `badInput` 顶回去）——那种情况用 `renderLedgerRows`。
- 拿它讲**比例**：格子填不填只讲"那天有没有数"，不表达"离目标多远"——比例用 `renderScaleBar`。
- 一个页面上放**两条**格带：同一页两个"最近 N 天"会让人分不清哪条是哪个窗口。

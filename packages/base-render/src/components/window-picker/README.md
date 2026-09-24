# window-picker · 窗口选择器（形态 A）

> 一件自足的公共组件：`attrs.ts`（标记契约）／`model.ts`（入参校验）／`render.ts`（纯函数产标记）／
> `style.ts`（唯一样式来源）／`runtime.ts`（产出 JS 文本）／`index.ts`（出口）。

## 何时用

整页读数要按「一段时间」重算时用它：六个技能的每一页都有这一件（今天／本周／本月／自定义）。

它替掉的三种错法：

1. **只在下拉里写「本月」**——读的人分不出是从 1 号算还是从今天往前推 30 天；
   本件把**起止两个日期与天数**摆在页上（窗口是一整页的口径，必须看得见）；
2. **天数写死**——本件按两个日期算含头含尾的天数（今天到今天 ＝ 1 天），手改起止就跟着变；
3. **窗口是编的**——渲染期算不出来时（没给 `today`）起止留空、天数写 `—`，由运行时按浏览器当天补上，
   **不编一个看着像真的日子**。

**不要**用它做这三件事：与页面读数无关的纯日期输入（用 `date-range`）、按词找（`search-field`）、
多选筛属性（`filter-chips`）。

## 入参

```ts
renderWindowPicker({
  name: 'main',                     // 必填：机器键（事件 detail.name 按它定位）
  form: 'A',                        // 形态键；本件只有 A
  label: '窗口',                     // 档位那一组的 aria-label
  presets: [                        // 缺省：今日(1)／本周(7)／近 30 天(30)／自定义
    { value: 'today', label: '今日', days: 1 },
    { value: 'week', label: '本周', days: 7 },
    { value: 'month', label: '近 30 天', days: 30 },
    { value: 'q3', label: '第三季度', from: '2026-07-01', to: '2026-09-30' },  // 固定起止
  ],
  preset: 'week',                   // 初始档（必须在 presets 里；缺省第一档）
  from: undefined, to: undefined,   // 给了起止就用它；此时没给 preset 会自动落到「自定义」
  today: '2026-09-25',              // 今天（给了就完全确定；不给＝运行时按浏览器当天算）
  loadingText: '正在换…',
  error: undefined, loading: false, disabled: false, extraClass: undefined,
})
```

- 档位两条路：`days`（最近 N 天，到今天）**或** `from`＋`to`（固定起止）——二选一，给了别的就抛 `bad-input`。
- `custom`（自定义）是**内置档**：起止被手改时窗口就落到它头上，调用方不必自己给。
- `presets` 里若没有 `custom`，本件会补一档。

## 契约

| 名字 | 落点 | 意思 |
|---|---|---|
| `data-ilife-window` / `-form` | 根 | 机器键／形态键（闭集 `['A']`） |
| `data-ilife-window-today` | 根 | 今天（渲染期给；运行时也读它，缺了才用浏览器当天） |
| `data-ilife-window-last` | 根 | 最近派发过的窗口（`from|to`）：同一个窗口不重复派发 |
| `data-ilife-window-loading="1"` / `-invalid="1"` / `-disabled="1"` | 根 | 载入态／错态／禁用态 |
| `data-ilife-window-preset="<value>"` | 每个档 | 机器值（当前档住同一颗键上的 `aria-pressed`） |
| `data-ilife-window-preset-days` | 每个档 | 这一档的天数（运行时按它算起止） |
| `data-ilife-window-from` / `-to` | 两个日期输入 | 起止（`type="date"`，值恒 `YYYY-MM-DD`） |
| `data-ilife-window-days` | 天数格 | 含头含尾的天数（运行时写实） |
| `data-ilife-window-status` | 天数格 | `role="status"`（载入态原地换字） |
| `data-ilife-window-empty` / `-error` | 根内两行 | 空态句（窗口未定）／错态句 |

| 事件 | `detail` | 何时 |
|---|---|---|
| `ilife:window-change` | `{ name, preset, from, to, days }` | 窗口真的变了才派发（同一个窗口不重复） |
| `ilife:window-loading`（页面派发） | `{ name, on }` | 载入态开关 |

## 不变量

1. **天数是真的算出来的**：含头含尾（今天到今天 ＝ 1 天）；UTC 计算，不受时区／夏令时影响。
2. **手改起止 → 自动落到「自定义」档**：档位不许继续显示「本周」而窗口已经不是本周。
3. **错态不吞**：起止半截／不是真实存在的日期／结束日早于起始日 → 旁边写一句 ＋ `aria-invalid`，
   **不派发** change（不静默改用户填的窗口）；改回好窗口即自动消错。
4. **空态是设计过的**：起止都没填 → 天数 `—` ＋「窗口未定：先选一段」。
5. **窗口必须看得见**：起止与天数永远在页上（不藏进下拉、不靠 tooltip）。
6. **390 档零横向溢出**：档位折行；天数那一格不缩、不截断（关键语义）。
7. **触控目标 ≥44×44**（每个档、两个日期输入）；样式只读皮肤，选择器全在 `.ilife-page-ui` 之下。

## 常见错法

| 错法 | 后果 | 正解 |
|---|---|---|
| 档位给 `days` 又给 `from`／`to` | 抛 `bad-input` | 一条路：要么 `days`，要么固定起止 |
| 只给 `from` 不给 `to` | 抛 `bad-input` | 成对给（半个窗口读不出天数） |
| `today` 不给、又指望渲染期就有起止 | 起止留空、天数 `—`（运行时才补） | 要确定就给 `today`；要立刻可读就给成对起止 |
| 把「本月」写成 `days: 30` | 标签与窗口不一致（30 天 ≠ 本月） | 标签写「近 30 天」，或用固定起止 |
| 手改起止后自己改回档位标签 | 与运行的自动化打架 | 让运行时段落「自定义」（它自己会做） |

# check-row · 票据纸的对账行

浅绿卡 ＋ 圆点 ＋ 一句（如「编号 7、9 / 共 2 笔 / 异常：无」）。判地＝`proto/acct-goal/` 十三件的 `.check-mini`。

## 出口

| 名字 | 是什么 |
|---|---|
| `renderCheckRow(input)` | 产一条对账行（纯函数） |
| `normalizeCheckRow(input)` | 入参归一化（唯一入口） |
| `checkRowCss()` | 本件样式段（调用方显式拼） |
| `CHECK_ROW_CLASS`／`CHECK_ROW_TONES`／`checkRowSlot` | 类名根／语气闭集／槽位 |

## 入参

| 字段 | 必填 | 说明 |
|---|---|---|
| `text` | 是 | 对账那一句 |
| `tone` | 否 | `ok`（缺省）／`warn`／`danger` |
| `dot` | 否 | 圆点开关；缺省 `true` |

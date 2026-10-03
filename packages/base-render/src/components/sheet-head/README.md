# sheet-head · 票据纸页头

纸面店头三行：品牌行（`.ilife-sheet-eyebrow`）／结论标题（`.ilife-sheet-title`，**受信 HTML**）／副题（`.ilife-sheet-sub`，可省）。

## 出口

| 名字 | 是什么 |
|---|---|
| `renderSheetHead(input)` | 产店头三行（纯函数） |
| `normalizeSheetHead(input)` | 入参归一化（唯一入口） |
| `sheetHeadCss()` | 本件样式段（调用方显式拼） |
| `SHEET_HEAD_CLASS`／`SHEET_HEAD_SLOTS`／`sheetHeadSlot` | 类名根与槽位 |

## 入参

| 字段 | 必填 | 说明 |
|---|---|---|
| `brand` | 是 | 品牌行（转义后上屏） |
| `titleHtml` | 是 | 结论标题（受信 HTML，调用方转义） |
| `sub` | 否 | 副题；空串＝不出这一行 |

判地＝`docs/skills/skill-bill/proto/acct-goal/` 十三件 v2.2 的 `.shop-head`。
```json 示例入参
{
  "brand": "饼干记账 · 新增账户",
  "titleHtml": "新增账户还差 1 项",
  "sub": "采集新增账户所需信息 · 请补齐必填项"
}
```


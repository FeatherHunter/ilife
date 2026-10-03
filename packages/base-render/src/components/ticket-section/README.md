# ticket-section · 票据纸的一段

段头（4px 主色条 ＋ 标题 ＋ 右对齐英文标）＋ 段内容。判地＝`proto/acct-goal/` 十三件的 `.sec`。

## 出口

| 名字 | 是什么 |
|---|---|
| `renderTicketSection(input)` | 产一段（纯函数） |
| `normalizeTicketSection(input)` | 入参归一化（唯一入口） |
| `ticketSectionCss()` | 本件样式段（调用方显式拼） |
| `TICKET_SECTION_CLASS`／`TICKET_SECTION_FORMS`／`ticketSectionSlot` | 类名根／形态闭集／槽位 |

## 入参

| 字段 | 必填 | 说明 |
|---|---|---|
| `title` | 是 | 段标题 |
| `tag` | 是 | 右对齐英文标（`LEDGER`／`DETAIL`／`CHECK`…） |
| `content` | 否 | 段内容（受信 HTML） |
| `form` | 否 | `plain`（缺省）／`danger` |
```json 示例入参
{
  "title": "落点",
  "tag": "LEDGER",
  "content": "<div class=\"ilife-block-ledger-rows is-ticket\"></div>"
}
```


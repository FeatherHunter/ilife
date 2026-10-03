# type-badge · 页面徽章列

页型／口径两枚胶囊 ＋ 状态徽章 ＋ 按句分行的下一步动作。原件＝`packages/skill-bill/src/write/typeBadge.ts`。

## 出口

| 名字 | 是什么 |
|---|---|
| `renderTypeBadge(input)` | 产徽章列（纯函数） |
| `normalizeTypeBadge(input)` | 入参归一化（唯一入口） |
| `typeBadgeCss()` | 空串（三枚零件的样式由 `blocksCss()` 出） |
| `TYPE_BADGE_CLASS`／`TYPE_BADGE_FORMS` | 类名根／形态闭集 |

## 入参

| 字段 | 必填 | 说明 |
|---|---|---|
| `pageKind` | 否 | 第一枚胶囊（页型／唤醒词） |
| `caliber` | 否 | 第二枚胶囊（口径那句） |
| `status` | 是 | 状态徽章的语义色 |
| `statusText` | 否 | 状态徽章的字 |
| `next` | 否 | 下一步动作（按句号分行） |
| `form` | 否 | `plain`（缺省，两枚胶囊并列）／`row`（收进一行） |
```json 示例入参
{
  "pageKind": "采集页",
  "caliber": "金额取负数",
  "status": "warn",
  "statusText": "还没写库",
  "next": "还差 1 项：补齐了，再说一遍「记支出」。"
}
```


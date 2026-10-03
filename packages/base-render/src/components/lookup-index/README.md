# lookup-index · 速查索引

**一句话**：77 条唤醒词一句话直达 —— 锚点行（页内跳转）＋ 分组行（唤醒词 → 去向）＋ 自律计数。
别名行标黄、且不混入总数。

**形态**：只落 h02 那一纸（锚 chips ＋ 组标题 ＋ 组内行 ＋ 自律条）。

## 入参

| 字段 | 类型 | 缺省 | 说明 |
|---|---|---|---|
| `anchors` | `LookupAnchor[]` | 必填 | 锚点（`id` 与目标组落点逐字相同；`label` 非空） |
| `groups` | `LookupGroup[]` | 必填 | 分组（`label` ＋ 非空 `rows`） |
| `groups[].rows` | `LookupRow[]` | 必填 | 组内行（`wake` 唤醒词 ＋ `goto` 去向；`alias` 为真＝别名行） |
| `total` | `number` | 必填 | 总数（自律条里的那个数） |
| `countNote` | `string` | 可选 | 自律条（如“每行一遍；别名不混数”） |
| `aliasMark` | `string` | `别名标黄、不混数` | 别名说明 |
| `extraClass` | `string` | 可选 | 附加类名（空格分隔） |

<!-- 示例入参：皮肤矩阵判据拿它渲染本件，必须能直接渲染成功 -->

```json 示例入参
{
  "anchors": [{ "id": "lookup-写入", "label": "写入" }, { "id": "lookup-查询", "label": "查询" }],
  "groups": [
    { "label": "写入", "rows": [{ "wake": "记一笔", "goto": "写入页" }] },
    { "label": "别名", "rows": [{ "wake": "查账单", "goto": "查询页", "alias": true }] }
  ],
  "total": 3,
  "countNote": "每行一遍；别名不混数"
}
```

## 运行时

`buildLookupIndexJs()` 产出 JS 文本：点锚点 → 对应组滚到可视区并聚焦。
不开脚本时原生 `<a href="#id">` 跳转照常成立（渐进增强）。

## 样式

`lookupIndexCss()`：锚点胶囊（44 高命中盒）＋ 组上边线 ＋ 别名行黄底。
颜色只经皮肤 token 读，不手写色值。

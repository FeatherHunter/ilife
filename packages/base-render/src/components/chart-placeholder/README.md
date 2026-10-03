# chart-placeholder · 图表占位

**一句话**：真图回填前的占位 —— 标题 ＋ “不重算口径”三行 ＋ 需真图标记 ＋ 种类声明。

**只占位、不画图**：真图由 `charts/`（donut／line／bar）直接调回填；本件不重算任何口径。

## 入参

| 字段 | 类型 | 缺省 | 说明 |
|---|---|---|---|
| `title` | `string` | 必填 | 占位标题（如“CHART”） |
| `lines` | `string[]` | 三行“不重算口径” | 说明行（1～4 行） |
| `needReal` | `boolean` | `false` | 需真图标记（为真时出“需真图”一句） |
| `kind` | `donut \| line \| bar` | `bar` | 种类（占的是哪一种图的位） |
| `extraClass` | `string` | 可选 | 附加类名（空格分隔） |

<!-- 示例入参：皮肤矩阵判据拿它渲染本件，必须能直接渲染成功 -->

```json 示例入参
{ "title": "CHART", "lines": ["本页只放占位，不重算口径", "真图回填前不做结论", "种类以基线复核为准"], "needReal": true, "kind": "donut" }
```

## 样式

`chartPlaceholderCss()`：虚线框 ＋ 透明底 ＋ 弱文字三行。
颜色只经皮肤 token 读，不手写色值。

## 无运行时

本件不接事件（`runtime.ts` 不存在）；回填真图时调用方整块换成 `charts/` 的产出。

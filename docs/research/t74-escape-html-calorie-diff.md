# #74 · D5 证据：`escapeHtml` 五字符归一（AC-14）对 calorie 输出的字节差异

- 复跑：`node docs/research/t74-escape-html-calorie-diff.mjs`（先 `pnpm build`）。
- **归一前实现（base-paint）**：`escapeHtml` 只转 `& < > "` 4 个字符（`packages/base-render/src/contract.ts:31-32` 归一前）。
  措辞更正（FX-74-8）：此处的「旧」指 **base-paint 自身归一之前**，**不是**「旧版本／旧共享层」——
  旧基线 `D:\2Study\StudyNotes\SKILLS\公共组件\assets\base.js:14` **本就五字符**（`'` → `&#39;`），
  故本次归一属**朝旧版对齐**，不是新增偏离（独立取证见 `docs/research/t74-verify-v3-migration.md`「旧基线对照」）。
- 新实现：恒读冻结常量 `ESCAPE_HTML_CHARS`／`ESCAPE_HTML_ENTITIES` 5 个字符（`& < > " '`），`'` → `&#39;`（`packages/base-render/src/contract.ts`）。
- 差异方向：**只增不减**——每个单引号使输出 +4 字节（`&#39;` 5 字节 vs `'` 1 字节）。
- 前提自查（本脚本断言）：calorie 模板与 `src/render/html.ts` 中**零**字面 `&#39;`，故「归一前」输出可由「归一后」输出把 `&#39;` 还原为 `'` 逐字反推。
  **失效条件（FX-74-9⑨）**：若真实用户数据本身含 `&#39;` 字面，反推法会把数据里的 `&#39;` 误当转义产物 → 该反推**失效**；
  只影响本证据表的**算法**，不影响第 2 节的实测结论（fixture 数据自造、零 `&#39;`）。

## 1. 静态面：calorie 渲染层的 escapeHtml 调用点（哪些输出可能变字节）

- `packages/skill-calorie/src/render/html.ts` 共 **41** 处 `escapeHtml(` 调用，行号：39、42、49、50、51、59、93、100、138、151、152、153、159、160、161、164、167、169、207、208、213、214、215、216、221、222、223、224、225、257、259、313、335、365、380、511、512、571、576、581、598
- 这 41 处覆盖 calorie 渲染层的**全部动态文本路径**（标题／KPI／表格行／收据明细／错误回执／HELP 速查／照片卡）；技能侧无本地 `escapeHtml` 副本，全部走 base-paint 的同一实现。

## 2. 动态面：fixture 驱动的真实渲染（每个被转义字段都含单引号）

| 渲染函数 | `&#39;` 命中 | 归一前字节 | 归一后字节 | 字节差 | 差异样点（归一后） |
|---|---|---|---|---|---|
| `renderPhotoReceiptHtml` | 8 | 509 | 541 | +32 | `...tle" style="color:#e6edf3">存照片&#39;s回执</h1><div class="ilife-rec...` |
| `renderErrorHtml` | 7 | 511 | 539 | +28 | `...tle" style="color:#e6edf3">存照片&#39;s失败回执</h1><div class="ilife-e...` |
| `renderGalleryHtml` | 6 | 1697 | 1721 | +24 | `...><b class="ilife-kpi-value">正面&#39;s</b></div><div class="ilife-...` |
| `renderPhotoHelpHtml` | 6 | 509 | 533 | +24 | `...f3">身材照片 HELP 速查</h1><div>查询：记&#39;身材 · 命中 1 条</div><div class="...` |
| `renderGifHtml` | 2 | 1094 | 1102 | +8 | `...><b class="ilife-kpi-value">正面&#39;s</b></div><div class="ilife-...` |

**结论**：5／5 个样本输出的字节**全部改变**，共 29 个 `'` → `&#39;`，合计 **+116 字节**；差异**只在被转义文本含 `'` 时出现**。

## 3. 现有资产／用例的影响面

- 全仓 calorie 包（`src/**`＋`test/**`＋`templates/**`＋`scripts/**`，排除 `node_modules`／`dist`）扫描：`[一-龥A-Za-z0-9]'[一-龥A-Za-z0-9]` 形态 **0 命中**（无「don't／it's」类内容），且字面 `&#39;` **0 命中** → 现有断言与快照**零变化**。
- 影响面因此是**数据相关**的：用户数据（照片备注／标签／错误回执的 `dataText`／HELP 的 `desc`·`exec` 等）含单引号时，输出字节改变；语义等价（`&#39;` 与 `'` 在 HTML 文本／属性里等价，且新行为**更安全**——属性用单引号包裹时不再可注入）。
- 技能侧本地 `escapeHtml` 副本（bill／chef／home／schedule／memo 各一份，均为 5 字符）**不在 #74 改动面**（施工单红线：只动 `packages/base-render`），删除动作归各自地图／#96 门。

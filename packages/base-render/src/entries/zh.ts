/** base-render · 词条表（**基准语言 zh**：key 集合的权威，回退链第二站）。
 *
 *  归属：本包自己的命名空间（ADR-0004 §3「词条随包存放，命名空间＝包名」）。
 *  key 形态（第一轮＝**派生命名**，见地图 #1197 决定记录）：<件名>.<位置>.<键>——
 *  件名取组件目录名／契约件名，位置取该词的**位置四分**归类（state／remain／text）。
 *
 *  位置四分（docs/agents/多语言-位置四分-base-render.md）：
 *   · 标题位／载荷位 → 整句化→词条（本表右值；拼接串一律写成一条**整句模板**，不拼片段）；
 *   · 版式位（如缺值符 ——）不进本表，留组件常量；
 *   · 数据位（数字／日期）不进本表，走 formatNumber／formatDate。
 *
 *  不变量：本表的中文值**逐字等于改造前写死在组件里的常量**——所以不启用多语言时产物逐字节不变。
 */
export const zh = {
  /* ── progress-list（多目标进度）状态字 ── */
  'progress-list.state.blank': '未记录',
  'progress-list.state.on-track': '进行中',
  'progress-list.state.done': '已达标',
  'progress-list.state.over': '已超',
  /* ── progress-list「还差多少」整句（模板只认 {name} 具名占位） ── */
  'progress-list.remain': '还差 {value}{unit}',
  'progress-list.over': '已超 {value}{unit}',
  'progress-list.exact': '刚好达标',
  /* ── 状态徽章（spec/controls 冻结契约 STATUS_DEFAULT_TEXT 的默认字） ── */
  'status-badge.text.ok': '成功',
  'status-badge.text.warn': '警告',
  'status-badge.text.danger': '失败',
  'status-badge.text.empty': '无数据',
  /* ── blocks.ts（区块渲染；key 第一轮派生命名，#1232 迁入） ── */
  'base-render.blocks.c001': '无数据',
  'base-render.blocks.c002': '复制指令',
  'base-render.blocks.c003': 'renderDetailSection: types[] 元素的 text',
  'base-render.blocks.c004': '写入时间 ',
  'base-render.blocks.c005': '/* 判地字面 · 授权照抄：#f3ecdc（轨道底；与规格 §1 的 `--pill` 同一枚一次性字面） */',
  'base-render.blocks.c006': '/* 判地字面 · 授权照抄：#c96f3f（占比条渐变起点；出处＝判地 `.scale-fill`，规格 §1 未列，待并进皮肤） */',
  'base-render.blocks.c007': '/* base-paint 区块样式资产 · #104 · 12 区 */',
  'base-render.blocks.c008': '未记录',
  'base-render.blocks.c009': '还差 {p1}{p2}',
  'base-render.blocks.c010': '要改：',
  'base-render.blocks.c011': '待开发',
  /* ── contract.ts（渲染契约；#1232 迁入） ── */
  'base-render.contract.c001': '未安装[{p1}]，请补装后使用。',
};

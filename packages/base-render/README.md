# base-paint（目录 `packages/base-render`）

> 目录名 `packages/base-render`，npm 包名 **`base-paint`**——同一个包；下文一律用包名。

两条消费面，**先选一条**（选错了会拿到两套互不相干的样式语言）：

| 你要做的事 | 走哪条路 | 里面有什么 |
|---|---|---|
| **画页面**（六个技能的新页、新读数、新交互） | **组件层** → `base-paint/blocks` | **70 件组件**：一件一目录、目录内自足、可独立演进（本 README 第一节，也是你 90% 的时候要看的） |
| 调既有页面的老函数 | **冻结面** → `base-paint` 根出口 | 12 区块 ＋ 控件 ＋ 图表 ＋ 页面级那批函数，签名逐名锁死（本 README 第二节速查） |

---

# 一、组件层：该用哪一件

## 1.1 按你要展示的东西找（70 件路由）

粗体是件名，照抄进 import 即可；括号里是中文名。**没有一件是"另一种皮肤下的同一件"**——
换皮只换取值，见 §1.3。

**页与标题**
- `page-head`（页头）：一页的标题 ＋ 主读数（读数固定落在第二行）＋ 工具位。
- `section-head`（小节头）：可折叠小节（原生 `<details>`，零脚本），带序号档。
- `sheet-frame`（纸面页框）：整页是一张纸（素纸／小票纸，可选撕口与裁切线）。**单据族六件的样式由 `sheetCss()` 一并挂**。

**一页的主读数与成组读数**
- `summary-head`（主数字头）：一页唯一的主读数——大数字 ＋ 分母 ＋ 副语 ＋ 印章，三档字号 × 两种字面。
- `stat-inline`（行内读数）：一行里几个「标签 值」串起来（表头、脚注、小结行）。
- `key-value-list`（档案行）：两列字段表，值右对齐成列（用户档案、物品参数、证件）。
- `ledger-rows`（账目行）：标签 →点线→ 值，右对齐等宽数字（一页的读数逐项列成账）。
- `entry-rows`（明细行）：一条记录一行（时间／类别／名称／数量／值 ＋ 备注另起一行）。

**进度与形状**
- `progress-ring`（进度环）：单个「已达到 ÷ 目标」的环形。· `stacked-bar`（构成条）：一层的占比构成（消费结构、营养结构、24h 构成）。· `heat-grid`（热力格）：一矩阵的浓淡（哪几格高）。
- `scale-bar`（刻度条）/ `punch-strip`（打孔格带）：一个值在刻度上的位置 / 一天一格的有无。
- `progress-list`（多目标进度）：一页多目标，每行「名 ＋ 状态字 ＋ 当前/目标 ＋ 条 ＋ 还差多少」。

**时间与分组**
- `calendar-month`（月历格）：七列一周，格内日期／读数／底部柱，缺值印 `—` 不印 0。
- `range-bar`（区间条）：泳道 ＋ 行尾合计 ＋ 整点刻度，长度＝多久。
- `hour-band`（时段带）：单带 ＋ 刻度尺 ＋ 明细行，带上的空档算出来显形（24h 概览）。
- `sub-list`（分组清单）：分组 ＋ 组级小计 ＋ 进度，一组一枚原生折页。
- `window-picker`（窗口选择器）：**看哪一段**——档 ＋ 起止 ＋ 「共 N 天」，改起止自动落「自定义」档。
- `date-range`（日期范围）：**选起止**（日历缩略 ＋ 起止两格 ＋ 快捷档），与页面读数无关。
- `cash-waterline`（现金水位）：**钱还剩多少、还能撑几天**——逐日水位柱／每周子弹图／进出水三栏（三形态都在）。
- `gantt-timeline`（甘特时间线）：**并行的时候哪条资源被占住、哪条还空着**——资源泳道 × 关键路径带（当前只有 `C` 一档）。
- `goal-stairs`（目标阶梯）：**分几段走、每段最晚哪天动手**——目标日往回倒推成一段一行的日程（当前只有 `C` 一档）。
- `reminder-setter`（提醒设置）：**几点提醒、重复几次**——一次一条的三个决定（`decisions`）／一天里好几条提醒摆在刻度上（`track`，两档都在）。

**分布与流向**
- `spread-dist`（分布与分位）：**一堆读数散成什么样**——逐日范围柱／分位尺（`range`／`quantile` 两档都在；箱线那一档只拿到 3 分，没落）。
- `gap-band`（差值带）：**实际与计划差多少、差在哪儿**——连续差值带／每日偏差柱（`band`／`deviation` 两档都在），刻度、折线、锚点同一份真值。
- `flow-ribbon`（流向带）：**钱从哪儿来、花到哪儿去**——桑基带／交叉矩阵／两条构成轨（三档都在），两侧一把尺子。
- `radar-profile`（多维画像雷达）：**几项各是多少、哪项拖后腿**——多边形雷达／极区扇图／展平成轴表（三档都在）。

**对照与榜单**
- `compare-columns`（双列对照）：同一指标两栏并排（新旧、你我、两期）。· `rank-list`（榜单）：单期名次。
- `scatter-fit`（相关性散点）：**两个读数之间是什么关系**——散点 ＋ 拟合线／分箱趋势带／滞后相关（三形态都在）。
- `small-multiples`（小倍数面板）：**同一个读数在多个期间并排**——一期一根迷你柱，横着比高低（当前只有 `columns` 一档）。

**状态与台账**
- `status-row`（状态台账行）：一笔一行——轨道点（形）＋ 阶段徽标（字）＋ 金额；第二行补充与到期日。
- `due-row`（到期行）：倒计时放大 ＋ 动作（保修、证件、还款日、提醒）。
- `streak-badge`（连记徽标）：连续 N 天／次的强弱三档。· `step-flow`（步骤条）：有序步骤（做菜步骤、落地训练）。
- `timer-card`（计时卡）：卡式大数字 ＋ 起停（等的那几分钟、运动计时）。
- `sync-status`（同步状态）：每个目标一行带最近时间与结果，**失败行必带原因与怎么修**（飞书、训记、备份）。

**清单与勾选**
- `task-list`（勾选清单）：纯勾选 ＋ 组内进度（买菜清单、盘库、待办）。
- `multi-checks`（多选清单）：全选头 ＋ 分组 ＋ 底部动作条，给「批量改」用。
- `radio-cards`（单选卡组）：一次选一个（餐别、账户、类别）。· `rating-row`（评分行）：星级 ＋ 数字读数。
- `bulk-bar`（批量操作条）：**勾几条一起改一个字段**——选中后浮出操作条，改之前先看见会改哪几条（当前只有 `A` 一档）。

**搜索与筛选**
- `search-field`（搜索框）：**本页内**搜索，结果就摆在页面里。· `filter-chips`（筛选条）：按属性取子集。
- `sort-toggle`（排序切换）：换排序口径（体检排序这类）。· `result-row`（结果行）：搜索结果一行（标题 ＋ 高亮 ＋ 值 ＋ 缩略图）。
- `command-palette`（命令面板）：**跨技能找「哪一页、哪个动作」**——单栏分组结果：动作在前、页面在后（当前只有 `A` 一档）。

**表与输入**
- `number-stepper`（数量步进）：`− n ＋` ＋ 常用值（份数、份量、数量）。
- `slider-row`（滑块行）：拖动 ＋ 常用档（热量目标、预算、库存下限）。
- `switch-row`（开关行）：设置项一行（开／关／禁用三态，说明写清「打开会怎样」）。
- `editable-value`（就地可编辑值）：**值即入口**——值旁边一枚铅笔，同格变编辑器，进出不变形。
- `wizard-shell`（分步录入壳）：**一趟多问的录入，一问一屏**——一条细进度 ＋ 大字问题 ＋ 这一问的答法（当前只有 `one` 一档）。
- `quick-capture`（快速录入条）：**随手记一笔**——一行式录入 ＋ 哪格认错了点哪格改（`oneline`）／常驻一行 ＋ 推开的六格抽屉（`drawer`，两档都在）。

**改与挪（改一条、挪一张、撤回来）**
- `undo-timeline`（改动时间线）：**谁改了什么、还能不能撤**——一条轨／一次改动的回滚单（`track`／`impact` 两档都在），
  三态 `undoable`／`undone`／`locked` 各有形与字（不只靠色）。
- `drag-sort`（拖拽排序清单）：**换个先后**——拿起一行、原位空槽、落点粗线（一档）；点一下拿起、点另一行放下，拖不是唯一通路。
- `kanban-columns`（看板列）：**按状态分列摆放、挪一张到下一列**（一档）；窄档一列一屏，点卡拿起 ＋ 点目标列收纳键挪。
- `relation-picker`（关系选择器）：**这条记录挂到哪个人／账户／分类上**——浮层选一个／行内展开选一个（两档都在）。

**反馈与确认**
- `confirm-strip`（二次确认条）：危险动作的二次确认（删记录）。· `skeleton`（加载骨架）：等数据那一两秒。
- `toast-card`（提示卡片）：纸面卡式提示（图标＋标题＋细节＋至多一动作＋关闭），与冻结面 `renderToast` **并存**——
  要「深色盒子那种」用根出口的 `renderToast`，要「纸面卡、带关闭、最多堆 3 条」用本件。

**容器与浮层**
- `dialog`（对话框）：覆盖式确认／表单／详情。· `drawer-sheet`（底部弹层）：多选 ＋「完成 N 项」（选账户、餐别、分类）。
- `popover-menu`（浮出菜单）：贴着某个按钮的一小组动作。· `tooltip`（气泡说明）：挂在一个词上的口径解释。

**加量池（少用，但用得上时最省事）**
- `note-block`（备注块）：记录旁边那段「当时为什么这么记」（长备注默认收起）。
- `invoice-lines`（金额分解）：一笔钱拆开（原价／优惠／实付／均摊），每行写清为什么。
- `photo-grid`（照片网格）：一格格照片 ＋ 末尾「加一张」。· `photo-compare`（前后对比）：两张叠着 ＋ 可拖竖线 ＋ 数值差值行。

## 1.2 怎么挂（四步，缺一步就是"没生效"）

```js
// ① 渲染：纯函数，产 HTML 字符串（零 DOM；件自己会转义；非法入参抛 badInput）
import { renderStatusRows, statusRowCss } from 'base-paint/blocks';
const html = renderStatusRows({ items: [{ name: '房租', amount: 3200, state: 'due', due: '09-30' }] });

// ② 样式段：挂进整页的 sharedCss（每个用到的件都要挂它自己的；族汇总见 sheetCss()）
import { pageUiCss } from 'base-paint';
import { blocksCss, skinCss, skinClass } from 'base-paint/blocks';
const sharedCss = pageUiCss() + blocksCss() + skinCss() + statusRowCss();

// ③ 运行时段：只有交互件才有（70 件里 32 件有；其余是零脚本件，跳到 ④）
import { buildSwitchRowJs, renderSwitchRow, switchRowCss } from 'base-paint/blocks';
const sharedHelpersJs = buildSharedHelpersJs() + buildSwitchRowJs();
const withSwitch = renderSwitchRow({ name: 'feishuSync', checked: true, label: '记完自动同步飞书' });
const sharedCss2 = sharedCss + switchRowCss();

// ④ 皮肤：一次 skinCss() ＋ 祖先上的一个类（四套任选，缺省 paper）
const page = `<main class="ilife-page-ui ${skinClass('paper')}">${html}${withSwitch}</main>`;
```

**四条会咬人的口径**
- **加法式**：不调 `②`／`③` 的页面产物**逐字节不变**——所以老页面可以零风险地逐件接。
- **样式只挂一次**：同页挂两遍同一件的样式段不会更"生效"，只会更大。
- **入参错了会抛**：件对非法入参一律抛 `badInput`（`err.code === 'bad-input'`，消息点名到字段），
  静默降级不会发生——把它当断言用。**表外的键也一律拒**（未知键不报错＝把 `steps` 写成 `step` 那种笔误
  会让屏上静静少一块，所以顶层与每个嵌套对象层都要查键；先例 `relation-picker`／`kanban-columns` 的 `model.ts`）。
  这条门由 `test/跨件不变量.test.mjs` 第 ③ 组守着（老件逐件留名在日期豁免表里，本批之后落的件一律硬过）。
- **名字从清单里摸**：`dist/components/清单.js` 每一行有 `render`／`style`／`runtime` 三列——那就是该件的三个出口名
  （`runtime: '无'` 的件是零脚本件，跳过第 ③ 步）。70 件的名字面全部经 `base-paint/blocks` 转出；
  包没有 `./components` 子路径，别去引 `dist/` 深处。

## 1.3 皮肤：四套取值，一件控件

`paper`（小票纸，缺省）· `broadsheet`（大字报刊）· `neutral`（中性）· `ink`（水墨·宣纸）

> 2026-09-24 有过另外两套（`terminal` 终端暗色／`blueprint` 蓝图工程），用户看完整体否掉，**已删**。
> 留下的每一套皮肤都是一份承诺（对比地板、判据、清单、维护），**不能被选中的皮肤只剩负债**——
> 口径与理由见 `docs/base/base-render/选中态与皮肤语言.md`。

挂法就是 §1.2 的第 ④ 步：`skinCss()` 产出一段 CSS（四套各自的类），页面在**祖先**上加 `ilife-skin-<名>`。
件**不感知**皮肤：同一份入参在四套皮肤下产出的**标记逐字节相同**（这一条有判据钉着），换的只是取值
（颜色、圆角、阴影、字面、字号、间距）。所以：

- 加第五套皮肤＝加一张取值表 ＋ 注册表一行，**组件代码零改动**；
- 不挂皮肤也不崩：每个 `var()` 都带兜底链（例 `var(--ilife-ink-3, var(--fg3, #86868b))`），落到冻结 token 与字面。
- **选中／强调一律走强调色系**（`accent-soft` 底 ＋ `accent-text` 字 ＋ `accent` 描边；无文字的点格条走 `accent` 实底），
  **不许拿正文墨色 `ink` 当面**——那是把"字色"当"面"，在纸面语言里只能读成一块坏斑。

## 1.4 细节在哪看（层层递进，别跳）

| 你要知道 | 上哪儿看 |
|---|---|
| 有哪些件、中文名、导出名、**示例入参** | `base-paint/dist/components/清单.js`（机器清单，随包发布；`COMPONENTS[].sample` 可直接喂渲染函数） |
| 这件怎么用、什么时候用、常见错法、入参逐字段 | 仓库里 `packages/base-render/src/components/<件名>/README.md`（70 份，唯一权威） |
| 件的实现与样式函数 | `base-paint/dist/components/<件名>/index.js`（`renderX`／`xStyle`／`buildXJs` 三件出口） |
| 改这个层（写新件／改样式）的规矩 | `packages/base-render/src/components/README.md`（本层红线与横切判据） |
| 冻结面的逐名签名 | `packages/base-render/src/spec/` ↔ `docs/base-paint-contract.md`（由 `test/contract-signatures.test.mjs` 逐字锁死） |

## 1.5 四条硬纪律（写页面时最容易踩的四条）

1. **宽度只许听容器**：件一律 `@container`，不写 `@media (max-width: …)`——件会被嵌进侧栏／面板／卡片，视口宽 ≠ 件宽。
2. **一条选择器里作用域恰一次**：`.ilife-page-ui` 出现在组合器两边＝那条规则永不命中（本层已实测抓到十几处）。
3. **状态靠「形 ＋ 字 ＋ 色」三样**：颜色会被皮肤换掉，只靠色的状态在换皮时就丢了。
4. **触控与焦点有地板**：可点元素命中盒 ≥44×44，`:focus-visible` 描边 ≥2px（每件都有对应的常量导出，别另写数字）。

---

# 二、冻结面速查（既有 12 区块 · 控件 · 图表 · 页面级）

> 这批函数的签名**逐名锁死**（`src/spec/` ↔ `docs/base-paint-contract.md`），改一个名字就是红。
> 新页面优先用第一节的组件层；下面是既有页面的调用面。

**包名说明**：目录叫 `packages/base-render`，npm 包名叫 `base-paint`——同一个包。

### 速查三问

| 我要画 | 调谁 | 从哪引 |
|---|---|---|
| 分布条 | `renderDistributionRows` | `base-paint/blocks`（子路径） |
| 徽章 | `renderStatusBadge`（空态／失败回执另有 `renderEmptyState`／`renderErrorReceipt`） | `base-paint` 根 |
| 环图 | `charts`（`donut` 种）＋ `chartsCss` 取样式 ＋ `buildChartsHelpersJs` 取脚本 | `base-paint` 根 |
| N 天里「**哪几天**有记录」 | `renderDayStrip`（时间格带；缺数一格一槽，不补零） | `base-paint` 根 |
| 页内导航（**看得出能点**） | `renderSegmentedNav`（分段导航；与状态胶囊形状分得开） | `base-paint` 根 |
| 一行元信息小签 | `renderChipRow`（胶囊行；**成组出现别用裸 `renderChips`**）——住在区块层，根出口转出**同一实现** | `base-paint` 根 或 `base-paint/blocks`（同一个函数） |
| 加减关系（A ＋ B ＝ C） | `renderEquationBar`（等式条；「摄入＋缺口＝消耗」这类） | `base-paint` 根 |
| 「这句话在什么前提下成立」 | `renderStateBanner`（态声明条；如「目标暂停中」） | `base-paint` 根 |

注意：`blocks` 整组只走子路径 `base-paint/blocks`，根出口没有它；以下除注明外均走 `base-paint` 根。
**一处例外**：`renderChipRow` 的实现住在区块层，根出口把它**原样转出**（两条路径拿到的是**同一个函数**）。
#950 收口时把当时另立在根上的第二件并回了区块层（两件同名、同容器类、入参却不兼容，样式还被两层各定义一次），
公共面上此后只有一个 `renderChipRow`——**别再按名字新建第二件**。

### 区块组装（`base-paint/blocks`）——新页面只许 blocks 组装

| 函数 | 一句话 |
|---|---|
| `renderPageShell` | 页面容器与标题区，每页外层 |
| `renderTocBlock` | 目录区块 |
| `renderCaliberLine` | 口径说明行（一行小字） |
| `renderConclusionBar` | 结论条（一句话总结）。**#950 扩参**：入参支持 **串**（原样，旧调用点逐字节不变）｜**对象** `{ text, tone?: 'ok'\|'warn'\|'danger'\|'info', badge?: string }`——`tone` 只改左侧强调条底色，`badge` 是「前提」短词（如「目标暂停中」）。左侧 3px 强调条已改由 `::before` 承载（原来 `border-left` 撞圆角会被裁成月牙） |
| `renderMiniBar` | 细进度条 |
| `renderDistributionRows` | 分布行（名＋条＋值，窄槽语义见包内测试） |
| `renderChips`／`renderChipRow` | 标签片组与**胶囊行**。`renderChips` 是**裸片**（逐项一枚 `<span>`、**没有容器**；落进 ≥1001px 页壳网格会被逐枚提升成整行——用户截图那三根长条就是它）；成组出现用 `renderChipRow({ items, tailHtml?, role?, extraClass? })`——**带容器**，`role='list'` 出 `list`＋逐枚 `listitem`（**缺省零 aria 属性**，既有 8 处调用点因此逐字节不变）。**#950 扩参**：`items[i].tone` 语气四档（`CHIP_TONES`：`neutral`／`ok`／`warn`／`danger`）——**给了才出语气类**，不给与改前逐字节相同 |
| `renderChangeRows` | 变化行（涨跌对照） |
| `renderKpiCard`／`renderKpiGrid` | 指标卡／指标卡宫格。**#950 扩参**：`value` **可缺省**（＝**判定卡**：这一格的答案是一句话而不是数字，判定词住 `status`＋`statusText`、说明住 `detail`）；`gap: { value, unit? }` 出一枚「还差 N」徽章；`pending: true` 出「未记录」态（值位 `—`、进度条归零、徽章出词）。**同槽互斥**：`gap`×`status`、`pending`×`value` 各自给会点名拒 |
| `renderDataTable` | 数据表 |
| `renderChartBlock` | 图表容器块（承 `charts` 的产出） |
| `renderListRows` | 列表行 |
| `renderPreBlock` | 预排文本块（命令／CLI 展示） |
| `renderDetailSection` | 详情分区 |
| `renderDisclosure` | 折叠展开区 |
| `renderParamForm` | 参数表单 |
| `renderEmptyBlock` | 空态块 |
| `renderCopyBlock` | 可复制文本块 |
| `renderFeedbackBlock` | 反馈块 |
| `blocksCss` | 区块样式唯一产出者（配 `BLOCK_STYLE_SECTIONS` 分段表） |

示例：`test/blocks.test.mjs`；源：`src/blocks.ts`。

### 控件（根）——原子交互与状态

| 函数 | 一句话 |
|---|---|
| `renderToast`／`createToastController` | 轻提示与它的控制器（含堆叠语义）。**纸面卡式的那种**是第一节的 `toast-card`，两件并存 |
| `copyText`／`createCopyRuntime`／`bindCopyAction` | 复制三件套（双通道＋提示反馈，唯一实现） |
| `buildSharedHelpersJs` | 共享脚本唯一产出者（`SHARED-HELPERS` 槽填充物） |
| `renderActionBar` | 操作条 |
| `renderStatusBadge` | 状态徽标（`ok`／`warn`／`danger`／`empty`） |
| `renderEmptyState` | 空态 |
| `renderErrorReceipt` | 失败回执 |
| `TOAST_ICON_GLYPHS` | 提示图标表 |

示例：`test/controls.test.mjs`、`test/copy-*.test.mjs`；源：`src/controls.ts`。

### 图表（根）——8 种纯字符串产出

- `charts`：统一入口，`bar`／`line`／`donut`／`progress`／`combo`／`sparkline`／`gauge`／`scatter`（CSS＋SVG 字符串，无 canvas）。
- `buildChartsHelpersJs`：图表脚本唯一产出者；`chartsCss`：图表样式。
- **点数闸（#950）**：`options.minPoints` ＋ `options.minPointsHint`——有效点少于闸值就不画「一条只有一个点的线」，
  改走既有空态（`CHART_EMPTY_RULE = emptyState`，正文取 `options.emptyText`、小字取 `minPointsHint`）。
  **折线／柱／迷你线／散点／组合五支吃它**（组合取两支里多的那一支）；`donut`／`progress`／`gauge` 是单值或占比，语义上不吃。
  **缺省不启用**（＝旧行为逐字节不变）——要用就显式给，如 `charts.line({ items, options: { minPoints: 2 } })`；
  非法值抛 `structure-invalid`。
- 图表的系列色与轴字号**不跟皮肤**（它住在冻结面；要跟皮肤是另一笔账）。
- 示例：`test/charts.test.mjs`、`test/chart-gate-column-950.test.mjs`；源：`src/charts.ts`；种定义：`src/spec/charts.ts`。

### 页面级（根）——整页怎么摆，不参与区块组合

- 形状件（`src/pageShapes.ts`）：`renderFactStrip` 事实条；`renderMediaFigure`／`renderMediaPlaceholder` 图片与媒体占位；`renderTimelineRows` 时间轴行；`pageShapeCss` 形状样式；`MEDIA_RATIOS` 比例表。
  **#950 事实条扩参**：`value` 可给 `null`（缺数 → 印 `FACT_STRIP_MISSING_MARK`（`—`）＋ 降调类，与「0」在产物上分得开）＋ `unit` 单位位（值位只吃数，单位小一号跟在后面）。
- **导航族（#950，`src/pageNav.ts`）**：
  - `renderSegmentedNav({ items, current?, sticky?, ariaLabel? })`——等宽分格 ＋ 选中实底 ＋ 图标位（`SEG_NAV_ICONS` 八枚内联 SVG，无外链）＋ `aria-current="page"` ＋ 44px 命中区；**做「动作」的形**，与状态胶囊分得开。
  - **胶囊行不在这族**：`renderChipRow` 住在区块层（`blocks.ts`，见上表），根出口只**转出同一实现**——同一个容器类不许被两层各定义一次样式（那样页面层会盖掉区块层）。
- **横条族（#950，`src/pageBars.ts`）**：
  - `renderDayStrip({ days, emptyMark?, caption?, density?, extraClass? })`——一格一天：`value: null` ＝ 缺数（印占位、圆点转灰）、`today: true` 高亮；`caption` 是带下事实条（`tone`：`plain`／`ok`／`warn`／`danger`，`ok` 出胶囊形）。
  - `renderEquationBar({ segments, total, heading?, endLabels?, extraClass? })`——两段轨道按 `value/total` 铺满（越界夹到 0–100，不抛错），`heading` 出顶部「左标右值」，`endLabels` 补一枚合计格。
  - `renderStateBanner({ tone, badge, text?, action?, extraClass? })`——**态**（前提）与**结论**分住：`tone` 闭集 `STATE_TONES`（`info`／`warn`／`danger`）＋ 徽标 ＋ 可选动作位（只出 `data-action-id`，交互归页面运行时）。
  - 两族样式由 `pageShapeCss()` **汇总**进页（调用方不必另接 `pageNavCss`／`pageBarsCss`）；胶囊行与语气色的样式随 `blocksCss()` 进页（住在区块层）。
- 移动端配方（`src/pageUi.ts`）：`pageUiCss` 断点／触摸区／安全区样式；`PAGE_UI_CLASS`／`PAGE_UI_VIEWPORT` 挂载常量。是否启用由整页装配决定，不启用则产出逐字节不变。
  **#950 扩参**：`pageUiCss({ column })` 四档正文列宽——`centered`（**缺省＝改前行为**：880 居中 ＋ 满铺白名单）／`wide`（1120 居中）／`full`（不收窄，正文满铺 1280）／`locked`（880 居中且**满铺白名单失效**，所有子件收进正文列）；
  常量 `PAGE_COLUMNS`／`PAGE_COLUMN_WIDTH_PX`（`{ centered: 880, wide: 1120 }`）。**页面侧别再自写列宽垫片**：`locked`／`full` 两档就是替它们准备的。
  另加 **C2 守卫**：≥1001px 页壳网格里行内级子件（`span`／`a`／`b`／…）不拉伸——忘了包 `renderChipRow` 时不再塌成整宽长条。

### 管线与契约（根）

| 函数 | 一句话 |
|---|---|
| `fillTemplate` | 占位符填充器（模板＋数据组装，失败抛错不返空页） |
| `buildStyleSheet`／`cx`／`token` | 样式表唯一产出者与类名工具（`STYLE_TOKENS` 11 个 token 唯一真相源） |
| `buildDataText`／`buildLogText` | 复制文本序列化（`text`／`json`／`csv` 三格式） |
| `renderPage`／`renderReco` | 页面与推荐渲染；`escapeHtml` 转义；`RenderError` |
| `mountInjector`／`openPage` | 多页挂载与开页 |
| `createPageRegistry`／`pageOrReco`／`recoDescriptor` | 页面注册与推荐描述 |
| `BODY_FONT_STACK` | 正文字体栈 |
| `renderHelpShell` | 数据页分型 help 模板渲染 |

### 旧 → 新（同一件事的两种写法，迁移口）

| 你可能正想写 | 别那样写 | 这样写（#950） |
|---|---|---|
| 三枚状态胶囊 | 裸 `<span class="ilife-block-chip">`（宽屏被网格拉成整行；见 `renderChips` 那行） | `renderChipRow({ items: [{ text, tone }] })`（`base-paint` 根与 `base-paint/blocks` 是同一个函数） |
| 页内跳转那一排 | 胶囊式目录（与状态胶囊同形，读者看不出能点） | `renderSegmentedNav({ items, current })` |
| 「有记录 1/7 天」一句话 | 只说数量，说不出**哪几天** | `renderDayStrip({ days, caption })`（缺数一格一槽） |
| 「摄入 860＋缺口 2012＝消耗 2872」写成句 | 句长随要素增长（实测 33 字把卡撑到同排最高） | `renderEquationBar({ segments, total, heading })` |
| 结论句前缀「目标暂停中，……」 | **态**被写成结论的一部分 | `renderStateBanner({ tone, badge, text })`，或 `renderConclusionBar({ text, tone, badge })` |
| 读数卡里塞「还差 N」进 `detail` | 说明行与判定混住 | `renderKpiCard({ ..., gap: { value, unit } })`；没值位的判定卡直接**不给 `value`** |
| 页面里自己写列宽／锁单列 CSS 垫片 | 每个包各写一份（公共层缺参数才会这样） | `pageUiCss({ column: 'wide' \| 'full' \| 'locked' })` |
| 1 个点也照画折线 | 出「一条只有一个点的线」，读起来像坏了 | `charts.line({ items, options: { minPoints: 2 } })` |

**资产接线（写给整页装配的实现者）**：页面级两族的样式由 `pageShapeCss()` 汇总进页——
你只要在整页 `sharedCss` 里已经拼了 `pageUiCss() + pageShapeCss()`（六个技能包现在都是这么拼的），
新件就自动带上样式，**不需要**另接 `pageNavCss`／`pageBarsCss`。

### 错误类口径

`RenderError` 根有导出；其余 `*Error`（`TemplateError`／`ControlsError`／`TextError`／`ChartError`／`BlocksError`／`HelpSchemaError`）不在根导出——冻结面无条目，调用方按 `name`／`code` 判定。

### 正身与测试索引

- 冻结签名正身：`src/spec/`（7 件）↔ `../../docs/base-paint-contract.md`，由 `test/contract-signatures.test.mjs` 逐字锁死。
- 分组示例：`test/render.test.mjs`、`test/template.test.mjs`、`test/style.test.mjs`、`test/text.test.mjs`、`test/help.test.mjs`、`test/help-shell-136.test.mjs`（字节锁）、`test/ui-fix-154.test.mjs`。

---

# 三、维护：help 模板铁律

1. 新页面只许 blocks 组装，禁新巨串：HTML/CSS/JS 大字面量不得进 `src`（走子路径 `base-paint/blocks` 组合或本 help模板管线）。
2. 改模板只改源：`assets/help-template.html`（唯一真相源；3 槽注释 ＋ 前缀 `__HELP_TITLE__` 占位即契约；行尾 CRLF 禁转 LF）。**还原／变异回写这一件时**：它被 `.gitattributes` 钉了 `text eol=crlf`（库内存 LF、检出 CRLF），故**不要**拿 `git show HEAD:<路径>` 的原文直接写回（那是 LF，会让 `gen-help-shell.cjs` 的 CRLF 断言当场抛错）；用工作树原文读进写出（`readFileSync` → `writeFileSync`）即逐字节安全。
3. 改后跑 gen：一键 `pnpm --filter base-paint gen:help-shell`（重写 `src/helpShell.ts`＋测试哈希；字节锁随 `pnpm test` 在 CI 验 drift，`gen:help-shell:check` 本地同口径）。
4. 过门：字节锁（`test/help-shell-136.test.mjs` 哈希）＋像素门（skill-calorie `help-shell-134` 双端/覆盖序）＋ `tsc -b` 全绿。
5. 手改生成物（`src/helpShell.ts`／测试哈希）必红：`--check` 非 0＋字节锁红。
6. 源不进包：`files` 仅 `dist`（省约 105KB；追溯靠仓库＋哈希锁），包内只留 `dist/helpShell.js`。

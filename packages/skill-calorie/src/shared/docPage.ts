/** #179 · 整页装配共用件：区块 HTML 拼成完整文档（最后一公里）。
 *
 * 谁在用（写得出哪两个在用）：**基础信息**（`src/profile/` 的预检确认页与回执页）与
 * **身体细节／身材照片**（身体那两页住 `src/body/wizardDocs.ts`、身材照那两页住 `src/photo/wizardPortDocs.ts`）；饮食／运动／分析各域页面
 * 同走这一份。此前这套模板与装配函数在 7 个 `*Docs.ts` 里各抄了一份，本次收成一份。
 *
 * 包裹约定（沿 #111–#113，不新增）：内容 = `base-paint/blocks` 的区块；文档 = `fillTemplate`
 * 包裹（资产裸文本＋填充器包裹）；`sharedCss = buildStyleSheet().css + blocksCss()`；图表页另加
 * CHARTS-HELPERS ＋ `buildChartsHelpersJs`，图表 CSS 由其运行时注入。
 * **#725 起「文档壳」那一圈（doctype／head 三槽位序／资产拼接／图表位）搬去公共层
 * `base-paint/docShell` 的 `renderDocShell`**——本件只留页头语义（下面那些字段与 A／B 双路）
 * ＋ 自己的补丁样式（走 `extraCss`），拼好正文后交给骨架件；11 个字段与两条路一行未动。
 * 本文件不做取数、不装任何能力名，只按参数拼页；`fmt`／`DOC_VERSION`／`DOC_SKILL` 不进来
 * （它们是各页自己的口径，留给整包按域重排那张票）。
 *
 * 复制与提示（`promptCopyArea`／`dataCopyArea`／`copyArea`／`copyLog`／`notice`）住在同目录
 * `copyArea.ts`——#239 按「一个文件对外不多于五个」把那一组名字另立一件，本文件只留装配与投影。
 */
import { renderPageShell } from 'base-paint/blocks';
import { renderDocShell } from 'base-paint/docShell';
import { pageShapeCss, pageUiCss } from 'base-paint';

/** 整页装配的入参（≤11 字段；B线新增 metaLeft／badge／summary 三字段：给 metaLeft 才走新路，
 *  badge 缺省＝不出徽章，老调用方不传即走老路）。 */
interface DocPageInput {
  /** head 的 `<title>` 文本：7 处旧模板除这一行外逐字相同，故标题走参数（如「卡路里·饮食」）。 */
  readonly docTitle: string;
  /** 正文标题（B-01 页面壳的 H1；B线口径＝人话短标题，不带日期）。 */
  readonly title: string;
  /** 正文眉标（空串＝不写这一行，与旧装配同口径；B线新路忽略此字段）。 */
  readonly eyebrow: string;
  readonly subtitle: string | null;
  /** 已组合好的区块 HTML。 */
  readonly content: string;
  /** 图表页：模板多一个 CHARTS-HELPERS 标记，并带上图表 helpers 资产（缺省＝普通页）。 */
  readonly charts?: boolean;
  /** 第 1 行左：参数一行小字（窗口／区间等）——**同过眉标那道源码标识符筛**（裁定 1 对整条页头成立）。 */
  readonly metaLeft?: string;
  /** B线老A壳第1行右：类型徽章。**由调用方传页型**（如「整体趋势」／「热量趋势」／
   *  「组合分析」）；不传或传空串即**整颗徽章不渲染**（页头回到「meta 一行 ＋ H1」）。
   *  #160 返工：此前缺省值是恒定的「卡路里 · 分析」，出现在每页且从不区分任何东西 ⇒ 删。 */
  readonly badge?: string;
  /** B线老A壳第3行：结论摘要（一句话人话；空串／null＝不出这一行）。 */
  readonly summary?: string | null;
  /** 可打印版式（#448 透传位，口径与 `renderPageShell({ printable })` 逐字一致）：为真时版面根带
   *  `ilife-page-printable`，A线／B线两条路都认；不给／给假 → 产物与旧版逐字相同（类不出现，
   *  样式段里的打印规则一律不命中）。样式与打印规则的唯一定义地在 `base-render/src/blocks.ts`。 */
  readonly printable?: boolean;
  /** **页面级移动端配方（#525）**：为真时这一页继承 HELP 页当刻的手机端能力——断点、44px 触摸区、
   *  `env(safe-area-inset-*)` 安全区、窄屏读数卡栅格与页内导航横滑、窄屏表格卡片化、页内定位，
   *  并拿到三件页面级形状（事实条／图片与 GIF 容器／时间轴条）的样式。
   *  **不给／给假 → 产出物与旧版逐字节相同**（多出的只有这一位；样式与根类都不出现）。
   *  定义地：`base-render/src/pageUi.ts`（配方）＋ `base-render/src/pageShapes.ts`（形状件）。 */
  readonly pageUi?: boolean;
  /** **宽屏单列锁**（#946 同款修法）：为真时在 ≥1001px 的档位把正文子件一律收回 **880 那一列**
   *  （页级配方 ⑧ 默认让读数卡／表／图／折叠区／列表行横跨整壳 1240，比页头三级左右各宽 180px）。
   *  **不给／给假 → 产出物与旧版逐字节相同**（多出的只有这一段 CSS）。见下方 `ONE_COLUMN_CSS`。 */
  readonly lockColumn?: boolean;
  /** **组件层随页挂载**（透传 `renderDocShell({ editableValue })`）：这一页用了公共层
   *  「就地可编辑值」`renderEditableValue` 时给真——组件的样式段与运行时随之挂上。
   *  **不给／给假 → 产出物与旧版逐字节相同**（组件那两段都不出现）。 */
  readonly editableValue?: boolean;
}

/** B线老A壳补丁 CSS（照抄老 combined_analysis.html 实测值；只用冻结 token 名＋#ff9500 字面，不新增变量名）。
 *  **首字符不是换行**：它是 `extraCss` 的一段，段前那个换行由骨架件（`renderDocShell`）补。 */
const BLINE_CSS = '.meta-bar{display:flex;justify-content:space-between;align-items:center;gap:12px;margin-bottom:16px}\n'
  + '.meta-bar .left{font-size:12px;color:var(--fg2)}\n'
  + '.type-badge{font-size:11px;padding:3px 10px;border-radius:6px;background:var(--soft);color:var(--fg2);font-weight:600;white-space:nowrap}\n'
  + '.ilife-block-page-shell-title{font-size:28px;line-height:1.25;font-weight:700;letter-spacing:-.02em;margin-bottom:4px;text-wrap:balance}\n'
  + '.sub{font-size:14px;color:var(--fg3);margin-bottom:24px}\n'
  + '.legend{font-size:12px;color:var(--fg2);margin-top:10px;display:flex;gap:16px;flex-wrap:wrap}\n'
  + '.legend span{display:inline-flex;align-items:center;gap:6px}\n'
  + '.legend i{display:inline-block;width:16px;height:2px}\n'
  + '.legend .b{border-top:2px dashed #ff9500;background:transparent;height:0}\n';

/** 窄屏读数卡两列（`≤640` 恒启用）：公共层同断点是单列（`blocks.ts`），`pageUi` 配方
 *  同断点已是两列（`pageUi.ts`，值逐字同）——未启用配方的页此前仍是单列，在此统一收成两列
 *  （已启用的页无视觉变化；`sportUi` 的 `auto-fit` 在正文样式段里更晚、同权重下仍胜出，
 *  运动族那份刻意保留的版式不受影响）。
 *  单卡守卫：只有一枚卡时保持通栏（`:has` 口径与公共层同）。
 *  **首字符不是换行**：它是 `extraCss` 的一段，段前那个换行由骨架件补（与 `BLINE_CSS` 同口径）。 */
const KPI_MOBILE_CSS = '@media (max-width:640px){'
  + '.ilife-block-page-shell .ilife-block-kpi-card-grid{grid-template-columns:repeat(2,minmax(0,1fr))}'
  + '.ilife-block-page-shell .ilife-block-kpi-card-grid:has(> :only-child){grid-template-columns:minmax(0,1fr)}'
  + '}';

/** **宽屏单列锁**（`lockColumn: true` 时才出这一段；#946 的同一处修法，先例住
 *  `src/render/workoutPlanCss.ts` 的 `PREVIEW_COLUMN_CSS`）。
 *
 *  病：页级配方 ⑧ 在 ≥1001 档把页头三级与正文收成 880 一列居中（`base-render/src/pageUi.ts`），
 *  同时把读数卡／表／图／折叠区／列表行归进「满铺」清单 —— 这些块因此横跨整壳（1280 − 左右各 20
 *  内距 ＝ 1240），比页头左右各宽 180px（#944 故障 1 在归档页 1440／1280 实测；本包档案族
 *  2026-09-24 桌面端复现同形：用户在图上报的正是「内容超出 880 正文列」）。
 *
 *  为什么盖得住公共层那条：选择器与它**同权**（都只到「根类 ＋ 正文容器」两个类），而这一段随
 *  `extraCss` 排在那两段**之后** ⇒ 同权重下后出现者胜；`base-render/**` 一行不动（红线）。
 *  同权是本条的边界：权重再高一点就会连别的页一起改掉，故刻意与它同权。 */
const ONE_COLUMN_CSS = '@media (min-width:1001px){.ilife-page-ui .ilife-block-page-shell-body>*{grid-column:2}}';

/** 眉标里**命令键或英文标识符**的判据：`calorie.view.diet`／`calorie.today`／`app_user` 这类。
 *
 *  `t425-融合基准.md:127-132`（裁定 1）定死「参数名、常量名、英文内部标识符一律不上屏」，
 *  并点名眉标那一行（当时实测「`CALORIE.VIEW.DIET · 饮食域`」漏到用户眼前）。
 *  本判据只挡**含下划线或点号的连写英文小写串**：
 *   · 命中：`calorie.view.diet`（点号连写）、`calorie_data`／`app_user`（下划线连写）；
 *   · 不命中：单段英文（`AI`／`TDEE` 这类整词由各页自己决定要不要写）、中文族名（`条目列表` 是
 *     `t425` 给的样张口径，必须留着）、带空格的英文短语。
 *
 *  为什么要在这里挡：眉标是**唯一**由整页装配层经手的页头字段，`assembleDocPage` 的 30 处调用点里
 *  一半以上写的是命令键；逐页改写等于同一个不许出屏的规则抄 30 份，且新增一页还会漏。
 *  这一道是**恒挡**（不是开关）：漏一行内部叫法就是用户看不懂，没有哪一页需要它。 */
const SOURCE_IDENTIFIER_RE = /[A-Za-z][A-Za-z0-9]*[._][A-Za-z0-9._]+/;

/** 眉标过滤：含源码标识符（命令键／下划线连写英文）即整行不出，其余原样。 */
function screenEyebrow(raw: string): string | null {
  if (raw === '') return null;
  if (SOURCE_IDENTIFIER_RE.test(raw)) return null;
  return raw;
}

/** B线转义（与 blocks.ts 同口径的冻结五字符表，老A壳三行文本字段用）。 */
function blineEsc(value: string): string {
  return value.replace(/[&<>"']/g, (ch) => {
    if (ch === '&') return '&amp;';
    if (ch === '<') return '&lt;';
    if (ch === '>') return '&gt;';
    if (ch === '"') return '&quot;';
    return '&#39;';
  });
}

/** ① 整页装配：区块 HTML ＋ 标题三件套 → 完整文档（图表页多带图表 helpers）。
 * B线新路（给了 metaLeft）：老A壳两行式＝meta-bar（左参数一行＋右页型徽章，**徽章由调用方给、
 * 不给即整颗不渲染**）＋H1（人话短标题）＋结论摘要行；沿用 B-01 类名（不碰类名根），补丁样式只用冻结 token。
 * 可打印位（`printable`，A线／B线共用）只加类名，不加样式、不碰 `extraCss`。
 * 本件只决定「哪一版正文」与「这一页的补丁样式」；文档壳（doctype／槽位序／资产拼接／图表位）交骨架件。 */
export function assembleDocPage(input: DocPageInput): string {
  const charts = input.charts === true;
  const metaLeft = typeof input.metaLeft === 'string' ? screenEyebrow(input.metaLeft) : null;
  const bline = metaLeft !== null;
  /** 可打印位（#448）：只认真真值，不给／给假即老路（与 `renderPageShell` 的口径同）。 */
  const printable = input.printable === true;
  const pageUi = input.pageUi === true;
  /** 组件层随页挂载（editableValue）：组件自带样式与运行时，只有用到它的页才挂。 */
  const editableValue = input.editableValue === true;
  /** 宽屏单列锁（`lockColumn`）：只对开了页面级配方的页有意义——没那一套就没有 880 那一列。 */
  const lockColumn = pageUi && input.lockColumn === true;
  /** 补丁样式按段拼（骨架件负责段前那个换行）：B线老A壳一段、页面级配方两段、
   *  读数卡窄屏两列一段（恒启用：此前未启用配方的页在 `≤640` 仍是单列，见本件 `KPI_MOBILE_CSS`；
   *  `pageUi` 的「不给即逐字节相同」只保它自己的两段）。单列锁排在配方那两段之后（同权重靠后取胜）。 */
  const extraCss = [
    bline ? BLINE_CSS : '',
    pageUi ? pageUiCss() + '\n' + pageShapeCss() : '',
    lockColumn ? ONE_COLUMN_CSS : '',
    KPI_MOBILE_CSS,
  ].filter((seg) => seg !== '').join('\n');
  if (bline) {
    const badge = typeof input.badge === 'string' && input.badge !== '' ? input.badge : null;
    const summary = typeof input.summary === 'string' && input.summary !== '' ? input.summary : undefined;
    const body = '<section class="ilife-block ilife-block-page-shell' + (printable ? ' ilife-page-printable' : '') + '">'
      + '<div class="meta-bar"><div class="left">' + blineEsc(metaLeft as string) + '</div>'
      + (badge === null ? '' : '<div class="type-badge">' + blineEsc(badge) + '</div>') + '</div>'
      + '<h1 class="ilife-block-page-shell-title">' + blineEsc(input.title) + '</h1>'
      + (summary === undefined ? '' : '<p class="sub">' + blineEsc(summary) + '</p>')
      + '<div class="ilife-block-page-shell-body">' + input.content + '</div>'
      + '</section>';
    return renderDocShell({ docTitle: input.docTitle, bodyHtml: body, extraCss, charts, pageUi, editableValue });
  }
  const eyebrow = typeof input.eyebrow === 'string' ? screenEyebrow(input.eyebrow) : null;
  const body = renderPageShell({
    title: input.title,
    ...(eyebrow === null ? {} : { eyebrow }),
    ...(input.subtitle ? { subtitle: input.subtitle } : {}),
    content: input.content,
    printable,
  });
  return renderDocShell({ docTitle: input.docTitle, bodyHtml: body, extraCss, charts, pageUi, editableValue });
}

/** ② 度量投影：stat-metrics 只收确定数字（冻结口径：null／undefined 不进投影）。 */
export function metricsOf(obj: Record<string, number | null | undefined>): Record<string, number> {
  const out: Record<string, number> = {};
  for (const [k, v] of Object.entries(obj)) {
    if (v !== null && v !== undefined) out[k] = v;
  }
  return out;
}

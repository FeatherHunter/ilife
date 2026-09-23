/** T351-v5 · 「看完整计划」一族（`buildPlanResultDoc`，order176–185）的页内样式文本（唯一产出者）。
 * 出处：老模板 `D:\2Study\StudyNotes\SKILLS\卡路里\templates\workout_plan_view.html`（722 行）的
 * `<style>` 段，以及该模板的生产落盘成品 `看完整计划_20260914_141334.html` 的样式段。照搬的是**观感**，
 * 不是它的脚本：老页那三段内联 JS（页签切换／各模式渲染／取数入口）一个字都不搬——本仓契约
 * `docs/base-paint-contract.md` 写死「新契约禁内联脚本（AC-7 零注入面）／共享 JS 文本的唯一产出者」，
 * 页签改由 `./workoutPlanLook.ts` 的「选钮 ＋ label ＋ 兄弟选择器」做，本件只为它按周数生成规则。
 *
 * 为什么是页内样式块：本页要的那套观感（页宽 900、16 圆角卡、胶囊页签、部位彩色徽章）属**页面级**，
 * 公共层样式表（`buildStyleSheet()` ＋ `blocksCss()`）里没有对应样式区，而本单不许动 `packages/base-*`
 * （提到公共层要另开票）。故照包内先例（`diet/libraryDocs.ts` 的 `FOOD_CSS`、`body/bodyDocs.ts` 的
 * `MEASURE_CSS`）落成一件页内 CSS 文本，随正文进内容区——它晚于 head 里的共享样式表，同特异性下本页胜。
 *
 * 老 token 名 → 本仓冻结 token（`CSS_VAR_TOKENS`，契约 §3.2）的映射：老页 `:root` 那 11 个名**一律不重定义**，
 * 只在 `.ilw-app` 作用域里起同义别名——`--ink`→`--fg`（#1d1d1f 同值）、`--ink2`→`--fg2`（同值）、
 * `--ink3`→`--fg3`（同值）、`--card`→`--card`（同值）、`--line`→`--line`（同值）、`--accent`→`--blue`
 * （Q12 已锁 B1 主色；老页 `#0071e3` 与它是同一支），`--green`→`--ok`（同值）、`--bg`→`--bg`。
 * 老页的 `--lineS:#e8e8ed` 在本仓没有冻结对应，照老值写死；`--red`／`--amber` **不用**——老页那两处是
 * 「完成率／漏练」块的色，要完成度数据，属别的命令（`calorie.view.exercise-review` 那一族），本页不造。
 *
 * 双端：老模板两处 `@media(max-width:640px)` 逐条搬（`.app` 内边距／`.session` 内边距／h1 字号／
 * `td` 与 `td:first-child`／`.kpi-grid` 两列＋奇数末位通栏卡）；老页 `.footer` 那一组**不搬**——本页底部
 * 是冻结双按钮（共享复制区），它的双端由共享样式表负责，本页不重画别人的件。
 * 打印：页签是导航件，打印时藏起来，两级面板一律展开（内容在 DOM 里，不靠脚本显示）。
 */
import { pageChromeCss } from './pageChromeCss.js';
/** 部位色板（老 `workout_plan_view.html:185-189` 的 `PART_COLORS` 逐字）：库中词／类名后缀／
 *  rgb 分量／文字色。老页把色值当内联 `style="background:色20;color:色"` 印在每颗徽章上（`色20`
 *  是 12.5% 的十六进制 alpha）；本页一律落类名，正文里零内联样式。 */
const PART_PALETTE: readonly (readonly [string, string, string, string])[] = [
  ['胸', 'chest', '194,65,12', '#c2410c'],
  ['肩', 'shoulder', '161,98,7', '#a16207'],
  ['臂', 'arm', '67,56,202', '#4338ca'],
  ['背', 'back', '4,120,87', '#047857'],
  ['腿', 'leg', '8,145,178', '#0891b2'],
  ['腹', 'abs', '124,58,237', '#7c3aed'],
  ['有氧', 'cardio', '107,114,128', '#6b7280'],
];

/** 清单外的部位走这颗灰徽章（老页 `PART_COLORS[part] || '#6e6e73'` 的兜底）。 */
const PART_OTHER: readonly [string, string, string] = ['other', '110,110,115', '#6e6e73'];

/** 部位词 → 徽章类名后缀（`./workoutMovementTable.ts` 的动作表取它拼 `ilw-pb-<后缀>`）。
 *  类名与色值同出一处：下面生成 CSS 的就是这张表，两边不会走散。 */
export const PART_CLASS: Readonly<Record<string, string>> = Object.freeze(
  Object.fromEntries(PART_PALETTE.map(([word, slug]) => [word, slug])),
);

/** 部位徽章的兜底类名后缀（库里出现清单外部位时用它，不是拼一个不存在的类）。 */
export const PART_FALLBACK_CLASS = PART_OTHER[0];

/** 一条规则的写法（选择器串 ＋ 声明串）；本件只产文本，不做解析。 */
const rule = (selectors: string, decls: string): string => selectors + '{' + decls + '}';

/** 选钮状态选择器串：`#<id>:<state>~.<scope> .<label>[for="<id>"]`，逐 id 拼成一条逗号规则。 */
function stateSel(ids: readonly string[], state: string, scope: string, label: string): string {
  return ids.map((id) => '#' + id + ':' + state + '~.' + scope + ' .' + label + '[for="' + id + '"]').join(',');
}

/** 同上，但把 `::after` **逐条挂在每个选择器后面**——逗号串末尾只挂一个 `::after` 时，
 *  声明会落到整串里**前面那些元素本身**上（激活那枚页签会被绝对定位成一条蓝条），这是实测坑。 */
function stateSelAfter(ids: readonly string[], state: string, scope: string, label: string): string {
  return ids.map((id) => '#' + id + ':' + state + '~.' + scope + ' .' + label + '[for="' + id + '"]::after').join(',');
}

/** **页面级**样式（本族十份都要的那几件）：页宽、窄屏内距、触屏三件、按钮行宽度约束。
 *  T351-v10 起这三件住共用件 `./pageChromeCss.ts`（看计划／复盘／写三族都用），本件只再加本族自己的
 *  可点件触摸目标（周页签 44px／日页签 38px）。185（计划对比实际）没有页签、没有场次卡也没有动作表，
 *  它只要页面级那一段（`planPageCss()`），不背一堆用不上的规则。 */
const PLAN_TOUCH_CSS = [
  '/* 本族可点件的触摸目标（HELP 的两档：主导航 44px、次要 chip 38px） */',
  '.ilw-tab,.ilw-day-tab{display:inline-flex;align-items:center;justify-content:center}',
  '.ilw-tab{min-height:44px}',
  '.ilw-day-tab{min-height:38px}',
].join('\n');

/** 静态段（与周数无关的那部分，住 `.ilw-*` 命名空间）；逐条都对着老模板的对应行写。 */
const STATIC_CSS = [
  '/* 老 token 名的页内别名（--lineS 照老值写死，无冻结对应） */',
  '.ilw-app{--ink:var(--fg);--ink2:var(--fg2);--ink3:var(--fg3);--lineS:#e8e8ed;--accent:var(--blue)}',
  '/* 选钮：视觉上藏起来，仍在文档流里、仍可 Tab 与方向键操作（零脚本的两级页签就靠它） */',
  '.ilw-wkr,.ilw-dyr{position:absolute;width:1px;height:1px;margin:-1px;padding:0;border:0;overflow:hidden;'
    + 'clip:rect(0 0 0 0);white-space:nowrap}',
  '/* 老 .tabs／.tab：周次页签——胶囊＋激活态主色字与下划线。',
  '   T351-v12：窄屏与多周计划（实测 12 周）下原来靠横向滚动，而滚动条被 `scrollbar-width:none` 藏了、',
  '   桌面也没有滚轮横滚的直觉 —— 第 11、12 周等于看不见。改成**换行铺开**：都在页上，点得到。 */',
  '.ilw-tabs{display:flex;flex-wrap:wrap;gap:2px;margin:0 0 18px;border-bottom:1px solid var(--lineS)}',
  '.ilw-tab{flex-shrink:0;padding:10px 18px;font-size:14px;font-weight:500;color:var(--ink2);cursor:pointer;'
    + 'position:relative;border-radius:6px 6px 0 0}',
  '.ilw-tab:hover{color:var(--ink);background:rgba(0,122,255,.06)}',
  '/* 老 .day-tabs／.day-tab：日页签——胶囊＋激活态深底白字；无安排的星期压暗 */',
  '.ilw-day-tabs{display:flex;gap:6px;flex-wrap:wrap;margin:0 0 14px;scrollbar-width:none}',
  '.ilw-day-tabs::-webkit-scrollbar{display:none}',
  '.ilw-day-tab{background:var(--card);border:1px solid var(--lineS);padding:6px 12px;font-size:12.5px;'
    + 'font-weight:500;color:var(--ink2);cursor:pointer;border-radius:8px}',
  '.ilw-day-tab:hover{border-color:var(--accent);color:var(--ink)}',
  '.ilw-off{background:var(--bg);color:var(--ink3)}',
  '/* 周区块与日区块；非激活面板靠本件生成的 :checked 规则收起来 */',
  '.ilw-week{margin:0 0 24px}',
  '.ilw-week-head{margin:0 0 12px;font-size:16px;font-weight:700;color:var(--ink);letter-spacing:-.01em}',
  '.ilw-day{margin:0}',
  '.ilw-none{margin:0 0 12px;padding:16px 18px;border:1px dashed var(--line);border-radius:14px;'
    + 'color:var(--ink3);font-size:13px;text-align:center}',
  '/* 老 .session：白底＋细线＋16 圆角＋淡阴影 */',
  '.ilw-session{background:var(--card);border:1px solid var(--lineS);border-radius:16px;padding:22px 26px;'
    + 'margin-bottom:14px;box-shadow:var(--shadow)}',
  '/* 老 .sess-head：一行信息密度高（周X ｜ 场次名 ｜ 时段 ｜ 共 N 组 ｜ 节奏） */',
  '.ilw-sess-head{display:flex;align-items:center;gap:12px;margin:0 0 14px;padding-bottom:12px;'
    + 'border-bottom:1px solid var(--lineS);flex-wrap:wrap}',
  '.ilw-sess-tag{font-size:11px;'
    + 'color:var(--ink3);background:var(--bg);padding:3px 8px;border-radius:5px}',
  '.ilw-sess-name{font-size:17px;font-weight:600;color:var(--ink)}',
  '.ilw-sess-meta{margin-left:auto;display:flex;flex-wrap:wrap;gap:12px;font-size:12px;color:var(--ink3)}',
  '/* 老表：动作列加粗加宽、表头小字、数值列右对齐。**表头与表体的对齐同出一处**——`renderDataTable` 给',
  '   `th` 与 `td` 盖的是同一个 `ilife-block-data-table-cell-<align>` 类（见 `base-render/src/blocks.ts`），',
  '   本页不再给 `th` 写死 `text-align`（v5 那句 `text-align:left` 会把右对齐列的表头摁回左边 ⇒ 表头与',
  '   表体在纵轴上错开，负责人附图点名）；横向内距也与 `td` 同值（右 10px／左 0），故同一列的**单元格边界',
  '   与文字边界都逐列相等**（同一张 `<table>` 共用一个格网，列宽不需要第二套规则）。 */',
  '.ilw-session .ilife-block-data-table{border:0;border-radius:0;background:transparent}',
  '.ilw-session th{padding:8px 10px 8px 0;border-bottom:1px solid var(--lineS);color:var(--ink3);'
    + 'font-size:11px;font-weight:500;letter-spacing:.06em;white-space:nowrap}',
  '.ilw-session td{padding:12px 10px 12px 0;border-bottom:1px solid var(--lineS);color:var(--ink2);'
    + 'font-size:13px;vertical-align:top}',
  '.ilw-session tr:last-child td{border-bottom:0}',
  '.ilw-session td:first-child{color:var(--ink);font-weight:500;min-width:160px}',
  '.ilw-session td:first-child strong{font-weight:600}',
  '/* 副行小字只收紧间距：字号与色仍走共享位的口径行（`renderCaliberLine` 的 ilife-block-caliber，',
  '   12px ＋ --fg2，达 AA 对比度；老页那版 11px ＋ #86868b 因对比度 3.62:1 已被共享样式表否掉） */',
  '.ilw-session .ilife-block-caliber{margin:2px 0 0}',
  '/* 老 .rest-day：休息日卡居中留白 */',
  '.ilw-rest{padding:40px;text-align:center;color:var(--ink3)}',
  '.ilw-rest-title{margin:0 0 8px;font-size:20px;font-weight:600;color:var(--ink)}',
  '.ilw-rest-note{margin:0;font-size:13px}',
  '/* 打印：页签是导航件不印，两级面板一律展开（内容在 DOM 里，不靠脚本显示） */',
  '@media print{.ilw-wkr,.ilw-dyr,.ilw-tabs,.ilw-day-tabs{display:none}'
    + '.ilw-week{display:block !important}.ilw-day:not(.ilw-day-empty){display:block !important}'
    + '.ilw-day-empty{display:none !important}.ilw-session{break-inside:avoid;box-shadow:none}}',
  '/* ── T351-v9 · 负责人 2026-09-15 六条口径落点 ─────────────────────────────',
  '   ⑤ 不用 `·` 顶替设计：四处串字符串的元素改成有形状的件 —— 周区块标题的场次胶囊',
  '      （`.ilw-week-count`）、休息日的星期小 chip（复用 `.ilw-sess-tag`）、动作副行的两颗小标签',
  '      （`.ilw-sub-detail` / `.ilw-sub-type`）、页头下的计划信息条（`.ilw-meta` ＋ `.ilw-chip`）。',
  '   ② 手机端照 HELP（`packages/base-render/src/helpShell.ts`）：触摸目标 ＋ 触屏三件 ＋',
  '      按钮行自约束 520 居中 ＋ 窄屏塌列，断点用 HELP 的 820。 */',
  '/* 动作副行：原来是一行「细化词 · 类型」，`·` 是拿符号顶替设计；改成两颗块级小标签。',
  '   字号 12 ＋ 浅底，与共享口径行同值（共享那件是纯文本单参、会转义，装不下标签，故本页自落一行）。 */',
  '.ilw-sub{margin:3px 0 0;display:flex;flex-wrap:wrap;align-items:center;gap:4px}',
  '.ilw-sub-detail{font-size:12px;color:var(--ink2);background:var(--bg);border-radius:5px;padding:1px 6px}',
  '.ilw-sub-type{font-size:12px;font-weight:600;color:var(--accent);background:rgba(0,122,255,.08);'
    + 'border-radius:5px;padding:1px 6px}',
  '/* 周区块标题：场次数做成胶囊（标题说「哪一周」、胶囊说「几场」，两件事各就各位） */',
  '.ilw-week-head{display:flex;align-items:center;gap:8px}',
  '.ilw-week-count{font-size:12px;font-weight:600;color:var(--ink2);background:var(--bg);'
    + 'border-radius:999px;padding:2px 10px}',
  '/* 休息日标题：星期小 chip（与场次卡同款）＋ 状态词 */',
  '.ilw-rest-title{display:flex;align-items:center;justify-content:center;gap:8px}',
  '.ilw-rest-txt{font-size:20px;font-weight:600;color:var(--ink)}',
  '/* 计划信息条：起日与计划说明。说明原文里若带 `·`（老技能当年就是这么写的），拆成胶囊排开 */',
  '.ilw-meta{display:flex;flex-wrap:wrap;align-items:center;gap:8px;margin:0 0 14px}',
  '.ilw-meta-k{font-size:12px;color:var(--ink3)}',
  '.ilw-meta-v{font-size:13px;font-weight:600;color:var(--ink);font-variant-numeric:tabular-nums}',
  '.ilw-chip{font-size:12px;font-weight:600;color:var(--ink2);background:var(--card);'
    + 'border:1px solid var(--lineS);border-radius:999px;padding:3px 10px}',
  '.ilw-chip-strong{color:var(--accent);background:rgba(0,122,255,.08);border-color:transparent}',
  '/* 老模板第二处 @media：本页自造的件在窄屏塌列（断点用 HELP 的 820，不用老模板的 640）。',
  '   共享区块自己那处 640 不撤——820 管本页，640 管共享件，两段同向不打架。 */',
  '@media (max-width:820px){',
  '.ilw-session{padding:16px 14px}',
  '.ilw-sess-head{gap:8px;padding-bottom:10px}',
  '.ilw-sess-name{font-size:16px}',
  '.ilw-sess-meta{width:100%;margin-left:0;gap:8px}',
  '.ilw-tab{padding:9px 12px;font-size:13px}',
  '.ilw-day-tab{padding:5px 10px;font-size:12px}',
  '.ilw-session td{padding:10px 4px 10px 0;font-size:12px}',
  '.ilw-session th{padding:6px 4px 6px 0}',
  '.ilw-session td:first-child{min-width:104px}',
  '.ilw-rest{padding:26px 14px}',
  '.ilw-rest-title{flex-direction:column;gap:6px}',
  '.ilw-rest-txt{font-size:18px}',
  '}',
].join('\n');

/** 部位徽章规则（与 `PART_CLASS` 同源生成；清单外词的兜底也在内）。 */
function badgeCss(): string {
  return [...PART_PALETTE.map(([, slug, rgb, ink]) => [slug, rgb, ink] as const), PART_OTHER]
    .map(([slug, rgb, ink]) => rule('.ilw-pb-' + slug, 'background:rgba(' + rgb + ',.13);color:' + ink))
    .join('\n');
}

/** 本族**页面级**样式块（共用件的页面级段 ＋ 本族可点件的触摸目标）：给 185 那种
 *  「只有共享区块、没有页签与场次卡」的页用，不背一堆用不上的 `.ilw-*` 规则。 */
export function planPageCss(): string {
  return pageChromeCss(900) + '<style>\n' + PLAN_TOUCH_CSS + '\n</style>';
}

/** #946 · 写前预览页的**同权单列规则**（#944 故障 1 的修法）。
 *
 *  病：页级配方 ⑧ 在 ≥1001 档把正文收成 880 一列居中（`packages/base-render/src/pageUi.ts:263-274`），
 *  同时把 `.ilife-block-data-table` 归进「满铺」清单（同件 `:276-284`）——本页「改前／改后」两张表因此
 *  横跨整壳（1280 − 左右各 20 内距 ＝ 1240），比页头三级（880）左右各宽 180px（归档页 1440／1280 实测）。
 *  修法＝**本页**把正文子件一律收回中间那一列，公共层一行不动（`base-render/**` 属 #921／#919 的盘子）。
 *
 *  为什么能盖住公共层那条：选择器与它**同权**（都是「根类 ＋ 正文容器」两个类 ＋ 0 权的通配／`:where()`），
 *  而本页样式段随正文进内容区、**晚于** head 里的共享样式表 ⇒ 同权重下后者胜（同权重、后出现）。
 *  权重再高一点就会连「本页只想收回自己这一页」的边界也一起改，故刻意与它同权。 */
const PREVIEW_COLUMN_CSS = '@media (min-width:1001px){.ilife-page-ui .ilife-block-page-shell-body>*{grid-column:2}}';

/** 写前预览页（`buildPlanProcessDoc`）的页内样式块：页面级段（`pageChromeCss(960)`，本页原来的页宽口径）
 *  ＋ 上面那一条同权单列规则。本族另外两页（看计划／计划对比实际）不受影响——本条只随本页产物出。 */
export function planPreviewCss(): string {
  return pageChromeCss(960) + '<style>\n' + PREVIEW_COLUMN_CSS + '\n</style>';
}

/** 页内样式块（含 `<style>` 包裹，照包内先例 `FOOD_CSS`／`MEASURE_CSS` 直插正文）：页面级段 ＋
 *  本族静态段 ＋ 按周数生成的页签规则（零脚本页签的另一半）。`weekCount` ＝ 页内周区块数
 *  （0 ＝ 无周区块，两层页签都不出现，此处只出静态段）。
 *  v6：两级页签里没有「全部周次」／「全部」两枚（负责人裁定去掉），各层恒有且只有一枚默认选中，
 *  故收放规则只剩「先全收、再放选中的那一枚」这半边——没有「放全部」的规则了。 */
export function planViewCss(weekCount: number): string {
  const n = Number.isFinite(weekCount) && weekCount > 0 ? Math.floor(weekCount) : 0;
  const wkIds = Array.from({ length: n }, (_, i) => 'ilw-wk-' + i);
  const dyn: string[] = [
    '.ilw-pb{display:inline-block;font-size:10.5px;font-weight:600;padding:2px 7px;border-radius:4px;'
      + 'white-space:nowrap}',
    badgeCss(),
    '/* 周次页签激活态：主色字＋下划线（老 .tab.active／.tab.active::after） */',
    rule(stateSel(wkIds, 'checked', 'ilw-tabs', 'ilw-tab'), 'color:var(--accent);font-weight:600'),
    stateSelAfter(wkIds, 'checked', 'ilw-tabs', 'ilw-tab')
      + '{content:"";position:absolute;left:12px;right:12px;bottom:-1px;height:2px;'
      + 'background:var(--accent);border-radius:1px}',
    rule(stateSel(wkIds, 'focus-visible', 'ilw-tabs', 'ilw-tab'), 'outline:2px solid var(--accent);'
      + 'outline-offset:2px'),
    '/* 周面板：任一周页签被选中先全收，再放选中的那一个（默认选中项由装配件钉在「本周」上） */',
    '.ilw-wkr:checked~.ilw-week{display:none}',
    ...Array.from({ length: n }, (_, i) => '#ilw-wk-' + i + ':checked~.ilw-week[data-wk="' + i + '"]{display:block}'),
  ];
  for (let i = 0; i < n; i += 1) {
    const dyIds = Array.from({ length: 7 }, (_, d) => 'ilw-dy-' + i + '-' + (d + 1));
    dyn.push('/* 第 ' + (i + 1) + ' 组日页签：激活态深底白字（老 .day-tab.active）＋面板收放 */');
    dyn.push(rule(stateSel(dyIds, 'checked', 'ilw-day-tabs', 'ilw-day-tab'),
      'background:var(--ink);border-color:var(--ink);color:#fff'));
    dyn.push(rule(stateSel(dyIds, 'focus-visible', 'ilw-day-tabs', 'ilw-day-tab'),
      'outline:2px solid var(--accent);outline-offset:2px'));
    dyn.push('.ilw-dyr:checked~.ilw-day{display:none}');
    for (let d = 1; d <= 7; d += 1) {
      dyn.push('#ilw-dy-' + i + '-' + d + ':checked~.ilw-day[data-dow="' + d + '"]{display:block}');
    }
  }
  return pageChromeCss(900) + '<style>\n' + PLAN_TOUCH_CSS + '\n' + STATIC_CSS + '\n'
    + dyn.join('\n') + '\n</style>';
}

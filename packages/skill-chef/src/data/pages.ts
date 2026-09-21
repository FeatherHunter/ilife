/** 数据管理能力的页面装配（三卡各一页，区块全走公共层，页内只追加本域自己的一段样式）。
 *
 * 配方来源：`docs/skills/skill-chef/t768-页面族配方.md`
 *   · 体检走结果型（结论条＋事实条＋完整度条＋逐菜折叠）；
 *   · 批量改走过程型目标形态（事实条＋变更行＋动作行＋复制区）；
 *   · 备份走回执型（结论条＋事实条＋动作行＋复制区）。
 * 老件对照：体检逐菜详情见 `data_quality_report.html`，批量三页见 `batch_edit.html`，
 * 备份完成页见 `backup_receipt.html`（信息组织取老件，视觉走公共层）。
 *
 * 样式分两层（不许拆）：公共层皮肤走 `chefSceneCss()` 一个入口，页内专属的版式（逐菜卡里的完整度条、
 * 变更行的卡、复制按钮不铺满整行、页内插图）由 `dataSeatCss()` 追加在它后面。
 *
 * #871 E 类裁定（2026-09-21）：原体检页／备份页各有一组**读数卡**（`renderKpiGrid`，3 张），
 * 读数与紧邻的事实条**同源重复**；公共层 `pageUi` ⑥ 在 ≤640 档把读数卡栅格写成两列 ⇒ 3 张卡必然
 * 排成「两格 ＋ 一张孤卡、右侧整格空着」（390 端实测，终审 68 分那一格）。本包不许改公共层，
 * 故在页面侧收口：**读数只留事实条一份**（flex 按内容换行，无栅格空位），不再出读数卡网格。
 * 若日后要恢复三格读数卡，须先给公共层补「奇数格在 ≤640 档」一条规则（另立票，见 #871 遗留出口）。
 */

import { CHART_PALETTE, renderActionBar, renderFactStrip } from 'base-paint';
import {
  renderCaliberLine,
  renderChangeRows,
  renderChipRow,
  renderConclusionBar,
  renderCopyBlock,
  renderDisclosure,
  renderDistributionRows,
  renderPageShell,
  renderProseBlock,
} from 'base-paint/blocks';
import { renderDocShell } from 'base-paint/docShell';
import { chefSceneCss } from '../render/skin.js';

/** 换行（仓库口径：不写字面换行转义，与 `blocks.ts`／`skin.ts` 同）。 */
const LF = String.fromCharCode(10);

/** 完整度条的填充色：达标取主色，未达标取品牌暖色（`CHART_PALETTE` 同族，不新造色值）。
 *  只用两色：四档深浅都要另立语义，本页只有「够不够 80 分」这一个判断。 */
const BAR_DONE = '--blue';
const BAR_SHORT = CHART_PALETTE[2];

/** 页族插画带的三张形状（对 720×120 的画布，纯装饰、不载读数，图形居中在 x=360 一处）：
 *  · 体检＝一张体检表（三行读数里最后一行落暖色）＋ 一枚带勾的暖色印记；
 *  · 批量改＝改前改后两张表 ＋ 中间一支主色箭头（暖色只落在「改后」那一栏，与变更行的语义同族）；
 *  · 备份＝叠起来的表 ＋ 一枚带勾的暖色印记。
 *  两张表／一叠表的形状是「这一页在处理几条记录」的图形记号，不带任何具体数字。 */
const FIGURE_ART = {
  quality: [
    '<rect x="316" y="22" width="88" height="76" rx="8" fill="var(--card)" stroke="var(--line)"/>',
    '<rect x="332" y="38" width="56" height="7" rx="3.5" fill="var(--soft)"/>',
    '<rect x="332" y="53" width="40" height="7" rx="3.5" fill="var(--soft)"/>',
    '<rect x="332" y="68" width="48" height="7" rx="3.5" fill="url(#chefDataWarm)"/>',
    '<circle cx="410" cy="86" r="13" fill="url(#chefDataWarm)"/>',
    '<path d="M404 86 l5 5 9 -10" fill="none" stroke="var(--card)" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>',
  ].join(''),
  batch: [
    '<rect x="264" y="30" width="72" height="60" rx="8" fill="var(--card)" stroke="var(--line)"/>',
    '<rect x="276" y="46" width="48" height="7" rx="3.5" fill="var(--soft)"/>',
    '<rect x="276" y="61" width="30" height="7" rx="3.5" fill="var(--soft)"/>',
    '<path d="M346 60 H374" stroke="var(--blue)" stroke-width="4" stroke-linecap="round"/>',
    '<path d="M366 50 l10 10 -10 10" fill="none" stroke="var(--blue)" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/>',
    '<rect x="384" y="30" width="72" height="60" rx="8" fill="var(--card)" stroke="var(--line)"/>',
    '<rect x="396" y="46" width="48" height="7" rx="3.5" fill="url(#chefDataWarm)"/>',
    '<rect x="396" y="61" width="30" height="7" rx="3.5" fill="var(--soft)"/>',
  ].join(''),
  backup: [
    '<rect x="330" y="18" width="72" height="16" rx="5" fill="var(--card)" stroke="var(--line)"/>',
    '<rect x="316" y="30" width="100" height="18" rx="6" fill="var(--card)" stroke="var(--line)"/>',
    '<rect x="300" y="44" width="132" height="54" rx="8" fill="var(--card)" stroke="var(--line)"/>',
    '<rect x="316" y="58" width="64" height="7" rx="3.5" fill="var(--soft)"/>',
    '<rect x="316" y="73" width="42" height="7" rx="3.5" fill="var(--soft)"/>',
    '<circle cx="410" cy="84" r="13" fill="url(#chefDataWarm)"/>',
    '<path d="M404 84 l5 5 9 -10" fill="none" stroke="var(--card)" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>',
  ].join(''),
} as const;

/** 带里两侧的「记录」记号（越往外越小越淡）：把整条带铺满，不留一片空槽
 *  （#873 第二轮复评点名「桌面端中间空槽浪费空间」，就是只摆一个居中图形留下的两侧空白）。 */
function recordMark(x: number, y: number, scale: number, opacity: string): string {
  return '<g opacity="' + opacity + '" transform="translate(' + x + ',' + y + ') scale(' + scale + ')">'
    + '<rect x="0" y="0" width="72" height="60" rx="8" fill="var(--card)" stroke="var(--line)"/>'
    + '<rect x="12" y="16" width="40" height="7" rx="3.5" fill="var(--soft)"/>'
    + '<rect x="12" y="31" width="26" height="7" rx="3.5" fill="var(--soft)"/>'
    + '</g>';
}

/** 页族插画带里两侧的记号（左右各两枚，由内向外变小变淡）——节奏件，不载任何读数。 */
const FIGURE_EDGE = recordMark(58, 48, 0.5, '.28') + recordMark(148, 34, 0.66, '.5')
  + recordMark(478, 34, 0.66, '.5') + recordMark(572, 48, 0.5, '.28');

/** 页族插画带（纯装饰）：一条满宽的浅暖底横带 ＋ 上面的图形记号。不写一个字，读屏器不进。
 *  暖色取自 `CHART_PALETTE`（与皮肤的品牌带同两枚），底衬与描边走冻结 token。
 *  画布给 720×120、`slice` 铺满：**窄档不让整张图等比缩成一条细线**——记号按高度缩放、
 *  两侧的短条记号先被裁掉，图形本身在 390 与 1280 两档都保持同样大小。 */
function seatFigure(kind: 'quality' | 'batch' | 'backup'): string {
  return '<figure class="chef-data-figure" aria-hidden="true">'
    + '<svg viewBox="0 0 720 120" preserveAspectRatio="xMidYMid slice" focusable="false">'
    + '<defs>'
    + '<linearGradient id="chefDataWash" x1="0" y1="0" x2="1" y2="0">'
    + '<stop offset="0" stop-color="' + CHART_PALETTE[6] + '" stop-opacity=".20"/>'
    + '<stop offset="1" stop-color="' + CHART_PALETTE[2] + '" stop-opacity=".06"/>'
    + '</linearGradient>'
    + '<linearGradient id="chefDataWarm" x1="0" y1="0" x2="1" y2="1">'
    + '<stop offset="0" stop-color="' + CHART_PALETTE[6] + '"/>'
    + '<stop offset="1" stop-color="' + CHART_PALETTE[2] + '"/>'
    + '</linearGradient>'
    + '</defs>'
    + '<rect x="0" y="0" width="720" height="120" fill="url(#chefDataWash)"/>'
    + FIGURE_EDGE
    + FIGURE_ART[kind]
    + '</svg></figure>';
}

/** 本域三页共用的页内版式（追加在公共层皮肤之后，改的只是本页自己的排版）。 */
function dataSeatCss(page: 'quality' | 'batch' | 'backup'): string {
  const root = '.ilife-page-ui';
  const rules = [
    // 复制区里「只有一颗复制按钮」的那一行，公共层让它铺满整行（≤640 给 520px 上限、≥641 铺满内容列）
    // ⇒ 桌面档会拖出一条 880px 的空胶囊，读起来像一个没写完的框。本域两页按内容宽收口。
    root + ' .ilife-block-copy-block .ilife-action-row-ghost-single {',
    '  grid-template-columns: max-content;',
    '}',
    // 页族插画带：整宽一条定高的带（窄档 96px／宽档 132px），面板的底与描边走 CSS，
    // 图形交给 SVG 按高度铺满——窄档不再是一条「小插图 ＋ 大片空白」的横槽。
    root + ' .chef-data-figure {',
    '  display: block;',
    '  box-sizing: border-box;',
    '  width: 100%;',
    '  height: 88px;',
    '  margin: 14px 0 0;',
    '  overflow: hidden;',
    '  border: 1px solid var(--line);',
    '  border-radius: 14px;',
    '}',
    root + ' .chef-data-figure svg {',
    '  display: block;',
    '  width: 100%;',
    '  height: 100%;',
    '}',
    // 页尾一对：装饰带与复制区并排（宽档两栏、窄档上下），两件之间恒留 12px 气口
    // （窄档紧贴会被读成一块，见图即上下两段）。
    root + ' .chef-data-pair {',
    '  display: grid;',
    '  gap: 12px;',
    '}',
    '@media (min-width: 1001px) {',
    '  ' + root + ' .chef-data-figure {',
    '    height: 116px;',
    '  }',
    '  ' + root + ' .chef-data-pair {',
    '    grid-template-columns: 340px minmax(0, 1fr);',
    '    align-items: start;',
    '    column-gap: 16px;',
    '  }',
    '  ' + root + ' .chef-data-pair .chef-data-figure {',
    '    margin: 0;',
    '  }',
    '  ' + root + ' .chef-data-pair .ilife-block-copy-block {',
    '    margin: 0;',
    '  }',
    '}',
  ];
  if (page === 'quality') {
    rules.push(
      // 完整度条落在逐菜卡里面：与下面那排五项读数胶囊拉开 10px（它是这张卡的抬头，不是读数的一部分）。
      root + ' .ilife-block-disclosure-body .ilife-block-dist-row {',
      '  margin-bottom: 10px;',
      '}',
      // 名称从 `--fg2` 提到 `--fg`：卡片里它才是主信息，条只是它的形状。
      root + ' .ilife-block-dist-row-name {',
      '  color: var(--fg);',
      '  font-weight: 600;',
      '}',
      // 复评点名「进度条与标签略显单薄」：条抬到 12px、分数抬到 15px，
      // 五项读数胶囊补一档内距（窄档下每个胶囊自己看得见，不再是一片小字）。
      root + ' .ilife-block-dist-row-bar {',
      '  height: 12px;',
      '}',
      root + ' .ilife-block-dist-row-val {',
      '  font-size: 15px;',
      '}',
      root + ' .ilife-block-disclosure-body .ilife-block-chip {',
      '  padding: 4px 10px;',
      '}',
    );
  }
  if (page === 'batch') {
    rules.push(
      // 变更行：改前是一条「上边框 ＋ 一行字」，标签在左、新旧值被 `flex:1` 推到最右缘（1280 档两者
      // 相隔 800px）。收成一张卡，标签按内容宽、新旧值紧随其后——改了什么一眼看完。
      root + ' .ilife-block-change-row {',
      '  box-sizing: border-box;',
      '  align-items: center;',
      '  padding: 10px 14px;',
      '  border: 1px solid var(--line);',
      '  border-left: 3px solid var(--blue);',
      '  border-radius: 14px;',
      '  background: var(--card);',
      '}',
      root + ' .ilife-block-change-row + .ilife-block-change-row {',
      '  margin-top: 8px;',
      '}',
      root + ' .ilife-block-change-row-label {',
      '  flex: 0 1 auto;',
      '}',
    );
  }
  if (page !== 'quality') {
    rules.push(
      // 宽档（≥1001）：复制区收成一行——标题与说明在左、按钮贴右。改前它是一张满宽卡，
      // 内容全堆在左上角（复评点名「说明卡片内容稀松、以小宽度居中」）。
      '@media (min-width: 1001px) {',
      '  ' + root + ' .ilife-block-copy-block {',
      '    display: grid;',
      '    grid-template-columns: minmax(0, 1fr) auto;',
      '    column-gap: 16px;',
      '    align-items: center;',
      '  }',
      '  ' + root + ' .ilife-block-copy-block-title {',
      '    grid-column: 1;',
      '    margin: 0;',
      '  }',
      '  ' + root + ' .ilife-block-copy-block-hint {',
      '    grid-column: 1;',
      '    margin: 2px 0 0;',
      '  }',
      '  ' + root + ' .ilife-block-copy-block .ilife-action-bar {',
      '    grid-column: 2;',
      '    grid-row: 1 / span 2;',
      '    margin: 0;',
      '  }',
      '}',
    );
  }
  return rules.join(LF);
}

function shell(title: string, eyebrow: string, blocks: string[], page: 'quality' | 'batch' | 'backup'): string {
  return renderDocShell({
    docTitle: title,
    bodyHtml: renderPageShell({ eyebrow, title, content: blocks.join('') }),
    extraCss: chefSceneCss() + LF + dataSeatCss(page),
    pageUi: true,
  });
}

export interface QualityItem {
  name: string;
  score: number;
  ingredients_count: number;
  steps_count: number;
  tips_count: number;
  techniques_count: number;
  has_background: boolean;
  missing: string[];
}

/** 体检页（结果型）。 */
export function dataQualityPage(input: { items: QualityItem[] }): string {
  const worst = input.items[0];
  const full = input.items.filter((x) => x.score >= 80).length;
  const todo = input.items.filter((x) => x.score < 80).length;
  const blocks = [
    renderConclusionBar(
      worst ? '先补「' + worst.name + '」：完整度 ' + worst.score + ' 分。' : '还没有菜谱可以体检。',
    ),
    renderFactStrip({
      items: [
        { label: '菜数', value: String(input.items.length) + '道' },
        { label: '达标', value: String(full) + '道', tone: full > 0 ? 'ok' : 'warn' },
        // 达标＝够 80 分，「待补」就是差在这一档上的菜数（与结论条点名的同一批）。
        { label: '待补', value: String(todo) + '道', tone: todo > 0 ? 'warn' : 'ok' },
        { label: '达标线', value: '80 分' },
      ],
    }),
    // 页族插画带：读数与逐菜卡之间一条图形记号（本轮复评点名「桌面端卡片横向留白过多却未补视觉元素」）。
    seatFigure('quality'),
    // 逐菜一张卡（默认展开）：抬头是完整度条（条长＝得分，0–100 取数侧的五项公式），
    // 下面接五项读数与缺口。一处读数只画一遍——不再另出与它同源的读数卡或第二名册。
    // 默认全展开（#873 复评实测：只开最差那道时其余两张卡只剩一行菜名，两视口都被读成留白，总分反而低 5 分）。
    ...input.items.map((it) =>
      renderDisclosure({
        title: it.name,
        open: true,
        contentHtml:
          renderDistributionRows({
            rows: [{
              label: '完整度',
              value: it.score + ' 分',
              pct: it.score,
              color: it.score >= 80 ? BAR_DONE : BAR_SHORT,
            }],
          }) +
          // 五项读数并排成一串小胶囊：窄档下是「食材 0 味」这种一格一事（不用两列表——两列表在
          // ≤640 会逐格折成「列名一行＋值一行」，五行读数被摊成十行，正是「列名与正文同号」那一类病）。
          renderChipRow({
            items: [
              { text: '食材 ' + String(it.ingredients_count) + ' 味' },
              { text: '步骤 ' + String(it.steps_count) + ' 步' },
              { text: '贴士 ' + String(it.tips_count) + ' 条' },
              { text: '技法 ' + String(it.techniques_count) + ' 个' },
              { text: '背景 ' + (it.has_background ? '有' : '无') },
            ],
          }) +
          // 缺口逐条并成一行（各条原本各占一句、句首都挂同一菜名，读起来是同一个词重复五遍）。
          // 菜名带着走：同一道菜的缺口句在页里唯一，不会与别的菜的同类句撞成重复行。
          (it.missing.length
            ? renderProseBlock({ text: it.name + '还缺：' + it.missing.join('、') + '。' })
            : renderProseBlock({ text: it.name + '五项齐全，不用补。' })),
      }),
    ),
    renderCaliberLine('评分只看完整度，口碑不计入。'),
    renderActionBar({
      buttons: [
        { label: '补最差那道菜', kind: 'primary', actionId: 'quality-fix' },
        { label: '导出一份备份', kind: 'ghost', actionId: 'quality-backup' },
      ],
    }),
  ];
  return shell('数据质量报告', '私家大厨 ｜ 数据管理', blocks, 'quality');
}

/** 批量改页（过程型目标形态：改前对比＋回执）。 */
export function dataBatchPage(input: { name: string; diffs: { field: string; before: string; after: string }[] }): string {
  const blocks = [
    // 结论条一句话交代这一页的两件事（改的边界 ＋ 已核对），不再另起一行说同一件事。
    renderConclusionBar('只改已经有的食材与步骤，改前改后已对上。'),
    renderFactStrip({
      items: [
        { label: '菜名', value: input.name },
        { label: '改动', value: String(input.diffs.length) + '处' },
      ],
    }),
    renderChangeRows({
      rows: input.diffs.map((d) => ({ label: d.field, before: d.before || '无', after: d.after || '无' })),
    }),
    renderCaliberLine('用量与时长要写数字。'),
    renderActionBar({
      buttons: [
        { label: '复制改动', kind: 'primary', actionId: 'batch-copy' },
        { label: '再看一遍菜谱', kind: 'ghost', actionId: 'batch-view' },
      ],
    }),
    // 页尾一对：装饰带与复制区并排（宽档两栏、窄档上下），把页底那一横排铺满，
    // 不再留一条「整宽装饰带 ＋ 下面一张稀疏卡」的空槽（#873 第二轮复评点名的同一条）。
    '<div class="chef-data-pair">'
      + seatFigure('batch')
      + renderCopyBlock({
        // 只说一次「复制」：按钮那块已经在动作行里说过了（#873 复评点名的同义复述）。
        title: '改动说明',
        dataActionId: 'batch-copy-data',
        dataText: input.name + '改' + input.diffs.length + '处：' + input.diffs.map((d) => d.field + d.before + '到' + d.after).join('；'),
      })
      + '</div>',
  ];
  return shell('批量改回执', '私家大厨 ｜ 数据管理', blocks, 'batch');
}

/** 备份回执页（回执型）。 */
export function dataBackupPage(input: { recipeCount: number; tableCount: number; bytes: number }): string {
  const blocks = [
    renderConclusionBar('备份已经落盘，一次导出全部数据。'),
    renderFactStrip({
      items: [
        { label: '菜数', value: String(input.recipeCount) + '道' },
        { label: '表数', value: String(input.tableCount) + '张' },
        { label: '大小', value: String(input.bytes) + '字节' },
      ],
    }),
    // 回执页只留一句旁注（原来那句「恢复时…定时与增量以后再做」是排期口吻，复评点名多余）。
    renderCaliberLine('默认不含已废弃的菜。'),
    renderActionBar({
      buttons: [
        { label: '看看全部菜谱', kind: 'primary', actionId: 'backup-list' },
        { label: '再备一份', kind: 'ghost', actionId: 'backup-again' },
      ],
    }),
    // 页尾一对：装饰带与复制区并排（宽档两栏、窄档上下），与本域批量改页同一处置，
    // 页底那一横排不再是一条空槽。
    '<div class="chef-data-pair">'
      + seatFigure('backup')
      + renderCopyBlock({
        title: '复制备份回执',
        hint: '复制的是这份回执原文，随文件一起留档。',
        dataActionId: 'backup-copy-data',
        dataText: '已备份' + input.recipeCount + '道菜（' + input.tableCount + '张表，共' + input.bytes + '字节）。',
      })
      + '</div>',
  ];
  return shell('备份回执', '私家大厨 ｜ 数据管理', blocks, 'backup');
}

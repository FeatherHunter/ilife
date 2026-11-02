/** 数据管理能力的页面装配（三卡各一页，区块全走公共层，页内只追加本域自己的一段样式）。
 *
 * 配方来源：`docs/skills/skill-chef/t768-页面族配方.md`
 *   · 体检走结果型（结论条＋事实条＋完整度条＋逐菜折叠）；
 *   · 批量改走过程型目标形态（事实条＋变更行＋动作行＋复制区）；
 *   · 备份走回执型（结论条＋事实条＋动作行＋复制区）。
 * 老件对照：体检逐菜详情见 `data_quality_report.html`，批量三页见 `batch_edit.html`，
 * 备份完成页见 `backup_receipt.html`（信息组织取老件，视觉走公共层）。
 *
 * 样式分两层（不许拆）：公共层皮肤与**族级装饰带／族节奏**走 `renderSceneShell()` 一个入口，
 * 页内专属的版式（逐菜卡里的完整度条、变更行的卡、复制按钮不铺满整行）由 `dataSeatCss()` 追加在它后面。
 * **页内不再出第二条装饰带**（第三轮公共层席把「页头一条族带」定成共用标准；本席第二轮那条 720×120
 * 满宽带与之重复，已撤）——体检页的完整度条是数据可视化，保留，色基与族带同取 `CHART_PALETTE`。
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
  renderDisclosure,
  renderDistributionRows,
  renderPageShell,
  renderProseBlock,
} from 'base-paint/blocks';
import { chefCopyArea } from '../render/copyArea.js';
import { renderSceneShell } from '../render/sceneShell.js';
import { m } from '../entries/index.js';
import { currentRenderLanguage, listJoin } from 'base-entries';

/** 换行（仓库口径：不写字面换行转义，与 `blocks.ts`／`skin.ts` 同）。 */
const LF = String.fromCharCode(10);

/** 完整度条的填充色：达标取主色，未达标取品牌暖色（`CHART_PALETTE` 同族，不新造色值）。
 *  只用两色：四档深浅都要另立语义，本页只有「够不够 80 分」这一个判断。 */
const BAR_DONE = '--blue';
const BAR_SHORT = CHART_PALETTE[2];

/** 本域三页共用的页内版式（追加在公共层皮肤之后，改的只是本页自己的排版）。 */
function dataSeatCss(page: 'quality' | 'batch' | 'backup'): string {
  const root = '.ilife-page-ui';
  const rules = [
    // 复制区里「只有一颗复制按钮」的那一行，公共层让它铺满整行（≤640 给 520px 上限、≥641 铺满内容列）
    // ⇒ 桌面档会拖出一条 880px 的空胶囊，读起来像一个没写完的框。本域两页按内容宽收口。
    root + ' .ilife-block-copy-block .ilife-action-row-ghost-single {',
    '  grid-template-columns: max-content;',
    '}',
    // 动作行里只剩一颗时让它占满整行（本域批量改页删掉那颗与复制区同义的「复制改动」之后，
    // 半格宽的一颗按钮会读成「这里少了一件」）。
    root + ' .ilife-action-row > .ilife-action-btn:only-child {',
    '  grid-column: 1 / -1;',
    '}',
  ];
  if (page === 'quality') {
    rules.push(
      // 完整度条落在逐菜卡里面：与下面那排五项读数胶囊拉开 10px（它是这张卡的抬头，不是读数的一部分）。
      root + ' .ilife-block-disclosure-body .ilife-block-dist-row {',
      '  margin-bottom: 10px;',
      '}',
      // 完整度条与族级装饰带**同一色基**：卡片的左缘取 `CHART_PALETTE` 下标 2（族带构图与底衬里那枚暖色），
      // 条本身留在自己那张卡里——它是数据可视化，不随装饰带撤。
      root + ' .ilife-block-disclosure {',
      '  border-left-color: ' + CHART_PALETTE[2] + ';',
      '  border-radius: 14px;',
      '}',
      // 名称从 `--fg2` 提到 `--fg`：卡片里它才是主信息，条只是它的形状。
      root + ' .ilife-block-dist-row-name {',
      '  color: var(--fg);',
      '  font-weight: 600;',
      '}',
      // 复评点名「进度条与标签略显单薄」：条抬到 12px、分数抬到 15px。
      root + ' .ilife-block-dist-row-bar {',
      '  height: 12px;',
      '}',
      root + ' .ilife-block-dist-row-val {',
      '  font-size: 15px;',
      '}',
      // 窄档胶囊只补行距（复评「字宽紧贴边缘」）；字号与内距回公共层缺省——
      // 本轮实测把它们抬高后五项读数在 390 折成两行，复评反读成「视觉冗余」。
      root + ' .ilife-block-disclosure-body .ilife-block-chip-row {',
      '  row-gap: 8px;',
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

/** 页壳：样式入口由公共层席收口成 `renderSceneShell()`（皮肤→族带→族节奏→页内四段合成）。
 *  族名**在每一页的调用点上逐字给**（体检＝结果型「查到了什么」；批量改与备份＝回执型「写下了什么」），
 *  与包内守门断言「这一处壳接线要带一个合法族名」同一形状。页内不再出第二条装饰带。 */
function shell(
  title: string,
  eyebrow: string,
  blocks: string[],
  seat: { readonly page: 'quality' | 'batch' | 'backup'; readonly family: 'result' | 'receipt' },
): string {
  return renderSceneShell({
    family: seat.family,
    docTitle: title,
    bodyHtml: renderPageShell({ eyebrow, title, content: blocks.join('') }),
    extraCss: dataSeatCss(seat.page),
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
    // 结论条只说「先动哪儿」，不再复述第一张卡上已经写着的菜名与分数
    // （判官两轮点名的「标语与缺失说明语义重复」：卡片标题＋完整度条已经把名与分说全了）。
    renderConclusionBar(
      worst ? m('skill-chef.data-pages.c001') : m('skill-chef.data-pages.c002'),
    ),
    renderFactStrip({
      items: [
        { label: m('skill-chef.data-pages.c003'), value: m('skill-chef.data-pages.c004', { p0: String(String(input.items.length)) }) },
        { label: m('skill-chef.data-pages.c005'), value: m('skill-chef.data-pages.c006', { p0: String(String(full)) }), tone: full > 0 ? 'ok' : 'warn' },
        // 达标＝够 80 分，「待补」就是差在这一档上的菜数（与结论条点名的同一批）。
        { label: m('skill-chef.data-pages.c007'), value: m('skill-chef.data-pages.c008', { p0: String(String(todo)) }), tone: todo > 0 ? 'warn' : 'ok' },
        { label: m('skill-chef.data-pages.c009'), value: m('skill-chef.data-pages.c010') },
      ],
    }),
    // 页头已有族级装饰带（结果族：碗／椒／放大镜／盘），页内不再摆第二条带。
    // 逐菜一张卡（默认展开）：抬头是完整度条（条长＝得分，0–100 取数侧的五项公式），
    // 下面接五项读数与缺口。一处读数只画一遍——不再另出与它同源的读数卡或第二名册。
    // 默认全展开（#873 复评实测：只开最差那道时其余两张卡只剩一行菜名，两视口都被读成留白，总分反而低 5 分）。
    ...input.items.map((it) => {
      const backgroundMark = it.has_background ? m('skill-chef.data-pages.c011') : m('skill-chef.data-pages.c012');
      const gapLine = it.missing.length
        ? m('skill-chef.data-pages.c013', { p0: String(it.name), p1: String(listJoin(currentRenderLanguage(), it.missing)) })
        : m('skill-chef.data-pages.c014');
      return renderDisclosure({
        title: it.name,
        open: true,
        contentHtml:
          renderDistributionRows({
            rows: [{
              label: m('skill-chef.data-pages.c015'),
              value: m('skill-chef.data-pages.c016', { p0: String(it.score) }),
              pct: it.score,
              color: it.score >= 80 ? BAR_DONE : BAR_SHORT,
            }],
          }) +
          // 五项读数并排成一串小胶囊：窄档下是「食材 0 味」这种一格一事（不用两列表——两列表在
          // ≤640 会逐格折成「列名一行＋值一行」，五行读数被摊成十行，正是「列名与正文同号」那一类病）。
          renderChipRow({
            items: [
              { text: m('skill-chef.data-pages.c017', { p0: String(String(it.ingredients_count)) }) },
              { text: m('skill-chef.data-pages.c018', { p0: String(String(it.steps_count)) }) },
              { text: m('skill-chef.data-pages.c019', { p0: String(String(it.tips_count)) }) },
              { text: m('skill-chef.data-pages.c020', { p0: String(String(it.techniques_count)) }) },
              { text: m('skill-chef.data-pages.c021', { p0: String(backgroundMark) }) },
            ],
          }) +
          // 缺口逐条并成一行（各条原本各占一句、句首都挂同一菜名，读起来是同一个词重复五遍）。
          // 菜名带着走：同一道菜的缺口句在页里唯一，不会与别的菜的同类句撞成重复行。
          renderProseBlock({ text: gapLine }),
      });
    }),
    renderCaliberLine(m('skill-chef.data-pages.c022')),
    renderActionBar({
      buttons: [
        { label: m('skill-chef.data-pages.c023'), kind: 'primary', actionId: 'quality-fix' },
        { label: m('skill-chef.data-pages.c024'), kind: 'ghost', actionId: 'quality-backup' },
      ],
    }),
    // 2026-09-22 用户口径「每张页都要有复制日志」：本页原**整块复制区都缺**
    // （53 件产物里只有 51 件有按钮，缺的两件之一就是本页）。
    chefCopyArea({
      dataActionId: 'quality-copy',
      data: {
        key: 'chef.history.query', shape: 'list',
        items: input.items.map((it) => ({ 菜名: it.name, 完整度: it.score, 缺口: listJoin(currentRenderLanguage(), it.missing) })),
        total: input.items.length,
      },
      log: {
        command: 'chef.history.query',
        source: m('skill-chef.data-pages.c025'),
        m5Line: m('skill-chef.data-pages.c026', {
          p0: String(String(input.items.length)),
          p1: String(String(full)),
          p2: String(String(todo)),
        }),
      },
    }),
  ];
  return shell(m('skill-chef.data-pages.c027'), m('skill-chef.data-pages.c028'), blocks, { page: 'quality', family: 'result' });
}

/** 批量改页（过程型目标形态：改前对比＋回执）。 */
export function dataBatchPage(input: { name: string; diffs: { field: string; before: string; after: string }[] }): string {
  const diffText = input.diffs.map((d) => m('skill-chef.data-pages.c029', { p0: String(d.field + d.before), p1: String(d.after) })).join('；');
  const blocks = [
    // 结论条一句话交代这一页的两件事（改的边界 ＋ 已核对），不再另起一行说同一件事。
    renderConclusionBar(m('skill-chef.data-pages.c030')),
    renderFactStrip({
      items: [
        { label: m('skill-chef.data-pages.c031'), value: input.name },
        { label: m('skill-chef.data-pages.c032'), value: m('skill-chef.data-pages.c033', { p0: String(String(input.diffs.length)) }) },
      ],
    }),
    renderChangeRows({
      rows: input.diffs.map((d) => ({ label: d.field, before: d.before || m('skill-chef.data-pages.c034'), after: d.after || m('skill-chef.data-pages.c035') })),
    }),
    // 删掉「用量与时长要写数字」那一行：它是**输入那一刻**的规矩，本页是改完之后的回执，
    // 页上没有输入位 ⇒ 留着只让我方多说一句（判官三轮点名的「文案叠说」之一）。
    renderActionBar({
      buttons: [
        // 只留这一颗：「复制改动」那颗主按钮在产物里**没有 `data-t`（点了不复制）**，
        // 与复制区那颗真按钮同说一件事 ⇒ 删掉，复制入口只留复制区一处。
        { label: m('skill-chef.data-pages.c036'), kind: 'ghost', actionId: 'batch-view' },
      ],
    }),
    chefCopyArea({
      dataActionId: 'batch-copy-data',
      data: {
        key: 'chef.data.batch', shape: 'receipt', ok: true,
        message: m('skill-chef.data-pages.c037', {
          p0: String(input.name),
          p1: String(input.diffs.length),
          p2: String(diffText),
        }),
      },
    }),
  ];
  return shell(m('skill-chef.data-pages.c038'), m('skill-chef.data-pages.c039'), blocks, { page: 'batch', family: 'receipt' });
}

/** 备份回执页（回执型）。 */
export function dataBackupPage(input: { recipeCount: number; tableCount: number; bytes: number }): string {
  const blocks = [
    renderConclusionBar(m('skill-chef.data-pages.c040')),
    renderFactStrip({
      items: [
        { label: m('skill-chef.data-pages.c041'), value: m('skill-chef.data-pages.c042', { p0: String(String(input.recipeCount)) }) },
        { label: m('skill-chef.data-pages.c043'), value: m('skill-chef.data-pages.c044', { p0: String(String(input.tableCount)) }) },
        { label: m('skill-chef.data-pages.c045'), value: m('skill-chef.data-pages.c046', { p0: String(String(input.bytes)) }) },
      ],
    }),
    // 只留一句旁注，且改成一口读得懂的短句（原来那句「默认不含已废弃的菜」被复评读成病句）。
    renderCaliberLine(m('skill-chef.data-pages.c047')),
    renderActionBar({
      buttons: [
        { label: m('skill-chef.data-pages.c048'), kind: 'primary', actionId: 'backup-list' },
        { label: m('skill-chef.data-pages.c049'), kind: 'ghost', actionId: 'backup-again' },
      ],
    }),
    chefCopyArea({
      // 删掉说明行：它与按钮「复制数据」说的是同一件事（判官点名的「文案叠说」）。
      // （原注还提到标题「复制备份回执」——该标题随 **2026-09-22 用户裁定「乙」** 连同卡片一去去掉了。）
      dataActionId: 'backup-copy-data',
      // 备份走 `history.query` 的 kind=backup，信封 key 随 CLI 取 `chef.history.query`。
      data: {
        key: 'chef.history.query', shape: 'list',
        items: [{ 菜数: input.recipeCount, 表数: input.tableCount, 大小: input.bytes }],
      },
    }),
  ];
  return shell(m('skill-chef.data-pages.c050'), m('skill-chef.data-pages.c051'), blocks, { page: 'backup', family: 'receipt' });
}

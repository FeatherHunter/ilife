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
  renderCopyBlock,
  renderDisclosure,
  renderDistributionRows,
  renderPageShell,
  renderProseBlock,
} from 'base-paint/blocks';
import { renderSceneShell } from '../render/sceneShell.js';

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
      worst ? '从下面第一道开始补。' : '还没有菜谱可以体检。',
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
    // 页头已有族级装饰带（结果族：碗／椒／放大镜／盘），页内不再摆第二条带。
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
            : renderProseBlock({ text: '五项齐全。' })),
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
  return shell('数据质量报告', '私家大厨 ｜ 数据管理', blocks, { page: 'quality', family: 'result' });
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
    // 删掉「用量与时长要写数字」那一行：它是**输入那一刻**的规矩，本页是改完之后的回执，
    // 页上没有输入位 ⇒ 留着只让我方多说一句（判官三轮点名的「文案叠说」之一）。
    renderActionBar({
      buttons: [
        // 只留这一颗：「复制改动」那颗主按钮在产物里**没有 `data-t`（点了不复制）**，
        // 与复制区那颗真按钮同说一件事 ⇒ 删掉，复制入口只留复制区一处。
        { label: '再看一遍菜谱', kind: 'ghost', actionId: 'batch-view' },
      ],
    }),
    renderCopyBlock({
      title: '改动说明',
      dataActionId: 'batch-copy-data',
      dataText: input.name + '改' + input.diffs.length + '处：' + input.diffs.map((d) => d.field + d.before + '到' + d.after).join('；'),
    }),
  ];
  return shell('批量改回执', '私家大厨 ｜ 数据管理', blocks, { page: 'batch', family: 'receipt' });
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
    // 只留一句旁注，且改成一口读得懂的短句（原来那句「默认不含已废弃的菜」被复评读成病句）。
    renderCaliberLine('已废弃的菜不在这一份里。'),
    renderActionBar({
      buttons: [
        { label: '看看全部菜谱', kind: 'primary', actionId: 'backup-list' },
        { label: '再备一份', kind: 'ghost', actionId: 'backup-again' },
      ],
    }),
    renderCopyBlock({
      // 删掉说明行：它与标题「复制备份回执」＋按钮「复制数据」说的是同一件事（判官点名的「文案叠说」）。
      title: '复制备份回执',
      dataActionId: 'backup-copy-data',
      dataText: '已备份' + input.recipeCount + '道菜（' + input.tableCount + '张表，共' + input.bytes + '字节）。',
    }),
  ];
  return shell('备份回执', '私家大厨 ｜ 数据管理', blocks, { page: 'backup', family: 'receipt' });
}

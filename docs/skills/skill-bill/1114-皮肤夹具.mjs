/** #1114 · 皮肤夹具：用公开件重搭判地页的「本票覆盖段」，好对它逐像素追 0。
 *
 *  口径（读之前先看这段）：
 *   1. 夹具的正文只由 base-paint/blocks 的公开件拼（纸、主数字头、账目行、占比行、明细卡、裁切线）；
 *      任何一条几何都必须来自公共层，夹具自己不写家具样式。
 *   2. 本票没覆盖的角色（店头／段标题／虚线／对账卡／按钮区／纸外页脚／页级底色）用空带顶位：
 *      带高＝判地实测高度（出处 .scratch/1114/boxes-j-*.json，390 视口），只为让被覆盖的件落在
 *      与判地相同的 y 上，好在同一段里做像素比对。空带不是实现，不进 packages/。
 *   3. 数据值照判地取（判地可见文本逐字抄下来当入参）。
 *
 *  产物：.scratch/1114-皮肤夹具/w01.html
 *  比对：原型截图与产物截图各裁到 [0,18,390,BOTTOM] 再 vision_pixel_diff。
 *  跑法：node docs/skills/skill-bill/1114-皮肤夹具.mjs
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import * as blocks from 'file:///D:/ilife/packages/base-render/dist/blocks.js';
import * as docShell from 'file:///D:/ilife/packages/base-render/dist/docShell.js';
import { pageUiCss } from 'file:///D:/ilife/packages/base-render/dist/index.js';

const OUT_DIR = 'D:/ilife/.scratch/1114-皮肤夹具';
mkdirSync(OUT_DIR, { recursive: true });

/* 判地实测带（390 视口；出处 .scratch/1114/boxes-j-*.json）：纸顶 y=18，纸内首行 y=36。 */
const BAND = {
  head: 131.38,  /* 36 -> 167.38：店头四条 ＋ 虚线（本票未覆盖） */
  gapA: 62.99,   /* 334.57 -> 397.56：虚线 ＋ 段标题「落点 LEDGER」 */
  gapB: 69,      /* 573.56 -> 642.56：虚线 ＋ 段标题「分类占比 SCALE」 */
  gapC: 69,      /* 691.56 -> 760.56：虚线 ＋ 段标题「明细 DETAIL」 */
};
const BOTTOM = 913; /* 判地 y：明细卡底 913.12（[0,913] 是本次比对的取景框） */

const spacer = (h, why) => '<div class="fixture-gap" style="height:' + h + 'px" data-role="' + why + '"></div>';

const summary = blocks.renderSummaryHead({
  eyebrow: '本页支出 · 共 2 笔',
  value: '35.00',
  unit: '元',
  size: 'l',
  layout: 'ticket',
  note: '主要花在「餐饮/外卖/午餐」，35.00 元，占本页支出 100%。',
});
const ledger = blocks.renderLedgerRows({
  layout: 'ticket',
  rows: [
    { label: '收入', value: '8000.00' },
    { label: '净额', value: '7965.00' },
    { label: '落点账本', value: '日常' },
    { label: '币种', value: 'CNY' },
  ],
});
const scale = blocks.renderDistributionRows({
  layout: 'ticket',
  rows: [{ label: '餐饮/外卖/午餐', value: '35.00 元', pct: 100 }],
});

let entries = '';
let entryState = '缺件（entry-card 未立件，按判地高度 152.56 顶位）';
try {
  const mod = await import('file:///D:/ilife/packages/base-render/dist/components/entry-card/index.js');
  entries = mod.renderEntryCard({
    entries: [
      /* 次行整段透传：时间戳那一段在判地里是 `<span class="mono">`（等宽），
         当纯文本传会让行盒矮 1px（实测 sub h=18.59 vs 判地 19.59）——数据要照判地取。 */
      { title: '备注 · 午饭', subHtml: '餐饮/外卖/午餐 · 微信 · <span class="ilife-block-entry-card-mono">2026-10-02 12:00:00</span> · #1', amount: '-35.00' },
      { title: '备注 · 9月工资', subHtml: '工资 · 招行卡 · <span class="ilife-block-entry-card-mono">2026-10-02 18:00:00</span> · #2', amount: '8000.00' },
    ],
  });
  entryState = '已立件';
} catch (e) {
  entries = '<div class="fixture-missing" style="height:152.56px" data-role="entry-card-placeholder"></div>';
}

const inner = spacer(BAND.head, 'shop-head+dashed')
  + summary
  + spacer(BAND.gapA, 'dashed+sec-heading-ledger')
  + ledger
  + spacer(BAND.gapB, 'dashed+sec-heading-scale')
  + scale
  + spacer(BAND.gapC, 'dashed+sec-heading-detail')
  + entries;

const paper = blocks.renderSheetFrame({ variant: 'ticket', content: inner });

/* 夹具壳（页面级：判地 body 的底色渐变与内距 ＋ .page 版心）——不是家具，只让夹具与判地同框。 */
const SHELL_CSS = [
  '.fixture-body { margin: 0; padding: 18px 10px 36px; min-height: 100vh; line-height: normal;',
  '  display: flex; flex-direction: column; align-items: center;',
  '  background: radial-gradient(1200px 600px at 50% -10%, #f7f2e6 0%, var(--ilife-ground) 55%, #e6dcc8 100%);',
  '  color: var(--ilife-ink); font-family: var(--ilife-font); -webkit-font-smoothing: antialiased; }',
  '.fixture-page { width: 100%; max-width: 440px; min-width: 0; }',
  '.fixture-body * { box-sizing: border-box; }',
  /* 页面级窄档（判地 @media(max-width:390px) 那三处；产品侧同款写在 skill-bill 的 TICKET_CSS 里）：
     纸内距 18/22/8、主数字 50px、账目值列 58%。组件层禁视口媒体查询（件宽 ≠ 视口宽），故这一档由页面给。 */
  /* 说明句在判地是**块**（`<p class="summary-note">`，满宽 326×43.19）；公共层那件把它渲成 `<span>`
     （跨档 DOM 一字不差的既有契约），组件档里只给了 `align-self:stretch`。产品页自己按块处理
     （实测 `summary` h=167.19 ＝ 判地），故这一条属**页面层**——夹具壳照判地补，不写进 packages/。 */
  '.fixture-body .ilife-block-summary-head.is-ticket .ilife-block-summary-head-note { display: block; }',
  '@media (max-width: 400px) {',
  '  .fixture-body .ilife-block-sheet.is-ticket { padding: 18px 22px 8px; }',
  '  .fixture-body .ilife-block-summary-head.is-ticket.is-l .ilife-block-summary-head-value { font-size: 50px; }',
  '  .fixture-body .ilife-block-ledger-rows.is-ticket .ilife-block-ledger-row-value { max-width: 58%; }',
  '}',
].join('\n');

/* 新立件的样式段要显式拼进来（blocksCss() 只汇总那 12 个区块的族样式）。 */
const pieceCss = [];
try { const ec = await import('file:///D:/ilife/packages/base-render/dist/components/entry-card/index.js'); if (typeof ec.entryCardCss === 'function') pieceCss.push(ec.entryCardCss()); } catch (e) {}
const css = [blocks.skinCss({ skins: ['ticket'] }), blocks.sheetCss(), blocks.blocksCss(), pageUiCss(), pieceCss.join('\n'), SHELL_CSS].join('\n');
const body = '<div class="fixture-body ' + blocks.skinClass('ticket') + ' ilife-page-ui"><div class="fixture-page">' + paper + '</div></div>';
const html = docShell.renderDocShell({ docTitle: '夹具 · w01-查今天', bodyHtml: body, extraCss: css, doctypeCase: 'lower', pageUi: false });
writeFileSync(OUT_DIR + '/w01.html', html, 'utf8');
console.log('夹具已写：' + OUT_DIR + '/w01.html');
console.log('取景框 [0,18,390,' + BOTTOM + ']；空带 ' + JSON.stringify(BAND) + '；明细卡座：' + entryState);

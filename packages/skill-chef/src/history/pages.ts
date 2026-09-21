/** 历史域独占的页面装配（4 卡各一页，双端自适应）。
 *
 * 本域独占：4 张卡（记录做菜回执／历史时间线／单菜统计／全局统计）的整页 HTML
 * 都在这里装配。每一格都是一次公共层区块调用（`t768-页面族配方.md` §7 第 1 条）：
 * 内容件走 `base-paint/blocks`，事实条／时间轴走 `base-paint` 的页面级形状件，
 * 文档壳走 `base-paint/docShell`（`pageUi: true`，手机 390 照 HELP 触屏口径）。
 * 本文件不写一条自有样式（`extraCss` 只拼 `pageUiCss + pageShapeCss` 两层公共配方）。
 *
 * 与信封的关系：CLI 的 `chef.history.query` 仍是 `list` 形（行为不变）；
 * 这里的四页是各卡自己的结果型／回执型页，不共用同一个列表信封（本票目标 2）。
 */

import {
  renderCaliberLine,
  renderChangeRows,
  renderChipRow,
  renderConclusionBar,
  renderCopyBlock,
  renderDataTable,
  renderDisclosure,
  renderKpiGrid,
  renderListRows,
  renderPageShell,
  renderProseBlock,
} from 'base-paint/blocks';
import { pageShapeCss, pageUiCss, renderActionBar, renderFactStrip, renderTimelineRows } from 'base-paint';
import { renderDocShell } from 'base-paint/docShell';
import type { HistoryGlobalPortrait } from './run-query.js';

/** 平均分显示：null 即「未评」，否则保留两位。 */
function fmtAvg(v: number | null): string {
  if (v === null) return '未评';
  return String(Math.round(v * 100) / 100);
}

/** 非空数字保留两位（画像表与行列表里的均分，全页同精度）。 */
function fmtNum(v: number): string {
  return String(Math.round(v * 100) / 100);
}

/** 整页装配：页壳 ＋ 文档壳（`pageUi` 开，移动端配方生效）。
 *
 * 文档标题带应用后缀（浏览器标签「页名 ｜ 私家大厨」常规写法；也使 `<title>`
 * 与页内 `<h1>` 不逐字重复，见质量门「重复句」列）。
 */
function docOf(docTitle: string, eyebrow: string, title: string, blocks: readonly string[]): string {
  return renderDocShell({
    docTitle: docTitle + ' ｜ 私家大厨',
    bodyHtml: renderPageShell({ eyebrow, title, content: blocks.join('') }),
    extraCss: pageUiCss() + '\n' + pageShapeCss(),
    pageUi: true,
  });
}

/** 记录做菜回执页的输入（写后回读一次即得，全是真值）。 */
export interface RecordPageInput {
  readonly name: string;
  readonly cookDate: string;
  readonly cookSequence: number;
  readonly rating: number;
  readonly feedback: string;
  readonly historyId: string;
  readonly prevStatus: string;
  readonly newStatus: string;
  readonly prevCount: number;
  readonly newCount: number;
  readonly avgRating: number | null;
}

/** 装配记录做菜回执页（回执型，配方 `t768-页面族配方.md` §3）。 */
export function renderRecordPage(input: RecordPageInput): string {
  const avgText = fmtAvg(input.avgRating);
  // 状态翻转只在首做时发生；未翻转时不印「已做 → 已做」这种恒等行（vision 第一轮）。
  const changes =
    input.prevStatus === input.newStatus
      ? [{ label: '做菜次数', before: input.prevCount + ' 次', after: input.newCount + ' 次' }]
      : [
          { label: '菜谱状态', before: input.prevStatus, after: input.newStatus },
          { label: '做菜次数', before: input.prevCount + ' 次', after: input.newCount + ' 次' },
        ];
  return docOf('记录做菜：' + input.name, '私家大厨 ｜ 历史', '记录做菜：' + input.name, [
    renderConclusionBar('已记下这次做菜。'),
    renderFactStrip({
      items: [
        { label: '菜', value: input.name },
        { label: '日期', value: input.cookDate },
        { label: '评分', value: input.rating + ' 分' },
      ],
    }),
    renderKpiGrid([
      { label: '本次评分', value: String(input.rating), unit: '分', bar: { pct: Math.round((input.rating / 5) * 100) } },
      {
        label: '平均评分',
        value: avgText,
        unit: input.avgRating === null ? '' : '分',
        ...(input.avgRating === null ? {} : { bar: { pct: Math.round((input.avgRating / 5) * 100) } }),
      },
      { label: '累计做过', value: String(input.newCount), unit: '次', detail: '第 ' + input.cookSequence + ' 次' },
    ]),
    renderProseBlock({ text: input.feedback }),
    renderChangeRows({ rows: changes }),
    renderCaliberLine('记录写进菜谱库。'),
    renderActionBar({
      buttons: [
        { label: '看这道菜的历史', kind: 'primary', actionId: 'h775-record-history' },
        { label: '再看一遍菜谱', kind: 'ghost', actionId: 'h775-record-view' },
        { label: '撤销这次记录', kind: 'ghost', actionId: 'h775-record-undo' },
      ],
    }),
    renderCopyBlock({
      title: '复制这条记录',
      dataText: input.name + '\n' + input.cookDate + ' 第' + input.cookSequence + '次 评分' + input.rating + '\n' + input.feedback,
      logText: '记录做菜 ' + input.name + ' ' + input.cookDate + ' 评分' + input.rating + ' 记录' + input.historyId,
    }),
  ]);
}

/** 历史时间线页的输入（行已按时间倒序排好）。 */
export interface TimelinePageInput {
  readonly name: string;
  readonly status: string;
  readonly count: number;
  readonly avgRating: number | null;
  readonly rows: ReadonlyArray<{ cookDate: string; cookSequence: number; rating: number | null; feedback: string }>;
}

/** 装配历史时间线页（结果型时间轴：日期／第几次／评分／反馈，倒序）。 */
export function renderTimelinePage(input: TimelinePageInput): string {
  const last = input.rows.length ? input.rows[0].cookDate : '还没有记录';
  const timeline =
    input.rows.length === 0
      ? renderProseBlock({ text: '还没有烹饪记录，做完后记一次就会出现在这里。' })
      : renderTimelineRows({
          rows: input.rows.map((r) => ({
            time: r.cookDate,
            main: '第 ' + r.cookSequence + ' 次做这道菜，评分 ' + (r.rating === null ? '未评' : r.rating + ' 分'),
            note: r.feedback || '这次没写反馈',
          })),
        });
  return docOf('历史时间线：' + input.name, '私家大厨 ｜ 历史', '历史时间线：' + input.name, [
    renderConclusionBar('共做过 ' + input.count + ' 次，平均 ' + fmtAvg(input.avgRating) + ' 分。'),
    renderFactStrip({
      items: [
        { label: '菜', value: input.name },
        { label: '最近一次', value: last },
        { label: '状态', value: input.status },
      ],
    }),
    timeline,
    renderCaliberLine('按做菜日期倒序。'),
    renderCopyBlock({
      title: '复制这份时间线',
      dataText: input.rows.map((r) => r.cookDate + ' 第' + r.cookSequence + '次 评分' + r.rating + ' ' + r.feedback).join('\n'),
    }),
  ]);
}

/** 单菜统计页的输入（老件 `stats` 全指标）。 */
export interface SingleStatsPageInput {
  readonly name: string;
  readonly status: string;
  readonly count: number;
  readonly avgRating: number | null;
  readonly maxRating: number | null;
  readonly minRating: number | null;
  readonly lastDate: string | null;
}

/** 装配单菜统计页（统计型 KPI 网格：总次数／均分／最高／最低／最近日期）。 */
export function renderSingleStatsPage(input: SingleStatsPageInput): string {
  const dash = (v: number | string | null): string => (v === null ? '—' : String(v));
  return docOf('单菜统计：' + input.name, '私家大厨 ｜ 历史', '单菜统计：' + input.name, [
    renderConclusionBar('平均 ' + fmtAvg(input.avgRating) + ' 分，做过 ' + input.count + ' 次。'),
    renderFactStrip({
      items: [
        { label: '菜', value: input.name },
        { label: '状态', value: input.status },
      ],
    }),
    renderKpiGrid([
      { label: '总次数', value: String(input.count), unit: '次' },
      {
        label: '平均评分',
        value: fmtAvg(input.avgRating),
        unit: input.avgRating === null ? '' : '分',
        ...(input.avgRating === null ? {} : { bar: { pct: Math.round((input.avgRating / 5) * 100) } }),
      },
      { label: '最高评分', value: dash(input.maxRating), unit: input.maxRating === null ? '' : '分' },
      { label: '最低评分', value: dash(input.minRating), unit: input.minRating === null ? '' : '分' },
      { label: '最近一次', value: dash(input.lastDate) },
    ]),
    renderCaliberLine('口径：平均分按全部记录直接算，无剔除。'),
    renderCopyBlock({
      title: '复制这份统计',
      dataText:
        input.name + ' 共' + input.count + '次 平均' + fmtAvg(input.avgRating) + ' 最高' + dash(input.maxRating) + ' 最低' + dash(input.minRating) + ' 最近' + dash(input.lastDate),
    }),
  ]);
}

/** 装配全局统计页（整体画像，老件 `global-stats` 口径：做过几道／总次数／最爱／最近／没做过）。 */
export function renderGlobalStatsPage(portrait: HistoryGlobalPortrait): string {
  // 同一道菜包揽两项最爱时合句，不印两遍菜名（vision 第一轮：文字不冗余）。
  const sameFav =
    portrait.favoriteAvg !== null && portrait.favoriteMost !== null && portrait.favoriteAvg.name === portrait.favoriteMost.name;
  const favText =
    portrait.favoriteAvg === null || portrait.favoriteMost === null
      ? '还没有记录，做完后这里会出现最爱。'
      : sameFav
        ? portrait.favoriteAvg.name + '做得最多（' + portrait.favoriteMost.times + ' 次），均分也最高（' + portrait.favoriteAvg.avgRating + ' 分）。'
        : '均分最高是' + portrait.favoriteAvg.name + '（' + portrait.favoriteAvg.avgRating + ' 分），做得最多是' +
          portrait.favoriteMost.name + '（' + portrait.favoriteMost.times + ' 次）。';
  const recent =
    portrait.recent.length === 0
      ? renderProseBlock({ text: '还没有记录。' })
      : renderDataTable({
          caption: '最近吃了啥',
          columns: [
            { key: 'date', label: '日期' },
            { key: 'name', label: '菜' },
            { key: 'avg', label: '均分', align: 'right' },
          ],
          rows: portrait.recent.map((r) => ({ date: r.lastDate, name: r.name, avg: r.avgRating === null ? '—' : fmtNum(r.avgRating) })),
        });
  const never =
    portrait.neverCooked.length === 0
      ? renderProseBlock({ text: '全部都做过，没有没做过的菜。' })
      : renderChipRow({ items: portrait.neverCooked.map((n) => ({ text: n })) });
  return docOf('全局统计', '私家大厨 ｜ 历史', '全局统计', [
    renderConclusionBar('做过 ' + portrait.cookedCount + ' 道菜，共 ' + portrait.totalCooks + ' 次。'),
    renderFactStrip({
      items: [
        { label: '共收录', value: portrait.recipeTotal + ' 道' },
        { label: '做过', value: portrait.cookedCount + ' 道' },
        { label: '没做过', value: portrait.neverCookedCount + ' 道' },
      ],
    }),
    renderKpiGrid([
      { label: '做过几道', value: String(portrait.cookedCount), unit: '道' },
      { label: '总次数', value: String(portrait.totalCooks), unit: '次' },
      { label: '没做过', value: String(portrait.neverCookedCount), unit: '道' },
    ]),
    renderProseBlock({ text: favText }),
    recent,
    renderDisclosure({ title: '还没做过的菜（' + portrait.neverCooked.length + ' 道）', contentHtml: never, open: false }),
    renderListRows({
      items: portrait.perRecipe.map((r) => ({
        left: r.count + ' 次',
        main: r.name,
        right: r.avgRating === null ? '未评' : fmtNum(r.avgRating) + ' 分',
      })),
      emptyText: '还没有记录。',
    }),
    renderCaliberLine('口径：最近 5 道按末次做菜日期倒序，均分保留两位。'),
    renderCopyBlock({
      title: '复制这份画像',
      dataText:
        '做过' + portrait.cookedCount + '道 共' + portrait.totalCooks + '次\n' +
        portrait.recent.map((r) => r.name + ' ' + r.lastDate).join('\n'),
    }),
  ]);
}

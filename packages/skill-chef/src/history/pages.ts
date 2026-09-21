/** 历史域独占的页面装配（4 卡各一页，双端自适应）。
 *
 * 本域独占：4 张卡（记录做菜回执／历史时间线／单菜统计／全局统计）的整页 HTML
 * 都在这里装配。每一格都是一次公共层区块调用（`t768-页面族配方.md` §7 第 1 条）：
 * 内容件走 `base-paint/blocks`，事实条／时间轴走 `base-paint` 的页面级形状件，
 * 文档壳走 `base-paint/docShell`（`pageUi: true`，手机 390 照 HELP 触屏口径）。
 * 样式分两层、都在 `extraCss` 里按序追加（不拆回公共层那两层）：公共层皮肤
 * `chefSceneCss()`（公共层两配方 ＋ 私家大厨皮肤）＋ 本域页内收口 `historyPageCss()`
 * （读数卡与动作条的格子口径、时间轴时间槽的宽度下限，见 `./page-css.ts`）。
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
  renderDisclosure,
  renderKpiGrid,
  renderListRows,
  renderPageShell,
  renderProseBlock,
} from 'base-paint/blocks';
import { renderActionBar, renderFactStrip, renderTimelineRows } from 'base-paint';
import { chefSceneCss } from '../render/skin.js';
import { renderDocShell } from 'base-paint/docShell';
import { historyPageCss } from './page-css.js';
import type { HistoryGlobalPortrait } from './run-query.js';

/** 换行（仓库口径：`String.fromCharCode(10)`，不写字面换行转义；两层样式段之间那一处连接位）。 */
const LF = String.fromCharCode(10);

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
    extraCss: chefSceneCss() + LF + historyPageCss(),
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
    // 结论条改印这次记录本身：第几次、几分。改前是「已记下这次做菜。」——与标题
    // 「记录做菜：…」说同一件事（#873 第 31 格扣分项），结论条那一格因此白占一行。
    renderConclusionBar('第 ' + input.cookSequence + ' 次做这道菜，评分 ' + input.rating + ' 分。'),
    // 事实条三格：这道菜是谁、哪一天、现在什么状态。评分不在这里重印（结论条与本次评分卡各一次）。
    renderFactStrip({
      items: [
        { label: '菜', value: input.name },
        { label: '日期', value: input.cookDate },
        { label: '状态', value: input.newStatus },
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
      // 累计做过：第几次已经写在结论条里，这里只留总数（同一件事不印两处）。
      { label: '累计做过', value: String(input.newCount), unit: '次' },
    ]),
    renderProseBlock({ text: input.feedback }),
    renderChangeRows({ rows: changes }),
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

/** 装配历史时间线页（结果型时间轴：日期／第几次／评分／反馈，倒序）。
 *
 * 同一天的多条只印一次日期（#873 第 32 格扣分项：同一日期并排两行时，日期栏与「第几次」
 * 读不出先后），续行的时间槽印「同日」——这一天有几条、各自是第几次，一眼看得出来。
 * 行序照取数面的口径不动（做菜日期倒序，同一天按第几次倒序），页面只改日期印几次。
 */
export function renderTimelinePage(input: TimelinePageInput): string {
  const last = input.rows.length ? input.rows[0].cookDate : '还没有记录';
  // 评分区间：本页列的就是这道菜的全部记录（取数面一次性给全，不分页），故区间就取这些行里
  // 有评分的那几条的极值——与单菜统计同一口径，不另查库、不猜数。
  const rated = input.rows.map((r) => r.rating).filter((v): v is number => v !== null);
  const facts = [
    { label: '菜', value: input.name },
    { label: '最近一次', value: last },
    { label: '状态', value: input.status },
    ...(rated.length === 0 ? [] : [{ label: '最高评分', value: Math.max(...rated) + ' 分' }]),
    ...(rated.length === 0 ? [] : [{ label: '最低评分', value: Math.min(...rated) + ' 分' }]),
  ];
  const timeline =
    input.rows.length === 0
      ? renderProseBlock({ text: '还没有烹饪记录，做完后记一次就会出现在这里。' })
      : renderTimelineRows({
          rows: input.rows.map((r, i) => ({
            time: i > 0 && input.rows[i - 1].cookDate === r.cookDate ? '同日' : r.cookDate,
            // 「这道菜」不逐行重印（页标题与事实条已经说了是哪道菜），一行只留两个读数。
            main: '第 ' + r.cookSequence + ' 次做，评分 ' + (r.rating === null ? '未评' : r.rating + ' 分'),
            note: r.feedback || '这次没写反馈',
          })),
        });
  return docOf('历史时间线：' + input.name, '私家大厨 ｜ 历史', '历史时间线：' + input.name, [
    renderConclusionBar('共做过 ' + input.count + ' 次，平均 ' + fmtAvg(input.avgRating) + ' 分。'),
    renderFactStrip({ items: facts }),
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

/** 装配单菜统计页（统计型 KPI 网格：总次数／均分／最高／最低；最近一次进事实条）。
 *
 * 四张读数卡而不是五张（#873 第 33 格扣分项：改前第五张「最近一次」在宽档被挤到第二行
 * 独自占一格、右边空着）。日期类的那一项归事实条——事实条本来就是「这一页一共几件事」
 * 的那一行，四张卡两档都排得满（390 两列两行，宽档一行四张）。
 */
export function renderSingleStatsPage(input: SingleStatsPageInput): string {
  const dash = (v: number | string | null): string => (v === null ? '—' : String(v));
  /** 评分卡上的刻度条：pct＝这一档分占满分 5 分的比例（与平均评分卡同一把尺）。 */
  const barOf = (v: number | null): { bar?: { pct: number } } =>
    v === null ? {} : { bar: { pct: Math.round((v / 5) * 100) } };
  return docOf('单菜统计：' + input.name, '私家大厨 ｜ 历史', '单菜统计：' + input.name, [
    renderConclusionBar('平均 ' + fmtAvg(input.avgRating) + ' 分，做过 ' + input.count + ' 次。'),
    renderFactStrip({
      items: [
        { label: '菜', value: input.name },
        { label: '状态', value: input.status },
        { label: '最近一次', value: dash(input.lastDate) },
      ],
    }),
    renderKpiGrid([
      { label: '总次数', value: String(input.count), unit: '次' },
      {
        label: '平均评分',
        value: fmtAvg(input.avgRating),
        unit: input.avgRating === null ? '' : '分',
        ...barOf(input.avgRating),
      },
      { label: '最高评分', value: dash(input.maxRating), unit: input.maxRating === null ? '' : '分', ...barOf(input.maxRating) },
      { label: '最低评分', value: dash(input.minRating), unit: input.minRating === null ? '' : '分', ...barOf(input.minRating) },
    ]),
    renderCaliberLine('平均分按全部记录算。'),
    renderCopyBlock({
      title: '复制这份统计',
      dataText:
        input.name + ' 共' + input.count + '次 平均' + fmtAvg(input.avgRating) + ' 最高' + dash(input.maxRating) + ' 最低' + dash(input.minRating) + ' 最近' + dash(input.lastDate),
    }),
  ]);
}

/** 装配全局统计页（整体画像，老件 `global-stats` 口径：做过几道／总次数／最爱／最近／没做过）。
 *
 * 关系：**页头那一行数只印一遍**（改前事实条三格与读数卡是同一组数，印两遍只是占高度）；
 * 结论条印的是「数读出来的结论」＝最爱那句（改前结论条印计数、正文段再印最爱，与读数卡三处
 * 说同一组数）；「最近吃了啥」走时间轴（改前是三列宽表，行里只有三个值，宽档中间那一大片
 * 读成空栏 —— #873 第 34 格扣分项）；做过的菜与还没做过的菜各收进一个折叠区（做过的菜那份
 * 改前没有标题，一行「4 次 辣椒炒肉 4.38 分」悬在页中间，看不出是哪个分区）。
 */
export function renderGlobalStatsPage(portrait: HistoryGlobalPortrait): string {
  // 同一道菜包揽两项最爱时合句，不印两遍菜名（vision 第一轮：文字不冗余）。
  const sameFav =
    portrait.favoriteAvg !== null && portrait.favoriteMost !== null && portrait.favoriteAvg.name === portrait.favoriteMost.name;
  const favLine =
    portrait.favoriteAvg === null || portrait.favoriteMost === null
      ? '还没有记录，做完后这里会出现最常做的那道菜。'
      : sameFav
        ? portrait.favoriteAvg.name + '做得最多，均分也最高（' + portrait.favoriteAvg.avgRating + ' 分）。'
        : '均分最高是' + portrait.favoriteAvg.name + '（' + portrait.favoriteAvg.avgRating + ' 分），做得最多是' +
          portrait.favoriteMost.name + '。';
  /** 均分写法：时间轴与列表同一种写法（保留两位，未评的写人话，不留空值位）。 */
  const avgTextOf = (v: number | null): string => (v === null ? '均分未评' : '均分 ' + fmtNum(v) + ' 分');
  const recent =
    portrait.recent.length === 0
      ? renderProseBlock({ text: '还没有记录。' })
      : renderTimelineRows({
          rows: portrait.recent.map((r) => ({ time: r.lastDate, main: r.name, note: avgTextOf(r.avgRating) })),
        });
  const never =
    portrait.neverCooked.length === 0
      ? renderProseBlock({ text: '全部都做过，没有没做过的菜。' })
      : renderChipRow({ items: portrait.neverCooked.map((n) => ({ text: n })) });
  const cookedList = renderListRows({
    items: portrait.perRecipe.map((r) => ({
      left: r.count + ' 次',
      main: r.name,
      right: r.avgRating === null ? '未评' : fmtNum(r.avgRating) + ' 分',
    })),
    emptyText: '还没有记录。',
  });
  return docOf('全局统计', '私家大厨 ｜ 历史', '全局统计', [
    renderConclusionBar(favLine),
    renderKpiGrid([
      { label: '共收录', value: String(portrait.recipeTotal), unit: '道' },
      { label: '做过', value: String(portrait.cookedCount), unit: '道' },
      { label: '没做过', value: String(portrait.neverCookedCount), unit: '道' },
      { label: '总次数', value: String(portrait.totalCooks), unit: '次' },
    ]),
    recent,
    renderCaliberLine('最近 5 道按末次做菜日期倒序。'),
    renderDisclosure({ title: '做过的菜（' + portrait.perRecipe.length + ' 道）', contentHtml: cookedList, open: true }),
    renderDisclosure({ title: '还没做过的菜（' + portrait.neverCooked.length + ' 道）', contentHtml: never, open: false }),
    renderCopyBlock({
      title: '复制这份画像',
      dataText:
        '做过' + portrait.cookedCount + '道 共' + portrait.totalCooks + '次\n' +
        portrait.recent.map((r) => r.name + ' ' + r.lastDate).join('\n'),
    }),
  ]);
}

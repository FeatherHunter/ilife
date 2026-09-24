/** #950 · 主页族的**页框三件**：态声明条、分段导航、记录带（五档共用，跟着页框走）。
 *
 * 用户裁定（主页照已认可原型 `proto-final-A+C.html` 重做）后，页框上这一段的读序是：
 *   **态声明条**（这句话在什么前提下成立，如「目标暂停中」）→ **结论条**（判语，仍住 `homeDocs`）
 *   → **分段导航**（页内三块的动作形）→ **记录带**（哪几天有记录）→ 各档正文。
 *  三件各管一件事，**与结论分住**：态不是结论（`pageBars` 的件头写过这条），导航不是状态（`pageNav` 同）。
 *
 * 记录带为什么取代了原先那三枚页头胶囊（「有记录 N/M 天／连续记录 N 天」）：胶囊说得出数量、说不出
 * **哪几天**；一格一天把窗口画出来，缺数留空槽、不补零。窗口的事实从此只在这一处落一次。
 *
 * 样式随公共层走（`pageShapeCss()` 由 `assembleDocPage` 汇总进页），**本件不写 `font-size`／`color`**。
 * 单位与取整由本件定：值位只吃「已经是给人看的样子」的串。
 */
import { renderDayStrip, renderSegmentedNav, renderStateBanner } from 'base-paint';
import type { DayCellInput, DayStripCaptionInput, SegNavIcon } from 'base-paint';
import type { DaySeries } from '../analysis/series.js';
import type { HomeData } from './home.js';
import { fmt } from './homeCards.js';

/** 页内导航项：锚点 id ＋ 人话短名 ＋ 图标（图标闭集由公共层给，清单外的值当场抛）。 */
export interface HomeNavItem {
  readonly id: string;
  readonly text: string;
  readonly icon: SegNavIcon;
}

/** 某天有没有数据（本件各处的「有记录」判据只有这一处，与 `home.ts::streakFromSeries` 同口径）。 */
function hasData(s: DaySeries): boolean {
  return s.calories !== null && s.calories !== undefined;
}

/** 态声明条：只在**目标暂停**时出。它说的是「下面那句判语在什么前提下成立」，不重复判语本身
 *  （判语住结论条，两句分住两件——这正是 `renderStateBanner` 存在的理由）。 */
export function stateBannerBlock(d: HomeData): string {
  if (!d.goalsPaused) return '';
  return renderStateBanner({ tone: 'warn', badge: '目标暂停中', text: '按暂停前的目标' });
}

/** 分段导航：页内三块的动作形（等宽分格 ＋ 选中实底 ＋ 图标位），`current` ＝ 这一档的主角区。
 *  `sticky` 走公共层缺省（吸顶）：长页滚动时导航留在视口顶。 */
export function navBlock(items: readonly HomeNavItem[], current?: string): string {
  return renderSegmentedNav({
    items: items.map((it) => ({ id: it.id, label: it.text, icon: it.icon })),
    ...(current === undefined ? {} : { current }),
    ariaLabel: '页内导航',
  });
}

/** 窗口均值按**显示层**取整上屏：`seriesAvg` 给的是两位小数，而记录带那条是「一句事实」，
 *  印「667.8 卡」是取数层的精度漏到页面上（同 #544 那条「数值走显示层取整」口径）。 */
function intOf(n: number | null | undefined): number | null {
  return n === null || n === undefined ? null : Math.round(n);
}

/** 格带最多画几天（超了就**截断 ＋ 明示**，同族先例＝运动族那句「本窗共 N 天，显示最近 100 天，其余 M 天」）。
 *
 *  为什么必须有这个上限（#950 实拍抓到）：一格一天的形状在 7～14 天里读得出；窗口 30 天时 30 格挤在
 *  880 那一列，每格只剩 29px，而桌面档的日期串是 `nowrap`（公共层为了圆角给了 `overflow:hidden`），
 *  于是「08-0908-1008-11…」互相压字——实拍截图上是糊成一团。**截断不丢事实**：本月／本周那些档，
 *  逐日事实另有 `逐日明细` 列表整列出来（30 天逐行），格带只担「最近这两周哪几天有记录」。 */
const STRIP_MAX_DAYS = 14;

/** 记录带：一格一天（日期 ＋ 状态点 ＋ 当日摄入），带下四件窗口事实。
 *  窗口比 `STRIP_MAX_DAYS` 长时只画**最近 14 天**，并在带下补一句截断明示。 */
export function dayStripBlock(d: HomeData, day: (date: string) => string): string {
  const all = d.week.series;
  const truncated = all.length > STRIP_MAX_DAYS;
  const shown = truncated ? all.slice(-STRIP_MAX_DAYS) : all;
  const days: DayCellInput[] = shown.map((s) => ({
    label: day(s.date),
    value: hasData(s) ? String(s.calories) : null,
    today: s.date === d.date,
  }));
  const caption: DayStripCaptionInput[] = [
    { text: '本窗 ' + d.week.loggedDays + '/' + d.week.windowDays + ' 天有记录' },
    { text: '连续记录 ' + d.streakDays + ' 天', tone: 'ok' },
    { text: '周均摄入 ' + fmt(intOf(d.week.avgIntake)) + ' 卡' },
    { text: '周均缺口 ' + fmt(intOf(d.week.avgDeficit)) + ' 卡' },
    ...(truncated ? [{ text: '带上是最近 ' + STRIP_MAX_DAYS + ' 天' }] : []),
  ];
  return renderDayStrip({ days, caption });
}

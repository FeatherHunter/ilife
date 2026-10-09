// 手册书排版（票 #1193 → 施工 #1195）：场景表 → 页／跨页／纸／书签，一次算清。
// 纯计算：零 DOM、零宿主知识。界面只读这里算出来的结果，不自己再算一遍。
// 几何口径见 docs/plugins/plugin-manager/书籍外壳-定稿.md（用户 2026-10-08 认可的定稿）。
//
// 规则：一个场景＝一页 → 页数＝场景数 → 跨页＝⌈页数/2⌉ → 纸＝⌊页数/2⌋+1。
// 一张纸一个书签：正面印偶数页、反面印奇数页，翻过去号码自动换成反面那一页；
// 纸一多，书签与间距一起等比收窄，保证最外那枚不越出「中缝 → 纸边」这半边。

type SceneState = 'written' | 'pending';
type Side = 'left' | 'right';

/** 一个场景＝一页。state 为 'pending' 时，这一页先占位、正文待定。 */
export interface ManualScene {
  key: string;
  title: string;
  state: SceneState;
}

/** 当前跨页里的一页。 */
export interface ManualPage {
  page: number;
  key: string;
  title: string;
  side: Side;
  state: SceneState;
}

/** 一张纸：正面／反面各印一页；书签印的是这次露出来的那一面。 */
export interface ManualSheet {
  sheet: number;
  front: number | null;
  back: number | null;
  facing: number;
  side: Side;
  tabOffset: number;
}

/** 一次排版的结果：这一跨页看哪两页、书签怎么排。 */
export interface ManualPlan {
  spread: number;
  spreadCount: number;
  pageCount: number;
  pages: ManualPage[];
  sheets: ManualSheet[];
  tab: { width: number; height: number; font: number; radius: number; overflow: boolean };
}

// 书签几何。单位一律是「纸面宽度的百分比」，取自定稿件；要调形状改这一处。
const TAB_WIDTH = 5.9;
const TAB_HEIGHT = 5.4;
const TAB_FONT = 1.9;
const TAB_RADIUS = 0.9;
const TAB_FIRST = 5.5; // 第一枚离中缝多远
const TAB_PITCH = 7.1; // 相邻两枚的间距
const HALF = 50; // 中缝到纸边的跨度
const EDGE = 1; // 留一点边，别贴到红框
const MIN_WIDTH = 3; // 再窄就印不下号了

/** 纸一多就等比收窄：缩小倍数取「排得下」与「不放大」里小的那个。 */
function tabScale(sheetCount: number): number {
  const span = TAB_FIRST + TAB_PITCH * (sheetCount - 1) + TAB_WIDTH;
  return Math.min(1, (HALF - EDGE) / span);
}

/**
 * 把场景表排成一本书在某一跨页上的样子。
 * @param scenes 场景清单，顺序就是页码顺序
 * @param spread 要看第几个跨页（从 0 起）；越界会被夹到第一／最后一跨页
 */
export function planManual(scenes: readonly ManualScene[], spread: number): ManualPlan {
  const pageCount = scenes.length;
  const spreadCount = Math.max(1, Math.ceil(pageCount / 2));
  const at = Math.min(Math.max(spread, 0), spreadCount - 1);

  const pages: ManualPage[] = [];
  if (pageCount > 0) {
    for (const page of [2 * at + 1, 2 * at + 2]) {
      if (page > pageCount) continue;
      const scene = scenes[page - 1];
      pages.push({ page, key: scene.key, title: scene.title, side: page % 2 === 1 ? 'left' : 'right', state: scene.state });
    }
  }

  const sheetCount = pageCount === 0 ? 0 : Math.floor(pageCount / 2) + 1;
  const scale = tabScale(sheetCount === 0 ? 1 : sheetCount);
  const sheets: ManualSheet[] = [];
  for (let sheet = 0; sheet < sheetCount; sheet++) {
    const front = sheet === 0 ? 1 : 2 * sheet;
    const backRaw = sheet === 0 ? null : 2 * sheet + 1;
    const back = backRaw !== null && backRaw <= pageCount ? backRaw : null;
    const onLeft = sheet === 0 || sheet <= at;
    sheets.push({
      sheet,
      front,
      back,
      facing: sheet === 0 ? 1 : onLeft ? (back ?? front) : front,
      side: onLeft ? 'left' : 'right',
      tabOffset: (TAB_FIRST + TAB_PITCH * sheet) * scale,
    });
  }

  return {
    spread: at,
    spreadCount,
    pageCount,
    pages,
    sheets,
    tab: {
      width: TAB_WIDTH * scale,
      height: TAB_HEIGHT * scale,
      font: TAB_FONT * scale,
      radius: TAB_RADIUS * scale,
      overflow: TAB_WIDTH * scale < MIN_WIDTH,
    },
  };
}

/** 跨页夹取：翻页目标越界时夹到第一／最后一跨页（与 planManual 内口径同一处，壳的铜扣与签直达都走它）。 */
export function clampSpread(scenes: readonly ManualScene[], spread: number): number {
  const spreadCount = Math.max(1, Math.ceil(scenes.length / 2));
  return Math.min(Math.max(spread, 0), spreadCount - 1);
}

/** 页码→跨页：点签／目录行直达用（页码从 1 起；越界页码先夹到首末页再换算）。 */
export function spreadOfPage(scenes: readonly ManualScene[], page: number): number {
  const pageCount = scenes.length;
  if (pageCount === 0) return 0;
  const at = Math.min(Math.max(page, 1), pageCount);
  return Math.floor((at - 1) / 2);
}

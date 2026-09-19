/** #719 · 页内两类形状的**唯一定义地**：**窗口条**与**事实条**。
 *
 * 为什么收在这里：这两类形状原先在三个能力族里各写一份（窗口条四份、事实条两份），
 * 实测「函数体逐字同构、只差 CSS 类名前缀与几处几何值」——任何一处单独改动都会与另外几份漂移。
 * 故按 `docs/agents/structure.md` 铁律二（概念唯一）收成一份：形状的拼装只写一次，
 * 「族用什么类名」（`WindowVocab`／`FactVocab`）与「几处几何值」（下面两段 CSS 里的逐值差异）由族参数给。
 *
 * 谁在用（写得出哪两个能力在用）：**运动族**（`src/exercise/sportUi.ts`）、**体重族**
 * （`src/weight/weightUi.ts`，经 `src/goal/goalWeightDoc.ts` 与 `src/weight/plateDocs.ts` 间接使用）、
 * **饮食族**（`src/diet/dietUi.ts`）。三族各自的形状件留一行包装并转出原名字，
 * 调用方一行不动（既有 34 个文件的 import 与 65 处调用点全部原样）。
 *
 * ── 类名不统一，是**故意的** ──
 * `sui-`／`wui-`／`dui-` 三套类名是既有**外部契约**：包内十余个测试件按字面断言它们
 * （`sui-window`／`sui-facts`／`sui-fact-k`／`wui-strip`／`wui-strip-v`／`wui-strip-note`／
 * `dui-window` 等）。统一类名会把十几件测试一起打红，而本票的红线之一是「测试只在外部行为上说话、
 * 不为了绿而改断言」。故共用件收的是**形状的拼装逻辑**，不是类名。
 *
 * ── 几何值也不统一，同样是**故意的** ──
 * 三族的圆角／内距／外边距逐值不同（日期块圆角 `8px` vs `10px`、内距 `4px 8px` vs `3px 9px`、
 * 条外边距 `4px 0 16px` vs `2px 0 10px`、窄屏日期块内距 `8px 12px` vs `6px 10px`）。
 * 那些不是随手写的，是各次视觉裁定落下的值；把它们统一＝改三族外观，超出本票授权。
 * 故两段 CSS 里按族逐值保留（体重族与饮食族除类名外**取值相同**，一行对齐即可）。
 *
 * 本件不取数、不取时钟、不出现任何一个能力目录的名字。
 */
import { escapeHtml } from 'base-paint';

const esc = (s: string): string => escapeHtml(s);

/** 窗口条的类名词汇（族给）。 */
export interface WindowVocab {
  readonly window: string;
  readonly date: string;
  readonly arrow: string;
  readonly days: string;
}

/** 事实条的类名词汇（族给）。 */
export interface FactVocab {
  readonly facts: string;
  readonly fact: string;
  readonly key: string;
  readonly value: string;
}

/** 三族的类名词汇表（**唯一一份**；各族形状件从这里取自己那一套）。 */
export const WINDOW_VOCAB = {
  exercise: { window: 'sui-window', date: 'sui-date', arrow: 'sui-arrow', days: 'sui-days' },
  weight: { window: 'wui-window', date: 'wui-date', arrow: 'wui-arrow', days: 'wui-days' },
  diet: { window: 'dui-window', date: 'dui-date', arrow: 'dui-arrow', days: 'dui-chip' },
} as const satisfies Record<string, WindowVocab>;

/** 三族的类名词汇表（事实条只有运动族与体重族在用；饮食族不产事实条）。 */
export const FACT_VOCAB = {
  exercise: { facts: 'sui-facts', fact: 'sui-fact', key: 'sui-fact-k', value: 'sui-fact-v' },
  weight: { facts: 'wui-strip', fact: 'wui-fact', key: 'wui-fact-k', value: 'wui-fact-v' },
} as const satisfies Record<string, FactVocab>;

/** 事实条容器／小格的附加类（体重族三个专用变体位；**不进共用件接口**，只作内部附加类串）。
 *
 *  `vertical` → `<facts>-v`：整块恒纵列；`gap` → `<facts>-gap`：整块与上一件之间空一行；
 *  `asNote` → `<facts>-note`：值退成脚注口气的字。三者的名字都从 `facts` 类派生
 *  （`wui-strip` → `wui-strip-v`／`-gap`／`-note`），运动族的 `facts` 是 `sui-facts` 故给了也不出
 *  ——运动族的三个调用点从不给这三个位。
 *
 *  **顺序固定 `facts` → `-v` → `-gap` → `-note`**：既有测试件按字面断言 `wui-strip-v`／
 *  `wui-strip-note`，且原实现就是这个顺序，重排会让产物变形。 */
function variantClasses(vocab: FactVocab, v: {
  readonly vertical?: boolean;
  readonly gap?: boolean;
  readonly asNote?: boolean;
}): string {
  return (v.vertical === true ? ' ' + vocab.facts + '-v' : '')
    + (v.gap === true ? ' ' + vocab.facts + '-gap' : '')
    + (v.asNote === true ? ' ' + vocab.facts + '-note' : '');
}

/** 窗口条：`2026-09-01 → 2026-09-07` ＋ 天数（或条数）胶囊。
 *
 *  `start === end`（单日窗）只出一枚日期块、不出箭头，块内写「（单日）」——不替读者断言一个
 * 不存在的跨度（#510 立的退化分支，三族同口径）。日期文本走 `escapeHtml`。 */
export function windowStrip(start: string, end: string, chipText: string | undefined, vocab: WindowVocab): string {
  const chip = chipText === undefined || chipText === '' ? '' : '<span class="' + vocab.days + '">' + esc(chipText) + '</span>';
  if (start === end) {
    return '<div class="' + vocab.window + '"><span class="' + vocab.date + '">' + esc(start) + '（单日）</span>' + chip + '</div>';
  }
  return '<div class="' + vocab.window + '">'
    + '<span class="' + vocab.date + '">' + esc(start) + '</span>'
    + '<span class="' + vocab.arrow + '">→</span>'
    + '<span class="' + vocab.date + '">' + esc(end) + '</span>'
    + chip
    + '</div>';
}

/** 事实条：一组「标签 ＋ 值」。`v` 为空串的那一条整条不出（缺值不留空槽）。
 *
 *  `variant` 三位是**落点**不是形状（见 `variantClasses`）。 */
export function factStrip(
  facts: ReadonlyArray<{ k: string; v: string }>,
  vocab: FactVocab,
  variant: { readonly vertical?: boolean; readonly gap?: boolean; readonly asNote?: boolean } = {},
): string {
  const body = facts
    .filter((f) => f.v !== '')
    .map((f) => '<span class="' + vocab.fact + '"><span class="' + vocab.key + '">' + esc(f.k) + '</span>'
      + '<span class="' + vocab.value + '">' + esc(f.v) + '</span></span>')
    .join('');
  return body === '' ? '' : '<div class="' + vocab.facts + variantClasses(vocab, variant) + '">' + body + '</div>';
}

/** 窗口条的 CSS（**裸串，不带 `<style>` 标签**；三族逐值保留各自的几何）。
 *
 *  体重族与饮食族取值相同，只类名前缀不同。本函数产出的是一段可直接拼进族样式段的字符串。 */
export function windowStripCss(): string {
  return ''
    // ── 运动族（`sui-`）：圆角 8px／内距 4px 8px／条外边距 4px 0 16px／窄屏 8px 12px ──
    + '.sui-window{display:inline-flex;align-items:center;gap:8px;flex-wrap:wrap;margin:4px 0 16px}'
    + '.sui-date{font-size:13px;font-weight:600;color:var(--fg);background:var(--card);'
    + 'border:1px solid var(--line);border-radius:8px;padding:4px 8px;font-variant-numeric:tabular-nums}'
    + '.sui-arrow{color:var(--fg3);font-size:13px}'
    + '.sui-days{font-size:12px;font-weight:700;color:var(--blue2);background:var(--soft);'
    + 'border-radius:999px;padding:4px 8px}'
    + '@media (max-width:820px){'
    + '  .sui-window{gap:8px}'
    + '  .sui-date{padding:8px 12px;min-height:32px;display:inline-flex;align-items:center}'
    + '  .sui-days{padding:4px 12px}'
    + '}'
    // ── 体重族（`wui-`）：圆角 10px／内距 3px 9px／条外边距 2px 0 10px／窄屏 6px 10px ──
    + '.wui-window{display:inline-flex;align-items:center;gap:8px;flex-wrap:wrap;margin:2px 0 10px}'
    + '.wui-date{font-size:13px;font-weight:600;color:var(--fg);background:var(--card);border:1px solid var(--line);'
    + 'border-radius:10px;padding:3px 9px;font-variant-numeric:tabular-nums}'
    + '.wui-arrow{color:var(--fg3);font-size:13px}'
    + '.wui-days{font-size:12px;font-weight:700;color:var(--blue2);background:var(--soft);border-radius:999px;padding:3px 10px}'
    + '@media (max-width:820px){'
    + '  .wui-window{gap:6px}'
    + '  .wui-date{padding:6px 10px;min-height:32px;display:inline-flex;align-items:center}'
    + '  .wui-days{padding:5px 10px}'
    + '}'
    // ── 饮食族（`dui-`；天数胶囊叫 `dui-chip`）：逐值同体重族 ──
    + '.dui-window{display:inline-flex;align-items:center;gap:8px;flex-wrap:wrap;margin:2px 0 10px}'
    + '.dui-date{font-size:13px;font-weight:600;color:var(--fg);background:var(--card);border:1px solid var(--line);'
    + 'border-radius:10px;padding:3px 9px;font-variant-numeric:tabular-nums}'
    + '.dui-arrow{color:var(--fg3);font-size:13px}'
    + '.dui-chip{font-size:12px;font-weight:700;color:var(--blue2);background:var(--soft);border-radius:999px;padding:3px 10px}'
    + '@media (max-width:820px){.dui-window{gap:6px}'
    + '.dui-date{padding:6px 10px;min-height:32px;display:inline-flex;align-items:center}}';
}

/** 事实条的 CSS（**裸串，不带 `<style>` 标签**）。
 *
 *  **本票唯一一处可见版式变更落在这里**：体重族的容器从「一行横排（`flex-wrap:wrap`）」改成
 *  「等宽小格（`auto-fit` 栅格、窄屏塌单列）」——正本取运动族那套（票面 §二、§六 第 1 条，用户已授权）。
 *  类名与其余属性（字号／色／权重）一律不动：体重族那三个变体位（`-v`／`-gap`／`-note`）的原规则
 *  也逐值保留，故 `wui-strip-v` 的纵列版式与 `wui-strip-note` 的脚注口气字**一行未改**。
 *
 *  体重族与运动族的**键／值两小格在桌面档的取向不同**（运动族「键上值下」，体重族「键值同行」），
 *  故 `.wui-fact` 不给 `flex-direction:column`；到了窄屏两族同归「键贴左、值贴右的纵列」。 */
export function factStripCss(): string {
  return ''
    // ── 运动族（`sui-`）──
    + '.sui-facts{display:grid;grid-template-columns:repeat(auto-fit,minmax(148px,1fr));gap:8px 16px;margin:8px 0 16px}'
    + '.sui-fact{display:flex;flex-direction:column;gap:2px;min-width:0}'
    // 键色 `--fg3`(#86868b) 对白底仅 3.62:1，12px 正文要 4.5:1；`--fg2`(#6e6e73) 为 5.07:1
    // （同包 `base-render/src/style.ts:567` 已为同类 12px 小字做过同一次改动，本处照办）。
    + '.sui-fact-k{font-size:12px;color:var(--fg2);white-space:nowrap}'
    + '.sui-fact-v{font-size:13px;font-weight:600;color:var(--fg);font-variant-numeric:tabular-nums;min-width:0}'
    // ── 体重族（`wui-strip`）：容器**逐值换成运动族那套栅格**（本票唯一可见变更）；键值两格与三个变体位原样 ──
    + '.wui-strip{display:grid;grid-template-columns:repeat(auto-fit,minmax(148px,1fr));gap:8px 16px;margin:2px 0 10px}'
    + '.wui-strip-v{flex-direction:column;align-items:stretch;gap:8px}'
    // 空槽（`margin-top:16px`）：**卡片的 `detail` 槽**里本件没有兄弟件可借距（KPI 值槽之下直接是本条）。
    + '.wui-strip-gap{margin-top:16px}'
    // 纵列里的一组「标签 ＋ 值」：标签在左、值贴右，行行对齐（窄屏的事实一栏读法）。
    + '.wui-strip-v .wui-fact{width:100%;justify-content:space-between;gap:12px}'
    // 「标签 ＋ **说明句**」那一型（`factStrip(facts, false, true, true)`）：值不是量值而是一句脚注口气的
    // 说明（「目标值超出刻度」），整块退一档（同 `.wui-note` 的字号／行高／色），不跟量值抢眼。
    // #510：两半**分两档**——标签留 `--fg3`、说明那半落到 `--fg2` 且不加粗（原来两半同为 13px 加粗 `--fg`，
    // 并排读成一句不通的话：`图上没画目标线 目标值超出刻度`）。
    + '.wui-strip-note .wui-fact{display:flex;align-items:baseline;flex-wrap:wrap;gap:2px 8px}'
    + '.wui-strip-note .wui-fact-k{font-size:12px;color:var(--fg3);font-weight:400;white-space:normal}'
    + '.wui-strip-note .wui-fact-v{font-size:12px;font-weight:400;color:var(--fg2);line-height:1.6}'
    // 体重族的键值两格：**逐值保留原写法**（桌面「键值同行」，与原 `.wui-fact` 一字不差）。
    + '.wui-fact{display:inline-flex;align-items:baseline;gap:6px;min-width:0}'
    + '.wui-fact-k{font-size:12px;color:var(--fg3);white-space:nowrap}'
    + '.wui-fact-v{font-size:13px;font-weight:600;color:var(--fg);font-variant-numeric:tabular-nums}'
    // ── 两族的窄屏段（820）：塌单列，键贴左／值贴右（两族同写法，逐值保留）──
    + '@media (max-width:820px){'
    + '  .sui-facts{grid-template-columns:minmax(0,1fr);gap:8px}'
    + '  .sui-fact{flex-direction:row;justify-content:space-between;align-items:baseline;gap:12px}'
    + '  .wui-strip{grid-template-columns:minmax(0,1fr);gap:8px}'
    + '  .wui-strip-v{gap:8px}'
    + '  .wui-fact{flex-direction:row;justify-content:space-between;align-items:baseline;gap:12px}'
    + '  .wui-fact-v{font-size:13px}'
    + '}'
    // ── 触摸面（HELP 第 ①）：两族的键值行／窗口条都是读者在手机上会按住的一块内容 ──
    + '.sui-facts,.sui-window{-webkit-tap-highlight-color:transparent;touch-action:manipulation}';
}

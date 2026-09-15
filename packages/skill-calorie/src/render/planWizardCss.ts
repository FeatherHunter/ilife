/** T351-v11 · 「构建向导」（order186）的页内样式（唯一产出者）。
 *
 * 本页要两件共享样式表里没有的东西：
 *   ① **时间线的形状**（计划 → 周 → 日 → 时段 → 动作 五层的缩进、连接线、层头）；
 *   ② **零脚本的交互**：勾选就地展开那一层的改法 ＋ 右上角「你已改的内容 N」现算。
 * 第 ② 条是本页敢说「是工具不是回显」的根据，做法全在这件里：
 *   - 展开：`input:checked ~ .ilw-how{display:block}`（勾选与说明块同父同级）；
 *   - 计数：`.ilw-wiz{counter-reset:changed}` ＋ `.ilw-mark:checked{counter-increment:changed}`
 *     ＋ `.ilw-count b::after{content:counter(changed)}`；计数元素排在全页勾选**之后**、绝对定位到右上角
 *     （计数器取文档顺序上它之前的累计值，排前面永远读到 0）。
 *
 * 色值只用冻结 token（`--fg/--fg2/--fg3/--bg/--card/--line/--blue/--ok`）；`#ff9500` 与 `#ff3b30`
 * 是本仓没有冻结对应、照老页写死的两档状态色（同 `reviewDocsCss.ts`／`workoutPlanCss.ts` 的成例）。
 * 窄屏（820 · 同 HELP）在文件末尾一段：时间线缩进收窄、动作行的三段改两行。
 */
import { pageChromeCss } from './pageChromeCss.js';

const CARD = 'background:var(--card);border:1px solid var(--line);border-radius:16px;box-shadow:var(--shadow)';

const STATIC_CSS = [
  '/* 全页根：计数器的计数域（`counter-reset` 放这里，勾选在任意深度都能累到它） */',
  '.ilw-wiz{position:relative;counter-reset:changed}',
  '/* 右上角「你已改的内容 N」：元素在 DOM 末尾（数得全），靠绝对定位钉到页头右侧 */',
  '.ilw-count{position:absolute;top:4px;right:0;display:inline-flex;align-items:center;gap:6px;'
    + 'padding:6px 12px;border-radius:999px;background:var(--soft,#f5f8ff);color:var(--blue);'
    + 'font-size:12.5px;font-weight:600;white-space:nowrap}',
  '.ilw-count b::after{content:counter(changed)}',
  '.ilw-count b{font-size:14px;font-variant-numeric:tabular-nums}',
  '/* 勾选计数器：勾一颗加一（纯 CSS，无脚本） */',
  '.ilw-mark:checked{counter-increment:changed}',
  '.ilw-mark{position:absolute;width:1px;height:1px;margin:-1px;padding:0;border:0;overflow:hidden;'
    + 'clip:rect(0 0 0 0);white-space:nowrap}',
  '/* 「改这一层」勾选钮：胶囊，勾上变主色实心；触摸目标 44px（照 HELP） */',
  '.ilw-tick{display:inline-flex;align-items:center;gap:6px;min-height:44px;padding:0 12px;'
    + 'border:1px solid var(--line);border-radius:999px;background:var(--card);color:var(--fg2);'
    + 'font-size:12.5px;font-weight:600;cursor:pointer;'
    + '-webkit-tap-highlight-color:transparent;touch-action:manipulation}',
  '.ilw-tick:hover{border-color:var(--blue);color:var(--blue)}',
  '.ilw-tick::before{content:"";width:10px;height:10px;border-radius:50%;border:1.5px solid currentColor;flex:none}',
  '/* 勾选态与展开都挂在 `:has()` 上：选钮在 `<label>` **里面**（这样整块胶囊都是点击区），',
  '   拿 `input:checked ~ .xxx` 够不着——同级兄弟是 label，不是 input。`:has()` 在 Chrome 105＋／',
  '   Safari 15.4＋／Firefox 121＋ 可用；本页是给人双击打开看的页，两年前的浏览器不在支持面内。 */',
  '.ilw-tick:has(.ilw-mark:checked){background:var(--blue);border-color:var(--blue);color:#fff}',
  '.ilw-tick:has(.ilw-mark:focus-visible){outline:2px solid var(--blue);outline-offset:2px}',
  '/* 展开块：默认收起，勾上才出；缩进对齐到它所属的那一层 */',
  '.ilw-how{margin:8px 0 0;padding:10px 14px;border-left:3px solid var(--blue);border-radius:0 8px 8px 0;'
    + 'background:var(--soft,#f5f8ff);color:var(--fg2);font-size:12.5px;display:none}',
  '.ilw-tick:has(.ilw-mark:checked)~.ilw-how{display:block}',
  '/* 展开块里「该说哪句话」逐条排成胶囊（不串成 `；` 一句，第 ⑤ 条） */',
  '.ilw-act{display:inline-block;margin:2px 4px 2px 0;padding:2px 9px;border-radius:999px;'
    + 'background:var(--card);border:1px solid var(--line);color:var(--fg);font-size:12px;font-weight:600}',
  '/* 计划读数：几周、几时段、几动作各一枚（原来 `1 周 · 1 时段 · 1 个动作` 用 `·` 串） */',
  '.ilw-stat{display:inline-block;margin-right:10px;font-size:12.5px;color:var(--fg3);'
    + 'font-variant-numeric:tabular-nums}',
  '/* 动作行的小标签（部位／类型各一枚，原来 `胸 · 力量`） */',
  '.ilw-tag{display:inline-block;margin-right:6px;padding:1px 7px;border-radius:5px;background:var(--bg);'
    + 'color:var(--fg2);font-size:11.5px}',
  '/* 结论条：一行三读数，左起一条状态色竖条 */',
  '.ilw-verdict{display:flex;flex-wrap:wrap;align-items:center;gap:14px;margin:0 0 10px;'
    + 'padding:14px 18px;border-radius:16px;box-shadow:var(--shadow);background:var(--card);'
    + 'border-left:4px solid var(--ok)}',
  '.ilw-verdict.is-warn{border-left-color:#ff9500}',
  '.ilw-verdict-word{font-size:15px;font-weight:600;color:var(--fg)}',
  '.ilw-verdict-num{font-size:12.5px;color:var(--fg2);font-variant-numeric:tabular-nums}',
  '/* 计划级（时间线的根） */',
  '.ilw-plan{padding:18px 20px;margin:0 0 14px;' + CARD + '}',
  '.ilw-plan-head{display:flex;flex-wrap:wrap;align-items:baseline;gap:10px;margin:0 0 6px}',
  '.ilw-plan-name{font-size:18px;font-weight:700;color:var(--fg)}',
  '.ilw-plan-count{font-size:12.5px;color:var(--fg3);font-variant-numeric:tabular-nums}',
  '.ilw-plan-desc{margin:0 0 8px;font-size:13px;color:var(--fg2)}',
  '.ilw-facts{display:flex;flex-wrap:wrap;gap:14px;margin:0 0 10px}',
  '.ilw-fact{font-size:12.5px;color:var(--fg2)}',
  '.ilw-fact b{color:var(--fg3);font-weight:600;margin-right:6px}',
  '/* 时间线：一条主竖线，每一层贴着它往右缩 */',
  '.ilw-timeline{margin:0 0 14px;padding-left:18px;border-left:2px solid var(--line)}',
  '.ilw-week{position:relative;padding:14px 0 0 0;margin:0 0 10px}',
  '.ilw-week::before{content:"";position:absolute;left:-24px;top:22px;width:12px;height:2px;background:var(--line)}',
  '.ilw-week-head{display:flex;flex-wrap:wrap;align-items:center;gap:10px;margin:0 0 10px}',
  '.ilw-week-name{font-size:16px;font-weight:700;color:var(--fg)}',
  '.ilw-week-count{font-size:12px;font-weight:600;color:var(--fg2);background:var(--bg);'
    + 'border-radius:999px;padding:2px 10px}',
  '.ilw-day{margin:0 0 10px;padding:12px 14px;background:var(--card);border:1px solid var(--line);'
    + 'border-radius:12px}',
  '.ilw-day-head{display:flex;align-items:center;gap:10px;margin:0 0 8px}',
  '.ilw-day-name{font-size:14px;font-weight:600;color:var(--fg)}',
  '.ilw-day-count{font-size:12px;color:var(--fg3)}',
  '.ilw-sess{padding:10px 12px;margin:0 0 8px;border-radius:10px;background:var(--bg)}',
  '.ilw-sess-rest{color:var(--fg3)}',
  '.ilw-sess-head{display:flex;flex-wrap:wrap;align-items:baseline;gap:10px}',
  '.ilw-sess-name{font-size:13.5px;font-weight:600;color:var(--fg)}',
  '.ilw-sess-time{font-size:12px;color:var(--fg2);font-variant-numeric:tabular-nums}',
  '.ilw-sess-count{font-size:12px;color:var(--fg3);margin-left:auto}',
  '/* 动作行（第 6 级「组」：组数×次数与重量就在这行右半边） */',
  '.ilw-moves{margin:8px 0 0;padding:0;list-style:none}',
  '.ilw-move{display:flex;flex-wrap:wrap;align-items:baseline;gap:10px;padding:6px 0;'
    + 'border-top:1px solid var(--line)}',
  '.ilw-move-name{font-size:13px;font-weight:600;color:var(--fg)}',
  '.ilw-move-meta{font-size:11.5px;color:var(--fg3)}',
  '.ilw-move-sets{margin-left:auto;font-size:12.5px;color:var(--fg2);font-variant-numeric:tabular-nums}',
  '/* 「这一层还空着」的缺口提示：点出下一步该说哪句话 */',
  '.ilw-gap{margin:0;font-size:12.5px;color:var(--fg3)}',
  '/* 窄屏（820 · 同 HELP）：时间线与缩进收窄，动作行三段改成两行 */',
  '@media (max-width:820px){',
  '/* 计数在 DOM 末尾（要数全），窄屏没法再靠绝对定位钉右上角——改成**浮动在屏幕底部**的胶囊，',
  '   勾一颗抬头就看得见；页尾留出它的高度免得压住复制按钮 */',
  '.ilw-wiz{padding-bottom:64px}',
  '.ilw-count{position:fixed;top:auto;right:auto;left:50%;bottom:12px;transform:translateX(-50%);'
    + 'margin:0;z-index:5;box-shadow:var(--shadow);background:var(--card);border:1px solid var(--line)}',
  '.ilw-plan{padding:16px 16px}',
  '.ilw-verdict{gap:10px;padding:12px 14px}',
  '.ilw-timeline{padding-left:12px}',
  '.ilw-day{padding:10px 12px}',
  '.ilw-sess-count{margin-left:0}',
  '.ilw-move-sets{margin-left:0;width:100%}',
  '}',
].join('\n');

/** 本页页内样式块（页面级那套另由 `./pageChromeCss.ts` 出）。 */
export function planWizardCss(): string {
  return '<style>\n' + STATIC_CSS + '\n</style>';
}

/** 页面级样式（本页复用共用件，导出只为让调用方少 import 一处）。 */
export { pageChromeCss };

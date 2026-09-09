/** t88 探针 5：壳产物结构细节（去 CSS/JS 后的正文），定位缺口与体积来源。只读。 */
const out = [];
const say = (s) => out.push(s);
const base = await import('../../packages/base-render/dist/index.js');
const css = base.buildStyleSheet().css;
const js = base.buildSharedHelpersJs();

// linear-gradient 位置
const li = css.indexOf('linear-gradient');
say('CSS-LINEAR-CTX ' + JSON.stringify(css.slice(Math.max(0, li - 160), li + 90)));
say('CSS-LINEAR-COUNT ' + (css.split('linear-gradient').length - 1));
// window. 位置
for (const m of js.matchAll(/window\./g)) say('HELPERS-WINDOW-CTX ' + JSON.stringify(js.slice(Math.max(0, m.index - 90), m.index + 60)));
// 关键能力探针（helpers JS 里有没有搜索/高亮/sheet 逻辑）
// R1-14 修：`'mark'` 子串会命中 `MARKER_ATTR`／`MARKER_SEL`（假阳性）→ 改用标签级正则。
for (const k of ['querySelectorAll', 'input', 'search', 'highlight', 'open(', 'details', 'tab']) {
  say('HELPERS-HAS-' + k.toUpperCase() + ' ' + (js.split(k).length - 1));
}
say('HELPERS-HAS-MARKTAG ' + ([...js.matchAll(/<mark[\s>]/g)].length) + ' (R1-14：标签级，非 MARKER_* 子串)');
say('HELPERS-HAS-MARKER-SUBSTR ' + (js.split('mark').length - 1) + ' (旧口径，含 MARKER_ATTR/SEL，仅备查)');
say('HELPERS-HEAD ' + JSON.stringify(js.slice(0, 200)));
say('HELPERS-ACTIONS ' + JSON.stringify([...js.matchAll(/data-action-id|data-t|addEventListener/g)].map((m) => m[0]).join(',')));
console.log(out.join('\n'));

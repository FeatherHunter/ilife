/** #464 复核新探针（被审脚本覆盖不到的盲区）：空格/缺键/数字0/破折号文本四边角。
 * 只读 dist 的 buildBodyCompositionDoc，不碰实现源码，不写库。
 * 判据：typeof x.note === 'string' ? x.note : '—' 必须严格按类型走，
 *   ' ' 原样透传（不断言可见归一化，只看原始格），undefined/0 走 '—'，
 *   '—' 文本透传（与占位同形，靠载荷区分不在本探针内）。
 * 输出机器读数 REVIEW-PROBE 一行，exit 0=全绿，exit 1=红。
 */
import { buildBodyCompositionDoc } from '../../packages/skill-calorie/dist/body/bodyDocs.js';

function mkView(notes) {
  const items = notes.map((n, i) => {
    const r = { date: '2026-09-0' + (i + 1), body_fat_pct: 20 + i, source: 'gym' };
    if (n !== '<MISSING>') r.note = n;
    return r;
  });
  return {
    source: 'gym', sourceParam: null, items, total: items.length,
    window: { kind: 'all' }, windowTotal: items.length, trend: [],
    latestPct: 20, anchor: { date: '2026-09-01', pct: 20, source: 'gym' },
    delta: null, calipers: null, sourceSeries: [], sourceCount: 0,
  };
}
function cellsOf(html) {
  const m = html.match(/<tbody>([\s\S]*?)<\/tbody>/);
  const body = (m && m[1]) || '';
  return body.split(/<tr[^>]*>/).slice(1).map((tr) =>
    tr.split(/<td[^>]*>/).slice(1).map((c) => (c.split('</td>')[0] ?? '').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"')));
}
const notes = [' ', '<MISSING>', 0, '—'];
const html = buildBodyCompositionDoc(mkView(notes));
const rows = cellsOf(html);
const got = rows.map((r) => r[3]);
console.log('REVIEW-PROBE raw=' + JSON.stringify(got));
let fail = 0;
function eq(a, b, msg) { if (a !== b) { console.error('FAIL ' + msg + ' got=' + JSON.stringify(a) + ' want=' + JSON.stringify(b)); fail++; } else console.log('ok ' + msg); }
eq(got[0], ' ', '空格原样透传');
eq(got[1], '—', '缺键走—');
eq(got[2], '—', '数字0走—');
eq(got[3], '—', '破折号文本透传为—形');
if (fail > 0) { console.log('REVIEW-PROBE RESULT: FAIL ' + fail); process.exit(1); }
console.log('REVIEW-PROBE RESULT: PASS 4/4');

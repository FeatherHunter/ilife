/** #394 独立审查探针（审查席新建，实施者脚本覆盖不到的盲区）。
 *
 * 只读原样张；变异只做在 `.scratch/t394-review/` 副本上，原样张一个字节不动。
 * N8/N9 谓词与判据 `packages/skill-calorie/test/t156-fusion-sample.test.mjs` 逐字同义，
 * 变异红＝判据有鉴别力；盲区段查判据没覆盖的项（单文件性、锚点完整性）。
 *
 * 运行（会写工作区，必须持锁）：
 *   node tooling/run-locked.mjs --ticket 394 -- node docs/skills/skill-calorie/t394-review-probe.mjs
 * 机器读数行以 PROBE- 开头；全部符合预期 exit 0，否则 exit 1。
 */
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO = join(HERE, '..', '..', '..');
const OUT = join(REPO, '.scratch', 't394-review');
mkdirSync(OUT, { recursive: true });

const S1P = join(REPO, 'docs', 'skills', 'skill-calorie', 't156-样张-写后回执.html');
const S2P = join(REPO, 'docs', 'skills', 'skill-calorie', 't156-样张-运动复盘.html');
const s1 = readFileSync(S1P, 'utf8');
const s2 = readFileSync(S2P, 'utf8');
writeFileSync(join(OUT, 's1.orig.html'), s1);
writeFileSync(join(OUT, 's2.orig.html'), s2);

// —— 与判据逐字同义的谓词（拷自 t156-fusion-sample.test.mjs N8/N9） ——
function n8(h) {
  return ((h.match(/href="#sec-/g) || []).length >= 3)
    && ((h.match(/id="sec-/g) || []).length >= 3)
    && h.includes('<nav');
}
function n9(h) { return h.includes('@media print'); }

let pass = 0;
let total = 0;
function expect(id, cond, detail) {
  total += 1;
  if (cond) { pass += 1; console.log('PROBE-' + id + ': PASS ' + detail); }
  else { console.log('PROBE-' + id + ': FAIL ' + detail); }
}

// —— 变异 A：去掉页内导航，看判据是否变红 ——
function stripNav(h) { return h.replace(/<nav[\s\S]*?<\/nav>/, ''); }
const a1 = stripNav(s1);
const a2 = stripNav(s2);
writeFileSync(join(OUT, 's1.nonnav.html'), a1);
writeFileSync(join(OUT, 's2.nonnav.html'), a2);
expect('MUT-nav-strip-S1-N8-red', n8(a1) === false, 'S1去导航后N8=' + n8(a1) + '（原值' + n8(s1) + '，期望false）');
expect('MUT-nav-strip-S2-N8-red', n8(a2) === false, 'S2去导航后N8=' + n8(a2) + '（原值' + n8(s2) + '，期望false）');

// —— 变异 B：去掉打印样式，看判据是否变红 ——
const Q = String.fromCharCode(64) + 'media print'; // '@media print'，避免字面量被判据原文干扰
function stripPrint(h) { return h.split(Q).join('@media speech'); }
const b1 = stripPrint(s1);
const b2 = stripPrint(s2);
writeFileSync(join(OUT, 's1.noprint.html'), b1);
writeFileSync(join(OUT, 's2.noprint.html'), b2);
expect('MUT-print-strip-S1-N9-red', n9(b1) === false, 'S1去打印后N9=' + n9(b1) + '（原值' + n9(s1) + '，期望false）');
expect('MUT-print-strip-S2-N9-red', n9(b2) === false, 'S2去打印后N9=' + n9(b2) + '（原值' + n9(s2) + '，期望false）');

// —— 盲区 C：原样张单文件性（无外部引用，判据未查） ——
function extRefs(h) {
  const pats = [/https?:\/\//g, /<link rel/g, /@import/g, /<iframe/g, /src="http/g];
  let n = 0;
  for (const p of pats) { n += (h.match(p) || []).length; }
  return n;
}
expect('BLIND-single-file-S1', extRefs(s1) === 0, 'S1外部引用数=' + extRefs(s1) + '（期望0）');
expect('BLIND-single-file-S2', extRefs(s2) === 0, 'S2外部引用数=' + extRefs(s2) + '（期望0）');

// —— 盲区 D：锚点完整性（每个 href="#x" 都有 id="x"，判据只数个数不查对应） ——
function danglingAnchors(h) {
  const DQ = String.fromCharCode(34);
  const hrefs = h.split('href=').slice(1).map(function (s) {
    const t = s.split(DQ)[1] || '';
    return t.charAt(0) === '#' ? t.slice(1) : t;
  });
  const ids = {};
  h.split('id=').slice(1).forEach(function (s) { ids[s.split(DQ)[1]] = 1; });
  return hrefs.filter(function (t) { return !ids[t]; });
}
expect('BLIND-anchors-S1', danglingAnchors(s1).length === 0, 'S1悬空锚点=' + JSON.stringify(danglingAnchors(s1)));
expect('BLIND-anchors-S2', danglingAnchors(s2).length === 0, 'S2悬空锚点=' + JSON.stringify(danglingAnchors(s2)));

console.log('PROBE-RESULT: ' + pass + '/' + total);
process.exit(pass === total ? 0 : 1);

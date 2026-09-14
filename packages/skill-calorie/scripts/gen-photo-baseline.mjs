#!/usr/bin/env node
/** #341 · 身材照片十页基线（跑十页、写／比 sha 清单）。
 *
 * 口径（票面写死）：
 * - 固定种子库：每页一张新鲜临时库，3 张照片（2026-09-04 正面／2026-09-05 正面+备注／
 *   2026-09-06 侧面），字节固定（1x1 PNG），`addPhotos` 落库（文件名＝日期_序号.png）。
 * - 固定照片目录：每页新鲜临时目录，经 `--params photosDir` 显式传入（不读不写环境变量）。
 * - 固定时钟：凡能显式传日期的页一律显式传（list 传 `today:2026-09-06`、gif 传 `days:36500`、
 *   gif-planner 传 `start/end`、add 传 `date/time`）；`help.center` 走 `q` 现找分支（不碰 `new Date()`）。
 * - 比对**规范化后的页面正文 sha256**（剥掉临时目录绝对路径、产物时间戳与渲染当刻时钟），不比文件字节。
 *   #462：三条写后回执页（`photo.add`／`remove`／`tag`）的回执时间取自 `src/render/receipt.ts` 的
 *   `nowStamp()`（渲染当刻系统时钟、取到秒），页面参数钉住了业务日期也钉不住它——故按四处已知位置剥
 *   （见 `CLOCK_STRIP_RULES`），不剥别的数字；剥不净即报错，不静默放过。
 * - 目标页（`calorie.photo.list`）有据更新；其余页 sha 冻结式守护：无据不得变，
 *   有据更新须附成因（见 t341 文档附录·基线重落），改完之后 `--check` 逐页报告。
 *
 * 基线清单即本文件尾部的 `BASELINE` 常量（不另落 JSON 文件：本票只写四处路径，
 * 清单住脚本自己体内）。`--write` 重算并回写本文件；`--check` 逐页比对并 exit。
 *
 * 用法：
 *   node packages/skill-calorie/scripts/gen-photo-baseline.mjs --write
 *   node packages/skill-calorie/scripts/gen-photo-baseline.mjs --check
 */
import { createHash } from 'node:crypto';
import { mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { openDb } from '../dist/index.js';
import { dispatch } from '../dist/cli/cmd_read.js';
import { dispatchWrite } from '../dist/cli/write.js';

/* ── 基线清单（`--write` 回写本块；`--check` 逐键比对） ── */
// BASELINE-BEGIN
const BASELINE = {
  "calorie.help.center": "fe452fadf15fe8ef94033bcac573bb6d5e97dc5ea6b2133b86356ce56d91251e",
  "calorie.photo.add": "d580551414e1d313e771a143dafc5667ffcd4908ca148c7f4c113f6d91eaa3b1",
  "calorie.photo.compare": "5495d89bcbeb6d3d6911c90b87ce73e19b359b04a09a1689994418f0ef077863",
  "calorie.photo.detail": "560a9b04745ac979c690c0138e76435671423babebbaece48225c9fc3cb811c3",
  "calorie.photo.gif": "b303a017301ae91cec22ab0506d0f1f261910653eebdecb901689b7fd2044138",
  "calorie.photo.list": "e10e44a69b838b5ff2e27db16ab27cde497094d07bb3c0fe1ea85bfe58a752f1",
  "calorie.photo.remove": "bb9390bcdb1256e4ad6ad2a373a6c4ddad1ddb9e3f60aec32d751aecd598f65f",
  "calorie.photo.tag": "fcf4621b1bb125b9e60b208bf810db63ccfae3df908e9defbc806c6922e6f57b",
  "calorie.view.gif-planner": "74358b47f733084b5bf9a199e72ece44bfc05940a38514aff09e4398189211ba",
  "calorie.view.photo-log-wizard": "4d25708e56b1f0bf4448fe23a5a58b5ff4bffb7c52d6aed4884e21a0eb3535e8"
};
// BASELINE-END

const TINY_PNG_B64 =
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==';
const TINY_PNG_2_B64 =
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';

function seedFresh() {
  const root = mkdtempSync(join(tmpdir(), 't341-base-'));
  const srcDir = join(root, 'src');
  const photosDir = join(root, 'photos');
  const { mkdirSync, writeFileSync: wfs } = await_import_fs();
  mkdirSync(srcDir, { recursive: true });
  mkdirSync(photosDir, { recursive: true });
  const a = join(srcDir, 'a.png');
  const b = join(srcDir, 'b.png');
  const c = join(srcDir, 'c.png');
  wfs(a, Buffer.from(TINY_PNG_B64, 'base64'));
  wfs(b, Buffer.from(TINY_PNG_2_B64, 'base64'));
  wfs(c, Buffer.from(TINY_PNG_B64, 'base64'));
  const db = openDb(join(root, 'calorie_data.db'));
  const { addPhotos } = await_import_photos();
  addPhotos(db, photosDir, { srcPaths: [a], tag: '正面', today: '2026-09-04', nowTime: '08:00:00' });
  addPhotos(db, photosDir, { srcPaths: [b], tag: '正面', note: '早起', today: '2026-09-05', nowTime: '08:00:00' });
  addPhotos(db, photosDir, { srcPaths: [c], tag: '侧面', today: '2026-09-06', nowTime: '08:00:00' });
  return { root, db, photosDir, seedA: a };
}

// 同步 import 替代（顶层 await 可用，dist 为 ESM，直接静态 import 即可；此处用函数包一层保持 seedFresh 同步签名）。
import { mkdirSync as _mkdirSync, writeFileSync as _writeFileSync } from 'node:fs';
import { addPhotos as _addPhotos } from '../dist/photo/photos.js';
function await_import_fs() {
  return { mkdirSync: _mkdirSync, writeFileSync: _writeFileSync };
}
function await_import_photos() {
  return { addPhotos: _addPhotos };
}

/** 十页：键＋固定参数（photosDir 由每页新鲜种子在运行时注入，键 `key` 旁标注读写）。 */
function pagesOf(photosDir, seedA) {
  return [
    { key: 'calorie.help.center', kind: 'read', params: { q: '记身材照' } },
    { key: 'calorie.photo.add', kind: 'write', params: { srcPaths: [seedA], tag: '正面', date: '2026-09-06', time: '08:00:00', photosDir } },
    { key: 'calorie.photo.compare', kind: 'read', params: { id1: 1, id2: 2, photosDir } },
    { key: 'calorie.photo.detail', kind: 'read', params: { id: 1, photosDir } },
    { key: 'calorie.photo.gif', kind: 'read', params: { tag: '正面', days: 36500, photosDir } },
    { key: 'calorie.photo.list', kind: 'read', params: { tag: '正面', today: '2026-09-06', photosDir } },
    { key: 'calorie.photo.remove', kind: 'write', params: { id: 3, photosDir } },
    { key: 'calorie.photo.tag', kind: 'write', params: { id: 1, op: 'add', tag: '晨起', photosDir } },
    { key: 'calorie.view.gif-planner', kind: 'read', params: { tag: '正面', start: '2026-09-01', end: '2026-09-06', photosDir } },
    { key: 'calorie.view.photo-log-wizard', kind: 'read', params: {} },
  ];
}

/* ── #462 · 渲染当刻时钟的剥除规则 ──
 * 三条写后回执页的「回执行时间格」与「复制日志」都取自 `src/render/receipt.ts` 的 `nowStamp()`
 * （渲染当刻系统时钟、`YYYY-MM-DD HH:MM:SS`、取到秒），与种子库、页面参数里的业务日期无关。
 * 只在下述四处已知位置剥：每条规则只吃一处 19 字符的时钟串，替换成 `<CLOCK>`，不吃别的数字。
 */
const CLOCK_MARK = '<CLOCK>';
const CLOCK_TEXT = '\\d{4}-\\d{2}-\\d{2} \\d{2}:\\d{2}:\\d{2}';
const CLOCK_STRIP_RULES = [
  // ① 回执行「时间」格：`>时间</td><td …>2026-09-14 23:35:57 · body_photos (写库回执)`
  [new RegExp('(>时间</td><td[^>]*>)' + CLOCK_TEXT, 'g'), (p) => p + CLOCK_MARK],
  // ② 回执行「写入时间」格：`>写入时间</td><td …>2026-09-14 23:35:57</td>`
  [new RegExp('(>写入时间</td><td[^>]*>)' + CLOCK_TEXT, 'g'), (p) => p + CLOCK_MARK],
  // ③ 复制日志 M5 整行「日期」段：`｜ id=4 | 日期 2026-09-14 23:35:57 | 影响 1 行 | 字段 …`
  [new RegExp('(｜ id=\\S+ \\| 日期 )' + CLOCK_TEXT, 'g'), (p) => p + CLOCK_MARK],
  // ④ 复制日志「时间戳版本」行：`时间戳版本` ＋ 换行 ＋ `2026-09-14 23:35:57 · 版本 0.1.0`
  [new RegExp('(时间戳版本\\n)' + CLOCK_TEXT, 'g'), (p) => p + CLOCK_MARK],
];
const CLOCK_LEN = 19;

/** 时钟串（与 `nowStamp()` 同格式；只用于「剥干净了没有」的核对，不改生产语义）。 */
function stampOf(d) {
  const p = (n) => String(n).padStart(2, '0');
  return d.getFullYear() + '-' + p(d.getMonth() + 1) + '-' + p(d.getDate()) + ' '
    + p(d.getHours()) + ':' + p(d.getMinutes()) + ':' + p(d.getSeconds());
}

/** 渲染窗口 [before, after] 内每个整秒的时钟串：渲染发生在两次取时之间，本页的时钟必是其中之一。 */
function renderClocksBetween(before, after) {
  const out = [];
  const t = new Date(before.getTime());
  t.setMilliseconds(0);
  for (let i = 0; i < 600 && t.getTime() <= after.getTime(); i++) {
    out.push(stampOf(t));
    t.setSeconds(t.getSeconds() + 1);
  }
  return out;
}

/** 剥渲染当刻时钟（有牙齿的版本）：
 * ① 只按四处已知位置剥，替代串不带任何业务数字；
 * ② 条数与吃掉的字符数对不上账即报错（防止某条规则顺手抹平别的数字）；
 * ③ 剥完若正文里仍残留本轮渲染窗口内的时钟串，即报错（漏一处就红，不静默放过）。
 */
function stripRenderClock(s, renderClocks) {
  const rawLen = s.length;
  let hits = 0;
  for (const [re, keep] of CLOCK_STRIP_RULES) {
    s = s.replace(re, (m, p1) => {
      hits += 1;
      return keep(p1);
    });
  }
  const eaten = rawLen - s.length;
  const want = hits * (CLOCK_LEN - CLOCK_MARK.length);
  if (eaten !== want) {
    throw new Error('渲染时钟剥除账不平：剥 ' + hits + ' 处却吃掉 ' + eaten + ' 字符（应 ' + want + '）');
  }
  for (const c of (renderClocks ?? [])) {
    if (s.includes(c)) throw new Error('渲染当刻时钟未被剥净：' + c);
  }
  return s;
}

/** 规范化：剥掉临时目录绝对路径、产物时间戳行与渲染当刻时钟（票面口径），保留业务日期与数据。 */
function normalize(html, roots, renderClocks) {
  let s = String(html ?? '');
  for (const r of roots) {
    if (r) s = s.split(r).join('<TMP>');
  }
  s = s.split(tmpdir()).join('<TMPDIR>');
  s = s.replace(/[A-Za-z]:[\\/][^"'<>\s]*t341-base-[^"'<>\s]*/g, '<TMP>');
  s = s.replace(/\d{4}-\d{2}-\d{2}_\d{6}(_\d+)?/g, '<STAMP>');
  return stripRenderClock(s, renderClocks);
}

function sha256(s) {
  return createHash('sha256').update(s, 'utf8').digest('hex');
}

function runAll() {
  const out = {};
  const unstable = [];
  for (const page of pagesOf('__PHOTOS__', '__SEEDA__')) {
    void page;
  }
  // 逐页新鲜种子（写键互不污染；读键亦隔离，sha 彼此独立）。
  const tmp = mkdtempSync(join(tmpdir(), 't341-probe-'));
  void tmp;
  const keys = [
    'calorie.help.center', 'calorie.photo.add', 'calorie.photo.compare', 'calorie.photo.detail',
    'calorie.photo.gif', 'calorie.photo.list', 'calorie.photo.remove', 'calorie.photo.tag',
    'calorie.view.gif-planner', 'calorie.view.photo-log-wizard',
  ];
  for (const key of keys) {
    const s = seedFresh();
    try {
      const page = pagesOf(s.photosDir, s.seedA).find((p) => p.key === key);
      // #462：记下渲染窗口，供剥除规则自证「剥干净了」。
      const atBefore = new Date();
      const got = page.kind === 'write'
        ? dispatchWrite(page.key, page.params, s.db)
        : dispatch(page.key, page.params, s.db);
      const atAfter = new Date();
      const norm = normalize(got.html, [s.root, s.photosDir], renderClocksBetween(atBefore, atAfter));
      out[key] = sha256(norm);
    } catch (e) {
      unstable.push(key + ':' + ((e && e.message) || String(e)));
      out[key] = 'ERROR:' + ((e && e.message) || String(e));
    } finally {
      try { s.db.close(); } catch { /* ignore */ }
    }
  }
  return { out, unstable };
}

const mode = process.argv[2];
if (mode !== '--write' && mode !== '--check') {
  console.error('用法：gen-photo-baseline.mjs --write|--check');
  process.exit(2);
}

if (mode === '--write') {
  const { out, unstable } = runAll();
  const self = readFileSync(new URL(import.meta.url), 'utf8');
  const block = '// BASELINE-BEGIN\nconst BASELINE = ' + JSON.stringify(out, null, 2) + ';\n// BASELINE-END';
  const next = self.replace(/\/\/ BASELINE-BEGIN[\s\S]*?\/\/ BASELINE-END/, block);
  if (next === self) {
    console.error('BASELINE 回写失败：标记块未命中');
    process.exit(1);
  }
  writeFileSync(new URL(import.meta.url), next);
  for (const [k, v] of Object.entries(out)) console.log((BASELINE[k] === v ? 'same ' : 'new ') + k + ' ' + v);
  if (unstable.length > 0) console.log('UNSTABLE ' + unstable.join(' | '));
  console.log('BASELINE-WROTE ' + Object.keys(out).length + ' pages');
} else {
  const { out, unstable } = runAll();
  let bad = 0;
  for (const [k, v] of Object.entries(out)) {
    const want = BASELINE[k];
    if (want === v) {
      console.log('ok ' + k + ' ' + v);
    } else {
      bad += 1;
      console.log('CHANGED ' + k + ' want=' + (want ?? '<缺>') + ' got=' + v);
    }
  }
  const wantKeys = Object.keys(BASELINE).sort().join(',');
  const gotKeys = Object.keys(out).sort().join(',');
  if (wantKeys !== gotKeys) {
    bad += 1;
    console.log('KEYSET want=[' + wantKeys + '] got=[' + gotKeys + ']');
  }
  if (unstable.length > 0) console.log('UNSTABLE ' + unstable.join(' | '));
  // 不稳定单列口径：本票十页里若有本就不稳定的页，当场记进票面并单列，不静默放宽。
  // 实测结论见 docs/skills/skill-calorie/t341-页面形状.md（本轮：十页全稳定，无单列）。
  console.log(bad === 0 ? 'BASELINE-OK 10/10' : 'BASELINE-DIFF ' + bad + ' pages');
  process.exit(bad === 0 ? 0 : 1);
}

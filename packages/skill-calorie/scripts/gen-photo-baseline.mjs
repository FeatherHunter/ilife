#!/usr/bin/env node
/** #341 · 身材照片十页基线（跑十页、写／比 sha 清单）。
 *
 * 口径（票面写死）：
 * - 固定种子库：每页一张新鲜临时库，3 张照片（2026-09-04 正面／2026-09-05 正面+备注／
 *   2026-09-06 侧面），字节固定（1x1 PNG），`addPhotos` 落库（文件名＝日期_序号.png）。
 * - 固定照片目录：每页新鲜临时目录，经 `--params photosDir` 显式传入（不读不写环境变量）。
 * - 固定时钟：凡能显式传日期的页一律显式传（list 传 `today:2026-09-06`、gif 传 `days:36500`、
 *   gif-planner 传 `start/end`、add 传 `date/time`）；`help.center` 走 `q` 现找分支（不碰 `new Date()`）。
 * - 比对**规范化后的页面正文 sha256**（剥掉临时目录绝对路径与产物时间戳），不比文件字节。
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
  "calorie.photo.add": "fcc55990964664e10433824cc5a1fd723cb4827d4dea6dedabe0e5eae1fd5a61",
  "calorie.photo.compare": "deb413fde06aed08900081356108d9c51c185db7b945e5ce3699cf7eb970432b",
  "calorie.photo.detail": "dfc49b927eb7c6b7b7abeeaff2fa1096864c2c6efbfcaf64c14f7bd2789310d6",
  "calorie.photo.gif": "c7869012198940e69a365aba79b8349ea48302a4379947ad412d7116dbca1827",
  "calorie.photo.list": "81b9036951d61047f16b1ebc2044e87c23c99ef3fda1ea2280ddf7ebc9809be9",
  "calorie.photo.remove": "31508df6dd87213729e0a9c9f477b098f37e4542ec793fa685a7c498ffef7397",
  "calorie.photo.tag": "c87ebf61d83424b8df10ba27b56b9148d0318249274e2025dfa893ffb464ee8a",
  "calorie.view.gif-planner": "6b7a5fe2c3728272723eff9f16000abf87db97bbc7f6bfb976e53cfaaff21b0e",
  "calorie.view.photo-log-wizard": "9dca1349af69374331aef82b73ba8dbd2d0d127b6044a6a7c8e6cf50202957a7"
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

/** 规范化：剥掉临时目录绝对路径与产物时间戳行（票面口径），保留业务日期与数据。 */
function normalize(html, roots) {
  let s = String(html ?? '');
  for (const r of roots) {
    if (r) s = s.split(r).join('<TMP>');
  }
  s = s.split(tmpdir()).join('<TMPDIR>');
  s = s.replace(/[A-Za-z]:[\\/][^"'<>\s]*t341-base-[^"'<>\s]*/g, '<TMP>');
  s = s.replace(/\d{4}-\d{2}-\d{2}_\d{6}(_\d+)?/g, '<STAMP>');
  return s;
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
      const got = page.kind === 'write'
        ? dispatchWrite(page.key, page.params, s.db)
        : dispatch(page.key, page.params, s.db);
      const norm = normalize(got.html, [s.root, s.photosDir]);
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

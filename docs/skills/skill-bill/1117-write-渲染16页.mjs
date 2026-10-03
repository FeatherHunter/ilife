#!/usr/bin/env node
/** #1117 · 写入域回执侧 16 页「真跑产物 ＋ 冻结原型同目录副本」生成器（入仓，随票走）。
 *
 * 出什么：
 *   ① 16 份**当刻构建产物**的回执页 HTML（不是截图、不是拼的示意）——隔离家目录 $env:TEMP\tick-1117 上真跑；
 *   ② 16 份冻结原型的同目录副本（逐件 sha256 与 docs/skills/skill-bill/proto/manifest.json 登记值核对，不等即抛错、不出墙）；
 *   ③ manifest.json（墙生成器 1117-write-验收墙.mjs 的输入）与运行日志。
 *
 * 样本：docs/skills/skill-bill/1117-write-样本集.json —— 金额／分类／时间逐条对得上原型可见文本；
 *   编号靠 seed 段把记录号顶到 11..23（x02..x26）与 1／2（x28／x30／x32）。
 * 用法（仓根）：
 *   node docs/skills/skill-bill/1117-write-渲染16页.mjs [--out <目录>]
 * 缺省输出 .scratch/1117-write/；末行打 RESULT: n/16，exit 0 全出、1 有缺。
 * 红线：只写本票自己的产物目录与隔离家目录；不改 packages/、不改原型。
 */
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { copyFileSync, existsSync, mkdirSync, readFileSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..', '..');
const argv = process.argv.slice(2);
const outArg = argv.indexOf('--out');
const OUT = resolve(ROOT, outArg >= 0 && argv[outArg + 1] !== undefined ? argv[outArg + 1] : '.scratch/1117-write');
const SAMPLE = join(ROOT, 'docs/skills/skill-bill/1117-write-样本集.json');
const PROTO_MANIFEST = join(ROOT, 'docs/skills/skill-bill/proto/manifest.json');
const BIN = join(ROOT, 'packages/skill-bill/dist/cli/cmd_read.js');

const sample = JSON.parse(readFileSync(SAMPLE, 'utf8'));
const HOME_DIR = join(process.env.TEMP || tmpdir(), sample.homeDirName);

const sha256 = (buf) => createHash('sha256').update(buf).digest('hex');
const strip = (html) => html
  .replace(/<style[\s\S]*?<\/style>/gi, ' ')
  .replace(/<script[\s\S]*?<\/script>/gi, ' ');
const visible = (html) => strip(html).replace(/<[^>]+>/g, '\n').split('\n').map((s) => s.trim()).filter(Boolean).join(' | ');

/** 两种页族的件套探针（DOM 面，只读产物）：doc ＝ 文档壳（读数／明细／对账／复制），sheet ＝ 票据纸（店头／主数字／落点／裁切线）。
 *  这里只记读数，不下「像不像」的判断——像不像只有人眼那一道。 */
function skeleton(html) {
  const body = strip(html);
  const count = (re) => (body.match(re) || []).length;
  const family = /ilife-bill-sheet-page/.test(body) ? 'sheet' : 'doc';
  const anchors = family === 'sheet'
    ? {
      店头: count(/ilife-sheet-title/g), 主数字: count(/ilife-ticket-summary/g),
      落点: count(/ilife-block-ledger-rows/g), 明细: count(/ilife-block-data-table/g),
      对账: count(/ilife-ticket-sec-heading/g), 复制区: count(/ilife-block-copy-block/g),
      口径行: count(/ilife-block-caliber/g), 裁切线: count(/ilife-block-sheet-cut/g),
    }
    : {
      页头: count(/ilife-block-page-shell-title/g), 主数字: count(/ilife-block-kpi-card-grid/g),
      明细: count(/ilife-block-data-table/g), 对账: count(/ilife-block-disclosure/g),
      复制区: count(/ilife-block-copy-block/g), 口径行: count(/ilife-block-caliber/g),
      裁切线: count(/ilife-block-sheet-cut|裁切线/g), 落点: count(/ilife-block-ledger|ledger-rows/g),
    };
  const txt = visible(html);
  return {
    family,
    anchors,
    anchorsMissing: Object.entries(anchors).filter(([, v]) => v === 0).map(([k]) => k),
    nav: count(/ilife-block-toc/g),                       // 页内导航（doc 族恰一个；sheet 族不出这一块）
    sourceNote: count(/数据来源/g) + count(/ilife-sheet-foot|基线/g),
    undefinedNaN: /undefined|NaN/.test(txt),
    loadingLazy: /loading\s*=\s*["']lazy/i.test(html),
    zigzagCut: count(/ilife-block-sheet-zigzag|ilife-block-sheet-cut/g),
    textUs: count(/▾/g),
  };
}

// ── ① 隔离家目录：库与配置都落在这里，绝不碰真家目录
rmSync(HOME_DIR, { recursive: true, force: true });
mkdirSync(join(HOME_DIR, '.ilife'), { recursive: true });
writeFileSync(join(HOME_DIR, '.ilife', 'bill.yaml'), 'db:' + String.fromCharCode(10) + '  dir: ' + JSON.stringify(HOME_DIR) + String.fromCharCode(10), 'utf8');
const env = { ...process.env, USERPROFILE: HOME_DIR, HOME: HOME_DIR };

function run(key, params, file) {
  const args = [BIN, key, '--params', JSON.stringify(params)];
  if (file) args.push('--html', file);
  const r = spawnSync(process.execPath, args, { cwd: ROOT, encoding: 'utf8', env });
  const last = String(r.stdout ?? '').trim().split(/\r?\n/).filter(Boolean).pop() ?? '';
  let json = null;
  try { json = JSON.parse(last); } catch { /* 非 envelope，按红记 */ }
  return { status: r.status, json, stderr: String(r.stderr ?? '') };
}

// ── ② 冻结原型（按 #1073 manifest 的 domain=write-receipt 逐件 sha256 核对）＋ 垫位样本
const protoMan = JSON.parse(readFileSync(PROTO_MANIFEST, 'utf8'));
const protoItems = (protoMan.items ?? []).filter((it) => it.domain === 'write-receipt' && it.kind === 'proto');
if (protoItems.length !== sample.items.length) throw new Error('冻结原型 write-receipt 应为 ' + sample.items.length + ' 件，实得 ' + protoItems.length);

mkdirSync(OUT, { recursive: true });
for (const it of sample.items) for (const n of [it.id + '-真跑.html', it.id + '-原型.html']) rmSync(join(OUT, n), { force: true });
for (const n of ['manifest.json', 'run-1117.log']) rmSync(join(OUT, n), { force: true });

// ── ③ 垫位：先把记录号顶到样本集要的位置（x02 起从 11 落、x28 的 1、x30／x32 的 2）
const seedLog = [];
for (const s of sample.seed) {
  const r = run('bill.record.add', s.params, null);
  if (r.status !== 0) throw new Error('垫位失败：' + JSON.stringify(s.params) + ' exit=' + r.status + ' ' + r.stderr.slice(-200));
  const backId = r.json?.data?.receipt?.recordId;
  seedLog.push('SEED id=' + backId + ' ' + JSON.stringify(s.params));
}

// ── ④ 逐页真跑 ＋ 原型同目录副本
const rows = [];
const log = [...seedLog];
for (const it of sample.items) {
  const proto = protoItems.find((p) => 'proto/' + p.rel === it.protoRel);
  if (!proto) throw new Error('冻结原型里没有 ' + it.protoRel);
  const protoSrc = join(ROOT, proto.file);
  const buf = readFileSync(protoSrc);
  const got = sha256(buf);
  if (got !== proto.sha256) throw new Error('冻结原型 sha256 不符：' + proto.file + ' got=' + got + ' want=' + proto.sha256);
  const protoCopy = it.id + '-原型.html';
  copyFileSync(protoSrc, join(OUT, protoCopy));

  const prodName = it.id + '-真跑.html';
  const prodPath = join(OUT, prodName);
  const r = run(it.key, it.params, prodPath);
  const exists = existsSync(prodPath);
  const bytes = exists ? statSync(prodPath).size : 0;
  const html = exists ? readFileSync(prodPath, 'utf8') : '';
  const sk = exists ? skeleton(html) : null;
  const recordId = r.json?.data?.receipt?.recordId ?? null;
  const problems = [];
  if (r.status !== 0) problems.push('exit=' + r.status + ' stderr=' + r.stderr.slice(-200));
  if (!exists) problems.push('未落盘');
  if (exists && !/<!doctype html>/i.test(html)) problems.push('非整页');
  if (exists && r.json?.delivery && r.json.delivery.bytes !== bytes) problems.push('字节不符 envelope=' + r.json.delivery.bytes + ' 盘上=' + bytes);
  if (exists && r.json?.data?.ok !== true) problems.push('信封 ok 不为 true：' + JSON.stringify(r.json?.data?.ok ?? null));
  if (exists && typeof it.idExpect === 'number' && recordId !== null && recordId !== it.idExpect) problems.push('编号不符 期望 ' + it.idExpect + ' 实得 ' + recordId);
  const ext = [...html.matchAll(/(?:src|href)="(?!#|data:|https?:|\/\/)([^"]+)"/g)].map((m) => m[1]);
  rows.push({
    seq: it.seq, id: it.id, wake: it.wake, key: it.key, params: it.params,
    file: prodName, proto: protoCopy,
    protoSrc: proto.file, protoSha256: proto.sha256,
    check: it.check, window: it.window,
    exit: r.status, recordId, idExpect: it.idExpect, bytes,
    envelopeBytes: r.json?.delivery?.bytes ?? null,
    family: sk?.family ?? null, anchors: sk?.anchors ?? null, anchorsMissing: sk?.anchorsMissing ?? null,
    nav: sk?.nav ?? null, sourceNote: sk?.sourceNote ?? null,
    undefinedNaN: sk?.undefinedNaN ?? null, loadingLazy: sk?.loadingLazy ?? null, usdMarks: sk?.textUs ?? null,
    externalRefs: ext, problems,
  });
  log.push('PAGE ' + it.id + ' ' + it.wake + ' key=' + it.key + ' exit=' + r.status + ' id=' + recordId + ' bytes=' + bytes
    + ' family=' + (sk?.family ?? '?') + ' 件套缺=' + JSON.stringify(sk?.anchorsMissing ?? []) + ' nav=' + sk?.nav
    + ' 来源=' + sk?.sourceNote + ' undef/NaN=' + sk?.undefinedNaN + ' lazy=' + sk?.loadingLazy
    + ' proto=' + proto.rel + ' protoSha=' + proto.sha256.slice(0, 12) + ' extRefs=' + ext.length
    + (problems.length ? ' PROBLEMS=' + problems.join(' | ') : ''));
}

// ── ⑤ 快照与清单
const bad = rows.filter((r) => r.problems.length > 0);
const gitHead = spawnSync('git', ['rev-parse', 'HEAD'], { cwd: ROOT, encoding: 'utf8' }).stdout.trim();
const gitStatus = spawnSync('git', ['status', '--porcelain', '--', 'packages'], { cwd: ROOT, encoding: 'utf8' }).stdout.trim();
const distHash = sha256(readFileSync(BIN));
const famCount = rows.reduce((a, r) => { a[r.family] = (a[r.family] ?? 0) + 1; return a; }, {});

const manifest = {
  wall: '1117-write',
  ticket: 1117,
  domain: 'write-receipt',
  total: rows.length,
  criteria: sample.criteria,
  sample: {
    set: 'docs/skills/skill-bill/1117-write-样本集.json',
    note: sample.$comment,
    isolatedHome: HOME_DIR,
    seed: sample.seed.map((s) => s.params),
    seedWhy: sample.seed.map((s) => s.why),
  },
  snapshot: { gitHead, gitStatusPackages: gitStatus, cmdReadDistSha256: distHash, at: new Date().toISOString() },
  readings: {
    families: famCount,
    navExactlyOne: rows.filter((r) => r.nav === 1).length,
    navZero: rows.filter((r) => r.nav === 0).length,
    sourceNoteAtLeastOne: rows.filter((r) => (r.sourceNote ?? 0) >= 1).length,
    noUndefinedNaN: rows.filter((r) => r.undefinedNaN === false).length,
    noLoadingLazy: rows.filter((r) => r.loadingLazy === false).length,
    anchorsAllPresent: rows.filter((r) => (r.anchorsMissing ?? []).length === 0).length,
  },
  rows,
};
writeFileSync(join(OUT, 'manifest.json'), JSON.stringify(manifest, null, 2), 'utf8');
writeFileSync(join(OUT, 'run-1117.log'), log.join('\n') + '\n', 'utf8');

console.log(log.join('\n'));
console.log('SNAPSHOT gitHead=' + gitHead + ' dist=' + distHash.slice(0, 12) + ' packages 工作区改动行数=' + (gitStatus ? gitStatus.split('\n').length : 0));
console.log('READINGS 页族=' + JSON.stringify(famCount) + ' nav恰一个=' + manifest.readings.navExactlyOne + '/' + rows.length
  + ' 来源脚注≥1=' + manifest.readings.sourceNoteAtLeastOne + '/' + rows.length
  + ' 无undefined/NaN=' + manifest.readings.noUndefinedNaN + '/' + rows.length
  + ' 无loading=lazy=' + manifest.readings.noLoadingLazy + '/' + rows.length
  + ' 件套无缺=' + manifest.readings.anchorsAllPresent + '/' + rows.length);
console.log('RESULT: ' + (rows.length - bad.length) + '/' + rows.length + ' 真跑成功；缺件/问题页 ' + bad.length
  + (bad.length ? ' -> ' + bad.map((b) => b.id + '(' + b.problems.join(';') + ')').join(' ') : ''));
console.log('OUT: ' + OUT);
process.exit(bad.length === 0 ? 0 : 1);

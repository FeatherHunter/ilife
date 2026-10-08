#!/usr/bin/env node
/**
 * #1234 · skill-calorie HTML 产物哈希基线（中文列）。
 *
 * 为什么单独立账本：主账本 tooling/skill-html.snapshot.json 是 5 技能 194 件（#96），
 * 当时 calorie 的 HTML 正在 #108-#113/#83 在途改造中，冻结它会跨票假红，故排除；
 * 而 calorie 占全仓中文字面量约 43%，没有可判的中文读数。本账本只冻 calorie 中文列，
 * 英文列由各迁移票按语言矩阵另起（#1199 门禁改造），不复用同一 equal。
 *
 * 口径：固定 now=2026-01-02T03:04:05（本地时区）→ buildHelpFileData → renderHelpFileHtml，
 * 文本归一化＝去 BOM ＋ CRLF→LF，sha256 前 32 hex（与主账本同口径）。version 嵌在产物里，
 * 发版 bump 后本账本需显式重录（--write），重录即声明。
 *
 * 用法：
 *   node tooling/calorie-html-snapshot.mjs --check     # 校验（默认，差异即 exit 1）
 *   node tooling/calorie-html-snapshot.mjs --write     # 重录基线（显式动作）
 *   node tooling/calorie-html-snapshot.mjs --list      # 列出产物 id＋出处
 *   node tooling/calorie-html-snapshot.mjs --show <id> # 打印单件基线 vs 实际对照
 *   node tooling/calorie-html-snapshot.mjs --selftest  # 自证：改一处必红，还原必绿
 *
 * 依赖：packages/skill-calorie/dist 已构建（与主账本同要求）。未构建显式失败，不静默跳过。
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const SNAP_PATH = join(root, 'tooling', 'calorie-html.snapshot.json');

export const FIXED_NOW = new Date(2026, 0, 2, 3, 4, 5);

export function normalize(text) {
  return String(text).replace(/^\uFEFF/, '').replace(/\r\n/g, '\n');
}

export function sha256(text) {
  return createHash('sha256').update(normalize(text), 'utf8').digest('hex').slice(0, 32);
}

export function byteLen(text) {
  return Buffer.byteLength(normalize(text), 'utf8');
}

async function loadCalorie() {
  try {
    return await import('../packages/skill-calorie/dist/photo/helpFile.js');
  } catch (cause) {
    console.error('dist 缺失：packages/skill-calorie/dist/photo/helpFile.js —— 请先 pnpm build');
    throw cause;
  }
}

export async function collect() {
  const mod = await loadCalorie();
  const data = mod.buildHelpFileData(new Date(FIXED_NOW.getTime()));
  const html = mod.renderHelpFileHtml(data);
  const meta = [
    'stem=' + mod.HELP_FILE_STEM,
    'version=' + mod.HELP_FILE_VERSION,
    'groups=' + String(data.groups.length),
    'subtitle=' + data.subtitle,
    'fixedNow=2026-01-02T03:04:05',
  ].join('\n') + '\n';
  return {
    mod, data, html, meta,
    artifacts: {
      'calorie/help-html': {
        src: 'packages/skill-calorie/src/photo/helpFile.ts',
        bytes: byteLen(html),
        sha256: sha256(html),
        textOmitted: true,
      },
      'calorie/help-meta': {
        src: 'packages/skill-calorie/src/photo/helpFile.ts',
        bytes: byteLen(meta),
        sha256: sha256(meta),
        text: meta,
      },
    },
  };
}

function loadSnap() {
  return JSON.parse(readFileSync(SNAP_PATH, 'utf8'));
}

async function cmdCheck() {
  const { artifacts } = await collect();
  const snap = loadSnap();
  let bad = 0;
  for (const [id, cur] of Object.entries(artifacts)) {
    const base = snap.artifacts?.[id];
    if (!base) { console.error('RED 账本缺这一件：' + id); bad++; continue; }
    if (base.sha256 !== cur.sha256 || base.bytes !== cur.bytes) {
      console.error('RED 产物变了：' + id + ' 基线 ' + base.sha256 + '/' + base.bytes + ' 实际 ' + cur.sha256 + '/' + cur.bytes);
      bad++;
    } else {
      console.log('OK ' + id + ' ' + cur.sha256 + '/' + cur.bytes);
    }
  }
  if (bad > 0) { console.error('RESULT: 基线不一致（' + bad + ' 件）'); process.exit(1); }
  console.log('RESULT: calorie 基线一致（' + Object.keys(artifacts).length + ' 件）');
}

async function cmdWrite() {
  const { mod, data, artifacts } = await collect();
  const snap = {
    generatedBy: 'tooling/calorie-html-snapshot.mjs',
    ticket: '#1234',
    purpose: 'skill-calorie 中文列 HTML 基线：固定 now 下 HELP 全页＋元信息；英文列另起账本',
    hashAlgo: 'sha256(归一化文本) 前 32 hex；归一化＝去 BOM ＋ CRLF→LF',
    fixedNow: '2026-01-02T03:04:05',
    calorieVersion: mod.HELP_FILE_VERSION,
    artifactCount: Object.keys(artifacts).length,
    artifacts,
  };
  writeFileSync(SNAP_PATH, JSON.stringify(snap, null, 2) + '\n', 'utf8');
  console.log('WROTE ' + SNAP_PATH + '（' + snap.artifactCount + ' 件，version=' + mod.HELP_FILE_VERSION + '，scenes=' + data.subtitle + '）');
}

async function cmdList() {
  const snap = loadSnap();
  for (const [id, a] of Object.entries(snap.artifacts)) console.log(id + ' ← ' + a.src + ' ' + a.sha256);
}

async function cmdShow(id) {
  const { artifacts, html, meta } = await collect();
  const snap = loadSnap();
  console.log('基线：' + JSON.stringify(snap.artifacts?.[id]));
  console.log('实际：' + JSON.stringify(artifacts[id]));
  if (id === 'calorie/help-meta') console.log(meta);
  else console.log('(help-html 正文 ' + html.length + ' 字，省略；比 sha 即可)');
}

async function cmdSelftest() {
  const { html } = await collect();
  const a = sha256(html);
  const b = sha256(html + 'X');
  if (a === b) { console.error('SELFTEST RED:  mutation 未改变哈希（门失明）'); process.exit(1); }
  console.log('SELFTEST: 改一处必红 OK（' + a + ' vs ' + b + '）');
  await cmdCheck();
  console.log('SELFTEST: 还原必绿 OK');
}

const arg = process.argv[2] ?? '--check';
if (process.argv[1]?.replace(/\\\\/g, '/').endsWith('tooling/calorie-html-snapshot.mjs')) {
  if (arg === '--check') await cmdCheck();
  else if (arg === '--write') await cmdWrite();
  else if (arg === '--list') await cmdList();
  else if (arg === '--show') await cmdShow(process.argv[3]);
  else if (arg === '--selftest') await cmdSelftest();
  else { console.error('未知参数：' + arg); process.exit(2); }
}

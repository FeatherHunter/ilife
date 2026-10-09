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
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { DEFAULT_LANGUAGE, LANGUAGES, ledgerPath, langFromArgv, normalizeLang } from './i18n-langs.mjs';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const SNAP_BASE = 'tooling/calorie-html.snapshot.json';
const SNAP_PATH = join(root, 'tooling', 'calorie-html.snapshot.json');
const SNAP_EN = join(root, ledgerPath(SNAP_BASE, 'en'));
const LANG = normalizeLang(langFromArgv(process.argv.slice(2)));
void SNAP_PATH;

/** 英文列**对照读数**入口（CLI `--en-artifacts <文件>`）：迁移票生成英文产物后，把它采到的
 *  英文列 sha 喂进来，门才判「英文列漏记」；不给＝待对照（pending），既不当绿也不当红。
 *  文件形状：{ "<产物 id>": { "sha256": "<32hex>" } }（bytes 可选）。 */
const EN_ARTIFACTS = (() => {
  const i = process.argv.indexOf('--en-artifacts');
  if (i < 0 || process.argv[i + 1] === undefined) return null;
  const p = process.argv[i + 1];
  if (!existsSync(p)) { console.error('FAIL: --en-artifacts 文件不存在：' + p); process.exit(2); }
  try { return JSON.parse(readFileSync(p, 'utf8')); }
  catch (e) { console.error('FAIL: --en-artifacts 文件不是合法 JSON：' + p + ' → ' + e.message); process.exit(2); }
})();

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

/** 英文列账本的**记录形**（与主账本英文列同形）：lang／basedOn／records；records 只记**偏离中文列**的产物。 */
export function loadEnColumn(snapEnPath = SNAP_EN, zhPath = SNAP_PATH) {
  if (!existsSync(snapEnPath)) throw new Error('英文列账本缺失：' + snapEnPath + '（语言列骨架必须入仓，不能等迁移票补）');
  const zh = JSON.parse(readFileSync(zhPath, 'utf8'));
  const en = JSON.parse(readFileSync(snapEnPath, 'utf8'));
  if (en.lang !== 'en') throw new Error('英文列账本声明的语言不对：' + snapEnPath + ' 写的是 ' + JSON.stringify(en.lang));
  if (en.basedOn !== SNAP_BASE) throw new Error('英文列账本必须声明 basedOn=' + SNAP_BASE + '（实得 ' + JSON.stringify(en.basedOn) + '）');
  const records = en.records;
  if (records === undefined || records === null || typeof records !== 'object' || Array.isArray(records)) throw new Error('英文列账本缺 records 对象：' + snapEnPath);
  for (const [id, rec] of Object.entries(records)) {
    const b = zh.artifacts?.[id];
    if (!b) throw new Error('英文列记了一条中文列没有的产物：' + id);
    if (!rec || typeof rec !== 'object' || typeof rec.sha256 !== 'string') throw new Error('英文列记录缺 sha256：' + id);
    if (rec.sha256 === b.sha256) throw new Error('英文列记录与中文列同件同哈希（＝没记，空转绿）：' + id);
  }
  return { lang: 'en', meta: en, artifacts: zh.artifacts || {}, records };
}

/** 英文列记录 vs **英文列当刻实际**：只有拿到英文列对照读数（enArtifacts，由迁移票生成）才判漏记。
 *  没给对照读数＝**待对照**（pending），既不当绿也不当红——英文页还没生成，就没有「英文页通过了」这句话可说。
 *  undocumented＝英文列实际偏离了中文列却没进英文列记录；shapeChanged＝记录了但实际又变；missing＝记录点名、实际已不存在。 */
export function enGaps(col, enArtifacts) {
  if (!enArtifacts) return { pending: true, undocumented: [], shapeChanged: [], missing: [] };
  const undocumented = [];
  const shapeChanged = [];
  for (const [id, cur] of Object.entries(enArtifacts)) {
    const zh = col.artifacts[id];
    if (!zh) { undocumented.push(id + '（中文列也没有这件）'); continue; }
    const enSha = cur && typeof cur === 'object' ? cur.sha256 : cur;
    // 英文列与中文列**同哈希**＝这件没偏离，本来就不该进 records（与 loadEnColumn 的完整性判据同口径）。
    if (enSha === zh.sha256) continue;
    const rec = col.records[id];
    if (rec === undefined) { undocumented.push(id); continue; }
    if (rec.sha256 !== enSha) shapeChanged.push(id + ' 记录 ' + rec.sha256 + ' 实际 ' + enSha);
  }
  const missing = Object.keys(col.records).filter((id) => enArtifacts[id] === undefined);
  return { pending: false, undocumented, shapeChanged, missing };
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
  if (bad > 0) { console.error('RESULT: 基线不一致（' + bad + ' 件）；中文列数值不许改，先查是谁动的'); process.exit(1); }
  console.log('COLUMN zh  artifacts=' + Object.keys(artifacts).length + ' ledger=' + SNAP_BASE);
  // 英文列：另起一份账本（records 形）。空列＝0 件待录入，**显式报数**，不当绿也不当红。
  let enCol;
  try { enCol = loadEnColumn(); } catch (e) {
    console.error('RED 英文列账本不可用：' + (e && e.message ? e.message : e));
    process.exit(1);
  }
  const enCount = Object.keys(enCol.records).length;
  // 英文列对照读数入口：CLI `--en-artifacts <文件>`（JSON：id → { sha256 }）；不给＝待对照（pending）。
  const gaps = enGaps(enCol, EN_ARTIFACTS);
  console.log('COLUMN en  recorded=' + enCount + ' ledger=' + ledgerPath(SNAP_BASE, 'en')
    + (enCount === 0 ? '（0 件＝待录入：英文列骨架已立，迁移票按批次录入；空列不许当绿，故此处显式报数）' : '')
    + (gaps.pending ? ' 待对照=' + Object.keys(artifacts).length + '（没有英文列对照读数）' : ' 未录入=' + gaps.undocumented.length));
  if (gaps.pending) {
    console.log('PENDING: 英文列 0 件（骨架已立、无记录可比）：这不是「英文页通过」，是「还没有英文页」。');
  }
  if (gaps.shapeChanged.length) {
    console.error('FAIL: 英文列记录与实际不符 ' + gaps.shapeChanged.length + ' 件（英文列是**偏离中文列**的记录，不是中文列的复制）');
    for (const x of gaps.shapeChanged.slice(0, 20)) console.error('  ! ' + x);
    console.error('RESULT: en recorded=' + enCount + ' mismatch=' + gaps.shapeChanged.length);
    process.exit(1);
  }
  if (gaps.missing.length) {
    console.error('FAIL: 英文列记录点名了 ' + gaps.missing.length + ' 件不存在的产物：' + gaps.missing.join('、'));
    process.exit(1);
  }
  if (gaps.undocumented.length) {
    console.error('FAIL: 英文列有 ' + gaps.undocumented.length + ' 件产物偏离中文列却没录入英文列账本（漏记＝假绿）：' + gaps.undocumented.join('、'));
    process.exit(1);
  }
  console.log('RESULT: calorie 基线一致（' + Object.keys(artifacts).length + ' 件；英文列 recorded=' + enCount + '）');
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

/** 英文列记录的重录入口（显式动作）：把当刻**偏离中文列**的产物写进英文列账本。 */
async function cmdWriteEn() {
  const { artifacts } = await collect();
  // 英文列的**当刻实际**：给了 --en-artifacts 用对照读数，没给就用当刻原生采集。
  //   迁移完成前两者逐字节相同 ⇒ 记录为空（0 件），这正是「没有偏离」的意思。
  const enActual = EN_ARTIFACTS || artifacts;
  const enSnap = existsSync(SNAP_EN) ? JSON.parse(readFileSync(SNAP_EN, 'utf8')) : null;
  const records = {};
  for (const [id, cur] of Object.entries(enActual)) {
    const zh = JSON.parse(readFileSync(SNAP_PATH, 'utf8')).artifacts?.[id];
    if (!zh) continue;
    if (cur.sha256 === zh.sha256) continue;
    const prev = enSnap && enSnap.records ? enSnap.records[id] : undefined;
    records[id] = {
      sha256: cur.sha256,
      bytes: cur.bytes,
      note: prev && prev.note ? prev.note : '英文列版本（偏离中文列；note 由迁移票补）',
    };
  }
  const snap = {
    generatedBy: 'tooling/calorie-html-snapshot.mjs',
    ticket: '#1234',
    purpose: 'skill-calorie HTML 产物账本的**英文列**记录：键＝英文列偏离中文列的那些产物；未偏离的不进本账本（中文列本身就是它的基线）',
    lang: 'en',
    basedOn: SNAP_BASE,
    hashAlgo: 'sha256(归一化文本) 前 32 hex；归一化＝去 BOM ＋ CRLF→LF（与中文列同一口径）',
    fixedNow: '2026-01-02T03:04:05',
    notation: {
      records: 'id → { sha256, bytes, note }；键集必须是中文列 artifacts 的子集；记录的 sha256 必须 ≠ 中文列同件',
    },
    readonlyUntilMigrated: Object.keys(records).length === 0,
    artifactCount: Object.keys(records).length,
    records,
  };
  writeFileSync(SNAP_EN, JSON.stringify(snap, null, 2) + '\n', 'utf8');
  console.log('WROTE ' + ledgerPath(SNAP_BASE, 'en') + '（英文列记录 ' + snap.artifactCount + ' 件）');
}

const arg = process.argv[2] ?? '--check';
// ⚠ 入口判据用**路径逐字相等**（fileURLToPath(import.meta.url) === process.argv[1]），
//   与 tooling/skill-html-snapshot.mjs 同形；**不要**用 endsWith 配正则归一化——
//   Windows 上 process.argv[1] 是反斜杠全路径，正则只要写错一层转义，判据就恒假：
//   脚本静默 exit 0、一行输出都没有（#1199 现场实测，已修）。
if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  if (arg === '--check') await cmdCheck();
  else if (arg === '--lang') { void LANG; await cmdCheck(); }
  else if (arg === '--write') await cmdWrite();
  else if (arg === '--write-en') await cmdWriteEn();
  else if (arg === '--list') await cmdList();
  else if (arg === '--show') await cmdShow(process.argv[3]);
  else if (arg === '--selftest') await cmdSelftest();
  else { console.error('未知参数：' + arg); process.exit(2); }
}

// #1073 物证冻结 · 清单生成器
//
// 用途：把 .scratch/ 下的票据纸原型**按字节**搬进 docs/skills/skill-bill/proto/，
//       并生成 manifest.json（派生物 —— 禁止手工维护）。
//
// 件表从**各域原型作者自己的清单**派生（.scratch/*/manifest-*.json），
// 不在本文件里手写任何页名；只有"哪个清单是哪个域的判地"这层映射写在这里。
//
// 落盘顺序（协议 §2.5 第 1 条）：先在内存里读齐 + 哈希 + 跑完全部断言，
// 全过才 copy；落盘后再逐件回读哈希复核。任何一条红 ⇒ 本次运行不落盘。
//
// 用法：
//   node docs/skills/skill-bill/1073-proto-manifest.mjs            # 生成
//   node docs/skills/skill-bill/1073-proto-manifest.mjs --dry      # 只算不落盘
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { copyFileSync, existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { dirname, join, posix, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const REPO = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..', '..');
const OUT_ROOT = join(REPO, 'docs', 'skills', 'skill-bill', 'proto');
const TICKET = 1073;
const DRY = process.argv.includes('--dry');

/** 票面验收的件数：95 张原型 ＋ 2 份 993 冻结原型 ＋ 2 份 token 规格。 */
const EXPECT = { proto: 95, frozen: 2, spec: 2, superseded: 16 };

const fail = (msg) => {
  process.stderr.write(`RED: ${msg}\n`);
  process.exit(1);
};
const sha256 = (buf) => createHash('sha256').update(buf).digest('hex');
const readJson = (p) => {
  if (!existsSync(p)) fail(`清单读不到：${posixify(p)}`);
  const raw = readFileSync(p);
  if (raw[0] === 0xef && raw[1] === 0xbb && raw[2] === 0xbf) fail(`清单带签名(BOM)：${posixify(p)}`);
  return JSON.parse(raw.toString('utf8'));
};
const posixify = (p) => relative(REPO, p).split('\\').join('/');
const listDir = (p) => (existsSync(p) ? readdirSync(p, { withFileTypes: true }) : []).filter((d) => d.isFile()).map((d) => d.name).sort();
/** 唤醒词：从页名里剥掉「序号前缀-」与「-版本.html」后缀。 */
const wakeOf = (file) => file.replace(/\.[^.]+$/, '').replace(/^[a-z]\d\d-/, '').replace(/-v[\d.]+$/, '');

/* ── 24 页判地表：.scratch/1068-no24/compare-manifest-24.json ──────────────
   SAY v2.3 / w09 v2.2 / setup v2.4 这三版是 24 页墙的判地，票面与 #1068 清单同源。 */
const W24 = readJson(join(REPO, '.scratch/1068-no24/compare-manifest-24.json'));
const breakdown = W24.breakdown ?? {};
const vOf = (label) => {
  // 24 页判地表的 key 两种写法都出现过：`w09去注版v22最新` 与 `write采集SAYv23`
  const dotted = /v(\d+)\.(\d+)/.exec(label);
  if (dotted) return `v${dotted[1]}.${dotted[2]}`;
  const joined = /v(\d)(\d)/.exec(label);
  if (joined) return `v${joined[1]}.${joined[2]}`;
  fail(`24 页判地表里解析不出版本号：${label}`);
};
const keyOf = (needle) => Object.keys(breakdown).find((k) => k.includes(needle));
const sayKey = keyOf('SAY');
const w09Key = keyOf('w09');
const setupKey = keyOf('setup');
if (!sayKey || !w09Key || !setupKey) fail(`24 页判地表缺 key（${[sayKey, w09Key, setupKey].join('/')}）`);
const SAY_V = vOf(sayKey);
const W09_V = vOf(w09Key);
const SETUP_SEAT = /^(.*?) v/.exec(W24.source?.setup ?? '')?.[1] ?? '1023-p-setup';

/* ── 各域件表 ────────────────────────────────────────────────────────────
   每条 = 一个域的一份判地清单。files() 从清单里读出页名。 */
const GROUPS = [
  {
    domain: 'query', dir: 'query', kind: 'proto', expect: 17,
    manifest: '.scratch/1019-p-query/manifest-p-query-v2.1.json',
    version: () => 'v2.1',
    files: (m) => m.rows.map((r) => ({ file: r.file, wake: r.wake, seq: r.seq })),
    seat: (m) => '.scratch/1019-p-query',
    // 清单的 merged 字段自述"w05 别名并入 w01，v2 不单独出纸" ⇒ 17 而非 18
    note: (m) => `w05-查账单 别名并入 w01-查今天，不单独出纸（清单 merged 字段：${m.merged?.['w05-查账单-proto.html'] ?? 'n/a'}）`,
  },
  {
    domain: 'analysis', dir: 'analysis', kind: 'proto', expect: 25,
    manifest: '.scratch/1021-p-analysis/manifest-analysis-v2.1.json',
    version: () => 'v2.1',
    // a04~a25 来自本清单；a01~a03 由本清单的 domain 字段自述指向 1031 席
    files: (m) => [
      ...m.rows.filter((r) => /^a\d\d-/.test(r.file)).map((r) => ({ file: r.file, seat: '.scratch/1021-p-analysis', wake: r.wake, seq: r.seq })),
      ...headSeat(m).files,
    ],
    seat: () => '.scratch/1021-p-analysis',
  },
  {
    domain: 'write-receipt', dir: 'write-receipt', kind: 'proto', expect: 16,
    manifest: '.scratch/1020-p-write/manifest-v2.json',
    version: () => 'v2',
    files: (m) => m.rows.filter((r) => r.file.includes('回执'))
      .map((r, i) => ({ file: r.file, wake: /^x\d\d-(.+?)-回执/.exec(r.file)?.[1], seq: i + 1 })),
    seat: () => '.scratch/1020-p-write',
  },
  {
    domain: 'say-collect', dir: 'say-collect', kind: 'proto', expect: 16,
    manifest: '.scratch/1030-say/manifest-v2.3.json',
    version: () => SAY_V,
    files: (m) => m.rows.map((r) => ({ file: r.file, wake: r.wake })),
    seat: () => '.scratch/1030-say',
  },
  {
    domain: 'w09', dir: 'w09', kind: 'proto', expect: breakdown[w09Key],
    manifest: '.scratch/1068-no24/compare-manifest-24.json',
    version: () => W09_V,
    files: () => {
      const seat = (W24.source?.w09 ?? '').split(' ')[0] || '1021-p-analysis';
      const seatPath = seat.startsWith('.scratch') ? seat : posix.join('.scratch', seat);
      const hits = listDir(join(REPO, seatPath)).filter((f) => new RegExp(`^w\\d\\d-.*-${W09_V}\\.html$`).test(f));
      if (hits.length !== breakdown[w09Key]) fail(`w09 判地应有 ${breakdown[w09Key]} 件，${seatPath} 里按 ${W09_V} 找到 ${hits.length} 件`);
      return hits.map((file) => ({ file, seat: seatPath, wake: '查分类' }));
    },
  },
  {
    domain: 'acct-goal', dir: 'acct-goal', kind: 'proto', expect: 13,
    manifest: '.scratch/1022-p-acct/manifest-p-acct-v2.2.json',
    version: (m) => m.version,
    files: (m) => m.rows.map((r) => ({ file: r.file, seq: r.seq })),
    seat: () => '.scratch/1022-p-acct',
  },
  {
    domain: 'setup-help', dir: 'setup-help', kind: 'proto', expect: breakdown[setupKey],
    manifest: '.scratch/1023-p-setup/manifest-p-setup-v2.4.json',
    version: (m) => m.version,
    files: (m) => m.rows.map((r) => ({ file: r.file, wake: r.wake, seq: r.seq })),
    seat: () => '.scratch/1023-p-setup',
  },
  {
    domain: 'write-collect', dir: 'superseded/write-collect-v2', kind: 'superseded', expect: EXPECT.superseded,
    manifest: '.scratch/1020-p-write/manifest-v2.json',
    version: () => 'v2',
    files: (m) => m.rows.filter((r) => r.file.includes('采集')).map((r) => ({ file: r.file })),
    seat: () => '.scratch/1020-p-write',
    note: () => '采集侧判地是 SAY v2.3（同 16 场，逐场对应）；本组是被取代版，只作历史物证存证，不计入 95',
  },
  {
    domain: 'frozen-993', dir: 'frozen-993', kind: 'frozen', expect: EXPECT.frozen,
    noManifest: true,
    version: () => '993',
    files: () => {
      // 两份 993 冻结原型已在版本库（git ls-files），各取 v 号最大的一份
      const tracked = execFileSync('git', ['ls-files', '--', 'bill-993-proto-*.html'], { cwd: REPO, encoding: 'utf8' })
        .split('\n').map((s) => s.trim()).filter(Boolean);
      const pick = (kind) => tracked
        .filter((f) => new RegExp(`^bill-993-proto-${kind}-7222-v(\\d+)\\.html$`).test(f))
        .sort((a, b) => Number(/v(\d+)\.html$/.exec(b)[1]) - Number(/v(\d+)\.html$/.exec(a)[1]))[0];
      return ['receipt', 'detail'].map((kind) => {
        const f = pick(kind);
        if (!f) fail(`版本库里找不到 bill-993-proto-${kind}-7222-vN.html`);
        return { file: f, rel: f, wake: kind === 'receipt' ? '回执' : '详情' };
      });
    },
  },
  {
    domain: 'style-spec', dir: 'style-spec', kind: 'spec', expect: EXPECT.spec,
    noManifest: true,
    version: () => '1005',
    files: () => listDir(join(REPO, '.scratch/1005-style'))
      .filter((f) => /\.(md|html)$/.test(f))
      .map((file) => ({ file, seat: '.scratch/1005-style', wake: file.replace(/\.(md|html)$/, '') })),
  },
];

function listDirsUnder(rel) {
  const p = join(REPO, rel);
  return existsSync(p) ? readdirSync(p, { withFileTypes: true }).filter((d) => d.isDirectory()).map((d) => d.name).sort() : [];
}

/** a01~a03 落在哪一席，由 1021 清单的 domain 字段自述（"…（a01~a03在1031）"）解析，不手写。 */
function headSeat(m) {
  const ptr = /a(\d+)~a(\d+)在([\w-]+)/.exec(String(m.domain));
  if (!ptr) fail(`分析域清单的 domain 字段没指明 a01~a03 落在哪一席：${m.domain}`);
  const [lo, hi] = [Number(ptr[1]), Number(ptr[2])];
  const dir = listDirsUnder('.scratch').find((d) => d.startsWith(`${ptr[3]}-`));
  if (!dir) fail(`分析域清单指向的席 ${ptr[3]}-* 在 .scratch 下找不到`);
  const seat = posix.join('.scratch', dir);
  const files = listDir(join(REPO, seat))
    .filter((f) => /^a(\d\d)-.*-v2\.1\.html$/.test(f))
    .filter((f) => { const n = Number(/^a(\d\d)/.exec(f)[1]); return n >= lo && n <= hi; })
    .map((f) => ({ file: f, seat }));
  if (files.length !== hi - lo + 1) fail(`a${lo}~a${hi}：${seat} 里按 v2.1 找到 ${files.length} 件，期望 ${hi - lo + 1} 件`);
  return { lo, hi, seat, files };
}

/* ── 一、内存里读齐 + 哈希 + 跑断言（此段任何一条红 ⇒ 不落盘）────────── */
const items = [];
const reds = [];
let seq = 0;

for (const g of GROUPS) {
  const m = g.noManifest ? {} : readJson(join(REPO, g.manifest));
  const rows = g.files(m);
  if (rows.length !== g.expect) reds.push(`${g.domain}：判地表 ${rows.length} 件，票面记 ${g.expect} 件`);
  const version = g.version(m);
  for (const r of rows) {
    const seat = r.seat ?? (typeof g.seat === 'function' ? g.seat(m) : '');
    const srcAbs = r.rel ? join(REPO, r.rel) : join(REPO, seat, r.file);
    const src = r.rel ?? posix.join(seat, r.file);
    if (!existsSync(srcAbs)) { reds.push(`原件不在盘上：${src}`); continue; }
    const buf = readFileSync(srcAbs);
    const rel = posix.join(g.dir, r.rel ?? r.file);
    const file = posix.join('docs/skills/skill-bill/proto', rel);
    items.push({
      seq: ++seq, domain: g.domain, wake: r.wake ?? wakeOf(r.file),
      version, kind: g.kind, rel, file, source: src, bytes: buf.length, sha256: sha256(buf),
    });
  }
  if (g.note) {
    const n = g.note(m);
    if (n) items.push({ __note: `${g.domain}: ${n}` });
  }
}

const notes = items.filter((i) => i.__note).map((i) => i.__note);
const rowsOut = items.filter((i) => !i.__note).sort((a, b) => a.rel < b.rel ? -1 : a.rel > b.rel ? 1 : 0);
rowsOut.forEach((r, i) => { r.seq = i + 1; });   // 落库序号：按仓内路径字典序，重跑稳定

const byKind = {};
for (const r of rowsOut) byKind[r.kind] = (byKind[r.kind] ?? 0) + 1;
for (const [k, n] of Object.entries(EXPECT)) {
  if ((byKind[k] ?? 0) !== n) reds.push(`kind=${k} 实际 ${byKind[k] ?? 0} 件，票面记 ${n} 件`);
}
const dup = rowsOut.map((r) => r.rel).filter((rel, i, a) => a.indexOf(rel) !== i);
if (dup.length) reds.push(`仓内路径重复：${[...new Set(dup)].join('、')}`);
const protoDomains = {};
for (const r of rowsOut.filter((r) => r.kind === 'proto')) protoDomains[r.domain] = (protoDomains[r.domain] ?? 0) + 1;
const EXPECT_DOMAINS = { query: 17, analysis: 25, 'write-receipt': 16, 'say-collect': 16, w09: 1, 'acct-goal': 13, 'setup-help': 7 };
for (const [d, n] of Object.entries(EXPECT_DOMAINS)) {
  if ((protoDomains[d] ?? 0) !== n) reds.push(`域 ${d} 实际 ${protoDomains[d] ?? 0} 件，票面记 ${n} 件`);
}
const unknown = Object.keys(protoDomains).filter((d) => !(d in EXPECT_DOMAINS));
if (unknown.length) reds.push(`清单里冒出票面没记的域：${unknown.join('、')}`);

if (reds.length) {
  for (const r of reds) process.stderr.write(`RED: ${r}\n`);
  fail(`断言 ${reds.length} 条红 ⇒ 本次运行不落盘（proto/ 未被改动）`);
}

/* ── 二、落盘：按字节复制 + 逐件回读哈希复核 ─────────────────────────── */
if (!DRY) {
  for (const r of rowsOut) mkdirSync(dirname(join(REPO, r.file)), { recursive: true });
  for (const r of rowsOut) copyFileSync(join(REPO, r.source), join(REPO, r.file));
  const bad = rowsOut.filter((r) => sha256(readFileSync(join(REPO, r.file))) !== r.sha256);
  if (bad.length) fail(`落盘后哈希不符 ${bad.length} 件：${bad.map((b) => b.rel).join('、')}`);
}

const manifest = {
  schema: 'skill-bill/proto-manifest@1',
  ticket: TICKET,
  generatedBy: 'docs/skills/skill-bill/1073-proto-manifest.mjs',
  note: '派生物：由生成器从各域原型清单派生，禁止手工维护。重跑生成器即可复现。',
  counts: { ...byKind },
  expect: EXPECT,
  expectDomains: EXPECT_DOMAINS,
  notes,
  items: rowsOut.map(({ seq, domain, wake, version, kind, rel, file, source, bytes, sha256: h }) =>
    ({ seq, domain, wake, version, kind, rel, file, source, bytes, sha256: h })),
};
const manifestPath = join(OUT_ROOT, 'manifest.json');
if (!DRY) writeFileSync(manifestPath, JSON.stringify(manifest, null, 2) + '\n', 'utf8');

console.log(`${DRY ? '[dry] ' : ''}${rowsOut.length} 件；按 kind：`
  + Object.entries(byKind).map(([k, v]) => `${k} ${v}`).join(' / ')
  + `；proto 按域：` + Object.entries(protoDomains).map(([k, v]) => `${k} ${v}`).join(' / '));
console.log(`RESULT: ${DRY ? 'DRY-RUN' : 'OK'} items=${rowsOut.length} proto=${byKind.proto} manifest=${posixify(manifestPath)}`);

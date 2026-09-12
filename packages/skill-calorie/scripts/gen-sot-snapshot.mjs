#!/usr/bin/env node
/** #180 · SoT 快照 `entry_sha` 重算（两态：`--write` 写盘／`--check` 只校验）。
 *
 * 口径（逐字照 `test/calorie-triggers.test.mjs:8-24` 的 `S()`／`L()`／`canon()`，不另立第二份）：
 *   字段序 wake_word, category, key, name, subfunction, output_type, html_template, data_source,
 *   prompt_template, user_intent, order, depends_on_external, data_fields, desc, main_prompt.cli,
 *   main_prompt.text, aliases, fill_hints, variants；分隔 U+0001；列表按「数目＋各项」拼 U+0002；
 *   undefined/null 记空串、true/false 记 1/0；sha256 取前 16 位。
 * 数据源：`packages/skill-calorie/dist/triggers/index.js` 的 `TRIGGERS`（先 `pnpm build`）；条目 id 取 `key ?? wake_word`。
 *
 * **只重写 `test/calorie-sot.snapshot.json` 的 `entry_sha` 段**，逐行替换那 16 个十六进制字符——
 * 不许 `JSON.stringify(JSON.parse(文件))` 整体回写：`scene_counts` 里场景次序是 `01…10`，JS 重排后
 * `10` 会跑到 `01` 前面（#180 议题实测整体回写 26125 字 ≠ 原 26126 字，首个差异就在这一段）。
 * 本脚本用三重自证守这条：① 前后总字节数；② 把 entry_sha 的值全部掩码后与原文比对必等；
 * ③ 写盘后立刻自重算，差异必须为 0。
 *
 * 运行：
 *   pnpm build && node packages/skill-calorie/scripts/gen-sot-snapshot.mjs --write
 *   pnpm build && node packages/skill-calorie/scripts/gen-sot-snapshot.mjs --check   # 门禁用；不等即 exit 1
 */
import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync } from 'node:fs';

const SNAPSHOT = new URL('../../../test/calorie-sot.snapshot.json', import.meta.url);
const DIST = new URL('../dist/triggers/index.js', import.meta.url);

const mode = process.argv.includes('--write') ? 'write' : process.argv.includes('--check') ? 'check' : null;
if (mode === null) {
  console.error('用法：node packages/skill-calorie/scripts/gen-sot-snapshot.mjs --write|--check');
  process.exit(2);
}

/* ── 与 test/calorie-triggers.test.mjs:8-24 同构的 canon（不增删覆盖） ───────────── */
const S = (v) => (v === undefined || v === null ? '' : v === true ? '1' : v === false ? '0' : String(v));
const L = (v) => {
  const a = v ?? [];
  return [String(a.length), ...a.map(String)].join('\u0002');
};
function canon(t) {
  const mp = t.main_prompt ?? {};
  const vr = t.variants ?? [];
  const vflat = [String(vr.length), ...vr.flatMap((x) => [x.label ?? '', x.cli ?? '', x.prompt ?? ''])].join('\u0002');
  return createHash('sha256')
    .update(
      [t.wake_word, t.category, S(t.key), S(t.name), S(t.subfunction), S(t.output_type), S(t.html_template), S(t.data_source), S(t.prompt_template), S(t.user_intent), S(t.order), S(t.depends_on_external), L(t.data_fields), S(t.desc), S(mp.cli), S(mp.text), L(t.aliases), L(t.fill_hints), vflat].join('\u0001'),
      'utf8',
    )
    .digest('hex')
    .slice(0, 16);
}
const idOf = (t) => t.key ?? t.wake_word;

/* ── 逐行改写 entry_sha 段 ────────────────────────────────────────────── */
const LINE_RE = /^(\s*)"([^"]+)": "([0-9a-f]{16})"(,?)$/;

function splitSnapshot(text) {
  const lines = text.split('\n');
  const start = lines.findIndex((l) => l.trim() === '"entry_sha": {');
  if (start < 0) throw new Error('快照缺 `"entry_sha": {` 段头');
  let end = -1;
  for (let i = start + 1; i < lines.length; i += 1) {
    if (lines[i].trim() === '},') { end = i; break; }
  }
  if (end < 0) throw new Error('快照 entry_sha 段未闭合');
  return { lines, start, end };
}

/** 掩码：把 entry_sha 段里每条的值换成等长占位符；用于「其余字节逐字未变」的证明。 */
function maskEntrySha(text) {
  const { lines, start, end } = splitSnapshot(text);
  const out = [...lines];
  for (let i = start + 1; i < end; i += 1) {
    const m = LINE_RE.exec(out[i]);
    if (!m) continue;
    out[i] = `${m[1]}"${m[2]}": "${'#'.repeat(m[3].length)}"${m[4]}`;
  }
  return out.join('\n');
}

const sha256 = (s) => createHash('sha256').update(s, 'utf8').digest('hex').toUpperCase();

function loadTriggers() {
  return import(DIST.href).then((m) => m.TRIGGERS);
}

function plan(snapshotText, triggers) {
  const { lines, start, end } = splitSnapshot(snapshotText);
  const want = new Map(triggers.map((t) => [idOf(t), canon(t)]));
  const seen = new Set();
  const changes = [];
  const next = [...lines];
  for (let i = start + 1; i < end; i += 1) {
    const m = LINE_RE.exec(next[i]);
    if (!m) throw new Error(`entry_sha 段第 ${i + 1} 行不符合逐行格式：${next[i]}`);
    const [, indent, id, oldSha, comma] = m;
    if (!want.has(id)) throw new Error(`快照多出一条 entry_sha：${id}`);
    seen.add(id);
    const sha = want.get(id);
    if (sha !== oldSha) changes.push({ id, oldSha, sha });
    next[i] = `${indent}"${id}": "${sha}"${comma}`;
  }
  const missing = [...want.keys()].filter((id) => !seen.has(id));
  if (missing.length > 0) throw new Error(`快照漏了 ${missing.length} 条 entry_sha：${missing.slice(0, 5).join('、')}…`);
  return { text: next.join('\n'), changes, entries: want.size };
}

const main = async () => {
  const before = readFileSync(SNAPSHOT, 'utf8');
  const triggers = await loadTriggers();
  const { text: after, changes, entries } = plan(before, triggers);

  console.log(`MODE=${mode} entries=${entries} changed=${changes.length}`);
  if (changes.length > 0) {
    for (const c of changes.slice(0, 10)) console.log(`CHANGED ${c.id} ${c.oldSha} -> ${c.sha}`);
    if (changes.length > 10) console.log(`CHANGED … 另 ${changes.length - 10} 条（明细见 --write 时的本行输出）`);
  }
  console.log(`BYTES before=${Buffer.byteLength(before)} after=${Buffer.byteLength(after)}`);
  console.log(`SHA256 before=${sha256(before)}`);
  console.log(`SHA256 after =${sha256(after)}`);
  if (maskEntrySha(before) !== maskEntrySha(after)) {
    console.error('FAIL: entry_sha 段以外存在差异（掩码比对不等）');
    process.exit(1);
  }
  console.log('MASK-EQUAL=1（entry_sha 段以外逐字未变）');

  if (mode === 'check') {
    if (changes.length > 0) {
      console.error(`FAIL: 快照 entry_sha 与 dist 现状不一致（${changes.length} 条）`);
      process.exit(1);
    }
    console.log(`RESULT: entries=${entries} mismatch=0 mode=check`);
    return;
  }

  if (changes.length === 0) {
    console.log(`RESULT: entries=${entries} changed=0 mode=write（快照已是最新，未写盘）`);
    return;
  }
  writeFileSync(SNAPSHOT, after, 'utf8');
  const reread = readFileSync(SNAPSHOT, 'utf8');
  if (reread !== after) {
    console.error('FAIL: 写盘后回读与预期不一致');
    process.exit(1);
  }
  const rel = plan(reread, triggers);
  if (rel.changes.length !== 0) {
    console.error(`FAIL: 写盘后自重算仍有 ${rel.changes.length} 条差异`);
    process.exit(1);
  }
  console.log(`RESULT: entries=${entries} changed=${changes.length} mode=write snapshot=test/calorie-sot.snapshot.json`);
};

await main();

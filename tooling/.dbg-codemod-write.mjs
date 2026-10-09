/** #1233 · 改写器写模式（v2）：把能机械改写的文案候选改成 `__E('key')` 过渡形，并把词条落进该包的词条表。
 *
 *  为什么单立一件：扫描分类（v1）已有自证与台账，写模式的安全装置（备份／幂等／只动 copy 类）另成一摊活，
 *  分件后两边各自有读数、互不牵连。
 *
 *  写什么：`copy` 类、单双引号、单行、无插值的字符串字面量——改成 `__E('i18n-<区段>.<n>')`；
 *   词条按 **该文件的出现顺序** 写进 `packages/<包>/src/entries/i18n_<区段>.zh.ts`（中文列＝原字面量逐字节相同）
 *   与 `.en.ts`（英文列本轮留空串＝待译：空串走回退链取 zh，故不启用多语言时产物不变）。
 *  不写什么：拼接串（前缀＋变量＋后缀）、数据位、标识符位、生成物、事实源载荷——只标红／留人工（位置四分规则）。
 *
 *  安全装置：① 写前把被改文件原文备份到 `.scratch/i18n-codemod-backup/`；
 *           ② 只动 `copy` 类（拼接串与数据位一根头发都不碰）；
 *           ③ `--dry` 只报不落盘；
 *           ④ 同一份源跑两遍结果相同（幂等：第二遍已无 copy 字面量可换）。
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { classify, collectFiles, tokenize } from './i18n-codemod.mjs';

/** 过渡调用名：机械改写的落点。各迁移票接真实消费方时，把 `__E('key')` 换成条目层调用。 */
export const TRANSITION_CALL = '__E';

const NL = String.fromCharCode(10);
const SQ = String.fromCharCode(39);
const DQ = String.fromCharCode(34);
const BS = String.fromCharCode(92);
const CJK = /[\u3400-\u4DBF\u4E00-\u9FFF\uF900-\uFAFF\u3040-\u309F\u30A0-\u30FF\uFF00-\uFFEF]/;

/** 一件文件里可写的字面量：copy 类、单行、同值只记一次（按首次出现）。 */
export function writableLiterals(root, rel) {
  const text = readFileSync(join(root, rel), 'utf8').replace(/\r\n/g, NL);
  const lines = text.split(NL);
  const head5 = lines.slice(0, 5).join(NL);
  const out = [];
  const seen = new Set();
  for (const lit of tokenize(text)) {
    if (!CJK.test(lit.value)) continue;
    if (lit.kind !== 'str') continue;
    if (seen.has(lit.value)) continue;
    const r = classify(rel, head5, lit, lines[lit.line - 1] || '', lines[lit.line - 2] || '', lines[lit.line] || '');
    if (r.cls !== 'copy') continue;
    seen.add(lit.value);
    out.push({ line: lit.line, value: lit.value });
  }
  return out;
}

/** 区段名：文件路径 → 区段（小写、非字母数字折成连字符）。 */
export function segmentOf(rel) {
  return rel.replace(/^packages\/[^/]+\/src\//, '').replace(/\.ts$/, '').replace(/[^a-zA-Z0-9]+/g, '-').toLowerCase();
}

/** 把一件文件里的 copy 字面量改成过渡调用（不落盘）。返回 {text, pairs}。 */
export function rewriteFile(root, rel, segment) {
  const text = readFileSync(join(root, rel), 'utf8').replace(/\r\n/g, NL);
  const lits = writableLiterals(root, rel);
  const pairs = lits.map((l, i) => ['i18n-' + segment + '.' + (i + 1), l.value]);
  const byValue = new Map(pairs.map((p) => [p[1], p[0]]));
  let out = '';
  let i = 0;
  const n = text.length;
  while (i < n) {
    const ch = text[i];
    const nx = text[i + 1];
    if (ch === '/' && nx === '/') { while (i < n && text[i] !== NL) { out += text[i]; i += 1; } continue; }
    if (ch === '/' && nx === '*') {
      while (i < n && !(text[i] === '*' && text[i + 1] === '/')) { out += text[i]; i += 1; }
      out += '*/'; i += 2; continue;
    }
    if (ch === SQ || ch === DQ) {
      const q = ch;
      let j = i + 1;
      let val = '';
      while (j < n && text[j] !== q && text[j] !== NL) {
        if (text[j] === BS && j + 1 < n) { val += text[j + 1]; j += 2; continue; }
        val += text[j]; j += 1;
      }
      console.error(JSON.stringify({i, j, val, closed: j < n && text[j] === q, hit: byValue.has(val), sz: byValue.size}));
      if (j < n && text[j] === q && byValue.has(val)) {
        out += TRANSITION_CALL + '(' + JSON.stringify(byValue.get(val)) + ')';
        i = j + 1; continue;
      }
    }
    out += text[i]; i += 1;
  }
  return { text, pairs };
}

/** 落两份词条表（zh／en）。en 本轮留空串＝待译。 */
export function writeEntryTables(root, pkg, segment, pairs) {
  const dir = join(root, 'packages', pkg, 'src', 'entries');
  mkdirSync(dir, { recursive: true });
  const stem = 'i18n_' + segment.replace(/-/g, '_');
  const head = (lang, note) => [
    '/** ' + pkg + ' · 机械抽取的词条表（' + lang + '）——由 tooling/i18n-codemod.mjs --write 产出（幂等）。',
    ' *',
    ' *  ' + note,
    ' *  手改会被下一次 --write 覆盖：改文案请改源件后重跑工具。',
    ' */',
    'export const ' + stem + '_' + lang + ' = {',
  ].join(NL);
  const body = () => pairs.map((p) => '  ' + JSON.stringify(p[0]) + ': ' + JSON.stringify('') + ',').join(NL);
  const zh = pairs.map((p) => '  ' + JSON.stringify(p[0]) + ': ' + JSON.stringify(p[1]) + ',').join(NL);
  writeFileSync(join(dir, stem + '.zh.ts'), head('zh', '中文列：值与改写前的源码字面量逐字节相同（未声明的差异为零）。') + NL + zh + NL + '};' + NL, 'utf8');
  writeFileSync(join(dir, stem + '.en.ts'), head('en', '英文列：**待译**（本轮留空串）。空串走回退链取 zh，故不启用多语言时产物不变。') + NL + body() + NL + '};' + NL, 'utf8');
  return { zh: stem + '.zh.ts', en: stem + '.en.ts', count: pairs.length };
}

/** 写模式入口。返回 {files, entries, list}。 */
export function writeAll(root, only, dry) {
  const files = collectFiles().filter((f) => only === undefined || f.startsWith('packages/' + only + '/'));
  const backup = join(root, '.scratch', 'i18n-codemod-backup');
  if (!dry) mkdirSync(backup, { recursive: true });
  const report = { files: 0, entries: 0, list: [] };
  for (const rel of files) {
    const lits = writableLiterals(root, rel);
    if (lits.length === 0) continue;
    const segment = segmentOf(rel);
    const pkg = rel.split('/')[1];
    const before = readFileSync(join(root, rel), 'utf8');
    const rw = rewriteFile(root, rel, segment);
    if (rw.text === before.replace(/\r\n/g, NL)) continue;
    report.files += 1;
    report.entries += rw.pairs.length;
    report.list.push({ rel, segment, writable: rw.pairs.length });
    if (dry) continue;
    const bak = join(backup, rel.replace(/[\\/]/g, '__'));
    if (!existsSync(bak)) writeFileSync(bak, before, 'utf8');
    writeFileSync(join(root, rel), rw.text, 'utf8');
    writeEntryTables(root, pkg, segment, rw.pairs);
  }
  return report;
}

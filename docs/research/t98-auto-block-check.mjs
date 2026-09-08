#!/usr/bin/env node
/** #98 证据·AUTO 块完整性（可复跑；幂等断言，不硬编码「当前值」）。
 *
 * 断言五件事，任一不成立即 exit 1：
 *   ① 结构：`<!-- HELP-AUTO-START -->`／`<!-- HELP-AUTO-END -->` 成对且有序，块非空；
 *   ② M6 正文（`## Wizard Verify 铁则`）行号 **小于** AUTO-START 行号 → 正文在块外；
 *   ③ 文件 LF-only（零 CR）、无 BOM、全文零字面 `\n`（反斜杠+n 两个字符）；
 *   ④ **幂等**：块内容 == `scripts/build-help.mjs` 的 `buildHelpBlock()` 现算输出
 *      （把该脚本复制到仓库外临时目录、把 dist 导入改成绝对路径后 import，
 *       临时副本重写的是**临时** SKILL.md 副本，真文件零写入）；
 *   ⑤ **基线**：块内容 == `git show <ref>:packages/skill-calorie/SKILL.md` 的块
 *      （默认 `--ref HEAD`，可覆盖；取不到即 SKIP 并如实打印）。
 *
 * 为什么是幂等而不是冻结 sha：AUTO 块由 `scripts/build-help.mjs`（`:159` 以标记切片拼回）
 * 整文件重写，任何合法重跑都会改块内容；把某一次的 sha 冻结成期望值 → 合法重跑即假红。
 * 故这里改为「现算比对」（④）＋「现取 git 基线比对」（⑤），期望值都不来自硬编码常量。
 *
 * 用法：node docs/research/t98-auto-block-check.mjs [--ref <gitref>]
 */
import { readFileSync, writeFileSync, mkdirSync, rmSync } from 'node:fs';
import { createHash, randomBytes } from 'node:crypto';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { spawnSync } from 'node:child_process';
import { tmpdir } from 'node:os';

const root = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const pkgDir = join(root, 'packages', 'skill-calorie');
const skill = join(pkgDir, 'SKILL.md');
const buildHelp = join(pkgDir, 'scripts', 'build-help.mjs');
const relSkill = 'packages/skill-calorie/SKILL.md';

const argv = process.argv.slice(2);
const refIdx = argv.indexOf('--ref');
const ref = refIdx >= 0 ? argv[refIdx + 1] : 'HEAD';

const START = '<!-- HELP-AUTO-START -->';
const END = '<!-- HELP-AUTO-END -->';
const M6_HEADING = '## Wizard Verify 铁则';

const fail = [];
const note = [];
const sha = (s) => createHash('sha256').update(s, 'utf8').digest('hex').toUpperCase();
const blockOf = (t) => {
  const s = t.indexOf(START), e = t.indexOf(END);
  return s >= 0 && e >= s ? t.slice(s, e + END.length) : '';
};

const raw = readFileSync(skill);
const text = raw.toString('utf8');
const block = blockOf(text);

// ③ 无 BOM / LF-only / 零字面 \n
if (raw[0] === 0xef && raw[1] === 0xbb && raw[2] === 0xbf) fail.push('文件带 UTF-8 BOM');
const crCount = (text.match(/\r/g) || []).length;
if (crCount !== 0) fail.push('存在 CR（要求 LF-only）：CR=' + crCount);
const literalBackslashN = (text.match(/\\n/g) || []).length;
if (literalBackslashN !== 0) fail.push('存在字面反斜杠n：' + literalBackslashN + ' 处');

// ① 标记成对且有序
const s = text.indexOf(START), e = text.indexOf(END);
if (s < 0 || e < 0 || e < s) fail.push('AUTO 标记缺失或顺序异常');
else if (!block.slice(START.length, -END.length).trim()) fail.push('AUTO 块内容为空');

// ② M6 正文在块外
const lineOf = (needle) => text.slice(0, text.indexOf(needle)).split('\n').length;
const m6Line = text.includes(M6_HEADING) ? lineOf(M6_HEADING) : -1;
const startLine = s >= 0 ? lineOf(START) : -1;
const endLine = e >= 0 ? lineOf(END) : -1;
if (m6Line < 0) fail.push('找不到 M6 正文标题：' + M6_HEADING);
else if (startLine > 0 && m6Line >= startLine) fail.push('M6 正文不在 AUTO 块外：M6=' + m6Line + ' AUTO-START=' + startLine);

// ④ 幂等：现算 buildHelpBlock() 比对（临时副本，零写入真文件）
let idempotent = 'SKIP';
const tmpRoot = join(tmpdir(), 'ilife-t98-' + process.pid + '-' + randomBytes(4).toString('hex'));
try {
  const spec = "'../dist/cli/keys.js'";
  const src = readFileSync(buildHelp, 'utf8');
  const occurrences = src.split(spec).length - 1;
  if (occurrences !== 1) {
    idempotent = 'ERR';
    fail.push('build-help.mjs 的 dist 导入字面量漂移（命中 ' + occurrences + ' 次）：' + spec);
  } else {
    mkdirSync(join(tmpRoot, 'scripts'), { recursive: true });
    writeFileSync(join(tmpRoot, 'scripts', 'build-help.mjs'), src.replace(spec, JSON.stringify(pathToFileURL(join(pkgDir, 'dist', 'cli', 'keys.js')).href)));
    writeFileSync(join(tmpRoot, 'SKILL.md'), text); // 模块 import 时重写的是这份副本
    const mod = await import(pathToFileURL(join(tmpRoot, 'scripts', 'build-help.mjs')).href);
    const generated = START + '\n' + mod.buildHelpBlock() + '\n' + END;
    idempotent = block === generated ? 'true' : 'false';
    if (block !== generated) fail.push('AUTO 块 != buildHelpBlock() 现算值（块已腐化或需重生成）：块 sha=' + sha(block) + ' 现算 sha=' + sha(generated));
    const after = readFileSync(skill);
    if (!after.equals(raw)) fail.push('真文件被本脚本改动（不应发生）：' + sha(after.toString('utf8')) + ' != ' + sha(text));
  }
} catch (err) {
  idempotent = 'SKIP';
  note.push('幂等比对跳过（' + (err && err.code ? err.code : String(err && err.message)) + '）；先跑根 `pnpm build` 生成 dist 再复跑本脚本');
} finally {
  const guard = resolve(tmpRoot);
  const banned = [join(root, 'node_modules'), join(root, 'packages'), join(root, 'docs'), join(root, 'test'), join(root, 'tooling'), join(root, '.git')].map((p) => resolve(p));
  if (guard.startsWith(resolve(tmpdir()) + '\\') && !banned.some((b) => guard === b || guard.startsWith(b + '\\'))) {
    rmSync(tmpRoot, { recursive: true, force: true });
  } else {
    fail.push('临时目录守卫未通过，拒绝删除：' + guard);
  }
}

// ⑤ 基线：与 git 里的块逐字节比对（期望值现取，不硬编码）
let gitBlockMatch = 'SKIP';
let gitBlockSha = '?';
if (ref) {
  const out = spawnSync('git', ['show', ref + ':' + relSkill], { cwd: root, encoding: 'utf8', maxBuffer: 1 << 26 });
  if (out.status === 0 && typeof out.stdout === 'string' && out.stdout.includes(START)) {
    const gb = blockOf(out.stdout);
    gitBlockSha = sha(gb);
    gitBlockMatch = gb === block ? 'true' : 'false';
    if (gb !== block) fail.push('AUTO 块与 ' + ref + ' 基线不同：' + sha(block) + ' != ' + gitBlockSha);
  } else {
    note.push('git 基线比对跳过（git show ' + ref + ':' + relSkill + ' 不可用，exit=' + out.status + '）');
  }
} else {
  note.push('git 基线比对跳过（未给 --ref）');
}

console.log('auto-block-sha256=' + sha(block));
console.log('auto-block-bytes=' + Buffer.byteLength(block, 'utf8'));
console.log('idempotent-equals-buildHelpBlock=' + idempotent);
console.log('git-ref=' + ref + ' git-block-match=' + gitBlockMatch + ' git-block-sha256=' + gitBlockSha);
console.log('m6-heading-line=' + m6Line + ' auto-start-line=' + startLine + ' auto-end-line=' + endLine);
console.log('m6-outside-auto=' + (m6Line > 0 && startLine > 0 && m6Line < startLine));
console.log('cr-count=' + crCount + ' literal-backslash-n=' + literalBackslashN + ' bom=' + (raw[0] === 0xef));
for (const n of note) console.log('NOTE: ' + n);
if (fail.length) {
  for (const f of fail) console.error('FAIL: ' + f);
  process.exit(1);
}
console.log('AUTO_BLOCK_CHECK=PASS');

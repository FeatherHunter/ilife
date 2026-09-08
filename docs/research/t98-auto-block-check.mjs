#!/usr/bin/env node
/** #98 证据·AUTO 块完整性（可复跑，纯读，不需持锁）。
 *
 * 断言四件事，任一不成立即 exit 1：
 *   ① `<!-- HELP-AUTO-START -->` 与 `<!-- HELP-AUTO-END -->` 之间的块内容 sha256 == 冻结值
 *      （冻结值取自本票改动**前**的 SKILL.md，见 docs/research/t98-m6-wizard-verify-evidence.md §2）；
 *   ② M6 正文（`## Wizard Verify 铁则`）行号 **小于** AUTO-START 行号 → 正文在块外；
 *   ③ 文件 LF-only（零 CR）、无 BOM；
 *   ④ 全文零字面 `\n`（反斜杠+n 两个字符）。
 *
 * 说明：AUTO 块由 `scripts/build-help.mjs:154-161` 整文件重写，任何包级 build 都会改它。
 * 本脚本的冻结 sha 只对**本票提交时**的块内容成立；后续票若合法重生成该块，需按新值更新冻结常量。
 *
 * 用法：node docs/research/t98-auto-block-check.mjs
 */
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const skill = join(root, 'packages', 'skill-calorie', 'SKILL.md');

/** 本票改动前（HEAD~ 的 SKILL.md）AUTO 块 sha256 —— 冻结基线 */
const FROZEN_AUTO_SHA = 'D884C2D018AB1AD19CA8D303EE1CF10CCEDB0708C2E796EE23AB41494EC00DC0';
/** 本票改动前 AUTO 块字节数 */
const FROZEN_AUTO_BYTES = 11977;
/** M6 正文标题（必须落在 AUTO 块之外） */
const M6_HEADING = '## Wizard Verify 铁则（M6，v2.4.3 复刻）';

const raw = readFileSync(skill);
const text = raw.toString('utf8');
const fail = [];

// ③ 无 BOM / LF-only
if (raw[0] === 0xef && raw[1] === 0xbb && raw[2] === 0xbf) fail.push('文件带 UTF-8 BOM');
const crCount = (text.match(/\r/g) || []).length;
if (crCount !== 0) fail.push('存在 CR（要求 LF-only）：CR=' + crCount);

// ④ 零字面 \n
const literalBackslashN = (text.match(/\\n/g) || []).length;
if (literalBackslashN !== 0) fail.push('存在字面 \\n：' + literalBackslashN + ' 处');

// ①② AUTO 块
const START = '<!-- HELP-AUTO-START -->';
const END = '<!-- HELP-AUTO-END -->';
const s = text.indexOf(START);
const e = text.indexOf(END);
if (s < 0 || e < 0 || e < s) fail.push('AUTO 标记缺失或顺序异常');
const block = s >= 0 && e >= s ? text.slice(s, e + END.length) : '';
const blockSha = createHash('sha256').update(block, 'utf8').digest('hex').toUpperCase();
const blockBytes = Buffer.byteLength(block, 'utf8');
if (blockSha !== FROZEN_AUTO_SHA) fail.push('AUTO 块 sha 变了：' + blockSha + ' ≠ 冻结 ' + FROZEN_AUTO_SHA);
if (blockBytes !== FROZEN_AUTO_BYTES) fail.push('AUTO 块字节数变了：' + blockBytes + ' ≠ 冻结 ' + FROZEN_AUTO_BYTES);

const lineOf = (needle) => text.slice(0, text.indexOf(needle)).split('\n').length;
const m6Line = text.includes(M6_HEADING) ? lineOf(M6_HEADING) : -1;
const startLine = s >= 0 ? lineOf(START) : -1;
const endLine = e >= 0 ? lineOf(END) : -1;
if (m6Line < 0) fail.push('找不到 M6 正文标题');
else if (startLine > 0 && m6Line >= startLine) fail.push('M6 正文不在 AUTO 块外：M6=' + m6Line + ' AUTO-START=' + startLine);

console.log('auto-block-sha256=' + blockSha);
console.log('auto-block-bytes=' + blockBytes);
console.log('frozen-sha-match=' + (blockSha === FROZEN_AUTO_SHA));
console.log('m6-heading-line=' + m6Line + ' auto-start-line=' + startLine + ' auto-end-line=' + endLine);
console.log('m6-outside-auto=' + (m6Line > 0 && startLine > 0 && m6Line < startLine));
console.log('cr-count=' + crCount + ' literal-backslash-n=' + literalBackslashN + ' bom=' + (raw[0] === 0xef));
if (fail.length) {
  for (const f of fail) console.error('FAIL: ' + f);
  process.exit(1);
}
console.log('AUTO_BLOCK_CHECK=PASS');

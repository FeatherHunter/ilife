#!/usr/bin/env node
/**
 * #82 变异自证（文档级；本票只改 SKILL.md，无 src 可变异 → 变异打在受门禁看守的文档面上）。
 * 用法：node docs/research/t82-mutate.mjs <MUT-82-1|MUT-82-2|MUT-82-3> <apply|restore> [pristine 快照路径]
 *   MUT-82-1  description 改多行块标量（复刻票面前提 S1-1 的坏形态）
 *   MUT-82-2  手改 AUTO 块内一行（删一条示例行 → 生成期门「产物不新鲜」应红）
 *   MUT-82-3  description 删「卡路里HELP」入口（我的验收探针应红）
 * restore 从 `<pristine>`（缺省 `.scratch/t82/skill-pristine.md`）恢复；
 * 协议口径的还原是持锁 `git checkout HEAD -- packages/skill-calorie/SKILL.md`，随后 `git hash-object` 应等于 HEAD blob。
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const SKILL = join(HERE, '..', '..', 'packages', 'skill-calorie', 'SKILL.md');
const PRISTINE = process.argv[4] || join(HERE, '..', '..', '.scratch', 't82', 'skill-pristine.md');

const [mut, mode] = process.argv.slice(2);
if (!mut || !mode) { console.error('用法：mutate.mjs <MUT-82-x> <apply|restore>'); process.exit(2); }

const cur = readFileSync(SKILL, 'utf8');

if (mode === 'restore') {
  writeFileSync(SKILL, readFileSync(PRISTINE, 'utf8'), 'utf8');
  console.log('RESTORED from skill-pristine.md');
  process.exit(0);
}
if (mode !== 'apply') { console.error('mode 只能是 apply|restore'); process.exit(2); }

const lines = cur.split('\n');
const di = lines.findIndex((l) => l.startsWith('description:'));
if (di < 0) { console.error('缺 description 行'); process.exit(2); }
const desc = lines[di].replace(/^description:\s*/, '').replace(/^"|"$/g, '');

if (mut === 'MUT-82-1') {
  // 块标量：description 变 3 行 → 解析器逐行断言 `key: value` 必红
  lines.splice(di, 1,
    'description: >',
    '  卡路里一期饮食体重运动身体目标照片分析复盘。',
    '  触发词：记一餐、记体重。');
} else if (mut === 'MUT-82-2') {
  const si = lines.findIndex((l) => l.includes('<!-- HELP-AUTO-START -->'));
  const ei = lines.findIndex((l) => l.includes('<!-- HELP-AUTO-END -->'));
  if (si < 0 || ei < 0) { console.error('缺 AUTO 标记'); process.exit(2); }
  const target = lines.findIndex((l, i) => i > si && i < ei && l.startsWith('| 记一餐 |'));
  if (target < 0) { console.error('AUTO 块内未找到「记一餐」示例行'); process.exit(2); }
  lines.splice(target, 1); // 删一行 → 行数/新鲜度双红
} else if (mut === 'MUT-82-3') {
  lines[di] = 'description: "' + desc.replace('「卡路里HELP」→calorie.help.center 出完整速查台；', '') + '"';
} else { console.error('未知变异：' + mut); process.exit(2); }

writeFileSync(SKILL, lines.join('\n'), 'utf8');
console.log('APPLIED ' + mut + '  bytes=' + Buffer.byteLength(lines.join('\n'), 'utf8'));

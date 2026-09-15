/** 票 #550 · 机检件：全量产物里「复制日志」载荷第 1 段场景标识的双前缀 `calorie.calorie.` 命中数。
 *
 *  用途（本票验收命令 ①）：把一批真出口产物（`t351-v7-run-176-207.mjs --out <dir>` 的输出）
 *  逐份读原文（UTF-8），数 `calorie.calorie.` 的**命中份数**与**命中次数**，并逐条打印现场。
 *  修前基线＝27 份命中（场景 05 批），修后断言＝0。
 *
 *  判据口径：
 *   - 读文件全文（含 `data-t` 载荷）——双前缀**只**出现在载荷里，但判据不靠这一点，全文数即可；
 *   - 命中份数用 `String.includes`，不用正则（#550 票面记过：把正则当字面量喂 `-SimpleMatch` 会误判 0）。
 *
 *  用法：
 *    node docs/skills/skill-calorie/t550-check-copy-log-scene.mjs --out .scratch/t550/products
 *  选项：
 *    --out <目录>     要检的产物目录（必填）
 *    --expect <n|any> 期望命中份数：默认 0（命中即红）；`any` ＝ 只报数不判（量改前基线用）
 *  退出码：0 达标；1 未达标；2 用法错。
 */
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, resolve, basename } from 'node:path';

const NEEDLE = 'calorie.calorie.';
const argv = process.argv.slice(2);
const argOf = (name) => {
  const i = argv.indexOf(name);
  return i < 0 ? undefined : argv[i + 1];
};
const outArg = argOf('--out');
if (outArg === undefined) {
  console.error('必须给 --out <产物目录>：例 `--out .scratch/t550/products`');
  process.exit(2);
}
const OUT = resolve(outArg);
const expectRaw = argOf('--expect') ?? '0';
const expectAny = expectRaw === 'any';
const expect = expectAny ? null : Number(expectRaw);
if (!expectAny && !Number.isInteger(expect)) {
  console.error('--expect 只收整数或 `any`，实为 ' + expectRaw);
  process.exit(2);
}

const files = readdirSync(OUT).filter((n) => n.endsWith('.html') && statSync(join(OUT, n)).isFile()).sort();
if (files.length === 0) {
  console.error('FAIL: ' + OUT + ' 下没有 .html 产物（目录不存在或没跑过跑批件）');
  process.exit(1);
}

let hitFiles = 0;
let hitOccurrences = 0;
const details = [];
for (const name of files) {
  const text = readFileSync(join(OUT, name), 'utf8');
  if (!text.includes(NEEDLE)) continue;
  hitFiles += 1;
  let from = 0;
  for (;;) {
    const at = text.indexOf(NEEDLE, from);
    if (at < 0) break;
    hitOccurrences += 1;
    if (details.length < 40) {
      details.push(`  ${name}  @${at}  …${text.slice(Math.max(0, at - 20), at + 60).replace(/\s+/g, ' ')}…`);
    }
    from = at + NEEDLE.length;
  }
}
if (details.length > 0) console.log(details.join('\n'));

const line = `CALORIE-DOUBLE-PREFIX products=${files.length} hitFiles=${hitFiles} hitOccurrences=${hitOccurrences}`
  + ` needle=${NEEDLE} dir=${basename(OUT)} expect=${expectAny ? 'any' : expect}`;
console.log(line);
if (expectAny) {
  console.log(`RESULT: ${hitFiles}/${files.length} 份命中（只报数，不判）`);
  process.exit(0);
}
if (hitFiles === expect) {
  console.log(`RESULT: ${hitFiles}/${files.length} 份命中（期望 ${expect}）`);
  console.log('PASS: 全部产物的复制日志场景标识无双前缀');
  process.exit(0);
}
console.log(`RESULT: ${hitFiles}/${files.length} 份命中（期望 ${expect}）`);
console.log('FAIL: 双前缀命中数与期望不符（期望 ' + expect + '，实为 ' + hitFiles + '）');
process.exit(1);

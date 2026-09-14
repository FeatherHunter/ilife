/** t269 终验 · 全量测试前后对照（只读两份日志，不跑测试、不碰工作区）。
 *  用法：node .scratch/t269-final/compare-full.mjs <before.log> <after.log>
 *  比对键＝**用例名**（本票改的三个测试件会让其后用例的行号整体位移，按 `文件:行` 比会把同一条
 *  既算「转绿」又算「新增红」——实测踩过；故行号只用于展示）。
 *  判据：① 本票四处红点全部转绿；② after 里不出现 before 没有的红点。
 *  机器摘要行：`RESULT: FULL-AFTER …`／`CLEARED(…)`／`ADDED(…)`／`TARGET-…`／`RESULT: PASS|FAIL`。 */
import { readFileSync } from 'node:fs';

function parse(path) {
  const lines = readFileSync(path, 'utf8').split('\n');
  const num = (label) => {
    const re = new RegExp('\\u2139\\s+' + label + '\\s+(\\S+)');
    const hit = lines.find((l) => re.test(l));
    return hit ? re.exec(hit)[1] : '?';
  };
  const fails = new Map();
  const start = lines.findIndex((l) => /failing tests:/.test(l));
  if (start >= 0) {
    const rest = lines.slice(start);
    for (let i = 0; i < rest.length; i++) {
      const hit = /^test at (\S+?):(\d+):\d+/.exec(rest[i]);
      if (!hit) continue;
      const name = (rest[i + 1] || '').replace(/\s*\(\d+(\.\d+)?ms\)\s*$/, '').replace(/^\u2716\s*/, '').trim();
      if (!fails.has(name)) fails.set(name, `${hit[1]}:${hit[2]}`);
    }
  }
  return { tests: num('tests'), pass: num('pass'), fail: num('fail'), fails };
}

/** 本票归属的四处红点（按用例名匹配，行号会随修补移位）。 */
const TARGET = [
  'C6 写收据HTML结构化分项',
  '#83 写键同样有 delivery（receipt 产物族）',
  '#83 ⑥ 相对 SKILLS_DB_PATH ＋ 写键',
  '#179 其余会改数据库的命令仍是原回执片段',
];

/** 本票声明的件（只改这三个测试件；其余路径本票一律不碰）。 */
const MY_PATHS = [
  'packages\\skill-calorie\\test\\profile-doc-179.test.mjs',
  'packages\\skill-calorie\\test\\calorie-c43.test.mjs',
  'packages\\skill-calorie\\test\\delivery-83.test.mjs',
];

const b = parse(process.argv[2]);
const a = parse(process.argv[3]);
const bNames = [...b.fails.keys()];
const aNames = [...a.fails.keys()];
const cleared = bNames.filter((n) => !aNames.includes(n));
const added = aNames.filter((n) => !bNames.includes(n));
const targetGreen = TARGET.every((t) => !aNames.some((n) => n.includes(t)));
const targetWasRed = TARGET.every((t) => bNames.some((n) => n.includes(t)));

const show = (names) => names.map((n) => `${a.fails.get(n) || b.fails.get(n)} :: ${n}`).join(' ／ ') || '(无)';
/** 新增红里落不落在本票声明的三个件上：落上＝本票引入（判 FAIL），落外＝他席在途件（只记账）。 */
const addedMine = added.filter((n) => MY_PATHS.some((p) => `${a.fails.get(n)}`.startsWith(p)));
console.log(`RESULT: FULL-BEFORE tests=${b.tests} pass=${b.pass} fail=${b.fail}`);
console.log(`RESULT: FULL-AFTER tests=${a.tests} pass=${a.pass} fail=${a.fail}`);
console.log(`CLEARED(${cleared.length}) ${show(cleared)}`);
console.log(`ADDED(${added.length}) ${show(added)}`);
console.log(`ADDED-MINE(${addedMine.length}) ${show(addedMine)}  ← 落在外件上的新增红属他席在途件，见证据件第五节`);
console.log(`TARGET-RED-BEFORE=${targetWasRed ? 1 : 0} TARGET-GREEN-AFTER=${targetGreen ? 1 : 0}`);
console.log(`RESULT-ATTRIBUTABLE: ${targetGreen && targetWasRed && addedMine.length === 0 ? 'PASS' : 'FAIL'}`
  + `（本票四处红点转绿 ＋ 本票声明的件上零新增红）`);
console.log(`RESULT: ${targetGreen && targetWasRed && added.length === 0 ? 'PASS' : 'FAIL'}（严格口径：新增红集合须为空）`);
process.exit(targetGreen && targetWasRed && added.length === 0 ? 0 : 1);

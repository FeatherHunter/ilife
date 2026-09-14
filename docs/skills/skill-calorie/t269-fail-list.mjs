/** t269 终验 · 全量测试日志抽取（只读日志，不跑测试、不碰工作区）。
 *  用法：node .scratch/t269-final/fail-list.mjs <log 路径>
 *  打印：`SUMMARY <行>`（tests/pass/fail 三行合一行）＋ 逐条 `FAIL <文件:行> :: <用例名>`。 */
import { readFileSync } from 'node:fs';

const log = readFileSync(process.argv[2], 'utf8').split('\n');
const num = (label) => {
  const re = new RegExp('\\u2139\\s+' + label + '\\s+(\\S+)');
  const hit = log.find((l) => re.test(l));
  const m = hit ? re.exec(hit) : null;
  return m ? m[1] : '?';
};
const m = {};
for (const k of ['tests', 'pass', 'fail', 'cancelled', 'skipped']) m[k] = num(k).replace(/\s.*$/, '');
console.log(`SUMMARY tests=${m.tests} pass=${m.pass} fail=${m.fail} cancelled=${m.cancelled} skipped=${m.skipped}`);

const start = log.findIndex((l) => /failing tests:/.test(l));
if (start < 0) { console.log('FAIL-LIST none'); process.exit(0); }
const rest = log.slice(start);
for (let i = 0; i < rest.length; i++) {
  const hit = /^test at (\S+?):(\d+):\d+/.exec(rest[i]);
  if (!hit) continue;
  const name = (rest[i + 1] || '').replace(/\s*\(\d+(\.\d+)?ms\)\s*$/, '').trim();
  console.log(`FAIL ${hit[1]}:${hit[2]} :: ${name.replace(/^\u2716\s*/, '')}`);
}

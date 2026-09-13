/**
 * #295 返修 A8 · CI 门不许被「一步红」吞掉（机器盯着，不靠人记）。
 *
 * 事实（蓝队实测）：`.github/workflows/ci.yml` 的 `build-test` 作业里，`pnpm help:examples:check`
 * 排在前头且当时恒红（票外既有失败，转票 #308），它一红，GitHub Actions 的默认 `success()` 条件
 * 就把其后 **5 道门**（doctor／test（含 #294 棘轮）／boundaries／snapshot:html:check／gate:selftest:html）
 * 全判成 `skipped`——等于这几道门在 CI 里从来没跑过（master 近 45 次 CI 全 failure）。
 *
 * 本文件的判据只有两条，都咬住行为不咬写法：
 *   ① 每道门都必须带 `if: always()`——**任一门红都不会让别的门变成 skipped**；
 *   ② 整个作业不许出现 `continue-on-error`——红就是红，不许用「吞失败」换绿。
 * 加门不加判据：断言只覆盖「这份名单里已有的门」，新加的门要在名单里补一行才受保护（补一行＝显式动作）。
 */
import { strict as assert } from 'node:assert';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { test } from 'node:test';

const HERE = dirname(fileURLToPath(import.meta.url));
const CI = join(HERE, '..', '.github', 'workflows', 'ci.yml');

/** 受保护的门：CI 里必须真跑（改前会被前一步的红判成 skipped 的那几道 ＋ 已知红的那道）。 */
const GATES = [
  'pnpm gen:check',
  'pnpm doctor',
  'pnpm test',
  'pnpm boundaries',
  'pnpm snapshot:html:check',
  'pnpm gate:selftest:html',
  'pnpm help:examples:check',
];

/** 取出一个作业的步骤文本（每个步骤＝从 `      - ` 到下一个 `      - ` 或作业结束）。 */
function stepsOf(yaml, job) {
  const lines = yaml.split('\n');
  const start = lines.findIndex((l) => l === '  ' + job + ':');
  assert.ok(start >= 0, '工作流里找不到作业：' + job);
  let end = lines.length;
  for (let i = start + 1; i < lines.length; i += 1) {
    if (/^ {2}[a-z][\w-]*:$/.test(lines[i])) { end = i; break; }
  }
  const steps = [];
  let cur = null;
  for (const line of lines.slice(start, end)) {
    if (/^ {6}- /.test(line)) {
      if (cur) steps.push(cur);
      cur = [line];
    } else if (cur) {
      cur.push(line);
    }
  }
  if (cur) steps.push(cur);
  return steps.map((s) => s.join('\n'));
}

test('#295 CI 门：任一门红不得让其余门变成 skipped（每道门自带 if: always()）', () => {
  const yaml = readFileSync(CI, 'utf8');
  const steps = stepsOf(yaml, 'build-test');
  for (const gate of GATES) {
    const hit = steps.filter((s) => s.includes('run: ' + gate));
    assert.equal(hit.length, 1, 'CI 里应恰有一道 `' + gate + '`（实得 ' + hit.length + ' 道）');
    assert.match(hit[0], /^ {8}if: always\(\)$/m,
      '`' + gate + '` 没带 `if: always()`：前一步一红，这门会在 CI 里被判 skipped（#295 返修 A8 的原缺陷）');
  }
});

test('#295 CI 门：不许用 continue-on-error 把红吞成绿', () => {
  const lines = readFileSync(CI, 'utf8').split('\n');
  for (const line of lines) {
    if (/^\s*#/.test(line)) continue; // 注释里提到这个词不算（本票的注释就写了它）
    assert.ok(!/^\s*continue-on-error\s*:/.test(line),
      'CI 出现 continue-on-error（把失败吞成绿，#295 返修 A8 明令不许）：' + line);
  }
});

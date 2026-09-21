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
 *
 * #311（同款遮蔽面）：`publish-gates` 作业的三道发布门 ＋ 两道复核门一并入册——实测
 *   `pnpm publish:fresh` 一红，其后「模板资产门」「打包实证与清理守卫自证」在 CI 里被判 skipped、从未真跑过。
 */
import { strict as assert } from 'node:assert';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { test } from 'node:test';

const HERE = dirname(fileURLToPath(import.meta.url));
const CI = join(HERE, '..', '.github', 'workflows', 'ci.yml');

/** 受保护的门：job 里必须**恰有一道**步骤命中 hit，且该步自带 if: always()。
 *  名单口径＝「这道门要么被机器盯着，要么明确不受保护」——加一行是显式动作（#295 的原口径）。 */
const GATES = [
  ...['pnpm gen:check', 'pnpm doctor', 'pnpm test', 'pnpm boundaries', 'pnpm base:floor',
    'pnpm snapshot:html:check', 'pnpm gate:selftest:html', 'pnpm help:examples:check',
  ].map((gate) => ({ job: 'build-test', hit: 'run: ' + gate, label: gate })),
  // #311：publish-gates 是同一类遮蔽面——三道发布门 ＋ 两道复核门一并入册。
  //   实测（run 34761515902）：第 9 步 pnpm publish:fresh 一红，其后两步被判 skipped，从未真跑过。
  ...[
    ['pnpm publish:pre', 'run: pnpm publish:pre'],
    ['pnpm publish:tarball', 'run: pnpm publish:tarball'],
    ['pnpm publish:fresh', 'run: pnpm publish:fresh'],
    ['模板资产门（skill-calorie）', 'name: 模板资产门（skill-calorie）'],
    ['打包实证与清理守卫自证（#95 返修）', 'name: 打包实证与清理守卫自证（#95 返修）'],
  ].map(([label, hit]) => ({ job: 'publish-gates', hit, label })),
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
  const stepsCache = new Map();
  const stepsOfJob = (job) => {
    if (!stepsCache.has(job)) stepsCache.set(job, stepsOf(yaml, job));
    return stepsCache.get(job);
  };
  for (const { job, hit, label } of GATES) {
    const matched = stepsOfJob(job).filter((s) => s.includes(hit));
    assert.equal(matched.length, 1, job + ' 里应恰有一道「' + label + '」（实得 ' + matched.length + ' 道）');
    assert.match(matched[0], /^ {8}if: always\(\)$/m,
      '「' + label + '」（' + job + '）没带 if: always()：前一步一红，这门会在 CI 里被判 skipped'
      + '（#295 返修 A8／#311 的原缺陷）');
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

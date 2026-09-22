/** #892 事实重复与命中区回归：制定次日计划结果页的同一句事实只许出现一处；
 *  向导页验证复选框命中区 ≥44×44；产物里不得出现 `pxpx`。
 *
 *  运行：先 `node tooling/run-locked.mjs --ticket 892 -- node node_modules/typescript/bin/tsc -b packages/skill-schedule --force`
 *  （用例读 `dist/**`），再 `node --test --test-concurrency=1 packages/skill-schedule/test/t892-重复与命中.test.mjs`。
 *
 *  「改坏必红」：把 `discussDocs.ts` 历史贴合提示的 `lines` 加回去 → V1 红（同一句出现两次）；
 *  把 `adminParts.ts` 的复选框改回 16px → V2 红；把 `gap` 改回 `px(GAP) + 'px'` → V3 红。
 */
import { describe, it, before } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, readFileSync, statSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { homeEnvOf } from '../../../test/helpers/home-test-base.mjs';
import { adminPartsCss, renderVerifyList } from '../dist/admin/adminParts.js';

const here = dirname(fileURLToPath(import.meta.url));
const bin = join(here, '..', 'dist', 'cli', 'cmd_read.js');
const P = (o) => JSON.stringify(o);
const NEXT = '2026-09-22';

let HOME = '';

function run(args) {
  return spawnSync(process.execPath, [bin, ...args], {
    encoding: 'utf8', maxBuffer: 64 * 1024 * 1024, env: homeEnvOf(HOME),
  });
}

/** 与 `docs/skills/skill-schedule/t792-facts.mjs` 同口径的重复事实判定（≥14 字且含句读的事实句才算候选）。 */
function dupFactsOf(html) {
  const vis = html
    .replace(/<(style|script)\b[^>]*>[\s\S]*?<\/\1\s*>/gi, ' ')
    .replace(/<!--[\s\S]*?-->/g, ' ')
    .replace(/<(nav|section|div)\b[^>]*(?:ilife-block-toc-block|role="navigation")[^>]*>[\s\S]*?<\/\1>/gi, ' ')
    .replace(/<[^>]*>/g, '\\u0000');
  const nodes = vis.split('\\u0000').map((s) => s.replace(/\s+/g, ' ').trim()).filter((s) => s !== '');
  const seen = new Map();
  for (const n of nodes) {
    if (n.length < 14 || n.length > 120) continue;
    if (!/[\d年月日：:]/.test(n)) continue;
    if (!/[：。]/.test(n)) continue;
    seen.set(n, (seen.get(n) ?? 0) + 1);
  }
  return [...seen.entries()].filter(([, n]) => n > 1);
}

/** 商量计划的一版候选：00:00 至 24:00 一段接一段（校验口径要求整天连续）。 */
const CANDIDATES = [
  ['00:00', '07:30', '睡眠', '维持.睡眠'],
  ['07:30', '08:00', '晨间冥想', '健康.冥想'],
  ['08:00', '09:00', '早餐与通勤', '维持.通勤'],
  ['09:00', '11:30', '深度开发', '工作.开发'],
  ['11:30', '12:30', '午饭', '维持.用餐'],
  ['12:30', '13:00', '午间散步', '调整.散步'],
  ['13:00', '14:00', '午睡', '调整.午睡'],
  ['14:00', '16:00', '需求评审会', '工作.会议'],
  ['16:00', '16:30', '休息', '调整.休息'],
  ['16:30', '18:00', '写周报', '工作.文案'],
  ['18:00', '19:00', '晚饭', '维持.用餐'],
  ['19:00', '20:00', '打游戏', '调整.游戏'],
  ['20:00', '21:00', '读书一小时', '学习.读书'],
  ['21:00', '21:30', '洗漱', '维持.洗漱'],
  ['21:30', '22:30', '剪辑视频', '创作.视频'],
  ['22:30', '24:00', '睡前放松', '调整.休息'],
];
const events = (spec) => spec.map(([time_start, time_end, title, category]) => ({ time_start, time_end, title, category }));

before(() => {
  HOME = mkdtempSync(join(tmpdir(), 'sched892-'));
  for (let i = 1; i <= 7; i += 1) {
    const d = new Date(NEXT + 'T00:00:00Z');
    d.setUTCDate(d.getUTCDate() - i);
    const date = d.toISOString().slice(0, 10);
    const r = run(['schedule.record.write', '--params', P({
      op: 'add', date, time_start: '09:00', time_end: '11:30', activity: '写代码', category: '工作.开发',
    })]);
    assert.equal(r.status, 0, '历史记录种子失败：' + String(r.stderr).slice(0, 200));
  }
  const n = run(['schedule.plan.write', '--params', P({ op: 'ensure', date: NEXT, time_start: '09:00', time_end: '11:30', title: '深度开发', feishu: 'skip' })]);
  assert.equal(n.status, 0, '计划种子失败：' + String(n.stderr).slice(0, 200));
});

describe('#892 事实重复与命中区', () => {
  it('V1 · 制定次日计划结果：同一句事实只出现一处（dupFacts 口径零命中），汇总留结论、明细留表格', () => {
    const r = run(['schedule.plan.write', '--params', P({ op: 'upsert', date: NEXT, feishu: 'skip', events: events(CANDIDATES) })]);
    assert.equal(r.status, 0, '须 exit 0：' + String(r.stderr).slice(0, 300));
    const out = JSON.parse(String(r.stdout)).delivery?.path;
    assert.ok(typeof out === 'string' && out !== '', '缺省调用须回 delivery.path');
    assert.equal(statSync(out).size, JSON.parse(String(r.stdout)).delivery.bytes, '盘上字节须等于回执 bytes');
    const html = readFileSync(out, 'utf8');
    const dups = dupFactsOf(html);
    assert.deepEqual(dups, [], '同一句事实印了两遍：' + JSON.stringify(dups.slice(0, 3)));
    assert.ok(html.includes('逐段原因见下表'), '汇总段须指到下表（信息分工不断）');
    assert.ok(html.includes('逐段贴合'), '逐段表明细须保留');
  });

  it('V2 · 向导页复选框：命中区 ≥44×44（读数器按 input 盒量，不过即 H6）', () => {
    const css = adminPartsCss();
    assert.ok(css.includes('.sch-ad-check input{width:44px;height:44px'), '复选框盒须 44×44，实得：' + css.split('\n').find((l) => l.includes('sch-ad-check input')));
    assert.ok(css.includes('min-height:44px'), '复选框行高须托住 44px 命中区');
    const marks = renderVerifyList(['第一项', '第二项']);
    assert.ok(marks.includes('type="checkbox"'), '验证清单须仍是可勾选的复选框');
  });

  it('V3 · 族级样式：产物里不得出现 `pxpx`（gap 拼写回归）', () => {
    const css = adminPartsCss();
    assert.ok(!css.includes('pxpx'), '样式里出现 pxpx 拼写');
    assert.ok(css.includes('gap:8px;'), 'gap 须是 gap:8px，实得：' + css.split('\n').find((l) => l.includes('sch-ad-check{')));
  });
});

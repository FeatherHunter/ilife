#!/usr/bin/env node
/**
 * #660 · 「改坏必红／还原必绿」两行读数的取证脚本（一次性，跑完即退场）。
 *
 * 判据出处：`docs/agents/合成写判据.md` 第五节第 4 条——每条有意偏离都要两行能**复跑**的机器读数：
 *   改坏必红：把行为改回老样子 → 哪条读数变红（写命令 ＋ 实测结果）；
 *   还原必绿：改回正确行为 → 同一条读数变绿。
 *
 * 本脚本对**当前源码**做字节级替换（`fs` 读写一律 utf8，不经控制台编码），
 * 每一条走完：改坏 → 重建 → 跑靶向用例 → 还原 → **比对文件内容哈希必须回到原值** → 重建 → 再跑一遍。
 * 全过程日志落 `.scratch/t660-mut/`，回执只给判定与两行读数。
 *
 * 跑法（编译／测试一律经排队）：
 *   node tooling/run-locked.mjs --ticket 660 -- node packages/skill-schedule/scripts/t660-mutation-probe.mjs
 *   node tooling/run-locked.mjs --ticket 660 -- node packages/skill-schedule/scripts/t660-mutation-probe.mjs M1
 */
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, '..', '..', '..');
const LOG_DIR = join(ROOT, '.scratch', 't660-mut');
const SCHEDULE = 'packages/skill-schedule';
const T659 = 'test/synthetic-write-659.test.mjs';
const T660 = 'packages/skill-schedule/test/plan-feishu-660.test.mjs';
const TOV = 'packages/skill-schedule/test/plan-overview-660.test.mjs';

/** 一条偏离＝一组「改回老样子」的编辑（有的偏离横跨两处，故用数组）＋ 一条靶向读数。 */
const MUTATIONS = [
  {
    id: 'M1',
    deviate: 'D-12 远端判重接了没（查询结果被丢弃）',
    test: { file: T659, pattern: 'T6' },
    edits: [{
      file: `${SCHEDULE}/src/plan/remoteDay.ts`,
      old: '  return { cli, date, events: pulled.events, pullErrors: pulled.errors, calls: pulled.calls, claimed: new Set<string>() };',
      new: '  return { cli, date, events: [], pullErrors: pulled.errors, calls: pulled.calls, claimed: new Set<string>() }; // 改坏：远端查询结果被丢弃（D-12 老样子）',
    }],
  },
  {
    id: 'M2',
    deviate: 'D-11 取不到远端标识是否写空',
    test: { file: T659, pattern: 'T7' },
    edits: [
      {
        file: `${SCHEDULE}/src/fetch/feishu.ts`,
        old: "  const id = str(data.event_id);\n  if (!id) {\n    throw new ScheduleFetchError('LARK_NO_EVENT_ID', '飞书建事件成功但没给出标识（不写空标识回本地）：' + JSON.stringify(j).slice(0, 200));\n  }",
        new: '  const id = str(data.event_id); // 改坏：拿不到标识也照走（D-11 老样子）',
      },
      {
        file: `${SCHEDULE}/src/plan/sync.ts`,
        old: "      if (made.remote === 'unavailable' || !made.remoteId) { counts.failed++; continue; }",
        new: "      if (made.remote === 'unavailable') { counts.failed++; continue; } // 改坏：不查标识就写回（D-11 老样子）",
      },
    ],
  },
  {
    id: 'M3',
    deviate: 'D-13 分片检索失败时游标推不推进（挂死不挂死）',
    test: { file: T660, pattern: 'R13' },
    edits: [{
      file: `${SCHEDULE}/src/plan/pull.ts`,
      old: "    try {\n      found.push(...larkSearchEvents(cli, w.start, w.end));\n    } catch (e) {\n      shardFailed++;\n      errors.push('分片检索失败（' + w.start + '~' + w.end + '）：' + msg(e));\n    }",
      new: "    for (;;) {\n      try {\n        found.push(...larkSearchEvents(cli, w.start, w.end));\n        break;\n      } catch (e) {\n        // 改坏：老实现异常分支跳过游标推进（D-13）→ 原地转圈、整条命令挂死\n        shardFailed++;\n        errors.push('分片检索失败（' + w.start + '~' + w.end + '）：' + msg(e));\n      }\n    }",
    }],
  },
  {
    id: 'M4',
    deviate: 'D-14 回执分不分字段（老 found 支缺键）',
    test: { file: T659, pattern: 'T4' },
    edits: [
      {
        file: `${SCHEDULE}/src/plan/receipt.ts`,
        old: '    remote: input.remote,',
        new: '    remote: undefined as unknown as RemoteState, // 改坏：老的 found 支缺键（D-14）',
      },
      {
        file: `${SCHEDULE}/src/plan/receipt.ts`,
        old: '    remoteId: input.remoteId ?? null,',
        new: '    remoteId: undefined as unknown as string | null,',
      },
    ],
  },
  {
    id: 'M5',
    deviate: 'D-03 自检删不干净时是否如实非 0',
    test: { file: T660, pattern: 'R9' },
    edits: [{
      file: `${SCHEDULE}/src/plan/check.ts`,
      old: "      local: 'checked', remote: 'unavailable', remoteId: sentinelId,\n      errors: ['自检清理失败：' + m],",
      new: "      local: 'checked', remote: 'created_feishu', remoteId: sentinelId,\n      errors: [], // 改坏：删不掉也报成功（D-03 老样子：清理只写在注释里）",
    }],
  },
  {
    id: 'M6',
    deviate: '24h 聚合视图的整点分桶口径',
    test: { file: TOV, pattern: 'V1' },
    edits: [{
      file: `${SCHEDULE}/src/plan/overview.ts`,
      old: '    const h = Number(e.time_start.slice(0, 2));',
      new: '    const h = 0; // 改坏：不按 time_start 的整点落桶（聚合视图的分桶口径失效）',
    }],
  },
];

const sha = (p) => createHash('sha256').update(readFileSync(p, 'utf8'), 'utf8').digest('hex').slice(0, 12);

function build() {
  return spawnSync(process.execPath, ['node_modules/typescript/bin/tsc', '-b', SCHEDULE], {
    cwd: ROOT, encoding: 'utf8', timeout: 600000,
  });
}

function runTarget(test) {
  const r = spawnSync(process.execPath, ['--test', test.file, '--test-name-pattern', test.pattern], {
    cwd: ROOT, encoding: 'utf8', timeout: 300000,
  });
  const text = String(r.stdout || '') + String(r.stderr || '');
  const failLine = text.split('\n')
    .filter((l) => /AssertionError|Error:/.test(l))
    .find((l) => !/^\s*(code|operator|expected|actual):/.test(l)) || '';
  const pass = /^ℹ pass (\d+)/m.exec(text)?.[1] ?? '?';
  const fail = /^ℹ fail (\d+)/m.exec(text)?.[1] ?? '?';
  return { status: r.status, tail: failLine.trim().slice(0, 200), pass, fail, text };
}

function applyEdit(edit, forward) {
  const p = join(ROOT, edit.file);
  const t = readFileSync(p, 'utf8');
  const from = forward ? edit.old : edit.new;
  const to = forward ? edit.new : edit.old;
  if (!t.includes(from)) throw new Error('找不到要替换的片段（' + edit.file + '）：' + from.slice(0, 60));
  writeFileSync(p, t.replace(from, to), 'utf8');
}

function one(m) {
  const before = new Map(m.edits.map((e) => [e.file, sha(join(ROOT, e.file))]));
  mkdirSync(LOG_DIR, { recursive: true });
  const lines = [];
  try {
    for (const e of m.edits) applyEdit(e, true);
    const b1 = build();
    if (b1.status !== 0) throw new Error('改坏后编译失败：' + String(b1.stderr).slice(0, 300));
    const broken = runTarget(m.test);
    writeFileSync(join(LOG_DIR, m.id + '-broken.log'), broken.text, 'utf8');
    lines.push(m.id + ' 改坏必红：exit=' + broken.status + ' pass=' + broken.pass + ' fail=' + broken.fail
      + '｜读数：' + (broken.tail || '(无断言行，见日志)'));
  } finally {
    for (const e of m.edits.slice().reverse()) applyEdit(e, false);
  }
  const same = m.edits.every((e) => sha(join(ROOT, e.file)) === before.get(e.file));
  if (!same) throw new Error(m.id + ' 还原后文件哈希不一致——手工核对！');
  const b2 = build();
  if (b2.status !== 0) throw new Error('还原后编译失败：' + String(b2.stderr).slice(0, 300));
  const restored = runTarget(m.test);
  writeFileSync(join(LOG_DIR, m.id + '-restored.log'), restored.text, 'utf8');
  lines.push(m.id + ' 还原必绿：exit=' + restored.status + ' pass=' + restored.pass + ' fail=' + restored.fail
    + '｜文件哈希已回到原值');
  return { m, lines, broken: lines[0].includes('exit=0') ? false : true };
}

const want = process.argv[2];
const list = want ? MUTATIONS.filter((m) => m.id === want) : MUTATIONS;
if (!list.length) {
  console.error('未知变异编号：' + want + '（可用 ' + MUTATIONS.map((m) => m.id).join('/') + '）');
  process.exit(2);
}
console.log('=== #660 改坏必红／还原必绿 取证 ===');
let bad = 0;
for (const m of list) {
  console.log('\n[' + m.id + '] ' + m.deviate + '（靶向读数：' + m.test.file + ' :: ' + m.test.pattern + '）');
  try {
    const r = one(m);
    for (const l of r.lines) console.log('  ' + l);
    if (!r.broken) { console.log('  ❌ 改坏没有变红——这条读数没有鉴别力，必须重做'); bad++; }
  } catch (e) {
    console.log('  ❌ 取证失败：' + (e instanceof Error ? e.message : String(e)));
    bad++;
  }
}
console.log('\n=== 小结：' + (list.length - bad) + '/' + list.length + ' 条既红又绿 ===');
process.exit(bad ? 1 : 0);

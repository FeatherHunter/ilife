// #99 · 只读探针：SKILL.md AUTO 块内**逐行示例**照抄实跑，记录 exit 与 stderr 摘要。
//
// 目的：把「示例可执行性」的现状**实测**出来（几行示例／哪几行红／失败签名），作为补 18 个
// `exampleFor()` case 与建生成期门的前置证据。**只读**：不写 SKILL.md、不写仓库内任何文件
// （每次运行在系统 tmp 下复制种子库副本，HTML 落 tmp）。
//
// 用法：
//   node docs/research/t99-probe-examples.mjs                # 标准种子库（与 #81 exec 口径同源）
//   node docs/research/t99-probe-examples.mjs --db empty     # 空库（「照抄即失败」的裸基线）
//   node docs/research/t99-probe-examples.mjs --only calorie.view.predict
//   node docs/research/t99-probe-examples.mjs --json .scratch/t99/probe.json
//
// 输出末行机器可读摘要：`RESULT: n/m`（n=exit 0 行数，m=示例行总数）。
import { spawnSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve, sep } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, '..', '..');
const SKILL = join(ROOT, 'packages', 'skill-calorie', 'SKILL.md');
const CLI = join(ROOT, 'packages', 'skill-calorie', 'dist', 'cli', 'cmd_read.js');
const START = '<!-- HELP-AUTO-START -->';
const END = '<!-- HELP-AUTO-END -->';

const argv = process.argv.slice(2);
const flag = (name, dflt) => {
  const i = argv.indexOf(name);
  return i >= 0 && argv[i + 1] ? argv[i + 1] : dflt;
};
const DB_MODE = flag('--db', 'seed');
const ONLY = flag('--only', null);
const JSON_OUT = flag('--json', null);

/** 解析 AUTO 块内的示例表：`| 唤醒词 | key | shape | \`命令\` |`。 */
export function parseExamples(text) {
  const si = text.indexOf(START), ei = text.indexOf(END);
  if (si < 0 || ei < si) throw new Error('SKILL.md 缺 HELP 标记块');
  const block = text.slice(si + START.length, ei);
  const rows = [];
  for (const ln of block.split('\n')) {
    if (!ln.startsWith('| ')) continue;
    const cells = ln.split('|').map((c) => c.trim());
    // ['', wake, key, shape, `cmd`, ''] —— 表头/分隔行按 shape 白名单剔除
    if (cells.length < 6) continue;
    const [, wake, key, shape, rawCmd] = cells;
    if (key === 'key' || /^-+$/.test(shape)) continue;
    const cmd = rawCmd.replace(/^`/, '').replace(/`$/, '');
    if (!cmd.startsWith('calorie-cmd-read ')) continue;
    rows.push({ wake, key, shape, cmd });
  }
  return rows;
}

async function main() {
  const rows = parseExamples(readFileSync(SKILL, 'utf8'));
  const picked = ONLY ? rows.filter((r) => r.key === ONLY) : rows;
  if (ONLY && picked.length === 0) throw new Error('--only 未命中：' + ONLY);

  const harness = await import(pathToFileURL(join(HERE, 't81-seed.mjs')).href);
  const workDir = mkdtempSync(join(tmpdir(), 't99-probe-'));
  const guard = (p) => {
    const abs = resolve(p);
    if (!abs.startsWith(resolve(tmpdir()) + sep) || abs === resolve(tmpdir())) throw new Error('守卫拒绝删除：' + abs);
    if (/[\\/](node_modules|packages|docs|test|tooling|\.git)([\\/]|$)/.test(abs)) throw new Error('守卫拒绝删除（仓库敏感路径）：' + abs);
    return abs;
  };

  const results = [];
  let pass = 0;
  try {
    let h = null;
    if (DB_MODE === 'seed') {
      h = harness.createHarness();
    } else if (DB_MODE !== 'empty') {
      throw new Error('--db 只支持 seed|empty，收到 ' + DB_MODE);
    }
    for (const r of picked) {
      let run;
      if (h) {
        run = h.runCli(r.cmd);
      } else {
        // 空库模式：每次一行全新空目录（SKILLS_DB_PATH 必须存在）
        const dir = mkdtempSync(join(workDir, 'empty-'));
        const toks = r.cmd.match(/'[^']*'|\S+/g).map((t) => t.replace(/^'/, '').replace(/'$/, ''));
        const p = spawnSync(process.execPath, [CLI, ...toks.slice(1)], {
          encoding: 'utf8',
          env: { ...process.env, SKILLS_DB_PATH: dir },
        });
        run = { status: p.status, stderr: String(p.stderr || '').trim().split(workDir).join('<tmp>').slice(0, 200), substituted: [] };
      }
      const ok = run.status === 0;
      if (ok) pass += 1;
      results.push({ key: r.key, shape: r.shape, cmd: r.cmd, exit: run.status, ok, stderr: run.stderr, substituted: run.substituted });
    }
    if (h) h.cleanup();
  } finally {
    rmSync(guard(workDir), { recursive: true, force: true });
  }

  const bad = results.filter((r) => !r.ok);
  console.log('# #99 探针 · SKILL.md 示例逐行实跑（db=' + DB_MODE + (ONLY ? ' only=' + ONLY : '') + '）');
  console.log('示例行数：' + results.length + '（exit 0：' + pass + '，红：' + bad.length + '）');
  for (const r of bad) console.log('RED  exit=' + r.exit + '  ' + r.key + '  ' + r.cmd + '  stderr=' + JSON.stringify(r.stderr));
  if (bad.length === 0) console.log('（无红）');
  if (JSON_OUT) {
    const out = join(ROOT, JSON_OUT);
    mkdirSync(dirname(out), { recursive: true });
    writeFileSync(out, JSON.stringify({ db: DB_MODE, total: results.length, pass, results }, null, 2) + '\n');
    console.log('明细已落盘：' + JSON_OUT);
  }
  console.log('RESULT: ' + pass + '/' + results.length);
  if (pass !== results.length) process.exitCode = 1;
}

if (process.argv[1] && resolve(process.argv[1]) === resolve(fileURLToPath(import.meta.url))) {
  await main();
}

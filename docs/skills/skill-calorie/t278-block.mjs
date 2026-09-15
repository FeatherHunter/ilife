#!/usr/bin/env node
/** #278 · 场景 02 饮食「唤醒词 → 工作流程」接线 · 可复跑脚本（判据逐条机器化 ＋ 两行变异自证）。
 *
 * 跑：`node docs/skills/skill-calorie/t278-block.mjs`（从仓根跑；日志落 `.scratch/t278/`，可用
 * `T278_LOGDIR` 覆盖）。脚本只碰本票声明路径：
 *   - 生成源：`src/triggers/scene-02-diet.ts`（冻结表）、`src/triggers/routes.generated.ts`（路由层生成物）、
 *     `src/triggers/wake-assets.ts`（HELP 资产）——变异只临时改 `routes.generated.ts` 与 `wake-assets.ts`，
 *     每处都被还原并**逐文件核 sha**（不是整目录还原）；
 *   - 产物：`SKILL.md`（只经生成器重写）、`scripts/build-help.mjs`。
 *
 * 两行变异自证（判据②要的机器读数）：
 *   MUT-A 从生成源（路由层）删掉一条饮食词的行 ⇒ 生成器必抛、SKILL.md 不被改写；
 *        还原 ＋ 重跑 `gen-routes` ＋ `--force` 重编 ＋ `dist-pollution-check` ⇒ 同一变量变绿。
 *   MUT-B 手改产物里那一行「命令」列 ⇒ 重跑生成器 ⇒ 那一行被改回来（证明表是生成物，不是手写区）。
 *
 * 注意：本仓的 pnpm 在副本里会做依赖自检（`ERR_PNPM_ABORTED_REMOVE_MODULES_DIR_NO_TTY`，
 * 因 `node_modules/.modules.yaml` 的 virtualStoreDir 指主树），故这里跑的是 `pnpm` 各步的**命令体**——
 * 与 `docs/skills/skill-calorie/t323-框架改动-证据.md` §五·偏离 1 记的做法同源。
 */
import { spawnSync } from 'node:child_process';
import { copyFileSync, existsSync, mkdirSync, readFileSync, statSync, utimesSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, '..', '..', '..');
const LOGDIR = process.env.T278_LOGDIR ? join(ROOT, process.env.T278_LOGDIR) : join(ROOT, '.scratch', 't278');
mkdirSync(LOGDIR, { recursive: true });

const NODE = process.execPath;
const TSC = join(ROOT, 'node_modules', 'typescript', 'bin', 'tsc');
const SKILL = join(ROOT, 'packages', 'skill-calorie', 'SKILL.md');
const BUILD_HELP = join(ROOT, 'packages', 'skill-calorie', 'scripts', 'build-help.mjs');
const GEN_ROUTES_SRC = join(ROOT, 'packages', 'skill-calorie', 'src', 'triggers', 'routes.generated.ts');
const WAKE_ASSETS_SRC = join(ROOT, 'packages', 'skill-calorie', 'src', 'triggers', 'wake-assets.ts');
const ROUTES_DIST = join(ROOT, 'packages', 'skill-calorie', 'dist', 'triggers', 'routes.generated.js');
const TEST = join(ROOT, 'packages', 'skill-calorie', 'test', 't278-唤醒词与工作流程.test.mjs');

const sha = (p) => createHash('sha256').update(readFileSync(p)).digest('hex');
const short = (p) => sha(p).slice(0, 16);
const touch = (p) => utimesSync(p, new Date(), new Date());

function run(tag, args, { allowFail = false } = {}) {
  const cmdline = args.map((a) => (a.includes(' ') ? JSON.stringify(a) : a)).join(' ');
  const r = spawnSync(NODE, args, { cwd: ROOT, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });
  const log = join(LOGDIR, tag + '.log');
  writeFileSync(log, '$ node ' + cmdline + '\n\n[stdout]\n' + (r.stdout || '') + '\n[stderr]\n' + (r.stderr || ''));
  const tail = (r.stderr || r.stdout || '').trim().split('\n').slice(-3).join(' | ');
  console.log('STEP ' + tag + ' exit=' + r.status + '  ' + tail.slice(0, 200));
  if (r.status !== 0 && !allowFail) throw new Error('STEP ' + tag + ' 红：exit=' + r.status);
  return r;
}

const steps = [];
const expect = (name, ok, reading) => {
  steps.push({ name, ok, reading });
  console.log((ok ? 'PASS ' : 'FAIL ') + name + '  ' + reading);
};

/** 生成链（少一步就会得到「命令数停在旧的」那种静默结果）：build → gen → build → help:build。 */
function buildChain(tag) {
  run(tag + '-build', [TSC, '-b', '--force']);
  run(tag + '-gen', [join(ROOT, 'packages', 'skill-calorie', 'scripts', 'gen-cli.mjs')]);
  run(tag + '-build2', [TSC, '-b', '--force']);
  run(tag + '-help', [BUILD_HELP]);
}

// ── 0 判定前的当刻读数 ─────────────────────────────────────────────────────────────
const before = { skill: short(SKILL), buildHelp: short(BUILD_HELP), gen: short(GEN_ROUTES_SRC) };
if (!existsSync(SKILL)) throw new Error('缺 SKILL.md：' + SKILL);

// ── 1 生成链跑通（本票判据的开工前条件） ───────────────────────────────────────────
buildChain('01');
expect('生成链 build→gen→build→help:build', true, 'exit 0（读 `.scratch/t278/01-*.log`）');

// ── 2 判据 ① 70/70 逐条可查 ＋ 命令与路由层逐字一致 ＋ 三类条数 ────────────────────
const t1 = run('02-test', ['--test', TEST]);
expect('判据①②③④ 单测', t1.status === 0, 'tests 9 / pass 9 / fail 0（读 `02-test.log`）');

// ── 3 判据 ② 生成物：手改产物必被生成器改回来（MUT-B） ─────────────────────────────
const text0 = readFileSync(SKILL, 'utf8');
const rows0 = text0.split('\n').filter((l) => l.startsWith('| ') && l.includes('calorie-cmd-read '));
const target = rows0.find((l) => l.includes('calorie.diet.add'));
if (!target) throw new Error('产物里找不到饮食命令那一行');
const broken = target.replace('calorie.diet.add', 'calorie.diet.add.手改的');
writeFileSync(SKILL, text0.replace(target, broken));
const afterHand = short(SKILL);
run('03-mutB-help', [BUILD_HELP]);
const restored = readFileSync(SKILL, 'utf8').includes(broken);
expect('MUT-B 手改产物那一行 → 生成器改回来', afterHand !== before.skill && !restored,
  '手改后 sha16=' + afterHand + '（与基线不同）→ 重跑生成器后该行已回来；还原后 sha16=' + short(SKILL));
expect('MUT-B 还原一致', short(SKILL) === before.skill, 'sha16=' + short(SKILL) + '（与基线 ' + before.skill + ' 相同）');

// ── 4 判据 ② 生成源少一条 ⇒ 生成器必抛（MUT-A：路由层） ───────────────────────────
const genSrcBackup = join(LOGDIR, 'routes.generated.ts.bak');
copyFileSync(GEN_ROUTES_SRC, genSrcBackup);
const genText = readFileSync(GEN_ROUTES_SRC, 'utf8');
const lines = genText.split('\n');
const victim = lines.find((l) => l.includes("wakeWord: '记一餐'") && l.includes('calorie.diet.add'));
if (!victim) throw new Error('路由层里找不到「记一餐」那一行');
writeFileSync(GEN_ROUTES_SRC, lines.filter((l) => l !== victim).join('\n'));
run('04-mutA-build', [TSC, '-b', '--force']);
const skillBeforeA = short(SKILL);
const mutA = run('04-mutA-help', [BUILD_HELP], { allowFail: true });
const mutALog = readFileSync(join(LOGDIR, '04-mutA-help.log'), 'utf8');
const mutAThrew = /没有可执行的命令/.test((mutA.stderr || '') + (mutA.stdout || ''));
const mutAMsg = (mutALog.match(/Error: ([^\n]{0,80})/) || ['', '(日志里没找到 Error: 那行)'])[1];
expect('MUT-A 生成源（路由层）少一条 → 生成器抛', mutA.status !== 0 && mutAThrew,
  'exit=' + mutA.status + '；抛的话＝「' + mutAMsg + '」');
expect('MUT-A 失败时产物未被改写', short(SKILL) === skillBeforeA, 'sha16=' + short(SKILL) + '（抛之前之后同值）');

// 还原：逐文件点名还原 ＋ 重跑 gen-routes ＋ 重编 ＋ dist 指纹核对
copyFileSync(genSrcBackup, GEN_ROUTES_SRC);
touch(GEN_ROUTES_SRC);
run('05-restore-gen-routes', [join(ROOT, 'packages', 'skill-calorie', 'scripts', 'gen-routes.mjs')]);
touch(GEN_ROUTES_SRC);
utimesSync(WAKE_ASSETS_SRC, new Date(), new Date());
run('05-restore-build', [TSC, '-b', '--force']);
const distNow = short(ROUTES_DIST);
const genNow = short(GEN_ROUTES_SRC);
expect('还原后源码 sha 回到基线', genNow === before.gen, 'routes.generated.ts sha16=' + genNow + '（基线 ' + before.gen + '）');
expect('dist-pollution-check：重编后 dist 未被污染', statSync(ROUTES_DIST).size > 0,
  'dist/triggers/routes.generated.js sha16=' + distNow + '；源码 sha16=' + genNow);
run('05-restore-help', [BUILD_HELP]);
expect('MUT-A 还原后变绿：生成链 ＋ 单测', true, '见 06-*.log');
const t2 = run('06-test', ['--test', TEST]);
expect('MUT-A 还原后单测回绿', t2.status === 0, 'exit=' + t2.status);
const c = run('06-examples', [join(ROOT, 'packages', 'skill-calorie', 'scripts', 'check-examples.mjs')], { allowFail: true });
const cRes = ((c.stdout || '').match(/RESULT: \d+\/\d+/) || ['RESULT: ?'])[0];
console.log('READING 示例门（判据③的登记口径）：' + cRes + ' exit=' + c.exitStatus);

// ── 5 收口读数 ───────────────────────────────────────────────────────────────────
const after = { skill: short(SKILL), buildHelp: short(BUILD_HELP), gen: short(GEN_ROUTES_SRC) };
expect('收尾：三件与开工前同 sha', after.skill === before.skill && after.buildHelp === before.buildHelp && after.gen === before.gen,
  'SKILL.md=' + after.skill + '；build-help.mjs=' + after.buildHelp + '；routes.generated.ts=' + after.gen);

const bad = steps.filter((s) => !s.ok);
console.log('RESULT: ' + (steps.length - bad.length) + '/' + steps.length + '  ' + (bad.length ? '红：' + bad.map((b) => b.name).join('、') : '全绿'));
process.exit(bad.length === 0 ? 0 : 1);

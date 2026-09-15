/** T554 · 「变异红／还原一致」自证（收进仓的 T351-v15 复核席变异件，按本票两处 S1 重排）。
 *
 * 每处变异都：改坏 → 重编 → **断言编译产物里出现了这次的印记** → 复跑契约门 → 期望的那几条变红 →
 * **逐文件**按字节还原（不用 git checkout）→ 重编 → 逐件 sha256 与变异前**全等** → 复跑 → 变回基线。
 *
 *   M1（改坏）周页签条 flex-wrap:nowrap → wrap               期望 C2.1／C2.5 变红（§1② 不许被改红）
 *   M2（改坏）日页签「只渲选中那一天」→ 全渲 7 天             期望 C1.2／C1.3 变红（§1① 不许被改红）
 *   M3（改坏）锁周参数格**摘掉坐标**（S1-② 复现）            期望 C3.4／X1 变红
 *   M4（改坏）锁周参数**改回纯文本**（S1-① 复现）             期望 C3.4／C3.5／X1 变红
 *   M5（改坏）锁周「加一次训练」**摘掉 disabled**（结构禁）    期望 C3.1 变红
 *
 * 用法（**整体必须在加锁包装器下**跑）：
 *   node tooling/run-locked.mjs --ticket 554 --run-id t554-mutation \
 *     -- node docs/skills/skill-calorie/t554-plan-editor-mutation.mjs --under-lock
 *
 * `tsc -b` 是全包一次编译：他席在途件随时可让整树临时变红，所以**不拿它的 exit 当判据**，
 * 拿「产物里有没有这次的印记」＋「还原后 dist 逐件 sha256 与基线全等」当判据。
 * 全程 try/finally：任何一步抛出都先把三个源文件按字节写回。
 */
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { copyFileSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(HERE, '..', '..', '..');
const OUT = join(ROOT, '.scratch/t554/mut');
const GATE = join(HERE, 't554-plan-editor-gate.mjs');
const CSS = resolve(ROOT, 'packages/skill-calorie/src/render/planEditorCss.ts');
const DOCS = resolve(ROOT, 'packages/skill-calorie/src/render/planEditorDocs.ts');
const RT = resolve(ROOT, 'packages/skill-calorie/src/render/planEditorRuntime.ts');
const SRC = [CSS, DOCS, RT];
const DIST = SRC.map((p) => resolve(ROOT, 'packages/skill-calorie/dist/render', p.split(/[\\/]/).pop().replace(/\.ts$/, '.js')));
const DIST_CSS = DIST[0], DIST_RT = DIST[2];
const TSC = resolve(ROOT, 'node_modules/typescript/bin/tsc');
const WRAP = resolve(ROOT, 'tooling/run-locked.mjs');
const INNER_LOCK = '.scratch/locks-t554-inner';   // 嵌套调用用隔离锁目录（免得等自己持有的主锁）
const sha = (p) => createHash('sha256').update(readFileSync(p)).digest('hex');
const say = (s) => process.stdout.write(s + '\n');

mkdirSync(join(OUT, 'backup'), { recursive: true });
mkdirSync(join(OUT, 'logs'), { recursive: true });
/* 加锁纪律自证：本套件必须**整体**在加锁包装器下跑（它持主锁，别席的编译排我后面）。
 * 套件内部的每一次编译／复跑再各走一次包装器（换隔离锁目录，免得等自己持有的主锁）。 */
if (!process.argv.includes('--under-lock')) {
  say('RED: 本套件必须在加锁包装器下运行：node tooling/run-locked.mjs --ticket 554 --run-id t554-mutation -- node docs/skills/skill-calorie/t554-plan-editor-mutation.mjs --under-lock');
  process.exit(2);
}
const backup = new Map(SRC.map((p) => [p, readFileSync(p)]));
const baseSrc = new Map(SRC.map((p) => [p, sha(p)]));
const baseDist = new Map(DIST.map((p) => [p, sha(p)]));
for (const [p, buf] of backup) copyFileSync(p, join(OUT, 'backup', p.split(/[\\/]/).pop() + '.bak'));

let innerSeq = 0;
say(`== 加锁自证：已在包装器下运行（外层持主锁）；内层编译／复跑各再走一次包装器，隔离锁目录 ${INNER_LOCK} ==`);
function runLocked(tag, args, extraEnv = {}) {
  innerSeq += 1;
  const runId = `t554-mut-${tag}-${innerSeq}`;
  const argv = [WRAP, '--ticket', '554', '--run-id', runId, '--lock-dir', INNER_LOCK, '--', ...args];
  try {
    return { code: 0, out: execFileSync(process.execPath, argv, { encoding: 'utf8', cwd: ROOT, env: { ...process.env, ...extraEnv }, maxBuffer: 32 * 1024 * 1024, stdio: ['ignore', 'pipe', 'pipe'] }) || '' };
  } catch (e) {
    return { code: (e && e.status) || 1, out: String((e && e.stdout) || '') + String((e && e.stderr) || '') };
  }
}
function build() {
  return runLocked('build', [process.execPath, TSC, '-b']);
}
function emitChecked(file, marker, tries = 4) {
  for (let i = 0; i < tries; i++) {
    if (readFileSync(file, 'utf8').includes(marker)) return true;
    build();
  }
  return readFileSync(file, 'utf8').includes(marker);
}
function restoreDist(tries = 6) {
  for (let i = 0; i < tries; i++) {
    build();
    if (DIST.every((p) => sha(p) === baseDist.get(p))) return true;
  }
  return DIST.every((p) => sha(p) === baseDist.get(p));
}
function runGate(outDir) {
  const r = runLocked('gate', [process.execPath, GATE, '--phase=gate'], { PE_OUT: outDir });
  const out = r.out;
  const st = {};
  for (const m of out.matchAll(/^\s*(PASS|RED)\s+(\S+)\s/gm)) st[m[2]] = m[1];
  return { st, res: (/RESULT: (\d+\/\d+)/.exec(out) || [])[1] || '?', out };
}
const statuses = (o, ids) => ids.map((i) => `${i}=${o.st[i]}`).join(' ');

const MUTS = [
  {
    id: 'M1', kind: 'break', label: '周页签条 flex-wrap:nowrap 改回 wrap', file: CSS,
    distFile: DIST_CSS, distMarker: '.pe-tabs{display:flex;flex-wrap:wrap;',
    from: '.pe-tabs{display:flex;flex-wrap:nowrap;', to: '.pe-tabs{display:flex;flex-wrap:wrap;',
    expectRed: ['C2.1', 'C2.5'],
  },
  {
    id: 'M2', kind: 'break', label: '日页签「只渲染选中的那一天」改回全渲 7 天', file: RT,
    distFile: DIST_RT, distMarker: 'dayHtml(0) + dayHtml(1)',
    from: "+ '<div class=\"pe-week\">' + dayHtml(daySel) + '</div>';",
    to: "+ '<div class=\"pe-week\">' + dayHtml(0) + dayHtml(1) + dayHtml(2) + dayHtml(3) + dayHtml(4) + dayHtml(5) + dayHtml(6) + '</div>';",
    expectRed: ['C1.2', 'C1.3'],
  },
  {
    id: 'M3', kind: 'break', label: 'S1-② 复现：锁周参数格摘掉 data-d/s/m 坐标', file: RT,
    distFile: DIST_RT, distMarker: "var at = lock() ? '' : ' data-d=\"",
    from: "    var at = ' data-d=\"' + d + '\" data-s=\"' + s + '\" data-m=\"' + m + '\"';",
    to: "    var at = lock() ? '' : ' data-d=\"' + d + '\" data-s=\"' + s + '\" data-m=\"' + m + '\"';",
    expectRed: ['C3.4', 'X1'],
  },
  {
    id: 'M4', kind: 'break', label: 'S1-① 复现：锁周参数改回纯文本（没有可填的格）', file: RT,
    distFile: DIST_RT, distMarker: "function plainOf(x){ return '<span class=\"pe-plain\">'",
    from: "    var del = lock() ? '<span class=\"pe-lockico\"",
    to: "    function plainOf(x){ return '<span class=\"pe-plain\">' + (x.kind === '有氧' ? x.minutes + ' 分钟' : x.sets + ' 组乘 ' + x.reps + ' 次') + '</span>'; }\n"
      + "    if (lock()) params = plainOf(mv);\n"
      + "    var del = lock() ? '<span class=\"pe-lockico\"",
    expectRed: ['C3.4', 'C3.5', 'X1'],
  },
  {
    id: 'M5', kind: 'break', label: 'S1-① 反侧：锁周「加一次训练」摘掉 disabled（结构禁复现）', file: RT,
    distFile: DIST_RT, distMarker: '(full || false ? \' disabled\'',
    from: "(full || lock() ? ' disabled' : '')", to: "(full || false ? ' disabled' : '')",
    expectRed: ['C3.1'],
  },
];

say('== 开工前门（不拿 tsc 的 exit 当判据，看的是我三件产物有没有漂移） ==');
const pre = build();
const preSame = DIST.every((p) => sha(p) === baseDist.get(p));
say(`PREFLIGHT: 编译 exit=${pre.code}；dist 三件与开工基线 ${preSame ? '全等' : '有漂移'}`
  + `；源码 sha256 ${SRC.map((p) => p.split(/[\\/]/).pop() + '=' + sha(p).slice(0, 12)).join(' ')}`);
if (!preSame) {
  say('RED: 开工前 dist 与我记录的基线不等——先查清谁在改 dist，本套件不继续（证据会不成立）。');
  process.exit(2);
}

say('== 基线（未变异） ==');
const b0 = runGate(join(OUT, 'logs', 'gate-base'));
say(`  契约门 ${b0.res}；${statuses(b0, ['C1.2', 'C1.3', 'C2.1', 'C2.5', 'C3.1', 'C3.4', 'C3.5', 'X1'])}`);
writeFileSync(join(OUT, 'logs', 'gate-base.txt'), b0.out, 'utf8');
if (b0.res !== '18/18') {
  say(`RED: 基线不是 18/18（=${b0.res}）——修没生效或树被别人带红，本套件的「期望红」判据会失真，停手。`);
  process.exit(2);
}

let allOk = true;
for (const m of MUTS) {
  let emitted = false;
  try {
    const jobs = [{ from: m.from, to: m.to }].concat(m.also || []);
    let next = readFileSync(m.file, 'utf8');
    for (const j of jobs) {
      const n = next.split(j.from).length - 1;
      if (n !== 1) throw new Error(`${m.id}: 变异锚点在 ${m.file} 命中 ${n} 次（应为 1）`);
      next = next.replace(j.from, j.to);
    }
    writeFileSync(m.file, next, 'utf8');
    writeFileSync(join(OUT, 'logs', `mut-${m.id}-src.diff.txt`), jobs.map((j) => `- ${j.from}\n+ ${j.to}\n`).join('\n'), 'utf8');
    emitted = emitChecked(m.distFile, m.distMarker);
    const r = emitted ? runGate(join(OUT, 'logs', `gate-${m.id}`)) : { st: {}, res: '未编出' };
    writeFileSync(join(OUT, 'logs', `gate-${m.id}.txt`), r.out || '', 'utf8');
    if (!emitted) {
      allOk = false;
      say(`\n== ${m.id} 变异 ==\nRED: ${m.id} 变异未能进入编译产物（他席在途件把整树带红？）⇒ 本处证据不成立`);
    } else if (m.expectRed) {
      const wrong = m.expectRed.filter((id) => r.st[id] !== 'RED');
      allOk = allOk && wrong.length === 0;
      say(`\n== ${m.id} 变异（改坏）==`);
      say(`RED: ${m.id} 变异=${m.file.split(/[\\/]/).pop()} 「${m.label}」 产物印记=${m.distMarker} 期望红=[${m.expectRed}] ${statuses(r, m.expectRed)} 契约门 ${r.res} ⇒ ${wrong.length === 0 ? 'OK' : '不符（' + wrong.join('、') + ' 没红）'}`);
    } else {
      const wrong = m.expectGreen.filter((id) => r.st[id] !== 'PASS');
      allOk = allOk && wrong.length === 0;
      say(`\n== ${m.id} 反证（临时修复方向）==`);
      say(`GREEN: ${m.id} 变异=${m.file.split(/[\\/]/).pop()} 「${m.label}」 产物印记=${m.distMarker} 期望转绿=[${m.expectGreen}] ${statuses(r, m.expectGreen)} 契约门 ${r.res} ⇒ ${wrong.length === 0 ? 'OK' : '不符（' + wrong.join('、') + ' 没转绿）'}`);
    }
  } finally {
    for (const [p, buf] of backup) writeFileSync(p, buf);   // 逐文件按字节还原
  }
  const distBack = restoreDist();
  const srcSame = SRC.filter((p) => sha(p) === baseSrc.get(p)).length;
  const distSame = DIST.filter((p) => sha(p) === baseDist.get(p)).length;
  const r2 = runGate(join(OUT, 'logs', `gate-${m.id}-restored`));
  writeFileSync(join(OUT, 'logs', `gate-${m.id}-restored.txt`), r2.out, 'utf8');
  const drift = Object.keys(b0.st).filter((id) => b0.st[id] !== r2.st[id]);
  const ok = emitted && distBack && srcSame === SRC.length && distSame === DIST.length && drift.length === 0 && r2.res === b0.res;
  allOk = allOk && ok;
  say(`RESTORE: ${ok ? 'IDENTICAL' : 'DRIFT'} ${m.id} 逐件 sha256 一致：源码 ${srcSame}/${SRC.length}、编译产物 ${distSame}/${DIST.length}`
    + `；复跑契约门 ${r2.res}（基线 ${b0.res}）读数漂移=${drift.length ? drift.join('、') : '无'}`
    + `；源码 ${SRC.map((p) => p.split(/[\\/]/).pop() + '=' + sha(p).slice(0, 12)).join(' ')}`);
}
say(`\nMUTATION-SUMMARY: ${allOk ? 'OK' : 'FAIL'}（五处改坏各自必红；五处还原后逐件 sha256 与基线全等）`);
process.exit(allOk ? 0 : 1);

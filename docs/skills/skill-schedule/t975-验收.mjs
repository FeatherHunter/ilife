#!/usr/bin/env node
/** #975 · 作息 HELP 验收墙（一条命令跑完票面那三条机器判据）。
 *
 * 判据（票面原文 → 本脚本的读数）：
 *  ① 「HELP 缺省落为文件可打开＋回执绝对路径」→ 跑真出口 `dist/cli/cmd_read.js schedule.help.lookup`
 *     （隔离家目录），从回执里取 `delivery.path`，断言文件在盘、非空、是 HTML 文档；
 *  ② 「双视口截图无横滚」→ 复用 `packages/skill-calorie/scripts/measure-responsive.mjs`
 *     （headless Chrome ＋ CDP `Emulation.setDeviceMetricsOverride`，390／768／1440 三档逐档读
 *     `documentElement.scrollWidth − innerWidth`，归零才 PASS）；
 *  ③ 「带字段卡 input 数＝字段数」→ 那是运行时段的事实，判据落在
 *     `test/help-file-202.test.mjs` 的「带字段卡」用例里（DOM 桩逐卡开弹层数 `[data-p]`），本脚本不重算。
 *  另外顺手出两张截图（桌面 1440／手机 390）供人采样门肉眼复核。
 *
 * 用法（仓根；先 `node node_modules/typescript/bin/tsc -b packages/skill-schedule`）：
 *   node docs/skills/skill-schedule/t975-验收.mjs [--out .scratch/five-help/schedule]
 *
 * 退出码：0＝三条判据全过；1＝任一红（逐条打印红在哪）；2＝环境缺件（Chrome 起不来／产物没编译）。
 */
import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';

const REPO = process.cwd();
const argOf = (name, dflt) => {
  const i = process.argv.indexOf(name);
  return i >= 0 && process.argv[i + 1] ? process.argv[i + 1] : dflt;
};
const OUT = resolve(argOf('--out', join(REPO, '.scratch', 'five-help', 'schedule')));
const BIN = join(REPO, 'packages', 'skill-schedule', 'dist', 'cli', 'cmd_read.js');
const MEASURE = join(REPO, 'packages', 'skill-calorie', 'scripts', 'measure-responsive.mjs');
const CHROME_CANDIDATES = [
  process.env.DSH_BROWSER,
  'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
  'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
].filter(Boolean);

const reds = [];
const lines = [];
const say = (s) => { lines.push(s); console.log(s); };

if (!existsSync(BIN)) {
  console.error('环境缺件：没编译（缺 ' + BIN + '）。先跑 node node_modules/typescript/bin/tsc -b packages/skill-schedule');
  process.exit(2);
}
if (!existsSync(MEASURE)) {
  console.error('环境缺件：缺度量工具 ' + MEASURE);
  process.exit(2);
}
const chrome = CHROME_CANDIDATES.find((p) => existsSync(p));
if (!chrome) {
  console.error('环境缺件：找不到 headless Chrome／Edge（可用 DSH_BROWSER=<路径> 指定）');
  process.exit(2);
}

mkdirSync(OUT, { recursive: true });

/* ── ① 真出口落盘：隔离家目录，跑缺省 HELP 交付，取回执里的绝对路径 ── */
const home = mkdtempSync(join(tmpdir(), 't975-home-'));
let htmlPath = '';
let ran021 = false;
try {
  const r = spawnSync(process.execPath, [BIN, 'schedule.help.lookup'], {
    encoding: 'utf8',
    maxBuffer: 64 * 1024 * 1024,
    env: {
      ...process.env,
      USERPROFILE: home,
      HOME: home,
      HOMEDRIVE: home.slice(0, 2),
      HOMEPATH: home.slice(2),
    },
  });
  if (r.status !== 0) {
    reds.push('真出口非 0 退出：' + String(r.status) + ' stderr=' + String(r.stderr).slice(0, 400));
  } else {
    let env;
    try {
      env = JSON.parse(r.stdout);
    } catch {
      reds.push('真出口 stdout 不是 JSON：' + String(r.stdout).slice(0, 200));
    }
    if (env) {
      htmlPath = env?.delivery?.path || env?.env?.delivery?.path || '';
      if (!htmlPath) reds.push('回执里没有 delivery.path（绝对路径）：' + JSON.stringify(env).slice(0, 300));
    }
  }
  if (htmlPath) {
    if (!existsSync(htmlPath)) {
      reds.push('回执给的路径不在盘上：' + htmlPath);
    } else {
      const size = statSync(htmlPath).size;
      const head = readFileSync(htmlPath, 'utf8').slice(0, 200);
      if (size <= 0) reds.push('HELP 文件是空的：' + htmlPath);
      if (!/^<!DOCTYPE html>/i.test(head.replace(/^\uFEFF/, ''))) reds.push('HELP 文件不像 HTML 文档（首段）：' + head.slice(0, 60));
      say('① 落盘：' + htmlPath + '（' + size + ' 字节，可打开＝HTML 文档头在场）');
      /* 产物留一份到证据目录：截图与后续探针都要一个稳定路径（隔离家目录跑完就删）。 */
      const kept = join(OUT, '作息管家_HELP.html');
      writeFileSync(kept, readFileSync(htmlPath));
      say('① 留档：' + kept + '（' + statSync(kept).size + ' 字节）');
      htmlPath = kept;
    }
  }
} catch (e) {
  reds.push('① 段抛错：' + String(e && e.message ? e.message : e));
}
/* 隔离家目录要留到 ②③ 量完再删——HELP 产物就落在它下面（早删＝后面两条判据被静默跳过）。 */

/* ── ② 三档视口无横滚（真浏览器读 scrollWidth − innerWidth） ── */
if (htmlPath && existsSync(htmlPath)) {
  ran021 = true;
  const json = join(OUT, 'overflow.json');
  const r = spawnSync(process.execPath, [MEASURE, htmlPath, '--widths', '390,768,1440', '--json', json, '--label', 'schedule-help-975'], {
    encoding: 'utf8',
    maxBuffer: 64 * 1024 * 1024,
    env: { ...process.env, DSH_BROWSER: chrome },
  });
  const tail = String(r.stdout || '').trim().split('\n').slice(-6).join(' | ');
  say('② 溢出度量：exit=' + r.status + ' 尾读：' + tail);
  if (r.status !== 0) reds.push('三档视口有横向溢出（度量工具 exit ' + r.status + '）');
  if (!existsSync(json)) reds.push('度量工具没写 JSON 读数：' + json);

  /* ── ③ 双视口截图（人采样门肉眼复核用；机器判据是上面那条） ── */
  const shots = [
    ['desktop-1440.png', '1440,1200'],
    ['mobile-390.png', '390,1400'],
  ];
  for (const [name, size] of shots) {
    const out = join(OUT, name);
    const profile = mkdtempSync(join(tmpdir(), 't975-chrome-'));
    const r2 = spawnSync(chrome, [
      '--headless=new', '--disable-gpu', '--hide-scrollbars', '--no-first-run', '--no-default-browser-check',
      '--user-data-dir=' + profile,
      '--window-size=' + size,
      '--screenshot=' + out,
      'file:///' + htmlPath.replace(/\\/g, '/'),
    ], { encoding: 'utf8', maxBuffer: 32 * 1024 * 1024 });
    rmSync(profile, { recursive: true, force: true });
    if (!existsSync(out) || statSync(out).size <= 0) {
      reds.push('截图没出来：' + name + '（chrome exit ' + r2.status + '）' + String(r2.stderr || '').slice(0, 200));
    } else {
      say('③ 截图：' + out + '（' + statSync(out).size + ' 字节，视口 ' + size + '）');
    }
  }
}

say('RESULT: ' + (reds.length === 0 ? 'PASS 3/3' : 'FAIL ' + reds.length + ' 条红'));
for (const red of reds) say('  ✗ ' + red);
/* 兜底：②③ 没真跑过（例如 ① 没拿到路径）就不许报绿——「跳过」与「通过」在机器读数上必须分得开。 */
if (!ran021 && reds.length === 0) {
  say('  ✗ ②③ 根本没跑（① 没拿到可用的 HELP 路径）——跳过不算通过');
  say('RESULT: FAIL 1 条红（跳过被当成绿）');
  process.exit(1);
}
rmSync(home, { recursive: true, force: true });
process.exit(reds.length === 0 ? 0 : 1);

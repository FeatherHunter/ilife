/** T2-②b #133 · HELP 落盘端到端（接线层 `src/render/helpFile.ts`）。
 *
 * 断言链（HELP key → 资产 5 键 JSON → helpPaths 命名 → wx 独占 → envelope 回执）：
 *  ① 文件存在＋JSON 可 parse＋5 键集逐字＋groups=10／subgroups=54／scenes=436；
 *  ② 头面逐字：skill_name=卡路里／title=唤醒词速查台／subtitle 实物格式／contact 实物 2 项逐字；
 *  ③ 回执绝对路径：`data.output === delivery.path`＋绝对路径＋落点文件即本次产物；
 *  ④ 二次同秒产 `_2`（wx 独占递增）；
 *  ⑤ 缺 dbDir 目录自动建出（exit 0）；空 dbDir／非 HELP key 即 bad-input（exit 2 口径）；
 *  ⑥ 只读类走内联回退（EACCES；平台忽略权限位时探测后跳过）；结构错 ENOTDIR 原样抛（exit 5 口径）；
 *  ⑦ mirror 默认关闭；显式开即落 `<dbDir>/卡路里.html` 且逐字节一致。
 * 运行：先 `npx tsc -b packages/skill-calorie`，
 * 再 `node --test packages/skill-calorie/test/help-file-133.test.mjs`
 */
import { strict as assert } from 'node:assert';
import { chmodSync, existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { isAbsolute, join } from 'node:path';
import { test } from 'node:test';
import {
  HELP_FILE_KEY,
  HELP_FILE_MIRROR_NAME,
  HELP_FILE_STEM,
  HELP_WAKE_WORDS,
  buildHelpFileData,
  renderHelpFileHtml,
  runHelpFile,
} from '../dist/render/helpFile.js';
import { CalorieRenderError } from '../dist/render/errors.js';

/** 本地 2026-07-26 12:30:00（命名秒＋subtitle 分钟同源；构造与格式化同为本地时区）。 */
const D0 = new Date(2026, 6, 26, 12, 30, 0);
const STAMP = '20260726_123000';
const MINUTE = '2026-07-26 12:30';

function tmpDb(tag) {
  return mkdtempSync(join(tmpdir(), 't133-help-' + tag + '-'));
}

/** 落盘 HTML 内 `help-data` JSON 提取（与接线 `HELP_FILE_DATA_ID` 同容器口径）。 */
function parseHelpData(html) {
  const m = html.match(/<script id="help-data" type="application\/json">([\s\S]*?)<\/script>/);
  assert.ok(m, '产物缺 help-data 容器');
  return JSON.parse(m[1]);
}

function sceneCount(groups) {
  return groups.reduce((n, g) => n + g.subgroups.reduce((a, s) => a + s.scenes.length, 0), 0);
}

test('#133 ②b-① HELP key 双写：文件存在＋JSON 可 parse＋10组/54子组/436场景', () => {
  const dbDir = tmpDb('e2e');
  for (const w of HELP_WAKE_WORDS) {
    const r = runHelpFile({ dbDir, wakeWord: w, now: new Date(2026, 6, 26, 12, 30, 59) });
    assert.equal(r.mode, 'file');
    rmSync(r.path);
  }
  const r = runHelpFile({ dbDir, wakeWord: '卡路里HELP', now: D0 });
  assert.equal(r.mode, 'file');
  assert.ok(existsSync(r.path), '落盘文件须存在：' + r.path);
  const data = parseHelpData(readFileSync(r.path, 'utf8'));
  assert.equal(data.groups.length, 10);
  assert.equal(data.groups.reduce((n, g) => n + g.subgroups.length, 0), 54);
  assert.equal(sceneCount(data.groups), 436);
});

test('#133 ②b-② 5键集逐字＋头面逐字（subtitle实物格式／contact实物2项）', () => {
  const data = buildHelpFileData(D0);
  assert.deepEqual(Object.keys(data).sort(), ['contact', 'groups', 'skill_name', 'subtitle', 'title']);
  assert.equal(data.skill_name, '卡路里');
  assert.equal(data.title, '唤醒词速查台');
  assert.equal(data.subtitle, '10 分类 · 436 场景 · 更新于 ' + MINUTE);
  assert.deepEqual(data.contact, {
    items: [
      { label: 'GitHub', value: 'https://github.com/FeatherHunter/SKILLS' },
      { label: 'Issues', value: 'https://github.com/FeatherHunter/SKILLS/issues' },
    ],
  });
  assert.ok(!('init_banner' in data) && !('version' in data) && !('recommendations' in data), '三可选键不传');
  const html = renderHelpFileHtml(data);
  assert.deepEqual(Object.keys(parseHelpData(html)).sort(), ['contact', 'groups', 'skill_name', 'subtitle', 'title']);
});

test('#133 ②b-③ 回执绝对路径（data.output===delivery.path＋文件即本次产物）', () => {
  const dbDir = tmpDb('receipt');
  const r = runHelpFile({ dbDir, wakeWord: '卡路里 help', now: D0 });
  assert.equal(r.mode, 'file');
  assert.ok(isAbsolute(r.path), '须为绝对路径：' + r.path);
  const env = r.envelope;
  assert.equal(env.key, HELP_FILE_KEY);
  assert.equal(env.data.output, r.path);
  assert.equal(env.delivery.path, r.path);
  assert.ok(isAbsolute(env.delivery.path), 'delivery.path 绝对路径不变式');
  assert.equal(env.delivery.mode, 'file');
  assert.equal(env.data.total, 10);
  assert.equal(env.data.sceneTotal, 436);
  assert.equal(env.data.subgroupTotal, 54);
  assert.equal(readFileSync(r.path, 'utf8'), readFileSync(env.delivery.path, 'utf8'));
  assert.ok(readFileSync(r.path, 'utf8').includes('唤醒词速查台'), '落点内容即本次产物');
});

test('#133 ②b-④ 二次同秒产_2（wx独占递增_N）', () => {
  const dbDir = tmpDb('dup');
  const a = runHelpFile({ dbDir, wakeWord: '卡路里HELP', now: D0 });
  const b = runHelpFile({ dbDir, wakeWord: '卡路里HELP', now: D0 });
  assert.equal(a.mode, 'file');
  assert.equal(b.mode, 'file');
  assert.equal(a.path, join(dbDir, 'calorie_html', HELP_FILE_STEM + '_' + STAMP + '.html'));
  assert.equal(b.path, join(dbDir, 'calorie_html', HELP_FILE_STEM + '_' + STAMP + '_2.html'));
  assert.ok(existsSync(a.path) && existsSync(b.path), '两份产物并存零覆盖');
});

test('#133 ②b-⑤ 缺dbDir目录自动建出；空dbDir／非HELP key即bad-input（exit 2口径）', () => {
  const dbDir = join(tmpDb('mkdir'), 'not-exist-db');
  assert.ok(!existsSync(dbDir), '前置：dbDir 不存在');
  const r = runHelpFile({ dbDir, wakeWord: '卡路里HELP', now: D0 });
  assert.equal(r.mode, 'file');
  assert.ok(existsSync(join(dbDir, 'calorie_html')), 'calorie_html 须被建出');
  assert.throws(() => runHelpFile({ dbDir: '', wakeWord: '卡路里HELP', now: D0 }),
    (e) => e instanceof CalorieRenderError && e.code === 'bad-input');
  assert.throws(() => runHelpFile({ dbDir: tmpDb('y'), wakeWord: '看今日主页', now: D0 }),
    (e) => e instanceof CalorieRenderError && e.code === 'bad-input');
});

test('#133 ②b-⑥ 只读类走内联回退；结构错原样抛（exit 5口径）', () => {
  const roDir = join(tmpDb('ro'), 'db');
  mkdirSync(roDir, { recursive: true });
  let probeDenied = false;
  try {
    chmodSync(roDir, 0o555);
    try {
      writeFileSync(join(roDir, '.wprobe'), 'x', { flag: 'wx' });
      rmSync(join(roDir, '.wprobe'), { force: true });
    } catch {
      probeDenied = true;
    }
    if (!probeDenied) return;
    const r = runHelpFile({ dbDir: roDir, wakeWord: '卡路里HELP', now: D0 });
    assert.equal(r.mode, 'inline');
    assert.ok(typeof r.reason === 'string' && r.reason.length > 0, '内联须带原因');
    assert.equal(r.envelope.delivery.mode, 'inline');
    assert.equal(r.envelope.delivery.path, undefined);
    assert.equal(typeof r.envelope.data.html, 'string');
  } finally {
    try { chmodSync(roDir, 0o755); } catch { /* 清理尽力 */ }
  }
  const fileAsDir = join(tmpDb('notdir'), 'f');
  writeFileSync(fileAsDir, 'x');
  assert.throws(() => runHelpFile({ dbDir: fileAsDir, wakeWord: '卡路里HELP', now: D0 }),
    (e) => e instanceof Error && !(e instanceof CalorieRenderError && e.code === 'bad-input'));
});

test('#133 ②b-⑦ mirror默认关闭；显式开即落根卡路里.html且逐字节一致', () => {
  const dbDir = tmpDb('mirror');
  const off = runHelpFile({ dbDir, wakeWord: '卡路里HELP', now: D0 });
  assert.equal(off.mode, 'file');
  assert.equal(off.mirrorPath, undefined);
  assert.ok(!existsSync(join(dbDir, HELP_FILE_MIRROR_NAME)), '默认不写根镜像');
  assert.equal(off.envelope.data.mirror, undefined);
  const on2 = runHelpFile({ dbDir, wakeWord: '卡路里HELP', now: D0, mirrorRoot: true });
  assert.equal(on2.mode, 'file');
  assert.ok(isAbsolute(on2.mirrorPath), '镜像路径须绝对');
  assert.equal(on2.mirrorPath, join(dbDir, HELP_FILE_MIRROR_NAME));
  assert.equal(readFileSync(on2.mirrorPath, 'utf8'), readFileSync(on2.path, 'utf8'), '镜像与主产物逐字节一致');
  assert.equal(on2.envelope.data.mirror, on2.mirrorPath);
  assert.equal(statSync(on2.mirrorPath).size, on2.bytes);
});

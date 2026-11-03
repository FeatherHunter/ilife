/**
 * #915 第二步 · 记账技能侧行告警（`bill.config.read` 的 `alerts`）。
 *
 * 三条断言（缺一不可）：
 *   ① 存在且在用的自定义目录 ⇒ 回执里没有 `db.dir` 这一格（`alerts` 缺席或空）；
 *   ② 真用不了的值（不存在的目录／同名文件占位置）⇒ 有这一格，且 `message` 说那件故障本身；
 *   ③ 回执 JSON 里不出现「现在生效的是」（#915 修掉的假警报，复活它等于白干）。
 *
 * 判定复用体检 `db.dir` 项（`src/health.ts` 的 `dirVerdict`：不在／在但写不进去／在且能写），
 * `message` 原样取体检那句，不新编口径。只给可改目录行 `db.dir`。
 *
 * 隔离：每个用例一个临时家目录（`USERPROFILE`／`HOME`，见 `test/helpers/home-test-base.mjs`），
 * 真实 `~/.ilife` 一行都不碰。经真 CLI 跑（需先编 `skill-bill`）。
 *
 * 运行：`node --test packages/skill-bill/test/t915-bill-alerts.test.mjs`
 */
import { describe, it, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync, spawnSync } from 'node:child_process';
import { chmodSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { configDirOf, homeEnvOf, requireIsolatedHome, useHome } from '../../../test/helpers/home-test-base.mjs';
import { dirFaultCodeOf } from '../dist/health.js';

const HERE = dirname(fileURLToPath(import.meta.url));
const CLI = join(HERE, '..', 'dist', 'cli', 'cmd_read.js');

/** 当刻用例的临时家目录（`beforeEach` 现开、`afterEach` 现删）。 */
let home = null;

/** 跑一条记账命令：回 `{ code, stdout, stderr }`（非 0 不抛，交给断言判）。 */
function runBill(key, params, lang) {
  const args = [CLI, key];
  if (lang !== undefined) args.push('--language', lang);
  if (params !== undefined) args.push('--params', JSON.stringify(params));
  try {
    const stdout = execFileSync(process.execPath, args, { encoding: 'utf8', env: homeEnvOf(home) });
    return { code: 0, stdout, stderr: '' };
  } catch (err) {
    return { code: err.status ?? -1, stdout: String(err.stdout ?? ''), stderr: String(err.stderr ?? '') };
  }
}

/** 跑一条命令并拆出信封 `data`（非 0 即当场失败，报文带 stderr）。 */
function dataOf(key, params, lang) {
  const r = runBill(key, params, lang);
  assert.equal(r.code, 0, key + ' 应 exit 0，stderr=' + r.stderr);
  const envelope = JSON.parse(r.stdout);
  assert.equal(envelope.key, key);
  return envelope.data;
}

const yamlFile = () => join(configDirOf(home), 'bill.yaml');

/** 直接把一份配置写到沙盒里（不经命令），`db.dir` 取入参，其余取默认值。 */
function writeConfigWithDbDir(dirValue) {
  const text = [
    'db:',
    '  dir: ' + JSON.stringify(dirValue),
    '  name: biscuit_accountant.db',
    '  goals: goals.json',
    'backup:',
    '  dir: ""',
    '  stem: biscuit_',
    'html:',
    '  dir: biscuit_accountant_html',
    '',
  ].join('\n');
  writeFileSync(yamlFile(), text, 'utf8');
}

/** 只读目录模拟（跨平台）：win32 用 icacls 拒绝写；POSIX 用 chmod 555。
 *  返回还原函数；无法模拟（如 root／无 icacls）返回 null，调用方 `t.skip`。 */
function makeDirReadOnly(dir) {
  if (process.platform === 'win32') {
    const r = spawnSync('icacls', [dir, '/deny', '*S-1-1-0:(W,AD,WD)'], { encoding: 'utf8' });
    if (r.status !== 0) return null;
    return () => spawnSync('icacls', [dir, '/remove:d', '*S-1-1-0'], { encoding: 'utf8' });
  }
  try { chmodSync(dir, 0o555); } catch { return null; }
  return () => { try { chmodSync(dir, 0o755); } catch { /* 还原尽力而为 */ } };
}

/** 还原之后确认目录真的还能写（否则「已还原」是假的）。 */
function canWrite(dir) {
  const probe = join(dir, '.t1327-probe');
  try { writeFileSync(probe, 'x'); rmSync(probe); return true; } catch { return false; }
}

/** 回执里 `db.dir` 那一格（缺席即 undefined）。 */
function alertOf(data) {
  const alerts = data.alerts;
  if (alerts === undefined || alerts === null) return undefined;
  return alerts['db.dir'];
}

beforeEach(() => {
  home = mkdtempSync(join(tmpdir(), 'bill-915-'));
  mkdirSync(configDirOf(home), { recursive: true });
  useHome(home);
  requireIsolatedHome(home); // 基座自证：当刻家目录必须是临时那一份
});

afterEach(() => {
  if (home !== null) rmSync(home, { recursive: true, force: true });
  home = null;
});

describe('#915 第二步 · 记账行告警只报真用不了', () => {
  it('① 负例：存在且在用的自定义目录 ⇒ 没有 `db.dir` 这一格', () => {
    const live = join(home, 'live-data');
    mkdirSync(live, { recursive: true });
    writeConfigWithDbDir(live);
    const data = dataOf('bill.config.read', {});
    assert.equal(data.resolved.dbDir, live, '生效落点应是用户配的那个目录');
    assert.equal(alertOf(data), undefined, '在且能写 ⇒ 不该有这一格，实为 ' + JSON.stringify(data.alerts ?? null));
    assert.equal(JSON.stringify(data).includes('现在生效的是'), false, '回执里不许出现合成句');
  });

  it('② 正例：不存在的目录 ⇒ 有这一格，且 message 说那件故障本身', () => {
    const missing = join(home, 'missing-915');
    writeConfigWithDbDir(missing);
    const data = dataOf('bill.config.read', {});
    const alert = alertOf(data);
    assert.notEqual(alert, undefined, '不在 ⇒ 必须有这一格');
    assert.equal(alert.code, 'DIR_MISSING');
    assert.match(String(alert.message), /不在/, 'message 应说那件故障本身，实为 ' + String(alert.message));
    assert.equal(String(alert.message).includes('现在生效的是'), false, 'message 里不许出现合成句');
    assert.equal(JSON.stringify(data).includes('现在生效的是'), false, '回执里不许出现合成句');
  });

  it('② 正例：同名文件占了目录的位置 ⇒ 有这一格，且 message 点名这件形状故障', () => {
    const blocked = join(home, 'file-block-915');
    writeFileSync(blocked, 'i am a file, not a dir', 'utf8');
    writeConfigWithDbDir(blocked);
    const data = dataOf('bill.config.read', {});
    const alert = alertOf(data);
    assert.notEqual(alert, undefined, '形状不对 ⇒ 必须有这一格');
    assert.equal(alert.code, 'DIR_MISSING', '同名的结构化读数＝目录不在（不按 message 首字分类）');
    assert.match(String(alert.message), /不在|同名文件/, 'message 应说那件故障本身，实为 ' + String(alert.message));
    assert.equal(String(alert.message).includes('现在生效的是'), false, 'message 里不许出现合成句');
    assert.equal(JSON.stringify(data).includes('现在生效的是'), false, '回执里不许出现合成句');
  });

  it('③ 回执全文无合成句（读数本身即判据）', () => {
    const live = join(home, 'live-data-2');
    mkdirSync(live, { recursive: true });
    writeConfigWithDbDir(live);
    const clean = JSON.stringify(dataOf('bill.config.read', {}));
    assert.equal(clean.includes('现在生效的是'), false, '干净回执不许出现合成句');
    const missing = join(home, 'missing-915-2');
    writeConfigWithDbDir(missing);
    const broken = JSON.stringify(dataOf('bill.config.read', {}));
    assert.equal(broken.includes('现在生效的是'), false, '故障回执也不许出现合成句');
    assert.match(readFileSync(join(HERE, '..', 'src', 'cli', 'config.ts'), 'utf8'), /billAlerts/);
    assert.equal(readFileSync(join(HERE, '..', 'src', 'cli', 'config.ts'), 'utf8').includes('现在生效的是'), false, '组装处源码不许写合成句');
  });
});

/* ── #1327：分类判据不依赖本地化报文 ─────────────────────────────── */
describe('#1327 · 英文下错误分类不失效（结构化判据）', () => {
  it('英文：不存在的目录仍判 DIR_MISSING，message 是英文那句', () => {
    writeConfigWithDbDir(join(home, 'missing-1327'));
    const data = dataOf('bill.config.read', {}, 'en');
    const alert = alertOf(data);
    assert.notEqual(alert, undefined, '不在 ⇒ 必须有这一格');
    assert.equal(alert.code, 'DIR_MISSING', '英文下分类必须仍为 DIR_MISSING');
    assert.equal(typeof alert.message, 'string', 'message 仍原样取自体检结论');
  });

  it('英文：同名文件占位仍判 DIR_MISSING', () => {
    const blocked = join(home, 'file-block-1327');
    writeFileSync(blocked, 'i am a file, not a dir', 'utf8');
    writeConfigWithDbDir(blocked);
    const alert = alertOf(dataOf('bill.config.read', {}, 'en'));
    assert.equal(alert?.code, 'DIR_MISSING', '同名的结构化读数＝目录不在，英文下不打折');
  });

  it('分类器只看结构：不在→MISSING，在但不可写→UNWRITABLE，在且可写→缺席', () => {
    assert.equal(dirFaultCodeOf({ exists: false, writable: false }), 'DIR_MISSING');
    assert.equal(dirFaultCodeOf({ exists: true, writable: false }), 'DIR_UNWRITABLE');
    assert.equal(dirFaultCodeOf({ exists: true, writable: true }), undefined);
  });

  it('旧判据已消失：源码不再按本地化报文首字分类', () => {
    for (const rel of ['src/cli/config.ts', 'src/health.ts']) {
      const src = readFileSync(join(HERE, '..', rel), 'utf8');
      assert.equal(src.includes("startsWith('不在')"), false, rel + ' 仍在按「不在」首字分类');
      assert.equal(src.includes('startsWith("不在")'), false, rel + ' 仍在按「不在」首字分类');
    }
  });
});

/* ── #1327 验收：目录不存在／不可写／同名三形态在 zh 与 en 下分类一致 ───────── */
const LANGS = ['zh', 'en'];

/** 跑同一形态在两种语言下的告警码，断言语言不影响分类。 */
function codesOfScenario(buildScenario) {
  const out = {};
  for (const lang of LANGS) {
    buildScenario();
    const alert = alertOf(dataOf('bill.config.read', {}, lang));
    out[lang] = alert?.code;
  }
  return out;
}

describe('#1327 · 三形态 × 两语言分类一致', () => {
  it('目录不存在：zh 与 en 都判 DIR_MISSING', () => {
    const missing = join(home, 'missing-1327-parity');
    const build = () => writeConfigWithDbDir(missing);
    assert.deepEqual(codesOfScenario(build), { zh: 'DIR_MISSING', en: 'DIR_MISSING' });
  });

  it('同名文件占位：zh 与 en 都判 DIR_MISSING', () => {
    const blocked = join(home, 'file-block-1327-parity');
    const build = () => {
      rmSync(blocked, { force: true });
      writeFileSync(blocked, 'i am a file, not a dir', 'utf8');
      writeConfigWithDbDir(blocked);
    };
    assert.deepEqual(codesOfScenario(build), { zh: 'DIR_MISSING', en: 'DIR_MISSING' });
  });

  it('目录在但不可写：zh 与 en 都判 DIR_UNWRITABLE', (t) => {
    const ro = join(home, 'readonly-1327');
    mkdirSync(ro, { recursive: true });
    const restore = makeDirReadOnly(ro);
    if (restore === null) { t.skip('当前环境无法模拟只读目录（root／无 icacls）'); return; }
    if (canWrite(ro)) { restore(); t.skip('拒绝写未生效（ACL 被继承绕过）'); return; }
    try {
      writeConfigWithDbDir(ro);
      const zh = alertOf(dataOf('bill.config.read', {}, 'zh'));
      const en = alertOf(dataOf('bill.config.read', {}, 'en'));
      assert.equal(zh?.code, 'DIR_UNWRITABLE', '中文下在但不可写 ⇒ DIR_UNWRITABLE');
      assert.equal(en?.code, 'DIR_UNWRITABLE', '英文下在但不可写 ⇒ DIR_UNWRITABLE');
    } finally {
      restore();
      assert.equal(canWrite(ro), true, '还原后目录应恢复可写');
    }
  });
});


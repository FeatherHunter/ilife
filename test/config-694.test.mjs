/**
 * #694 公共层配置件（`packages/base-link-core/src/config/`）验收。
 *
 * 覆盖：① 定位（家目录决定落点 `<家>/.ilife/`、`os.homedir()` 派生、不认 `$DSH_HOME`）；
 * ② 读写与默认值（不存在即落一份／改了就下次读得到／删了回默认／半份回落默认）；
 * ③ 解析（受限子集支持面与拒绝面，失败带行号）；
 * ④ 重置为默认（先备份 `.bak`）；⑤ 测试隔离门；⑥ 零新增外部依赖。
 *
 * 隔离口径（#763 起的家目录通道）：每个用例都经 `test/helpers/config-test-base.mjs` 把**家目录**
 * （Windows `USERPROFILE`／POSIX `HOME`）指到独占临时目录，配置因此落在 `<临时家目录>/.ilife/`
 * ——不存在任何一条会碰到真实 `~/.ilife/` 的路径。
 *
 * 运行：`node --test test/config-694.test.mjs`（需先 `tsc -b packages/base-link-core`）。
 */
import { describe, it, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync, spawnSync } from 'node:child_process';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import * as CORE_API from '../packages/base-link-core/dist/index.js';
import { ConfigError, configPaths, loadConfig, resetConfig, saveConfig } from '../packages/base-link-core/dist/index.js';
import { formatConfigYaml, parseConfigYaml } from '../packages/base-link-core/dist/config/yaml.js';
import { requireConfigTestBase, setupConfigTestBase } from './helpers/config-test-base.mjs';
import { configDirOf } from './helpers/home-test-base.mjs';
import { realHomeDir } from './helpers/real-home-snapshot.mjs';

const ROOT = fileURLToPath(new URL('..', import.meta.url));
const CORE = join(ROOT, 'packages', 'base-link-core');
const DIST_INDEX = pathToFileURL(join(CORE, 'dist', 'index.js')).href;
const DIST_DIRS = pathToFileURL(join(CORE, 'dist', 'config', 'dirs.js')).href;

/** 一份「卡路里式」默认值：项名与取值形状照现有代码常量（库名／产物目录名／子目录／数字／布尔／空串）。 */
const DEFAULTS = {
  db: { dir: 'C:/ilife/data', name: 'calorie_data.db' },
  html: { dir: 'calorie_html' },
  photo: { dir: 'C:/photos', gifSubdir: 'gifs' },
  advanced: { limit: 30, enabled: true, note: '' },
};

/** 子进程环境的基线：默认剥掉 NODE_TEST_CONTEXT（别把「测试运行中」带进探针）；值为 undefined 的键即删除。 */
function probeEnv(extra) {
  const env = { ...process.env };
  delete env.NODE_TEST_CONTEXT;
  for (const [key, value] of Object.entries(extra ?? {})) {
    if (value === undefined) delete env[key];
    else env[key] = value;
  }
  return env;
}

/** 在子进程里跑一段 ESM（真起一个进程读盘，不是同进程重读）。 */
function runNode(code, extraEnv) {
  return execFileSync(process.execPath, ['--input-type=module', '-e', code], {
    cwd: ROOT, env: probeEnv(extraEnv), encoding: 'utf8',
  });
}

/** 读一份配置的子进程探针（默认值表按参数传，模拟「技能自己那套表」）。 */
function probeLoad(stem, defaults, extraEnv) {
  const code = 'const m = await import(' + JSON.stringify(DIST_INDEX) + ');'
    + ' const d = ' + JSON.stringify(defaults) + ';'
    + ' console.log(JSON.stringify(m.loadConfig(' + JSON.stringify(stem) + ', d).values));';
  return JSON.parse(runNode(code, extraEnv));
}

let base = null;
beforeEach(() => { base = setupConfigTestBase(); });
afterEach(() => { base.cleanup(); });

/**
 * 隔离门探针（#763）：起一个**只算落点、不碰盘**的子进程，报它抛没抛。
 *
 * 为什么只调 `resolveConfigDir()` 而不是拿技能命令做「缺隔离」实验：`resolveConfigDir()` 与
 * `mkdirSync` 之间隔着 `ensureConfigDirs`，算落点这一步零写——守卫哪天 fail-open，这条用例也
 * 不可能写出真实数据（拿技能命令做实验则相反：守卫一失效就真写）。
 *
 * 「缺隔离」怎么造：**把家目录指到真实家目录**——那正是「家目录没被注入」时子进程看到的那一份
 * （账号的事实，见 `test/helpers/real-home-snapshot.mjs` 的 `realHomeDir()`），也正是守卫的判据。
 * 别想着「把两格删掉」：`node --test` 会把 `process.env.USERPROFILE` 当刻的取值**原样注回**它起的
 * 每个子进程（实测：删掉也照样塞回来；空串会到子进程，但 `os.homedir()` 随即抛 `ERR_SYSTEM_ERROR`，
 * 走不到守卫）——所以「删变量」这条路在测试运行器里根本不通，只有「指到真实家目录」这一条。
 *
 * @param {object} [extra] 额外环境（反向对照用：给一个临时家目录就应当放行）
 * @returns {string} `'OK:<落点>'` 或 `'THREW:<错误码>'`
 */
function probeGuard(extra = {}) {
  const code = 'const m = await import(' + JSON.stringify(DIST_DIRS) + ');'
    + ' try { console.log("OK:" + m.resolveConfigDir()); } catch (e) { console.log("THREW:" + e.code); }';
  const env = { ...probeEnv(extra), NODE_TEST_CONTEXT: 'child-v8' }; // 跑在测试运行器里（守卫的适用条件）
  const r = spawnSync(process.execPath, ['--input-type=module', '-e', code], { cwd: ROOT, encoding: 'utf8', env });
  return String(r.stdout).trim();
}

describe('#694 A 定位', () => {
  it('A1 配置目录＝当刻家目录下的 .ilife，文件名＝<技能>.yaml，数据目录在它下面', () => {
    assert.equal(requireConfigTestBase(), base.dir, '基座必须已经把家目录接管到临时目录');
    const paths = configPaths('calorie');
    assert.equal(paths.configDir, configDirOf(base.dir));
    assert.equal(paths.configFile, join(configDirOf(base.dir), 'calorie.yaml'));
    assert.equal(paths.dataDir, join(configDirOf(base.dir), 'data'));
  });

  it('A2 默认落点＝注入的家目录下的 .ilife，且不认 $DSH_HOME（技能要能在没有 DSH 的平台上单跑）', () => {
    const home = join(base.dir, 'injected-home');
    // 不给 NODE_TEST_CONTEXT：子进程不跑在测试运行器里，故守卫不适用——这一条判的是**落点同源**
    // （配置目录＝`os.homedir()/.ilife`，不跟着 DSH 自己的变量走），不是守卫。
    const out = runNode(
      'const m = await import(' + JSON.stringify(DIST_DIRS) + '); console.log(m.resolveConfigDir());',
      { USERPROFILE: home, HOME: home, DSH_HOME: join(ROOT, 'nope-dsh-home'), NODE_TEST_CONTEXT: undefined },
    ).trim();
    assert.equal(out, configDirOf(home), '默认落点必须是注入的家目录下的 .ilife');
    assert.equal(existsSync(join(home, '.ilife')), false, '只算落点不许碰盘（mkdir 在它之后）');
    assert.equal(out.includes('nope-dsh-home'), false, '默认落点不得跟着 $DSH_HOME 走');
  });

  it('A3 主体名非法即拒（不许拿路径分隔符越出配置目录）', () => {
    assert.throws(() => configPaths('../escape'), (err) => err instanceof ConfigError && err.code === 'CONFIG_STEM_INVALID');
    assert.throws(() => configPaths('calorie.yaml'), (err) => err instanceof ConfigError && err.code === 'CONFIG_STEM_INVALID');
  });

  it('A4 测试隔离门：跑在测试运行器里却要落到真实家目录 → 响亮失败，且零写盘', () => {
    const realHome = realHomeDir().dir; // 「没被注入」时子进程看到的那一份（账号的事实）
    const tempHome = join(base.dir, 'probe-home');
    assert.equal(probeGuard({ USERPROFILE: realHome, HOME: realHome }), 'THREW:CONFIG_TEST_ISOLATION_MISSING',
      '回落到真实家目录必须抛 CONFIG_TEST_ISOLATION_MISSING');
    assert.equal(existsSync(join(tempHome, 'x')), false, '探针只算落点，一次盘都不碰');
    // 反向对照：同一个探针，家目录注入到临时目录就照常算出落点（证明门只关「回落到真实家目录」这一件事）。
    assert.equal(probeGuard({ USERPROFILE: tempHome, HOME: tempHome }), 'OK:' + configDirOf(tempHome),
      '注入了家目录就必须放行，且落点＝注入的那一份');
    assert.equal(existsSync(configDirOf(tempHome)), false, '探针只算落点，不建目录（mkdir 在它之后）');
  });
});

describe('#694 B 读写与默认值', () => {
  it('B1 文件不存在 → 用默认值并落一份，配置目录与数据目录首次自动建', () => {
    const loaded = loadConfig('calorie', DEFAULTS);
    assert.equal(loaded.created, true);
    assert.deepEqual(loaded.values, DEFAULTS);
    assert.equal(existsSync(loaded.path), true, '落了一份配置文件');
    assert.equal(existsSync(loaded.dataDir), true, '数据目录首次自动建');
    const parsed = parseConfigYaml(readFileSync(loaded.path, 'utf8'), loaded.path);
    assert.deepEqual(parsed.values, DEFAULTS, '落盘的默认值必须原样读得回来');
  });

  it('B2 改配置 → 下次读得到（跨进程真读盘）', () => {
    loadConfig('calorie', DEFAULTS);
    saveConfig('calorie', DEFAULTS, { db: { name: 'calorie_prod.db' }, advanced: { limit: 7 } });
    const values = probeLoad('calorie', DEFAULTS, { USERPROFILE: base.dir, HOME: base.dir });
    assert.equal(values.db.name, 'calorie_prod.db', '改过的库名下次读得到');
    assert.equal(values.advanced.limit, 7, '改过的数字下次读得到');
    assert.equal(values.db.dir, DEFAULTS.db.dir, '没改的项仍是默认值');
  });

  it('B3 删文件 → 回到默认，并再落一份', () => {
    saveConfig('calorie', DEFAULTS, { db: { name: 'calorie_prod.db' } });
    const paths = configPaths('calorie');
    runNode('const fs = await import("node:fs"); fs.unlinkSync(' + JSON.stringify(paths.configFile) + ');', {});
    const loaded = loadConfig('calorie', DEFAULTS);
    assert.equal(loaded.created, true);
    assert.deepEqual(loaded.values, DEFAULTS);
    assert.equal(existsSync(paths.configFile), true, '再落一份');
  });

  it('B4 文件只写了一半 → 缺的项回落默认值（不改盘上那份）', () => {
    const paths = configPaths('calorie');
    writeFileSync(paths.configFile, 'db:\n  name: 手写的.db\n', 'utf8');
    const loaded = loadConfig('calorie', DEFAULTS);
    assert.equal(loaded.created, false);
    assert.equal(loaded.values.db.name, '手写的.db');
    assert.equal(loaded.values.db.dir, DEFAULTS.db.dir);
    assert.equal(readFileSync(paths.configFile, 'utf8'), 'db:\n  name: 手写的.db\n', '读不写回：盘上仍是用户那份');
  });

  it('B5 不认识的键 → 报错并指出行号（不静默吞掉）', () => {
    const paths = configPaths('calorie');
    writeFileSync(paths.configFile, 'db:\n  name: a.db\nhtml:\n  dirr: typo\n', 'utf8');
    let caught = null;
    try { loadConfig('calorie', DEFAULTS); } catch (err) { caught = err; }
    assert.ok(caught instanceof ConfigError, '须抛 ConfigError');
    assert.equal(caught.code, 'CONFIG_UNKNOWN_KEY');
    assert.equal(caught.line, 4, '行号指向那一行');
    assert.match(caught.message, /html\.dirr/);
  });

  it('B6 类型不符 → 报错并指出行号', () => {
    const paths = configPaths('calorie');
    writeFileSync(paths.configFile, 'advanced:\n  limit: 三十天\n', 'utf8');
    let caught = null;
    try { loadConfig('calorie', DEFAULTS); } catch (err) { caught = err; }
    assert.ok(caught instanceof ConfigError);
    assert.equal(caught.code, 'CONFIG_TYPE_MISMATCH');
    assert.equal(caught.line, 2);
    assert.match(caught.message, /advanced\.limit/);
  });

  it('B7 改坏一行 → 报错带行号且不崩：修回去之后同一进程照常读得到', () => {
    const paths = configPaths('calorie');
    writeFileSync(paths.configFile, 'db:\n  name: a.db\nhtml:\n\tdir: 制表符缩进\n', 'utf8');
    let caught = null;
    try { loadConfig('calorie', DEFAULTS); } catch (err) { caught = err; }
    assert.ok(caught instanceof ConfigError);
    assert.equal(caught.code, 'CONFIG_PARSE_FAILED');
    assert.equal(caught.line, 4);
    assert.match(caught.message, /第 4 行/);
    writeFileSync(paths.configFile, 'db:\n  name: b.db\n', 'utf8');
    assert.equal(loadConfig('calorie', DEFAULTS).values.db.name, 'b.db', '同进程后续调用照常');
  });

  it('B8 保存时给的项写盘、没给的项按默认值补齐（盘上永远只有默认值表那组键）', () => {
    saveConfig('calorie', DEFAULTS, { db: { name: 'only-name.db' } });
    const text = readFileSync(configPaths('calorie').configFile, 'utf8');
    const parsed = parseConfigYaml(text, 'calorie.yaml');
    assert.deepEqual(parsed.values, {
      db: { dir: DEFAULTS.db.dir, name: 'only-name.db' },
      html: { dir: DEFAULTS.html.dir },
      photo: { dir: DEFAULTS.photo.dir, gifSubdir: DEFAULTS.photo.gifSubdir },
      advanced: { limit: DEFAULTS.advanced.limit, enabled: DEFAULTS.advanced.enabled, note: '' },
    });
  });

  it('B9 保存时给不认识／类型不符的键 → 当场拒，盘上不产生半份', () => {
    saveConfig('calorie', DEFAULTS, { db: { name: 'a.db' } });
    const before = readFileSync(configPaths('calorie').configFile, 'utf8');
    assert.throws(() => saveConfig('calorie', DEFAULTS, { nope: 'x' }),
      (err) => err instanceof ConfigError && err.code === 'CONFIG_UNKNOWN_KEY');
    assert.throws(() => saveConfig('calorie', DEFAULTS, { advanced: { limit: 'x' } }),
      (err) => err instanceof ConfigError && err.code === 'CONFIG_TYPE_MISMATCH');
    assert.equal(readFileSync(configPaths('calorie').configFile, 'utf8'), before, '拒了就不写盘');
  });

  it('B10 默认值本身不合子集 → 当场拒（挡在写盘之前）', () => {
    assert.throws(() => loadConfig('calorie', { a: {} }),
      (err) => err instanceof ConfigError && err.code === 'CONFIG_SHAPE_INVALID');
    assert.throws(() => loadConfig('calorie', { a: { b: { c: 1 } } }),
      (err) => err instanceof ConfigError && err.code === 'CONFIG_SHAPE_INVALID');
    assert.equal(existsSync(configPaths('calorie').configFile), false, '拒了就不落盘');
  });
});

describe('#694 C 重置为默认', () => {
  it('C1 重置前先把现有文件另存 .bak，再按默认值重写', () => {
    saveConfig('calorie', DEFAULTS, { db: { name: 'calorie_prod.db' } });
    const paths = configPaths('calorie');
    const before = readFileSync(paths.configFile, 'utf8');
    const result = resetConfig('calorie', DEFAULTS);
    assert.equal(result.backupPath, paths.configFile + '.bak');
    assert.equal(readFileSync(result.backupPath, 'utf8'), before, '.bak 就是重置前那份');
    assert.deepEqual(parseConfigYaml(readFileSync(paths.configFile, 'utf8'), paths.configFile).values, DEFAULTS);
  });

  it('C2 文件本来就不存在 → 只落一份默认值，backupPath 为 null', () => {
    const result = resetConfig('calorie', DEFAULTS);
    assert.equal(result.backupPath, null);
    assert.deepEqual(loadConfig('calorie', DEFAULTS).values, DEFAULTS);
    assert.equal(existsSync(result.path + '.bak'), false);
  });

  it('C3 再重置一次覆盖旧 .bak', () => {
    saveConfig('calorie', DEFAULTS, { db: { name: 'first.db' } });
    resetConfig('calorie', DEFAULTS);
    saveConfig('calorie', DEFAULTS, { db: { name: 'second.db' } });
    const again = resetConfig('calorie', DEFAULTS);
    assert.match(readFileSync(again.backupPath, 'utf8'), /second\.db/);
  });
});

describe('#694 D 受限子集解析器', () => {
  it('D1 支持面：一层嵌套 ＋ 字符串／数字／布尔 ＋ 单双引号 ＋ 整行与值后注释', () => {
    const text = [
      '# 整行注释',
      'db:',
      '  name: calorie_data.db',
      '  dir: "C:/带 空格/路径"',
      "  note: '单引号''转义'",
      'advanced:',
      '  limit: 30    # 值后注释',
      '  ratio: 1.5',
      '  enabled: true',
      '  off: false',
      'plain: value with spaces',
      'quotedHash: "a # b"',
      '',
    ].join('\n');
    const { values, lineOf } = parseConfigYaml(text, 'calorie.yaml');
    assert.deepEqual(values, {
      db: { name: 'calorie_data.db', dir: 'C:/带 空格/路径', note: "单引号'转义" },
      advanced: { limit: 30, ratio: 1.5, enabled: true, off: false },
      plain: 'value with spaces',
      quotedHash: 'a # b',
    });
    assert.equal(lineOf.get('db'), 2);
    assert.equal(lineOf.get('db.name'), 3);
    assert.equal(lineOf.get('advanced.enabled'), 9);
  });

  it('D2 生成器与解析器互为逆（round-trip）：写出去的分明写回来一模一样', () => {
    const samples = [
      DEFAULTS,
      { a: 'true', b: '30', c: '1.5', d: '', e: '带 空格', f: 'a#b', g: "it's", h: 'x:y', i: 'C:\\Users\\x' },
      { g: { num: -3, ratio: 0.5, flag: false } },
    ];
    for (const sample of samples) {
      const text = formatConfigYaml(sample);
      assert.deepEqual(parseConfigYaml(text, 'sample.yaml').values, sample, 'round-trip 失败：' + text);
    }
  });

  it('D3 拒绝面：列表／两层嵌套／制表符缩进／引号未闭合／重复键／空组，一律带行号', () => {
    const cases = [
      ['a:\n  - x\n', 2, /列表/],
      ['a:\n  b: 1\n    c: 2\n', 3, /缩进/],
      ['a:\n  b:\n', 2, /没有值/],
      ['a:\n\tb: 1\n', 2, /制表符/],
      ['a: "没闭合\n', 1, /引号没有闭合/],
      ['a: 1\na: 2\n', 2, /重复定义/],
      ['a: 1\nb:\n', 2, /没有值，也没有子项/],
      ['就是一句话\n', 1, /不是「键: 值」形状/],
      ['a: # 只有注释\n', 1, /只有注释/],
    ];
    for (const [text, line, re] of cases) {
      let caught = null;
      try { parseConfigYaml(text, 'bad.yaml'); } catch (err) { caught = err; }
      assert.ok(caught instanceof ConfigError, '须抛 ConfigError：' + JSON.stringify(text));
      assert.equal(caught.code, 'CONFIG_PARSE_FAILED');
      assert.equal(caught.line, line, '行号不对：' + JSON.stringify(text));
      assert.match(caught.message, re);
      assert.match(caught.message, /第 \d+ 行/);
    }
  });

  it('D4 形状校验：空组、深于一层、数组一律拒（写出去也解析不回来）', () => {
    assert.throws(() => formatConfigYaml({ a: {} }),
      (err) => err instanceof ConfigError && err.code === 'CONFIG_SHAPE_INVALID');
    assert.throws(() => formatConfigYaml({ a: { b: { c: 1 } } }),
      (err) => err instanceof ConfigError && err.code === 'CONFIG_SHAPE_INVALID');
    assert.throws(() => formatConfigYaml({ a: [1, 2] }),
      (err) => err instanceof ConfigError && err.code === 'CONFIG_SHAPE_INVALID');
  });

  it('D5 BOM 与 CRLF 不挡路（编辑器写出来的文件照样读得到）', () => {
    const text = '\uFEFFdb:\r\n  name: a.db\r\n';
    assert.deepEqual(parseConfigYaml(text, 'bom.yaml').values, { db: { name: 'a.db' } });
  });
});

describe('#694 E 约束', () => {
  it('E1 零新增外部依赖：base-link-core 的 dependencies 仍为空', () => {
    const pkg = JSON.parse(readFileSync(join(CORE, 'package.json'), 'utf8'));
    assert.deepEqual(Object.keys(pkg.dependencies ?? {}), []);
    assert.deepEqual(Object.keys(pkg.peerDependencies ?? {}), []);
  });

  it('E2 配置面只经包根出口拿到（消费者不用知道里面怎么分件）', () => {
    for (const name of ['configPaths', 'loadConfig', 'saveConfig', 'resetConfig', 'ConfigError']) {
      assert.equal(typeof CORE_API[name], 'function', name + ' 必须在包根出口上');
    }
  });
});

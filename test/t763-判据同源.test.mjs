/**
 * #763 · 判据同源：**生产守卫**与**测试侧快照**必须看同一棵「真实家目录」。
 *
 * 为什么要有这道门：同一句判据「真实家目录＝**账号**那一份」现在有两处实现——
 *   ① 生产侧 `packages/base-link-core/src/config/dirs.ts` 的 `realAccountHome()`（模块内私有，拦「忘了注入」）；
 *   ② 测试侧 `test/helpers/real-home-snapshot.mjs` 的 `realHomeDir()`（真实树快照门禁量的是同一棵树）。
 * 两处取值顺序**逐条同源**（`os.userInfo().homedir` → win32 兜 `HOMEDRIVE`＋`HOMEPATH` → 拿不到则 fail-open）。
 * 任一侧改了判据而另一侧没跟：守卫会去拦一棵树、快照去看另一棵树——**假绿**正是这么来的。本件就守这一条：
 * 同一个时刻、同一台机器上，「生产守卫抛不抛」与「测试侧认不认它是真实那份」**必须一致**。
 *
 * 运行：`node --test test/t763-判据同源.test.mjs`（需先 `tsc -b packages/base-link-core`）。
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { homedir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { isRealHome } from './helpers/home-test-base.mjs';
import { realHomeDir } from './helpers/real-home-snapshot.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const DIRS = pathToFileURL(join(HERE, '..', 'packages', 'base-link-core', 'dist', 'config', 'dirs.js')).href;

/** 子进程里问一次生产守卫：回 `OK:<配置目录>` 或 `THREW:<错误码>`。 */
function probeProduction(extraEnv) {
  const code = 'const m = await import(' + JSON.stringify(DIRS) + ');'
    + ' try { console.log("OK:" + m.resolveConfigDir()); } catch (e) { console.log("THREW:" + e.code); }';
  const r = spawnSync(process.execPath, ['--input-type=module', '-e', code], {
    encoding: 'utf8',
    env: { ...process.env, NODE_TEST_CONTEXT: 'child-v8', ...extraEnv },
  });
  return String(r.stdout ?? '').trim();
}

/**
 * 「没隔离」那一态**只能显式构造**：把两格家目录指到**账号家目录**（守卫判据里的那棵树）。
 *
 * 为什么不能靠「删掉两格」来构造（本机实测，别再走回头路）：母进程把 `USERPROFILE` 改成临时值时，
 * 子进程即使把这两格从 env 里删掉，拿到的仍是**注入值**（`{"up":"<临时>","home":null,"hd":"<临时>"}`）——
 * win32 会把用户身份那几格注回子进程。删键构造出的「没隔离」是假的，用例会永远绿不起来（或假绿）。
 */
const ACCOUNT_HOME = realHomeDir().dir;

test('#763 判据同源①：家目录指回账号那份（＝没隔离）⇒ 生产守卫必须抛，且测试侧也认「当刻家目录＝真实那份」', () => {
  const out = probeProduction({ USERPROFILE: ACCOUNT_HOME, HOME: ACCOUNT_HOME });
  assert.equal(out, 'THREW:CONFIG_TEST_ISOLATION_MISSING',
    '生产守卫必须拦下「要落到真实家目录」这一档（实测：' + out + '）');
  assert.equal(isRealHome(homedir()), true,
    '同一时刻测试侧必须把当刻家目录认成真实那份；两侧不一致＝守卫拦一棵树、快照看另一棵树（假绿的入口）');
  assert.ok(realHomeDir().dir.length > 0, '真实家目录判据源必须给得出目录（拿不到就是 fail-open 那一档，读数要写明）');
});

test('#763 判据同源②：注入家目录 ⇒ 生产守卫放行，且测试侧认「不是真实那份」', () => {
  const fake = join(HERE, '..', '.scratch', 't763', 'drift-probe-home');
  const out = probeProduction({ USERPROFILE: fake, HOME: fake });
  assert.ok(out.startsWith('OK:'), '注入之后生产守卫必须放行（实测：' + out + '）');
  assert.ok(out.includes('.ilife'), '放行时算出来的配置目录必须是「注入家目录下」的 `.ilife`：' + out);
  assert.equal(isRealHome(fake), false, '测试侧必须认它是临时那份');
});

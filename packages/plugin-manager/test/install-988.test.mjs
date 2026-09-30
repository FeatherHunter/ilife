// 票 #988 自证回路：缺席安装的**落点选择**与**失败可见**（全用替身，不碰真机）。
//
// 咬五件事：
//   ① 宿主发布进程内插件管理器时，执行器以 `'desktop-manager'` kind 构建、交的是这家
//      manager——规格冻结与安装语义全在更新包里（0.2.0 `commands.js`／`store.js`），
//      总管只定 kind + 交 manager，不自己调 `installBundle`；
//   ② 第三方桌面（kind `'desktop'`）即使有 manager 也不走这条，沿既有 desktop-service 路由；
//   ③ 宿主没有这个出口时，落点交回注入的执行器替身（既有路由不变）；
//   ④ 失败**不许再吞**：`detail`（宿主原话）优先进回包，退出码看得见，并留一条 warn；
//   ⑤ 面板侧 `failureDetailOf` 只取值与截断 + `failureDetailCode` 把原文单放一个可复制块，
//      两处失败行（结果行与缺席卡）共用。
//
// 先构建再跑：`node node_modules/typescript/bin/tsc -b packages/plugin-manager`
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { UPDATE_TARGETS } from '../dist/update-targets.js';
import { installErrorDetail, installMissing } from '../dist/update-host.js';
import { desktopInstallSpec, desktopManagerOf } from '../dist/desktop-install.js';
import { failureDetailOf } from '../dist/update-view.js';

const HERE = dirname(fileURLToPath(import.meta.url));
const SRC = (name) => readFileSync(join(HERE, '..', 'src', name), 'utf8');

/** 记账那一家：缺席安装的样例目标。 */
const TARGET = UPDATE_TARGETS.find((t) => t.key === 'bill');
const VERSION = '0.3.19';

/** 现场事实替身：ctx 只要长得像取用口就够（本票的判据不在 ctx 上）。 */
function factsOf(ctx = {}, environmentKind = 'cli') {
  return {
    ctx,
    profileDir: 'C:/假/使用范围',
    profileName: 'desktop',
    environmentKind,
    runningVersions: new Map(),
  };
}

function recorder() {
  const lines = [];
  return { lines, log: (level, event, fields) => lines.push({ level, event, fields }) };
}

/** 执行器工厂替身：记下总管传给更新包的零件，装的动作按 `run` 办。 */
function factoryOf(run) {
  const seen = { parts: null, args: null };
  return {
    seen,
    createExecutor: (parts) => {
      seen.parts = parts;
      return async (args) => {
        seen.args = args;
        await run(parts, args);
      };
    },
  };
}

describe('#988 缺席安装的落点', () => {
  it('宿主有插件管理器：执行器以 desktop-manager kind 构建，交的是这家 manager', async () => {
    const manager = { installBundle: async () => ({ application: 'applied' }) };
    const { seen, createExecutor } = factoryOf(async () => {});
    const { lines, log } = recorder();
    const reply = await installMissing(factsOf(), TARGET, { version: VERSION }, {
      desktopManager: () => manager,
      createExecutor,
      log,
    });
    assert.equal(seen.parts.environmentKind, 'desktop-manager', 'kind 必须显式定 desktop-manager（执行器自己只会按 cli 走）');
    assert.equal(seen.parts.pluginManager(), manager, '必须把这家 manager 交给执行器，不自己调 installBundle');
    assert.equal(seen.parts.targetPackageName, 'dsh-bill-ilife');
    assert.deepEqual(seen.args, { version: VERSION, profileName: 'desktop', environmentKind: 'desktop-manager' });
    assert.equal(reply.ok, true, '执行器装成功时回包必须 ok');
    assert.equal(reply.value.route, 'desktop-manager');
    assert.deepEqual(lines.at(-1), {
      level: 'info',
      event: 'ilife.install.done',
      fields: { route: 'desktop-manager', packageName: 'dsh-bill-ilife', version: VERSION },
    });
  });

  it('第三方桌面（kind desktop）即使有 manager：也不走 manager 路由，沿既有落点', async () => {
    const seen = [];
    let factoryTouched = 0;
    const reply = await installMissing(factsOf({}, 'desktop'), TARGET, { version: VERSION }, {
      desktopManager: () => ({ installBundle: async () => ({ application: 'applied' }) }),
      runExecutor: async (target, version) => seen.push([target.packageName, version]),
      createExecutor: () => {
        factoryTouched += 1;
        return async () => {};
      },
    });
    assert.equal(reply.ok, true);
    assert.equal(reply.value.route, 'executor', '第三方桌面沿既有 desktop-service 路由，不抢 manager');
    assert.deepEqual(seen, [['dsh-bill-ilife', VERSION]]);
    assert.equal(factoryTouched, 0, 'manager 路由的工厂不许被碰');
  });

  it('宿主没有这个出口：落点交回执行器替身（既有路由不变）', async () => {
    const seen = [];
    const reply = await installMissing(factsOf(), TARGET, { version: VERSION }, {
      desktopManager: () => null,
      runExecutor: async (target, version) => seen.push([target.packageName, version]),
    });
    assert.equal(reply.ok, true);
    assert.equal(reply.value.route, 'executor');
    assert.deepEqual(seen, [['dsh-bill-ilife', VERSION]]);
  });

  it('执行器抛错：**不许再吞**——detail（宿主原话）优先，退出码看得见，并留一条 warn', async () => {
    const { lines, log } = recorder();
    const error = Object.assign(new Error('install-failed'), {
      detail: '宿主拒绝了这次安装',
      debug: 'Error: install-failed\n    at runInstall (store.js:451:11)',
      exitCode: 1,
    });
    const { createExecutor } = factoryOf(async () => {
      throw error;
    });
    const reply = await installMissing(factsOf(), TARGET, { version: VERSION }, {
      desktopManager: () => ({ installBundle: async () => ({}) }),
      createExecutor,
      log,
    });
    assert.equal(reply.ok, false);
    assert.equal(reply.error.code, 'install-failed');
    assert.equal(reply.error.details.route, 'desktop-manager');
    const detail = String(reply.error.details.detail);
    assert.match(detail, /宿主拒绝了这次安装/, '宿主原话（detail）必须优先看得见');
    assert.doesNotMatch(detail, /runInstall/, '有 detail 时不许把堆栈摊上屏');
    assert.match(detail, /exit=1/, '退出码必须看得见');
    assert.equal(lines.length, 1);
    assert.equal(lines[0].level, 'warn');
    assert.equal(lines[0].event, 'ilife.install.failed');
    assert.equal(lines[0].fields.detail, detail);
  });

  it('执行器抛错无 detail：退回 debug 原文（排查不断线）', async () => {
    const error = Object.assign(new Error('install-failed'), {
      debug: 'Error: install-failed\n    at runCliProcess (store.js:417:11)',
      exitCode: 127,
    });
    const reply = await installMissing(factsOf(), TARGET, { version: VERSION }, {
      desktopManager: () => null,
      runExecutor: async () => {
        throw error;
      },
    });
    assert.equal(reply.ok, false);
    assert.equal(reply.error.details.route, 'executor');
    const detail = String(reply.error.details.detail);
    assert.match(detail, /runCliProcess/, '无 detail 时执行器原文（debug）必须看得见');
    assert.match(detail, /exit=127/, '退出码必须看得见');
  });

  it('版本不合法：落 invalid-release，不碰任何落点', async () => {
    let touched = 0;
    const reply = await installMissing(factsOf(), TARGET, { version: 'v0.3.19' }, {
      desktopManager: () => {
        touched += 1;
        return { installBundle: async () => ({ application: 'applied' }) };
      },
      runExecutor: async () => {
        touched += 1;
      },
      createExecutor: () => {
        touched += 1;
        return async () => {};
      },
    });
    assert.equal(reply.error.code, 'invalid-release');
    assert.equal(touched, 0);
  });
});

describe('#988 宿主出口的取用与规格', () => {
  it('desktopInstallSpec：只认精确版本与合法包名', () => {
    assert.equal(desktopInstallSpec('dsh-bill-ilife', '0.3.19'), 'dsh-bill-ilife@0.3.19');
    assert.equal(desktopInstallSpec('@scope/pkg', '1.2.3'), '@scope/pkg@1.2.3');
    assert.equal(desktopInstallSpec('dsh-bill-ilife', 'latest'), null);
    assert.equal(desktopInstallSpec('dsh-bill-ilife', '^0.3.19'), null);
    assert.equal(desktopInstallSpec('dsh bill', '0.3.19'), null);
  });

  it('desktopManagerOf：缺方法、取用抛错、ctx 无取用口，一律回 null（回 null 才走既有路由）', () => {
    assert.equal(desktopManagerOf({ get: () => undefined }), null);
    assert.equal(desktopManagerOf({ get: () => ({}) }), null);
    assert.equal(desktopManagerOf({ get: () => ({ installBundle: 'not-a-function' }) }), null);
    assert.equal(
      desktopManagerOf({
        get: () => {
          throw new Error('cannot get property "pluginManager" without inject');
        },
      }),
      null,
    );
    assert.equal(desktopManagerOf(undefined), null);
    const manager = { installBundle: async () => ({ application: 'applied' }) };
    assert.equal(desktopManagerOf({ get: () => manager }), manager);
  });

  it('installErrorDetail：detail 优先于 debug，退出码拼在最前，不回空串', () => {
    assert.match(
      installErrorDetail(Object.assign(new Error('x'), { detail: '宿主原话', debug: 'stack noise' })),
      /宿主原话/,
    );
    assert.doesNotMatch(
      installErrorDetail(Object.assign(new Error('x'), { detail: '宿主原话', debug: 'stack noise' })),
      /stack noise/,
    );
    assert.match(installErrorDetail(new Error('boom')), /boom/);
    assert.equal(installErrorDetail(Object.assign(new Error('x'), { exitCode: 3 })).startsWith('exit=3'), true);
    assert.notEqual(installErrorDetail({}).trim(), '');
  });
});

describe('#988 失败原文那一块（面板纯函数 + 可复制块）', () => {
  it('有原文取值、超长截断、没有就回 null', () => {
    assert.equal(failureDetailOf({ details: { detail: '宿主原话' } }), '宿主原话');
    assert.equal(failureDetailOf({ details: { detail: 'x'.repeat(400) } }).length, 300);
    assert.equal(failureDetailOf({ details: {} }), null);
    assert.equal(failureDetailOf({ details: { detail: '   ' } }), null);
    assert.equal(failureDetailOf({ details: { detail: 42 } }), null);
    assert.equal(failureDetailOf(null), null);
  });

  it('面板两处失败行共用可复制块，插件入口把留痕口交进表', () => {
    const panel = SRC('update-panel.ts');
    assert.match(panel, /failureDetailCode\(failureDetailOf\(row\.failure\)\)/, '结果行经共用块摊原文');
    assert.match(panel, /failureDetailCode\(failureDetailOf\(row\?\.failure\)\)/, '缺席卡经共用块摊原文');
    assert.match(panel, /function failureDetailCode/, '共用块只定义一次');
    assert.match(panel, /userSelect/, '可复制块点一下全选（cmd 样式的可复制习语）');
    assert.match(SRC('index.ts'), /buildUpdatePhoneTable\(ctx, \{ log \}\)/, '入口要把留痕口交进电话表');
  });
});

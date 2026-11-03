// 票 #1323 · 宿主语言来路的行为门：settings.locale.preference 的读取面与 argv 追加。
//
// 缝：dsh-life-pack 根入口导出的 host-locale 三件（六家插件共用的唯一实现），
//     以及 createSkillCliBridge 把 callerLanguage 落到子进程 argv 的那一步。
// 判据出处：#1323 票面验收 ①（宿主设置经技能调用形态透传为 caller）、②（设置缺失→中文）、
//     ④（优先级链与非法 caller 由技能侧判定，这里钉发送面）。
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import {
  CALLER_LANGUAGE_FLAG,
  callerLanguageReader,
  localePreferenceOf,
  withCallerLanguage,
} from '../dist/index.js';
import { createSkillCliBridge } from '../dist/skill-cli/bridge-factory.js';

/** DSH settings 服务的假面：describe() 同步回活跃条目描述符。 */
const settingsOf = (rows) => ({ describe: () => rows });

describe('#1323 host-locale：从 settings.locale.preference 取调用方语言', () => {
  it('取得到 locale 条目里的 preference（去空白）', () => {
    const settings = settingsOf([
      { ns: 'other', value: { preference: 'en' } },
      { ns: 'locale', value: { preference: ' en ' } },
    ]);
    assert.equal(localePreferenceOf(settings), 'en');
  });

  it('服务缺席／describe 不是函数／抛错／条目缺席／值非字符串或空白 ⇒ undefined（中文）', () => {
    assert.equal(localePreferenceOf(undefined), undefined);
    assert.equal(localePreferenceOf(null), undefined);
    assert.equal(localePreferenceOf({}), undefined);
    assert.equal(localePreferenceOf({ describe: () => { throw new Error('boom'); } }), undefined);
    assert.equal(localePreferenceOf(settingsOf('not-an-array')), undefined);
    assert.equal(localePreferenceOf(settingsOf([{ ns: 'locale', value: {} }])), undefined);
    assert.equal(localePreferenceOf(settingsOf([{ ns: 'locale', value: { preference: '   ' } }])), undefined);
    assert.equal(localePreferenceOf(settingsOf([{ ns: 'locale', value: { preference: 42 } }])), undefined);
  });

  it('callerLanguageReader 每次现读 ctx.get(\'settings\')，读不到／读抛错都降级 undefined', () => {
    let rows = [{ ns: 'locale', value: { preference: 'en' } }];
    let reads = 0;
    const ctx = { get: (name) => { reads += 1; assert.equal(name, 'settings'); return settingsOf(rows); } };
    const caller = callerLanguageReader(ctx);
    assert.equal(caller(), 'en');
    rows = [];
    assert.equal(caller(), undefined, '设置 live 改后下一次现读');
    assert.equal(reads, 2, '每次调用都重新读');
    assert.equal(callerLanguageReader(undefined)(), undefined);
    assert.equal(callerLanguageReader({ get: () => { throw new Error('boom'); } })(), undefined);
  });

  it('withCallerLanguage：追加在 arg 末尾；空值不追加；已带同参数不重复', () => {
    assert.deepEqual(withCallerLanguage(['cli', 'key', '--params', '{}'], 'en'), ['cli', 'key', '--params', '{}', CALLER_LANGUAGE_FLAG, 'en']);
    assert.deepEqual(withCallerLanguage(['cli'], '  '), ['cli']);
    assert.deepEqual(withCallerLanguage(['cli'], undefined), ['cli']);
    const once = ['cli', CALLER_LANGUAGE_FLAG, 'en'];
    assert.deepEqual(withCallerLanguage(once, 'en'), once);
  });
});

/** 假的已装技能包：出口把收到的 argv 原样回执，用来钉桥实际发出的参数。 */
const ECHO_ARGV_CLI = [
  "const [key] = process.argv.slice(2);",
  "process.stdout.write(JSON.stringify({ key, data: { key, argv: process.argv.slice(2) } }));",
].join('\n');

function fakeBridge({ callerLanguage } = {}) {
  const root = mkdtempSync(join(tmpdir(), 'host-locale-'));
  const skillDir = join(root, 'node_modules', 'skill-fake');
  mkdirSync(join(skillDir, 'dist'), { recursive: true });
  writeFileSync(join(skillDir, 'package.json'), JSON.stringify({ name: 'skill-fake', version: '1.2.3', type: 'module' }));
  writeFileSync(join(skillDir, 'dist', 'cli.js'), ECHO_ARGV_CLI);
  const bridge = createSkillCliBridge({
    skillPackage: 'skill-fake',
    repoRelativeCli: 'packages/skill-fake/dist/cli.js',
    packageRelativeCli: 'dist/cli.js',
    moduleUrl: pathToFileURL(join(root, 'bridge.mjs')).href,
    hostCallMethod: 'fake.read',
    makeError: (code, message) => Object.assign(new Error(message), { code }),
    ...(callerLanguage === undefined ? {} : { callerLanguage }),
  });
  return { bridge, cleanup: () => rmSync(root, { recursive: true, force: true }) };
}

describe('#1323 桥：callerLanguage 现读后追加进子进程 argv', () => {
  it('有来源 ⇒ argv 末尾是 --caller-language <值>', async () => {
    const fake = fakeBridge({ callerLanguage: () => 'en' });
    try {
      const data = await fake.bridge.readViaCli('demo.key', {});
      assert.deepEqual(data.argv, ['demo.key', '--params', '{}', CALLER_LANGUAGE_FLAG, 'en']);
    } finally {
      fake.cleanup();
    }
  });

  it('无来源／来源回 undefined ⇒ argv 与接线前逐字相同（默认中文路径不变）', async () => {
    const bare = fakeBridge();
    const empty = fakeBridge({ callerLanguage: () => undefined });
    try {
      for (const fake of [bare, empty]) {
        const data = await fake.bridge.readViaCli('demo.key', {});
        assert.deepEqual(data.argv, ['demo.key', '--params', '{}']);
      }
    } finally {
      bare.cleanup();
      empty.cleanup();
    }
  });
});

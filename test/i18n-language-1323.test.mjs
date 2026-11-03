/**
 * #1323 · 宿主语言来路：`--caller-language` 的公共层验收（`packages/base-link-core/src/config/language.ts`）。
 *
 * 缝（生产唯一判定地）：base 能力门 `../packages/base-link-core/dist/index.js` 转出的语言件。
 * 断言来源（非推导）：#1323 票面验收 ②④（设置经 argv 透传为 caller；优先级链与非法 caller 报错）
 * ＋ #1198 既有口径（argv ＞ 配置 ＞ caller ＞ zh）。
 * 运行：先 `node node_modules/typescript/bin/tsc -b packages/base-link-core`，
 * 再 `node --test test/i18n-language-1323.test.mjs`。
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  AVAILABLE_LANGUAGES,
  CALLER_LANGUAGE_ARG,
  ConfigError,
  callerLanguageFromArgv,
  isCallerLanguageArg,
  isLanguageArg,
  resolveLanguage,
} from '../packages/base-link-core/dist/index.js';

describe('#1323 宿主语言来路：--caller-language 的形状', () => {
  it('参数名唯一由公共层导出；宿主侧的提示与用户显式覆盖是两个参数', () => {
    assert.equal(CALLER_LANGUAGE_ARG, '--caller-language');
    assert.equal(isCallerLanguageArg('--caller-language'), true);
    assert.equal(isCallerLanguageArg('--language'), false);
    assert.equal(isLanguageArg('--caller-language'), false, '用户覆盖参数（--language）与宿主提示（--caller-language）分开摘');
  });

  it('从 argv 里摘值：只摘不判，大小写与空白原样留给判定', () => {
    assert.equal(callerLanguageFromArgv(['bill.config.check']), undefined);
    assert.equal(callerLanguageFromArgv(['--params', '{}', '--caller-language', 'EN']), 'EN');
    assert.equal(callerLanguageFromArgv(['--caller-language', 'en', '--caller-language', 'zh']), 'zh', '重复时最后一个生效');
  });

  it('缺值或值落在 -- 开头 ⇒ CONFIG_LANGUAGE_ARGV_MISSING（列可用语言）', () => {
    for (const argv of [['--caller-language'], ['--caller-language', '--language', 'en']]) {
      assert.throws(
        () => callerLanguageFromArgv(argv),
        (error) => {
          assert.ok(error instanceof ConfigError, '须是公共层的配置错误');
          assert.equal(error.code, 'CONFIG_LANGUAGE_ARGV_MISSING');
          assert.match(error.message, /--caller-language/);
          assert.match(error.message, new RegExp(AVAILABLE_LANGUAGES.join('、')));
          return true;
        },
      );
    }
  });
});

describe('#1323 优先级链：argv ＞ 配置文件 ＞ caller ＞ 缺省 zh', () => {
  it('配置两格空串 ＋ caller en ⇒ en/en（桌面设置切英文时生效）', () => {
    assert.deepEqual(
      resolveLanguage({ values: { language: { text: '', format: '' } }, caller: 'en' }),
      { text: 'en', format: 'en' },
    );
  });

  it('配置文件 language.text 压过 caller：text 跟配置、format 空串跟 caller', () => {
    assert.deepEqual(
      resolveLanguage({ values: { language: { text: 'zh', format: '' } }, caller: 'en' }),
      { text: 'zh', format: 'en' },
    );
  });

  it('argv 压过 caller：--language zh 时 text=zh（format 无覆盖仍跟 caller）', () => {
    assert.deepEqual(
      resolveLanguage({ values: { language: { text: '', format: '' } }, caller: 'en', argv: ['cmd', '--language', 'zh'] }),
      { text: 'zh', format: 'en' },
    );
  });

  it('宿主经 argv 传的 --caller-language 与 options.caller 同义（显式传入的 options.caller 优先）', () => {
    assert.deepEqual(
      resolveLanguage({ argv: ['cmd', '--params', '{}', '--caller-language', 'en'] }),
      { text: 'en', format: 'en' },
    );
    assert.deepEqual(
      resolveLanguage({ caller: 'zh', argv: ['cmd', '--caller-language', 'en'] }),
      { text: 'zh', format: 'zh' },
      '两处都给了：显式参数（程序内调用）优先于 argv 提示',
    );
  });

  it('caller 大小写/空白规范化（EN、 en ⇒ en）；空串＝没有调用方偏好', () => {
    assert.deepEqual(resolveLanguage({ caller: ' EN ' }), { text: 'en', format: 'en' });
    assert.deepEqual(resolveLanguage({ caller: '' }), { text: 'zh', format: 'zh' });
    assert.deepEqual(resolveLanguage({ argv: ['cmd', '--caller-language', 'en'] }), { text: 'en', format: 'en' });
  });

  it('非法 caller（无论来自参数还是 argv）报错并列可用语言', () => {
    for (const options of [
      { caller: 'fr' },
      { argv: ['cmd', '--caller-language', 'fr'] },
    ]) {
      assert.throws(
        () => resolveLanguage(options),
        (error) => {
          assert.ok(error instanceof ConfigError);
          assert.equal(error.code, 'CONFIG_UNKNOWN_LANGUAGE');
          assert.match(error.message, /调用方偏好/);
          assert.match(error.message, new RegExp(AVAILABLE_LANGUAGES.join('、')));
          return true;
        },
      );
    }
  });
});

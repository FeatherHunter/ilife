/**
 * #1198 · 语言选择链的公共层验收（`packages/base-link-core/src/config/language.ts`）。
 *
 * 缝（生产真正走的那条路）：base 能力门 `../packages/base-link-core/dist/index.js`
 * 转出的语言件 ＋ 6 技能默认值表里的 `language` 组（读各自 `dist/config.js`）。
 * 隔离口径照 `test/config-retired-762.test.mjs`：本件只断纯函数与默认值表，不碰盘、不碰家目录。
 *
 * 断言来源（非推导）：ADR-0004 §4（两键名、空串语义、缺省 zh、未知值报错列可用语言、
 * BCP 47）＋ #1198 票面（配置文件两键＋命令行覆盖）。
 * 运行：先 `tsc -b packages/base-link-core`（及 6 技能包），再 `node --test test/i18n-language-1198.test.mjs`。
 */
import { afterEach, beforeEach, describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import {
  AVAILABLE_LANGUAGES,
  DEFAULT_LANGUAGE,
  ConfigError,
  loadConfig,
  parseLanguageArgs,
  resolveLanguage,
} from '../packages/base-link-core/dist/index.js';
import { configDirOf, requireIsolatedHome, useHome } from './helpers/home-test-base.mjs';

describe('#1198 语言选择链', () => {
  it('可用语言本期为 zh/en，缺省为 zh（代码常量，后续从词条目录派生）', () => {
    assert.deepEqual([...AVAILABLE_LANGUAGES], ['zh', 'en']);
    assert.equal(DEFAULT_LANGUAGE, 'zh');
  });

  it('全空（配置文件空串＋无调用方＋无 argv）→ zh/zh', () => {
    assert.deepEqual(
      resolveLanguage({ values: { language: { text: '', format: '' } } }),
      { text: 'zh', format: 'zh' },
    );
  });

  it('配置文件 language.text 生效（format 空串时跟随调用方、无调用方回退 zh）', () => {
    assert.deepEqual(
      resolveLanguage({ values: { language: { text: 'en', format: '' } } }),
      { text: 'en', format: 'zh' },
    );
  });

  it('text 与 format 可分开（日期版式独立于文本语言）', () => {
    assert.deepEqual(
      resolveLanguage({ values: { language: { text: 'en', format: 'zh' } } }),
      { text: 'en', format: 'zh' },
    );
  });

  it('空串＝跟随调用方：调用方 en 时 text 落 en，format 无调用方时回退 zh', () => {
    assert.deepEqual(
      resolveLanguage({ values: { language: { text: '', format: '' } }, caller: 'en' }),
      { text: 'en', format: 'en' },
    );
  });

  it('命令行覆盖最优先（argv > 配置文件 > 调用方）', () => {
    assert.deepEqual(
      resolveLanguage({
        values: { language: { text: 'zh', format: 'zh' } },
        caller: 'zh',
        argv: ['calorie.view.today', '--language', 'en'],
      }),
      { text: 'en', format: 'zh' },
    );
  });

  it('BCP 47 大小写不敏感（EN 归一为 en；带区域子标签如 zh-CN 本期视为未识别）', () => {
    const out = resolveLanguage({ values: { language: { text: 'EN', format: '' } } });
    assert.equal(out.text, 'en');
  });

  it('未知值报错并列出可用语言（配置文件侧）', () => {
    assert.throws(
      () => resolveLanguage({ values: { language: { text: 'zz', format: '' } } }),
      (e) => {
        assert.ok(e instanceof ConfigError);
        assert.ok(e.message.includes('zz'), '报文点名这个值：' + e.message);
        assert.ok(e.message.includes('zh') && e.message.includes('en'), '报文列出可用语言：' + e.message);
        return true;
      },
    );
  });

  it('未知值报错并列出可用语言（命令行侧）', () => {
    assert.throws(
      () => resolveLanguage({ values: { language: { text: '', format: '' } }, argv: ['k', '--language', 'zz'] }),
      (e) => {
        assert.ok(e instanceof ConfigError);
        assert.ok(e.message.includes('zh') && e.message.includes('en'));
        return true;
      },
    );
  });

  it('parseLanguageArgs 只收 --language/--format-language（空格式），其余原样忽略', () => {
    assert.deepEqual(
      parseLanguageArgs(['calorie.view.today', '--params', '{}', '--language', 'en', '--timeout', '1000']),
      { language: 'en', formatLanguage: undefined },
    );
    assert.deepEqual(parseLanguageArgs(['k', '--format-language', 'en']), {
      language: undefined,
      formatLanguage: 'en',
    });
    assert.deepEqual(parseLanguageArgs(['k']), { language: undefined, formatLanguage: undefined });
  });

  it('老配置文件没有 language 组也能读：按默认补齐、其余逐项不变（未声明的差异为零）', async () => {
    const home = mkdtempSync(join(tmpdir(), 'ilife-1198-home-'));
    try {
      useHome(home);
      requireIsolatedHome(home);
      mkdirSync(configDirOf(home), { recursive: true });
      const mod = await import('../packages/skill-bill/dist/config.js');
      writeFileSync(
        join(configDirOf(home), 'bill.yaml'),
        'db:\n  dir: \'\'\n  name: biscuit_accountant.db\n  goals: goals.json\n',
        'utf8',
      );
      const loaded = loadConfig('bill', mod.BILL_CONFIG_DEFAULTS, mod.BILL_CONFIG_RETIRED);
      assert.deepEqual(loaded.values.language, { text: '', format: '' });
      assert.equal(loaded.values.db.name, 'biscuit_accountant.db');
      assert.deepEqual(resolveLanguage({ values: loaded.values }), { text: 'zh', format: 'zh' });
    } finally {
      rmSync(home, { recursive: true, force: true });
    }
  });

  it('6 技能默认值表各带 language 组（空串＝跟随调用方，老文件缺组时按默认补）', async () => {
    const mods = await Promise.all([
      import('../packages/skill-bill/dist/config.js'),
      import('../packages/skill-calorie/dist/config.js'),
      import('../packages/skill-chef/dist/config.js'),
      import('../packages/skill-home/dist/config.js'),
      import('../packages/skill-memo-ilife/dist/config.js'),
      import('../packages/skill-schedule/dist/config.js'),
    ]);
    const tables = [
      mods[0].BILL_CONFIG_DEFAULTS,
      mods[1].CALORIE_CONFIG_DEFAULTS,
      mods[2].CHEF_CONFIG_DEFAULTS,
      mods[3].HOME_CONFIG_DEFAULTS,
      mods[4].MEMO_CONFIG_DEFAULTS,
      mods[5].SCHEDULE_CONFIG_DEFAULTS,
    ];
    for (const t of tables) {
      assert.deepEqual(t.language, { text: '', format: '' });
    }
  });
});

/**
 * #1323 · 宿主语言来路：技能 CLI 的 `--caller-language` 入口（进程边界）。
 *
 * 缝：技能唯一出口 `packages/skill-bill/dist/cli/cmd_read.js`（argv+JSON+exit）。
 * 断言来源（非推导）：#1323 票面验收 ②（桌面设置 en ⇒ 不带 `--language` 的回执英文；
 * 设置缺失 ⇒ 中文；显式 `--language` 覆盖 caller）与 ④（非法 caller 报错）。
 * 用 `bill.config.check`（只读、回执标题随语言变）当 tracer。
 * 运行：先 `node node_modules/typescript/bin/tsc -b packages/skill-bill`，
 * 再 `node --test packages/skill-bill/test/i18n-1323-caller.test.mjs`。
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { appendFileSync, mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { billEnv } from './helpers/config-base.mjs';

const here = dirname(fileURLToPath(import.meta.url));
const bin = join(here, '..', 'dist', 'cli', 'cmd_read.js');

function cli(db, args, env = undefined) {
  return spawnSync(process.execPath, [bin, ...args], { cwd: here, encoding: 'utf8', env: env ?? billEnv(db) });
}

/** 回执里的标题（`bill.config.check` 的 config.file 条目）：中文「配置文件」／英文 Config file。 */
function titleOf(result) {
  assert.equal(result.status, 0, 'stderr: ' + result.stderr);
  const parsed = JSON.parse(result.stdout);
  const item = parsed.data.items.find((row) => row.id === 'config.file');
  assert.ok(item, '回执须含 config.file 条目');
  return item.title;
}

const CHECK = ['bill.config.check', '--params', '{}'];

describe('#1323 技能 CLI：--caller-language 是宿主的语言提示', () => {
  it('不给任何语言参数 ⇒ 中文（缺省不变）', () => {
    const db = mkdtempSync(join(tmpdir(), 'bill1323-'));
    assert.equal(titleOf(cli(db, CHECK)), '配置文件');
  });

  it('--caller-language en ⇒ 英文（桌面设置切英文在此生效）', () => {
    const db = mkdtempSync(join(tmpdir(), 'bill1323-'));
    assert.equal(titleOf(cli(db, [...CHECK, '--caller-language', 'en'])), 'Config file');
  });

  it('--language 压过 caller：--language zh --caller-language en ⇒ 中文', () => {
    const db = mkdtempSync(join(tmpdir(), 'bill1323-'));
    assert.equal(titleOf(cli(db, [...CHECK, '--language', 'zh', '--caller-language', 'en'])), '配置文件');
  });

  it('配置文件 language.text 压过 caller（argv ＞ 配置 ＞ caller）', () => {
    const db = mkdtempSync(join(tmpdir(), 'bill1323-'));
    // 现场布好后**再**追加配置，且把这份 env 原样交给子进程：再让它跑一次 billEnv 会把追加的组重写掉。
    const env = billEnv(db);
    appendFileSync(join(db, '.ilife', 'bill.yaml'), 'language:\n  text: zh\n', 'utf8');
    assert.equal(titleOf(cli(db, [...CHECK, '--caller-language', 'en'], env)), '配置文件');
    assert.equal(titleOf(cli(db, [...CHECK, '--language', 'en'], env)), 'Config file');
  });

  it('非法 caller ⇒ 非 0 且点名、列可用语言（不静默回退）', () => {
    const db = mkdtempSync(join(tmpdir(), 'bill1323-'));
    const bad = cli(db, [...CHECK, '--caller-language', 'fr']);
    assert.notEqual(bad.status, 0, '未识别的调用方语言应非 0');
    assert.match(bad.stderr, /调用方偏好/);
    assert.match(bad.stderr, /不认识的语言「fr」/);
    assert.match(bad.stderr, /zh、en/);
  });
});

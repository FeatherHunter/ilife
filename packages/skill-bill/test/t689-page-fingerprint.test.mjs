// t689 · 判据甲（改一次版式只动一处）的靶向测试：账本与当刻产物逐页一致；重录必须声明票号。
// 门的正本：packages/skill-bill/scripts/gen-page-fingerprints.mjs（规格 docs/t685-接口与判据.md §2.1）。
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const GATE = join(here, '..', 'scripts', 'gen-page-fingerprints.mjs');
const LEDGER = join(here, 't689-页面指纹.json');
const LEDGER_EN = join(here, 't689-页面指纹.en.json');

function run(args) {
  return spawnSync(process.execPath, [GATE, ...args], { encoding: 'utf8' });
}

describe('t689 · 判据甲门：页面指纹账本', () => {
  it('账本在仓（test/t689-页面指纹.json）且 44 页齐（写域 32＋分析 B12）', () => {
    assert.ok(existsSync(LEDGER), '账本须入仓：' + LEDGER);
    const ledger = JSON.parse(readFileSync(LEDGER, 'utf8'));
    assert.equal(Object.keys(ledger.pages).length, 44, '账本须记 44 张页');
  });

  it('--check：当刻产物与账本逐页一致（RESULT 44/44、exit 0）', () => {
    const r = run(['--check']);
    assert.equal(r.status, 0, '门须绿：' + r.stdout + r.stderr);
    assert.match(r.stdout, /RESULT: 44\/44/);
    assert.match(r.stdout, /PASS: 44 张页指纹与账本一致/);
  });

  it('重录必须声明票号：--write 不带 --declare-layout-change 即红，且不落盘', () => {
    const before = readFileSync(LEDGER, 'utf8');
    const r = run(['--write']);
    assert.equal(r.status, 1, '须红：' + r.stdout);
    assert.match(r.stdout, /RED 重录必须声明票号/);
    assert.equal(readFileSync(LEDGER, 'utf8'), before, '未声明时不许改账本');
  });

  it('--lang 缺省 zh：RESULT 行无后缀（逐字节不变）', () => {
    const r = run(['--check']);
    assert.equal(r.status, 0, '门须绿：' + r.stdout + r.stderr);
    assert.match(r.stdout, /RESULT: 44\/44/);
    assert.doesNotMatch(r.stdout, /lang=/);
  });

  it('英文列账本在仓（test/t689-页面指纹.en.json）且 44 页齐、与中文账本同形', () => {
    assert.ok(existsSync(LEDGER_EN), '英文列账本须入仓：' + LEDGER_EN);
    const zh = JSON.parse(readFileSync(LEDGER, 'utf8'));
    const en = JSON.parse(readFileSync(LEDGER_EN, 'utf8'));
    assert.deepEqual(Object.keys(en.pages).sort(), Object.keys(zh.pages).sort(), '英文列须与中文列同页集');
    assert.equal(Object.keys(en.pages).length, 44, '英文列须记 44 张页');
  });

  it('--lang en --check：当刻 en 产物与英文列账本逐页一致（RESULT 44/44 lang=en、exit 0）', () => {
    const r = run(['--lang', 'en', '--check']);
    assert.equal(r.status, 0, '门须绿：' + r.stdout + r.stderr);
    assert.match(r.stdout, /RESULT: 44\/44 lang=en/);
    assert.match(r.stdout, /PASS: 44 张页指纹与账本一致/);
  });

  it('--lang en 重录必须声明票号：--write 不带 --declare-layout-change 即红，且不落盘', () => {
    const before = readFileSync(LEDGER_EN, 'utf8');
    const r = run(['--lang', 'en', '--write']);
    assert.equal(r.status, 1, '须红：' + r.stdout);
    assert.match(r.stdout, /RED 重录必须声明票号/);
    assert.equal(readFileSync(LEDGER_EN, 'utf8'), before, '未声明时不许改英文列账本');
  });

  it('--lang 未识别语言即红（不许静默落缺省）', () => {
    const r = run(['--lang', 'ja', '--check']);
    assert.notEqual(r.status, 0, '须红：' + r.stdout + r.stderr);
    assert.match(r.stdout + r.stderr, /未识别语言/);
  });
});

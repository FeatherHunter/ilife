// t689 · 判据乙（场景件不许有块序）的靶向测试：正例走真包，反例走夹具目录（改前的场景件＋现场塞进块位 import）。
// 门的正本：packages/skill-bill/scripts/check-scene-shape.mjs（规格 packages/skill-bill/docs/t685-接口与判据.md §2.2）。
// 反例的两条是「防假绿」自证：门必须当场变红并点名到文件；扫描面为空也必须红（缩面＝放宽）。
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, mkdirSync, copyFileSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const GATE = join(here, '..', 'scripts', 'check-scene-shape.mjs');
const PKG = join(here, '..');
const FIXTURE = join(here, 'fixtures', 't689', 'scene-before-fold.ts');

function gate(root) {
  const args = root === null ? [GATE] : [GATE, '--root', root];
  return spawnSync(process.execPath, args, { encoding: 'utf8' });
}
function tempRoot(name) {
  const root = mkdtempSync(join(tmpdir(), name));
  mkdirSync(join(root, 'src', 'write'), { recursive: true });
  return root;
}

describe('t689 · 判据乙门：场景件只声明差异值', () => {
  it('正例·真包：16 件场景件全合格（RESULT 16/16、exit 0）', () => {
    const r = gate(null);
    assert.equal(r.status, 0, '门须绿：' + r.stdout + r.stderr);
    assert.match(r.stdout, /RESULT: 16\/16/);
    assert.match(r.stdout, /PASS: /);
    assert.ok(r.stdout.startsWith('SCAN-ROOT: '), '须打认口行 SCAN-ROOT');
  });

  it('反例①·改前的场景件（块序还在件里）：当场红且点名到文件:行号', () => {
    const root = tempRoot('t689-shape-old-');
    copyFileSync(FIXTURE, join(root, 'src', 'write', 'scene-plain.ts'));
    const r = gate(root);
    assert.equal(r.status, 1, '须红：' + r.stdout);
    assert.match(r.stdout, /RED .*scene-plain\.ts:\d+ \[乙-1\] import render/);
    assert.match(r.stdout, /RED .*scene-plain\.ts:\d+ \[乙-3\] pageShell\(\.\.\.\)/);
    assert.match(r.stdout, /RESULT: 0\/1/);
    assert.match(r.stdout, /修法：/, '红时必须给修法');
  });

  it('反例②·合格件里塞一行块位 import：改坏必红', () => {
    const root = tempRoot('t689-shape-mut-');
    const good = readFileSync(join(PKG, 'src', 'write', 'scene-expense.ts'), 'utf8');
    writeFileSync(join(root, 'src', 'write', 'scene-expense.ts'),
      good.replace("import type { Scene } from './scene.js';",
        "import { renderDataTable } from 'base-paint/blocks';\nimport type { Scene } from './scene.js';"), 'utf8');
    const r = gate(root);
    assert.equal(r.status, 1, '须红：' + r.stdout);
    assert.match(r.stdout, /RED .*scene-expense\.ts:\d+ \[乙-1\] import renderDataTable/);
  });

  it('反例③·扫描面为空：红（缩面即放宽，不许静默绿）', () => {
    const root = mkdtempSync(join(tmpdir(), 't689-shape-empty-'));
    const r = gate(root);
    assert.equal(r.status, 1);
    assert.match(r.stdout, /扫描面为空/);
    assert.match(r.stdout, /RESULT: 0\/1/);
  });
});

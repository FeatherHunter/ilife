/**
 * tooling/test/test-suite.test.mjs —— #1313：全量测试清单单一事实源的自证。
 *
 * 覆盖四条：
 *   ① expandGlobs 只认单段 *、只返回文件、字典序、去重、缺目录静默跳过；
 *   ② 真仓库 SUITE_GLOBS 每条都展开出至少一个测试文件（清单不过期）；
 *   ③ suiteFiles 与逐条展开一致、无重复、全在盘上；
 *   ④ run-tests.mjs --list 的清单与 suiteFiles 逐字一致（驱动与门跑同一套）。
 */
import { strict as assert } from 'node:assert';
import { spawnSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { test } from 'node:test';

import { REPO_ROOT, SUITE_GLOBS, expandGlobs, suiteFiles } from '../test-suite.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, '..', '..');
const NODE = process.execPath;

test('expandGlobs：单段 *、只收文件、字典序、去重、缺目录静默跳过', () => {
  const root = mkdtempSync(join(tmpdir(), 't1313-glob-'));
  try {
    mkdirSync(join(root, 'test'), { recursive: true });
    mkdirSync(join(root, 'pkg', 'test', 'deep'), { recursive: true });
    writeFileSync(join(root, 'test', 'z.test.mjs'), '');
    writeFileSync(join(root, 'test', 'a.test.mjs'), '');
    writeFileSync(join(root, 'test', 'notes.txt'), '');
    writeFileSync(join(root, 'pkg', 'test', 'b.test.mjs'), '');
    writeFileSync(join(root, 'pkg', 'test', 'deep', 'c.test.mjs'), '');
    writeFileSync(join(root, '.hidden.test.mjs'), '');

    const files = expandGlobs(['test/*.test.mjs', 'pkg/test/*.test.mjs', 'pkg/test/*/*.test.mjs', 'missing/*.test.mjs'], { root });
    assert.deepEqual(files, ['pkg/test/b.test.mjs', 'pkg/test/deep/c.test.mjs', 'test/a.test.mjs', 'test/z.test.mjs'],
      '只展开 .test.mjs、按字典序、目录里的非测试件不收、缺目录跳过');
    assert.deepEqual(expandGlobs(['test/*.test.mjs', 'test/a.test.mjs'], { root }), ['test/a.test.mjs', 'test/z.test.mjs'], '同一文件被两条 glob 命中只算一次');
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test('真仓库清单：每条 glob 都展开出测试文件、全部在盘、无重复', () => {
  for (const glob of SUITE_GLOBS) {
    assert.ok(expandGlobs([glob], { root: ROOT }).length >= 1, 'glob 已过期（一个文件都展开不出）：' + glob);
  }
  const files = suiteFiles({ root: ROOT });
  assert.ok(files.length > 100, '全量套件应有上百件（现为 ' + files.length + '）');
  assert.equal(new Set(files).size, files.length, '清单不得重复');
  assert.deepEqual(files, expandGlobs(SUITE_GLOBS, { root: ROOT }), 'suiteFiles 必须等于 SUITE_GLOBS 的展开结果');
  for (const file of files) {
    assert.ok(file.endsWith('.test.mjs'), '清单里只放测试件：' + file);
    assert.ok(!file.startsWith('/') && !file.includes('\\'), '路径是仓库相对正斜杠：' + file);
  }
});

test('run-tests --list 与 suiteFiles 逐字一致（门与驱动同一套清单）', () => {
  const result = spawnSync(NODE, [join(ROOT, 'tooling', 'run-tests.mjs'), '--list'], { cwd: ROOT, encoding: 'utf8', windowsHide: true });
  assert.equal(result.status, 0, result.stderr);
  const listed = String(result.stdout).split('\n').map((line) => line.replace(/\r$/, '')).filter(Boolean);
  assert.deepEqual(listed, suiteFiles({ root: ROOT }));
});

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const cli = join(root, 'tooling/skilllink.mjs');
// 真 node 定位：npm_node_execpath（pnpm 下）→ PATH 之 node → execPath；逐个 --version 探测，防 Electron 冒充。
function nodeBin() {
  const cands = [process.env.npm_node_execpath, 'node', process.execPath].filter(Boolean);
  for (const c of cands) {
    try {
      const p = spawnSync(c, ['--version'], { encoding: 'utf8' });
      if (p.status === 0 && /^v\d+/.test((p.stdout || '').trim())) return c;
    } catch { /* 试下一个 */ }
  }
  return process.execPath;
}
const NODE = nodeBin();
function run(...a) { return spawnSync(NODE, [cli, ...a], { cwd: root, encoding: 'utf8' }); }

describe('skilllink 契约冻结', () => {
  it('read calorie.today：exit 0 + stdout 纯 JSON envelope 全字段', () => {
    const r = run('read', 'calorie.today');
    assert.equal(r.status, 0);
    const env = JSON.parse(r.stdout);
    assert.equal(env.version, '0.1.0');
    assert.equal(env.skill, 'calorie');
    assert.equal(env.shape, 'list');
    assert.equal(env.key, 'calorie.today');
    assert.ok(Array.isArray(env.data.items));
  });
  it('未知 key：exit 3 + stdout 为空 + stderr 指 key', () => {
    const r = run('read', 'bill.today');
    assert.equal(r.status, 3);
    assert.equal(r.stdout, '');
    assert.match(r.stderr, /key/);
  });
  it('缺 key：exit 2 用法', () => {
    const r = run('read');
    assert.equal(r.status, 2);
  });
  it('--params 非对象：exit 非 0', () => {
    const r = run('read', 'calorie.today', '--params', '[]');
    assert.notEqual(r.status, 0);
  });
  it('--html 落盘 utf8 含 section', () => {
    const p = join(mkdtempSync(join(tmpdir(), 'sk-')), 'out.html');
    const r = run('read', 'calorie.today', '--html', p);
    assert.equal(r.status, 0);
    assert.match(readFileSync(p, 'utf8'), /<section/);
  });
  it('doctor：exit 0', () => {
    const r = run('doctor');
    assert.equal(r.status, 0);
  });
});

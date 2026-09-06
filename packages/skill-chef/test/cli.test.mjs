import { describe, it, before } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const bin = join(here, '..', 'dist', 'cli', 'cmd_read.js');
let DB = '';

function nodeBin() {
  const cands = [process.env.npm_node_execpath, 'node', process.execPath].filter(Boolean);
  for (const c of cands) {
    try {
      const p = spawnSync(c, ['--version'], { encoding: 'utf8' });
      if (p.status === 0 && /^v\d+/.test((p.stdout || '').trim())) return c;
    } catch {}
  }
  return process.execPath;
}
const NODE = nodeBin();
function run(args, envExtra) {
  return spawnSync(NODE, [bin, ...args], { cwd: here, encoding: 'utf8', env: { ...process.env, SKILLS_DB_PATH: DB, ...(envExtra || {}) } });
}
const P = (o) => JSON.stringify(o);

before(() => {
  DB = mkdtempSync(join(tmpdir(), 'chefcli-'));
  assert.equal(run(['chef.recipe.write', '--params', P({ name: '宫保虾球', difficulty: '中等', servings: 2, ingredients: [{ name: '虾仁', category: '海鲜', quantity_text: '300克' }], steps: [{ action: '滑油', heat_level: '大火' }] })]).status, 0);
  assert.equal(run(['chef.recipe.write', '--params', P({ name: '麻婆豆腐', difficulty: '简单', servings: 2, ingredients: [{ name: '嫩豆腐', category: '豆制品', quantity_text: '400克' }], steps: [{ action: '焯水', heat_level: '中火' }] })]).status, 0);
});

describe('私家大厨唯一出口 cmd_read（8 键全票）', () => {
  it('write 加菜→view 闭环→search 命中', () => {
    const v = run(['chef.recipe.view', '--params', P({ name: '宫保虾球' })]);
    assert.equal(v.status, 0);
    const env = JSON.parse(v.stdout);
    assert.equal(env.shape, 'detail');
    assert.equal(env.skill, 'chef');
    const s = run(['chef.recipe.search', '--params', P({ q: '虾球' })]);
    assert.equal(s.status, 0);
    assert.ok(JSON.parse(s.stdout).data.total >= 1);
  });
  it('cooking steps + shopping 合并', () => {
    const c = run(['chef.cooking.run', '--params', P({ name: '宫保虾球' })]);
    assert.equal(c.status, 0);
    assert.ok(JSON.parse(c.stdout).data.steps.length >= 1);
    const q = run(['chef.shopping.query', '--params', P({ names: ['宫保虾球', '麻婆豆腐'] })]);
    assert.equal(q.status, 0);
    assert.ok(JSON.parse(q.stdout).data.total >= 2);
  });
  it('history record/query 闭环 + help 现找', () => {
    assert.equal(run(['chef.history.record', '--params', P({ name: '宫保虾球', rating: 5, feedback: '很香' })]).status, 0);
    const h = run(['chef.history.query', '--params', P({ name: '宫保虾球' })]);
    assert.equal(h.status, 0);
    assert.equal(JSON.parse(h.stdout).data.total, 1);
    const all = run(['chef.help.lookup']);
    assert.equal(all.status, 0);
    assert.equal(JSON.parse(all.stdout).data.total, 35);
    const q = run(['chef.help.lookup', '--params', P({ q: '帮我搜个虾球菜' })]);
    assert.ok(JSON.parse(q.stdout).data.items.some((x) => x.key === 'chef.recipe.search'));
  });
  it('契约：未知 key 3 且 stdout 空；坏参 2；缺 DB 1；空结果 4；--html 落盘', () => {
    const k = run(['chef.nope']);
    assert.equal(k.status, 3);
    assert.equal(k.stdout, '');
    assert.equal(run(['chef.recipe.view', '--params', '[]']).status, 2);
    assert.equal(run(['chef.recipe.view', '--timeout', 'abc']).status, 2);
    assert.equal(run(['chef.recipe.view'], { SKILLS_DB_PATH: '' }).status, 1);
    assert.equal(run(['chef.recipe.search', '--params', P({ q: '不存在的菜xxx' })]).status, 4);
    assert.equal(run(['chef.recipe.view', '--params', P({ name: '不存在的菜xxx' })]).status, 4);
    const p = join(DB, 'out.html');
    const r = run(['chef.recipe.view', '--params', P({ name: '宫保虾球' }), '--html', p]);
    assert.equal(r.status, 0);
    assert.match(readFileSync(p, 'utf8'), /<section/);
  });
});

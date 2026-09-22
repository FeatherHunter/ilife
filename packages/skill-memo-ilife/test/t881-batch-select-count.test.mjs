// #881 · 批量改分类向导：程序化全选/清空后计数与勾选数一致（定义级 ＋ 真出口）。
//
// 背景：点「清空选择」后勾选框与卡片已变，但 `#selCount` 不刷新 —— 程序赋值
// `checked` 不触发 `change`，而计数只在 `change` 监听与初次渲染里更新，
// `selectAll` 漏调了 `updateSelCount()`。本件把修法钉住，改坏必红。
// Q 结论（2026-09-22，维护者「按照推荐的来」）：Q1 用直接调计数（不派发事件）；
// Q2 心愿两页本票不动，只锁本模板。
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { existsSync, mkdtempSync, readdirSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { mkMemoDb, seedNote } from './helpers/memo-sqlite.mjs';
import { mkMemoConfig, stubPathEnv } from './helpers/config-base.mjs';

const here = dirname(fileURLToPath(import.meta.url));
const pkg = join(here, '..');
const BIN = join(pkg, 'dist', 'cli', 'cmd_read.js');
const TEMPLATE = readFileSync(join(pkg, 'templates', 'change_category.html'), 'utf8');

const selectAllBody = () => {
  const m = /function selectAll\(on\)\{([\s\S]*?)\n\}/.exec(TEMPLATE);
  assert.ok(m, '模板须有 selectAll(on) 定义');
  return m[0];
};

describe('#881 · 定义级：selectAll 须刷新计数', () => {
  it('selectAll 末尾调一次 updateSelCount（程序赋值不触发 change，靠这一调同步）', () => {
    assert.ok(/updateSelCount\(\)/.test(selectAllBody()), 'selectAll 体内须含 updateSelCount() 调用，删掉即红');
  });

  it('回归锁：change 监听与初次渲染仍调计数', () => {
    assert.match(TEMPLATE, /addEventListener\('change',function\(e\)\{[^}]*updateSelCount\(\)/, '手动单选路径须保留 change→计数');
    assert.match(TEMPLATE, /document\.getElementById\('selTotal'\)\.textContent=items\(\)\.length;\s*\n\s*updateSelCount\(\)/, '初次渲染须调一次计数');
  });

  it('数据面不受计数器影响：已选行直读勾选框实时状态', () => {
    const m = /function selectedRows\(\)\{([\s\S]*?)\n\}/.exec(TEMPLATE);
    assert.ok(m, '模板须有 selectedRows 定义');
    assert.ok(m[0].includes('cb&&cb.checked'), '已选行须直读勾选框，不经过计数行');
    assert.ok(!m[0].includes('selCount'), '已选行不许读计数行（计数只管显示）');
  });
});

describe('#881 · 真出口：交付页与模板同源（含这一调）', () => {
  it('memo.batch 收集出的向导页里 selectAll 同样带计数刷新', () => {
    const db = mkMemoDb('memo-881-');
    seedNote(db, { content: '买牛奶', category: '备忘' });
    const home = mkMemoConfig({ db: { dir: db } }, 'memo-881-home-');
    const env = stubPathEnv(home, mkdtempSync(join(tmpdir(), 'memo-881-stub-')));
    const r = spawnSync(process.execPath, [BIN, 'memo.batch', '--params', JSON.stringify({ fromCategory: '备忘', toCategory: '打卡' })], { encoding: 'utf8', env });
    assert.equal(r.status, 0, 'stderr=' + String(r.stderr).slice(0, 300));
    const landing = join(db, 'memo_html');
    const files = (existsSync(landing) ? readdirSync(landing) : []).filter((f) => f.startsWith('备忘改分类-批量-向导'));
    assert.equal(files.length, 1, '产物：' + files.join(','));
    const html = readFileSync(join(landing, files[0]), 'utf8');
    const m = /function selectAll\(on\)\{([\s\S]*?)\n\}/.exec(html);
    assert.ok(m, '交付页须含 selectAll 定义');
    assert.ok(/updateSelCount\(\)/.test(m[0]), '交付页的 selectAll 须带计数刷新（模板与交付同源）');
  });
});

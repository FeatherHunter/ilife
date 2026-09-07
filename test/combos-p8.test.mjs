import { describe, it, before } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, readdirSync, chmodSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseRegistryKey, ENVELOPE_SHAPES, createEnvelope, createRegistry } from '../packages/base-link-core/dist/index.js';
import { MEMO_KEY_SHAPES } from '../packages/skill-memo-ilife/dist/render/index.js';
import { VIEW_KEYS, viewShapeFor } from '../packages/skill-calorie/dist/render/index.js';
import { PRESENT_KEYS } from '../packages/base-combos/dist/index.js';
import { combosKeys, renderPresent } from '../packages/base-combos/scripts/gen-present.mjs';
import { buildHelpBlock, START, END } from '../packages/base-combos/scripts/build-help.mjs';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const skilllink = join(root, 'tooling/skilllink.mjs');
const yamlPath = join(root, 'packages/base-combos/combos.yaml');
let DB = '';
let LARK = '';

function nodeBin() {
  const cands = [process.env.npm_node_execpath, 'node', process.execPath].filter(Boolean);
  for (const c of cands) {
    try {
      const p = spawnSync(c, ['--version'], { encoding: 'utf8' });
      if (p.status === 0 && /^v\d+/.test((p.stdout || '').trim())) return c;
    } catch { /* next */ }
  }
  return process.execPath;
}
const NODE = nodeBin();
const env = () => ({ ...process.env, SKILLS_DB_PATH: DB, LARK_CLI_PATH: LARK });
function run(args) { return spawnSync(NODE, args, { cwd: root, encoding: 'utf8', env: env() }); }
function read(key, params) {
  const a = params === undefined ? [key] : [key, '--params', JSON.stringify(params)];
  const r = run([skilllink, 'read', ...a]);
  assert.equal(r.status, 0, key + ' exit ' + r.status + ' stderr=' + r.stderr);
  const e = JSON.parse(r.stdout);
  assert.equal(e.key, key);
  return e;
}

// fake lark-cli（sync 全绿用；与 memo-e2e 同构）+ tmp 种子（真实 DB 零触碰）。
function makeFakeCli(dir) {
  const logic = [
    'const a = process.argv.slice(2);',
    "if (a[0] === '--version') { console.log('lark-cli 9.9.9-fake'); }",
    "else if (a[0] === 'auth' && a[1] === 'status') { console.log(JSON.stringify({ identities: { user: { openId: 'ou_fake' } } })); }",
    "else if (a[0] === 'auth' && a[1] === 'check') { process.exit(a[3] === 'task' ? 0 : 1); }",
    'else { console.error(\'unknown\'); process.exit(2); }',
    '',
  ].join('\n');
  const mjs = join(dir, 'fakelark.mjs');
  writeFileSync(mjs, logic);
  if (process.platform === 'win32') {
    const cmd = join(dir, 'fakelark.cmd');
    writeFileSync(cmd, '@node "' + mjs + '" %*\r\n');
    return cmd;
  }
  const sh = join(dir, 'fakelark');
  writeFileSync(sh, '#!/usr/bin/env node\n' + logic);
  try { chmodSync(sh, 0o755); } catch { /* win 无 exec 位 */ }
  return sh;
}

before(() => {
  DB = mkdtempSync(join(tmpdir(), 'p8-'));
  mkdirSync(join(DB, 'memo'));
  const note = (id, title, body, category) => ({ id, title, body, category, sub: null, createdAt: '2026-09-01', updatedAt: '2026-09-02' });
  writeFileSync(join(DB, 'memo', 'n1.json'), JSON.stringify(note('n1', '去医院', '今天去医院复查', '备忘')));
  writeFileSync(join(DB, 'memo', 'n2.json'), JSON.stringify(note('n2', '跑步', '今天跑了 5 公里', '打卡')));
  LARK = makeFakeCli(DB);
});

describe('P8 combos 真相源与 HELP 注入', () => {
  it('check-combos 全绿（加条目只改 yaml 的门禁）', () => {
    const r = run(['tooling/check-combos.mjs']);
    assert.equal(r.status, 0, r.stderr);
    assert.match(r.stdout, /channels 15 对/);
  });
  it('calorie.today 转正 cmd_read（空库阻断 exit 4，有数 exit 0 由 T11 覆盖）', () => {
    const r = run([skilllink, 'read', 'calorie.today']);
    assert.equal(r.status, 4, 'stderr=' + r.stderr);
    assert.match(r.stderr, /缺失阻断/);
  });
  it('memo 十键取数全通（skilllink spawn 出口，tmp 隔离）', () => {
    assert.equal(read('memo.search', { q: '跑步' }).shape, 'list');
    assert.equal(read('memo.detail', { id: 'n1' }).shape, 'detail');
    const c = read('memo.create', { title: '买奶', category: '备忘' });
    const id = c.data.message.replace('已记一条：', '');
    assert.ok(id.length > 0);
    assert.equal(read('memo.update', { id, done: true }).shape, 'receipt');
    assert.equal(read('memo.remove', { id, confirm: true }).shape, 'receipt');
    assert.equal(read('memo.remind').shape, 'list');
    assert.equal(read('memo.wish').shape, 'list');
    assert.equal(read('memo.sync').shape, 'receipt');
    assert.equal(read('memo.batch').shape, 'receipt');
    assert.equal(read('memo.stats').shape, 'stat');
  });
  it('calorie 四视图取数通（VIEW_KEYS×stat envelope 全字段）', () => {
    for (const k of [VIEW_KEYS.home, VIEW_KEYS.diet, VIEW_KEYS.exercise, VIEW_KEYS.goal]) {
      assert.equal(viewShapeFor(k), 'stat');
      const e = createEnvelope({ skill: 'calorie', shape: 'stat', key: k, data: { metrics: { v: 1 } } });
      assert.equal(e.key, k);
    }
  });
  it('15 对 key×shape 与实现侧一致（memo MEMO_KEY_SHAPES + registry）', () => {
    const reg = createRegistry(PRESENT_KEYS);
    for (const [key, shape] of Object.entries(MEMO_KEY_SHAPES)) {
      assert.equal(reg.resolve(key).key, key);
      assert.ok(ENVELOPE_SHAPES.includes(shape));
    }
    assert.equal(parseRegistryKey('calorie.today').skill, 'calorie');
  });
  it('present.ts == 代码生成输出（手改即挂，加注册条目跑构建）', () => {
    const yaml = readFileSync(yamlPath, 'utf8');
    const want = renderPresent(combosKeys(yaml));
    const got = readFileSync(join(root, 'packages/base-combos/src/present.ts'), 'utf8');
    assert.equal(got.replace(/\r\n/g, '\n'), want);
  });
  it('HELP.md 块 == 构建注入输出（静态文本，36 位+15 对+6 降级+L6 空位）', () => {
    const yaml = readFileSync(yamlPath, 'utf8');
    const text = readFileSync(join(root, 'packages/base-combos/HELP.md'), 'utf8');
    const si = text.indexOf(START), ei = text.indexOf(END);
    assert.ok(si >= 0 && ei > si);
    assert.equal(text.slice(si + START.length, ei).trim(), buildHelpBlock(yaml).trim());
    assert.match(text, /L6\.1/);
  });
  it('HELP 不进运行时（发货代码无 HELP 标记计算）', () => {
    const runtime = [
      join(root, 'tooling/skilllink.mjs'),
      ...readdirSync(join(root, 'packages/base-combos/dist')).filter((f) => f.endsWith('.js')).map((f) => join(root, 'packages/base-combos/dist', f)),
      join(root, 'packages/skill-memo-ilife/dist/cli/cmd_read.js'),
      ...readdirSync(join(root, 'packages/skill-memo-ilife/dist/fetch')).filter((f) => f.endsWith('.js')).map((f) => join(root, 'packages/skill-memo-ilife/dist/fetch', f)),
    ];
    for (const f of runtime) assert.ok(!readFileSync(f, 'utf8').includes('HELP-AUTO'), '运行时含 HELP 计算：' + f);
  });
  it('0 张业务表进说明书（yaml+HELP 无库定义语义）', () => {
    const text = readFileSync(yamlPath, 'utf8') + readFileSync(join(root, 'packages/base-combos/HELP.md'), 'utf8');
    for (const re of [/CREATE\s+TABLE/i, /DROP\s+TABLE/i, /sqlite/i, /\.db\b/, /建表/, /表结构/, /落表/, /数据表/, /schema/i]) {
      assert.ok(!re.test(text), '说明书含业务表语义：' + re);
    }
  });
});

// #734 路线①：dsh-home-ilife 把技能唯一出口开成 agent 工具。
// 判据（票面）：① 入口按包 bin 声明解析（换路径即跟着换，不是字面量）；
// ② PATH 里没有 node 也跑通（工具在宿主进程里用宿主运行时代跑）；
// ③ Electron 形态的 execPath ⇒ 加 ELECTRON_RUN_AS_NODE=1；④ envelope 原样交回；⑤ 缺 key／非 0 出口报人话。
import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { apply, inject, SKILL_TOOL_NAME, resolveSkillEntry, createSkillTool } from '../dist/index.js';

let root;
let fixtureDir;
let fixtureEntry;

before(() => {
  root = mkdtempSync(join(tmpdir(), 't734-'));
  // 桩技能包：清单里声明 bin，入口另住一处（用来证明解析读的是声明，不是字面路径）
  fixtureDir = join(root, 'fixture-skill');
  mkdirSync(join(fixtureDir, 'bin'), { recursive: true });
  writeFileSync(join(fixtureDir, 'package.json'), JSON.stringify({
    name: 'fixture-home', version: '0.0.0', bin: { 'fixture-cmd-read': './bin/entry.mjs' },
  }));
  fixtureEntry = join(fixtureDir, 'bin', 'entry.mjs');
  writeFileSync(fixtureEntry, [
    "const args = process.argv.slice(2);",
    "const key = args[0];",
    "const params = args[1] === '--params' ? args[2] : '{}';",
    "if (key === 'fixture.fail') { process.stderr.write('ERR 4: 取数失败（缺失阻断）'); process.exit(4); }",
    "console.log(JSON.stringify({ key, params: JSON.parse(params), data: { output: '/tmp/x.html' } }));",
  ].join('\n'));
});

after(() => { rmSync(root, { recursive: true, force: true }); });

function stubCtx() {
  const calls = { providers: [], tools: [], effects: [], warns: [], routes: [], rpc: [] };
  const ctx = {
    connection: {
      rpc: { handle: (channel, handler) => { calls.rpc.push([channel, handler]); return () => {}; } },
      fetch: { register: (options) => { calls.routes.push([options.path, options.methods]); return () => {}; } },
    },
    skills: {
      registerProvider: (create) => {
        calls.providers.push(create({ signal: new AbortController().signal, invalidate: () => {} }));
        return () => {};
      },
    },
    tools: { register: (definition) => { calls.tools.push(definition); return () => {}; } },
    effect: (cb, label) => { calls.effects.push(label); return () => {}; },
    logger: { warn: (...a) => calls.warns.push(a), info: () => {}, error: () => {} },
  };
  return { ctx, calls };
}

describe('#734 agent 工具：技能唯一出口的宿主调用通道', () => {
  it('inject 声明 tools；apply 注册一个同名工具，交付通道不受影响', () => {
    assert.ok(inject.includes('tools'), '用了 tools 面就要声明');
    const { ctx, calls } = stubCtx();
    apply(ctx);
    assert.equal(calls.tools.length, 1, '须注册一个 agent 工具');
    assert.equal(calls.tools[0].name, SKILL_TOOL_NAME);
    assert.deepEqual(calls.routes.map(([p]) => p), ['/api/ilife-home-ilife'], 'RPC 通道照常注册');
    assert.ok(calls.tools[0].output && typeof calls.tools[0].output.render === 'function', '形状须合 register 的要求');
  });

  it('入口按包 bin 声明解析（不是字面路径）', () => {
    assert.equal(resolveSkillEntry(fixtureDir), fixtureEntry);
    const other = join(root, 'other-skill');
    mkdirSync(join(other, 'dist', 'cli'), { recursive: true });
    writeFileSync(join(other, 'package.json'), JSON.stringify({ name: 'o', bin: { 'o-cmd-read': './dist/cli/cmd_read.js' } }));
    assert.equal(resolveSkillEntry(other), join(other, 'dist', 'cli', 'cmd_read.js'));
  });

  it('PATH 里没有 node 也跑通（宿主运行时代跑，工具不读 PATH）', async () => {
    const tool = createSkillTool({ entry: () => fixtureEntry, execPath: () => process.execPath });
    const saved = process.env.PATH;
    process.env.PATH = join(root, 'empty-path-dir'); // 该目录不存在，PATH 里没有任何可执行文件
    try {
      const out = await tool.execute({ key: 'home.help.lookup', params: { mode: 'file' } });
      const parsed = JSON.parse(out);
      assert.equal(parsed.key, 'home.help.lookup');
      assert.equal(parsed.data.output, '/tmp/x.html');
    } finally {
      process.env.PATH = saved;
    }
  });

  it('Electron 形态的宿主 ⇒ spawn 带 ELECTRON_RUN_AS_NODE=1，argv 指向包内入口', async () => {
    const seen = [];
    const tool = createSkillTool({
      entry: () => fixtureEntry,
      execPath: () => 'C:\\Program Files\\DSH Desktop\\DSH Desktop.exe',
      run: (bin, argv, env) => {
        seen.push({ bin, argv: [...argv], env });
        return { status: 0, stdout: JSON.stringify({ key: argv[1], data: { output: '/tmp/x.html' } }), stderr: '' };
      },
    });
    const out = await tool.execute({ key: 'home.item.search' });
    assert.equal(seen.length, 1);
    assert.equal(seen[0].bin, 'C:\\Program Files\\DSH Desktop\\DSH Desktop.exe');
    assert.equal(seen[0].env.ELECTRON_RUN_AS_NODE, '1');
    assert.equal(seen[0].argv[0], fixtureEntry, '第一个参数须是包内入口（按 bin 解析出来的）');
    assert.equal(seen[0].argv[1], 'home.item.search');
    assert.deepEqual(seen[0].argv.slice(2), ['--params', '{}']);
    assert.equal(JSON.parse(out).data.output, '/tmp/x.html');
  });

  it('缺 key／出口非 0 都报人话（不吐原始 JSON）', async () => {
    const tool = createSkillTool({ entry: () => fixtureEntry, execPath: () => process.execPath });
    await assert.rejects(() => tool.execute({}), /缺 key/);
    await assert.rejects(() => tool.execute({ key: 'fixture.fail' }), /exit=4.*缺失阻断/s);
  });
});

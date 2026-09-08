// #56 agent 回路：桩 ctx 抓打包技能提供方，list/get 断言（实施前必红：inject 无 skills、零注册）。
// badge 同形（dsh-skill-badge）：rank 内联 600、source bundled、名用 skill-calorie；
// 单份 SKILL.md 按包名解析，不复制。面板/桥行为由本包既有烟囱看守，本文件只断言新增面。
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { apply, inject, PROVIDER_NAME, SKILL_NAME, BUNDLED_SKILL_RANK } from '../dist/index.js';

function stubCtx() {
  const calls = { rpc: [], providers: [], effects: [], warns: [] };
  const ctx = {
    connection: {
      rpc: {
        handle: (channel, handler) => {
          calls.rpc.push([channel, handler]);
          return () => {};
        },
      },
    },
    skills: {
      registerProvider: (create) => {
        const control = { signal: new AbortController().signal, invalidate: () => {} };
        calls.providers.push(create(control));
        return () => {};
      },
    },
    effect: (cb, label) => {
      calls.effects.push(label);
      return () => {};
    },
    logger: { warn: (...a) => calls.warns.push(a), info: () => {}, error: () => {} },
  };
  return { ctx, calls };
}

describe('#56 打包技能提供方（卡路里样板）', () => {
  it('inject 声明 connection + skills（用了就声明）', () => {
    assert.ok(Array.isArray(inject), 'inject 须为数组');
    assert.ok(inject.includes('connection'), 'RPC 通道仍需 connection');
    assert.ok(inject.includes('skills'), '打包技能提供方需声明 skills');
  });

  it('apply 注册且仅注册一个提供方，RPC 通道不受影响', () => {
    const { ctx, calls } = stubCtx();
    apply(ctx);
    assert.equal(calls.providers.length, 1, '须注册一个技能提供方');
    assert.equal(calls.providers[0].name, PROVIDER_NAME);
    assert.deepEqual(calls.rpc.map(([c]) => c), ['/ilife-calorie'], 'RPC 通道注册不变');
  });

  it('list 给出唯一的 skill-calorie 摘要（bundled/600/单份 SKILL.md）', async () => {
    const { ctx, calls } = stubCtx();
    apply(ctx);
    const list = await calls.providers[0].list({});
    assert.equal(list.length, 1, '有且仅有一个打包技能');
    const [c] = list;
    assert.equal(c.name, SKILL_NAME);
    assert.equal(c.name, 'skill-calorie');
    assert.ok(typeof c.description === 'string' && c.description.length > 0, '描述非空（取自 SKILL.md frontmatter）');
    assert.equal(c.provider, PROVIDER_NAME, 'candidate.provider 须等于注册名（宿主校验红线）');
    assert.equal(c.source, 'bundled');
    assert.equal(c.rank, BUNDLED_SKILL_RANK);
    assert.equal(c.rank, 600);
    assert.equal(c.invocation?.modelInvocable, true);
    assert.equal(c.invocation?.userInvocable, true);
    assert.equal(c.resourceBase?.kind, 'directory');
    const skillMd = join(String(c.resourceBase.path), 'SKILL.md');
    assert.ok(existsSync(skillMd), 'resourceBase 须指向含单份 SKILL.md 的技能包根：' + skillMd);
    // 单份性：读到的描述与包内 SKILL.md frontmatter 同值（非插件内第二份拷贝）。
    const raw = readFileSync(skillMd, 'utf8');
    assert.ok(raw.includes(`name: ${SKILL_NAME}`), 'SKILL.md frontmatter 名须为 skill-calorie');
    assert.ok(raw.includes(String(c.description).slice(0, 12)), '摘要描述须与 SKILL.md 同源');
  });

  it('get 给全文（frontmatter 后正文，可调 CLI），过期候选失效', async () => {
    const { ctx, calls } = stubCtx();
    apply(ctx);
    const [c] = await calls.providers[0].list({});
    const def = await calls.providers[0].get(c, {});
    assert.ok(def, '命中候选须给全文');
    assert.equal(def.name, c.name);
    assert.equal(def.description, c.description);
    assert.equal(def.provider, PROVIDER_NAME);
    assert.equal(def.source, 'bundled');
    assert.ok(typeof def.content === 'string' && def.content.length > 100, '正文非空');
    assert.ok(def.content.includes('calorie-cmd-read'), '正文须含唯一出口调用形');
    assert.ok(!def.content.startsWith('---'), '正文须为 frontmatter 后（filesystem 同形），不带头');
    const stale = await calls.providers[0].get({ ...c, name: 'skill-not-here' }, {});
    assert.equal(stale, undefined, '过期候选须失效（宿主 get 契约）');
  });

  it('重装配时提供方重名退让（抛 already registered 不炸，RPC 照常）', () => {
    const { ctx, calls } = stubCtx();
    ctx.skills.registerProvider = () => {
      throw new Error('a skill provider named "dsh-calorie" is already registered');
    };
    assert.doesNotThrow(() => apply(ctx), '重名退让不得抛');
    assert.deepEqual(calls.rpc.map(([c]) => c), ['/ilife-calorie'], '退让后 RPC 照常注册');
    assert.ok(calls.warns.length >= 1, '退让须 warn 留痕');
  });
});

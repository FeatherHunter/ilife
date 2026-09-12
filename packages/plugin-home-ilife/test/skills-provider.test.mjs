// #193 agent 回路：桩 ctx 抓打包技能提供方，list/get 断言（#56 卡路里／#150 记账／#206 作息样板同形）。
// 锁五件：① inject 声明 skills；② apply 注册且只注册一个提供方、重名退让不炸；
// ③ list 给唯一的 skill-home 摘要（bundled/600/单份 SKILL.md 按包名解析、不复制）；
// ④ get 给全文（frontmatter 后正文，含唯一出口调用形），过期候选失效；
// ⑤ 打包清单必须带 SKILL.md（少了它，安装态提供方读不到说明面——本票实测的断链点）。
// 另加本技能特有的一把锁：说明面主唤醒词「居家管家 帮助」（老家 SKILL.md 的 help_wake_word）
// 必须出现在 description 里，否则 agent 认不出本技能就是居家管家那条路。
// 再加两条（整改补，B 席反例 1）：退让只认 already registered，**他错必重抛**——原 7 条对
// `index.ts` 那句条件抛零覆盖（改成 `if (false) throw error` 仍全绿）。
// 注意：全量唤醒词清单与「HELP 交付」正文节属票 9（#192），本用例不锁它们，免越界钉死别人要改的说明面。
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { join } from 'node:path';
import { apply, inject, PROVIDER_NAME, SKILL_NAME, BUNDLED_SKILL_RANK } from '../dist/index.js';

/** 解析工作区里的技能包（插件 dependencies 已声明 skill-home）。 */
const require = createRequire(import.meta.url);

/** 老家 help_wake_word（本图目的地的触发词）；frontmatter 与 description 都要认得住它。 */
const HELP_WAKE_WORD = '居家管家 帮助';

function stubCtx() {
  const calls = { providers: [], warns: [] };
  const ctx = {
    skills: {
      registerProvider: (create) => {
        const control = { signal: new AbortController().signal, invalidate: () => {} };
        calls.providers.push(create(control));
        return () => {};
      },
    },
    logger: { warn: (...a) => calls.warns.push(a), info: () => {}, error: () => {} },
  };
  return { ctx, calls };
}

describe('#193 打包技能提供方（居家线）', () => {
  it('inject 声明 skills（用了就声明）', () => {
    assert.ok(Array.isArray(inject), 'inject 须为数组');
    assert.ok(inject.includes('skills'), '打包技能提供方需声明 skills');
  });

  it('apply 注册且仅注册一个提供方', () => {
    const { ctx, calls } = stubCtx();
    apply(ctx);
    assert.equal(calls.providers.length, 1, '须注册一个技能提供方');
    assert.equal(calls.providers[0].name, PROVIDER_NAME);
  });

  it('list 给出唯一的 skill-home 摘要（bundled/600/单份 SKILL.md）', async () => {
    const { ctx, calls } = stubCtx();
    apply(ctx);
    const list = await calls.providers[0].list({});
    assert.equal(list.length, 1, '有且仅有一个打包技能');
    const [c] = list;
    assert.equal(c.name, SKILL_NAME);
    assert.equal(c.name, 'skill-home');
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
    const raw = readFileSync(skillMd, 'utf8');
    assert.ok(raw.startsWith('---\n'), 'SKILL.md 须以 YAML frontmatter 开头（缺头会让 skills-cli 整包跳过）');
    assert.ok(raw.includes(`name: ${SKILL_NAME}`), 'SKILL.md frontmatter 名须为 skill-home');
    assert.ok(raw.includes(String(c.description).slice(0, 12)), '摘要描述须与 SKILL.md 同源');
  });

  it('get 给全文（frontmatter 后正文，含唯一出口），过期候选失效', async () => {
    const { ctx, calls } = stubCtx();
    apply(ctx);
    const [c] = await calls.providers[0].list({});
    const def = await calls.providers[0].get(c, {});
    assert.ok(def, '命中候选须给全文');
    assert.equal(def.name, c.name);
    assert.equal(def.provider, PROVIDER_NAME);
    assert.ok(typeof def.content === 'string' && def.content.length > 100, '正文非空');
    assert.ok(def.content.includes('home-cmd-read'), '正文须含唯一出口调用形');
    assert.ok(!def.content.startsWith('---'), '正文须为 frontmatter 后（filesystem 同形），不带头');
    const stale = await calls.providers[0].get({ ...c, name: 'skill-not-here' }, {});
    assert.equal(stale, undefined, '过期候选须失效（宿主 get 契约）');
  });

  it('重装配时提供方重名退让（抛 already registered 不炸，且 warn 留痕）', () => {
    const { ctx, calls } = stubCtx();
    ctx.skills.registerProvider = () => {
      throw new Error('a skill provider named "dsh-home-ilife" is already registered');
    };
    assert.doesNotThrow(() => apply(ctx), '重名退让不得抛');
    assert.ok(calls.warns.length >= 1, '退让须 warn 留痕');
  });

  // B 席反例 1：把 index.ts:32 的条件抛改成无条件吞错（if (false) throw error），原 7 条仍全绿
  // ⇒「他错重抛」此前零锁。以下两条把它锁死：退让（含 already registered）不抛，他错必抛。
  it('重名退让之外的一切错误必须原样重抛（他错不吞）', () => {
    const { ctx } = stubCtx();
    const boom = new Error('skills registry is not available');
    ctx.skills.registerProvider = () => {
      throw boom;
    };
    assert.throws(
      () => apply(ctx),
      (e) => e === boom,
      '非「already registered」的错误须原样重抛（吞掉＝宿主故障被静默）',
    );
  });

  it('退让只认 already registered（错误文案里没有这句即须重抛）', () => {
    const { ctx, calls } = stubCtx();
    ctx.skills.registerProvider = () => {
      throw new Error('provider limit reached for dsh-home-ilife');
    };
    assert.throws(() => apply(ctx), /provider limit reached/, '近义文案不得被当退让吞掉');
    assert.equal(calls.warns.length, 0, '未退让时不得留退让警告');
  });

  it('说明面认得住主唤醒词：description 含老家的 help_wake_word', async () => {
    const { ctx, calls } = stubCtx();
    apply(ctx);
    const [c] = await calls.providers[0].list({});
    assert.ok(String(c.description).includes(HELP_WAKE_WORD), 'description 须含「' + HELP_WAKE_WORD + '」');
    const raw = readFileSync(join(String(c.resourceBase.path), 'SKILL.md'), 'utf8');
    assert.ok(raw.includes('help_wake_word: "' + HELP_WAKE_WORD + '"'), 'frontmatter 须带老家同值 help_wake_word');
  });

  it('打包清单带 SKILL.md（安装态提供方能读到说明面）', () => {
    const skillPkg = JSON.parse(readFileSync(require.resolve('skill-home/package.json'), 'utf8'));
    assert.ok(skillPkg.files.includes('SKILL.md'), 'skill-home files 须含 SKILL.md（缺它＝安装态断链）');
  });
});

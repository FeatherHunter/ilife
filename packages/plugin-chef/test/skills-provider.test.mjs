// #218 agent 回路：桩 ctx 抓打包技能提供方，list/get 断言（#150 记账／#56 卡路里样板同形）。
// 锁四件：① inject 声明 skills；② apply 注册且只注册一个提供方、重名退让不炸；
// ③ list 给唯一的 skill-chef 摘要（bundled/600/单份 SKILL.md 按包名解析、不复制）；
// ④ get 给全文（frontmatter 后正文，含唯一出口调用形）；
// 另加本技能特有的三把锁：description 必须覆盖 WAKE_TABLE 全部 37 条唤醒词（说明面与路由表不许漂移）、
// 打包清单必须带 SKILL.md（少了它，安装态提供方读不到说明面——实测的断链点之一）、
// SKILL_NAME 常量必须与 SKILL.md frontmatter 实测值逐字一致（不然插件内会硬编码出第二份名）。
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { join } from 'node:path';
import { apply, inject, PROVIDER_NAME, SKILL_NAME, BUNDLED_SKILL_RANK, SKILL_FILE, skillDir, parseSkillText } from '../dist/index.js';
import { WAKE_TABLE } from 'skill-chef/policy';

/** 解析工作区里的技能包（插件 dependencies 已声明 skill-chef）。 */
const require = createRequire(import.meta.url);

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

describe('#218 打包技能提供方（大厨线）', () => {
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

  it('list 给出唯一的 skill-chef 摘要（bundled/600/单份 SKILL.md）', async () => {
    const { ctx, calls } = stubCtx();
    apply(ctx);
    const list = await calls.providers[0].list({});
    assert.equal(list.length, 1, '有且仅有一个打包技能');
    const [c] = list;
    assert.equal(c.name, SKILL_NAME);
    assert.equal(c.name, 'skill-chef');
    assert.ok(typeof c.description === 'string' && c.description.length > 0, '描述非空（取自 SKILL.md frontmatter）');
    assert.equal(c.provider, PROVIDER_NAME, 'candidate.provider 须等于注册名（宿主校验红线）');
    assert.equal(c.source, 'bundled');
    assert.equal(c.rank, BUNDLED_SKILL_RANK);
    assert.equal(c.rank, 600);
    assert.equal(c.invocation?.modelInvocable, true);
    assert.equal(c.invocation?.userInvocable, true);
    assert.equal(c.resourceBase?.kind, 'directory');
    const skillMd = join(String(c.resourceBase.path), SKILL_FILE);
    assert.ok(existsSync(skillMd), 'resourceBase 须指向含单份 SKILL.md 的技能包根：' + skillMd);
    const raw = readFileSync(skillMd, 'utf8');
    assert.ok(raw.includes(`name: ${SKILL_NAME}`), 'SKILL.md frontmatter 名须为 skill-chef');
    assert.ok(raw.includes(String(c.description).slice(0, 12)), '摘要描述须与 SKILL.md 同源');
    // 按包名解析（不复制）：resolve 出来的包根须与提供方给的是同一个目录。
    assert.equal(skillDir(), c.resourceBase.path, 'skillDir 须与 resourceBase 同源（按包名解析，不复制第二份）');
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
    assert.ok(def.content.includes('chef-cmd-read'), '正文须含唯一出口调用形');
    assert.ok(def.content.includes('chef.help.lookup'), '正文须含 HELP 那条命令');
    assert.ok(!def.content.startsWith('---'), '正文须为 frontmatter 后（filesystem 同形），不带头');
    const stale = await calls.providers[0].get({ ...c, name: 'skill-not-here' }, {});
    assert.equal(stale, undefined, '过期候选须失效（宿主 get 契约）');
  });

  it('重装配时提供方重名退让（抛 already registered 不炸，且 warn 留痕）', () => {
    const { ctx, calls } = stubCtx();
    ctx.skills.registerProvider = () => {
      throw new Error('a skill provider named "dsh-chef" is already registered');
    };
    assert.doesNotThrow(() => apply(ctx), '重名退让不得抛');
    assert.ok(calls.warns.length >= 1, '退让须 warn 留痕');
  });

  it('说明面与路由表不漂移：description 覆盖 WAKE_TABLE 全部唤醒词', async () => {
    const { ctx, calls } = stubCtx();
    apply(ctx);
    const [c] = await calls.providers[0].list({});
    const missing = WAKE_TABLE.map((e) => e.phrase).filter((p) => !String(c.description).includes(p));
    assert.deepEqual(missing, [], 'description 少列这些唤醒词（改 WAKE_TABLE 即须同步说明面）');
    assert.ok(String(c.description).startsWith('「私家大厨HELP」'), '带头词：先说「私家大厨HELP」这条主路');
  });

  it('打包清单带 SKILL.md（安装态提供方能读到说明面）', () => {
    const skillPkg = JSON.parse(readFileSync(require.resolve('skill-chef/package.json'), 'utf8'));
    assert.ok(skillPkg.files.includes('SKILL.md'), 'skill-chef files 须含 SKILL.md（缺它＝安装态断链）');
  });

  it('SKILL_NAME 常量与 SKILL.md frontmatter 实测值逐字一致（不硬编码第二份名）', async () => {
    const parsed = parseSkillText(readFileSync(join(skillDir(), SKILL_FILE), 'utf8'));
    assert.ok(parsed, 'SKILL.md 须有合法 frontmatter（name＋description，缺任一即整包跳过）');
    assert.equal(parsed.name, SKILL_NAME, 'SKILL.md frontmatter name 与 SKILL_NAME 走散');
    assert.equal(parsed.name, 'skill-chef');
  });
});

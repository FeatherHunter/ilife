// #232 agent 回路：桩 ctx 抓打包技能提供方，list/get 断言（#150 记账／#218 大厨样板同形）。
// 锁四件：① inject 声明 skills；② apply 注册且只注册一个提供方、重名退让不炸；
// ③ list 给唯一的 skill-memo-ilife 摘要（bundled/600/单份 SKILL.md 按包名解析、不复制）；
// ④ get 给全文（frontmatter 后正文，含唯一出口调用形）；
// 另加本技能特有的四把锁：list 返回的 description 必须逐字等于 frontmatter 实测描述
// （少了它，frontmatter 写错口径也跑得过去——复审 E 实测的缺口）、
// description 的触发词必须是用户裁定带空格的唯一入口「备忘录 HELP」、
// 打包清单必须带 SKILL.md（少了它，安装态提供方读不到说明面——实测的断链点之一）、
// SKILL_NAME 常量必须与 SKILL.md frontmatter 实测值逐字一致（不然插件内会硬编码出第二份名）。
// #231 起 get 那条再加两把：正文须写 HELP 那条命令（旧条件断言翻正向）＋ 缺省产物名通式
// （少了后者，正向断言会被构建期注入块「相关场景：…」白捡）。
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { join } from 'node:path';
import { apply, inject, PROVIDER_NAME, SKILL_NAME, BUNDLED_SKILL_RANK, SKILL_FILE, skillDir, parseSkillText } from '../dist/index.js';
import { buildHelpLookup } from 'skill-memo-ilife';

/** 解析工作区里的技能包（插件 dependencies 已声明 skill-memo-ilife）。 */
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
    // apply 除注册提供方外还要装 RPC 通道（#80：ctx.connection.fetch.register）＋登记清理；
    // 本回路只看提供方，通道用最小桩顶着，不重复 smoke 已覆盖的通道断言。
    connection: { fetch: { register: () => () => {} } },
    effect: () => () => {},
    logger: { warn: (...a) => calls.warns.push(a), info: () => {}, error: () => {} },
  };
  return { ctx, calls };
}

describe('#232 打包技能提供方（备忘录线）', () => {
  it('inject 声明 skills（用了就声明）', () => {
    assert.ok(Array.isArray(inject), 'inject 须为数组');
    assert.ok(inject.includes('skills'), '打包技能提供方需声明 skills');
    assert.ok(inject.includes('connection') && inject.includes('webServer'), '原有 RPC 通道声明不得丢');
  });

  it('apply 注册且仅注册一个提供方', () => {
    const { ctx, calls } = stubCtx();
    apply(ctx);
    assert.equal(calls.providers.length, 1, '须注册一个技能提供方');
    assert.equal(calls.providers[0].name, PROVIDER_NAME);
  });

  it('list 给出唯一的 skill-memo-ilife 摘要（bundled/600/单份 SKILL.md）', async () => {
    const { ctx, calls } = stubCtx();
    apply(ctx);
    const list = await calls.providers[0].list({});
    assert.equal(list.length, 1, '有且仅有一个打包技能');
    const [c] = list;
    assert.equal(c.name, SKILL_NAME);
    assert.equal(c.name, 'skill-memo-ilife');
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
    assert.ok(raw.includes('name: ' + SKILL_NAME), 'SKILL.md frontmatter 名须为 skill-memo-ilife');
    // ⭐ 焊死「list 返回的 description ＝ frontmatter 那一段」：少了这条，frontmatter 写错口径
    // （入口形／触发词）也跑得过去——复审 E 实测的就是这个缺口。
    const parsedFromFile = parseSkillText(raw);
    assert.ok(parsedFromFile, 'SKILL.md 须有合法 frontmatter');
    assert.equal(c.description, parsedFromFile.description, 'list 返回的描述须逐字等于 frontmatter 实测描述（错形拦在这里）');
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
    assert.ok(def.content.includes('memo-cmd-read'), '正文须含唯一出口调用形');
    // `memo.help.lookup`：#229 已把命令建进技能（`dist/render/envelope.js` 实测有它），#231 已把说明面写成文，
    // 故本条按票面交接项翻成**无条件正向断言**（旧的条件断言＝「正文不含它或命令存在」，翻向后不再需要）。
    assert.ok(def.content.includes('memo.help.lookup'), '正文须含 HELP 那条命令 memo.help.lookup（#231 说明面）');
    // ⭐ 上一条能被构建期注入块「相关场景：…」白捡（那块里本来就列了 memo.help.lookup），
    // 故再钉一条只认说明面正文的：缺省产物名通式（裁决 1，扁平落 memo_html/、不加 help/ 一层）。
    assert.ok(def.content.includes('备忘录_HELP_<YYYYMMDD_HHMMSS>.html'),
      '正文须写明缺省交付物名通式 备忘录_HELP_<YYYYMMDD_HHMMSS>.html（#231：缺省即交付物）');
    assert.ok(def.content.includes('<!-- HELP-AUTO-START -->'), '正文须含构建期注入的速查标记块');
    assert.ok(!def.content.startsWith('---'), '正文须为 frontmatter 后（filesystem 同形），不带头');
    const stale = await calls.providers[0].get({ ...c, name: 'skill-not-here' }, {});
    assert.equal(stale, undefined, '过期候选须失效（宿主 get 契约）');
  });

  it('重装配时提供方重名退让（抛 already registered 不炸，且 warn 留痕）', () => {
    const { ctx, calls } = stubCtx();
    ctx.skills.registerProvider = () => {
      throw new Error('a skill provider named "dsh-memo-ilife" is already registered');
    };
    assert.doesNotThrow(() => apply(ctx), '重名退让不得抛');
    assert.ok(calls.warns.length >= 1, '退让须 warn 留痕');
  });

  it('说明面与速查表口径：速查块覆盖全部唤醒词，简介说明主路', async () => {
    const { ctx, calls } = stubCtx();
    apply(ctx);
    const [c] = await calls.providers[0].list({});
    const phrases = [...new Set(buildHelpLookup().map((h) => h.phrase))];
    assert.equal(phrases.length, 28, '速查表唤醒词条数变了：改路由表即须同步说明面');
    assert.ok(String(c.description).startsWith('「备忘录HELP」'), '带头词：先说「备忘录HELP」这条主路');
    // ⭐ 入口口径（用户 2026-09-12 裁定，出处 map-220-body.md:41／t226-amendment.md:5-7／t224-decision-draft.md:83）：
    // 新技能的 HELP 入口**只认 1 条**，写法是带空格的 `备忘录 HELP`（不分大小写）。description 是 agent
    // 在技能表里唯一看得到的触发说明——写成无空格形就是另一个字符串，故这里逐字焊住（复审 E 打假 8）。
    // ⚠️ 已知缺口：主唤醒词与能力面已写进 description，但 28 条速查唤醒词**没有**逐条进
    // frontmatter description（用户 2026-09-12 裁定：新技能只认「备忘录 HELP」一条入口，
    // 其余 27 条是场景别名，住在正文速查块，不进技能表简介）。
    // 故这里只锁「速查块自己覆盖得到」，不逼 description 逐条列——照大厨那张图的写法会逼出
    // 一份与用户裁定相反的长简介。要不要逐条进简介，归 #231（SKILL.md 说明面）裁。
    const inBody = readFileSync(join(skillDir(), SKILL_FILE), 'utf8');
    const missingInBody = phrases.filter((p) => !inBody.includes(p));
    assert.deepEqual(missingInBody, [], '速查块须覆盖全部唤醒词（说明面可以简，速查表不许缺）');
    assert.ok(String(c.description).includes('触发词：备忘录 HELP（不分大小写）'),
      'description 的触发词须写用户裁定的唯一入口「备忘录 HELP」（带空格，不分大小写）');
    assert.ok(c.description.length > 40, '简介须说清这是什么技能（名＋用途）');
  });

  it('打包清单带 SKILL.md（安装态提供方能读到说明面）', () => {
    const skillPkg = JSON.parse(readFileSync(require.resolve('skill-memo-ilife/package.json'), 'utf8'));
    assert.ok(skillPkg.files.includes('SKILL.md'), 'skill-memo-ilife files 须含 SKILL.md（缺它＝安装态断链）');
  });

  it('SKILL_NAME 常量与 SKILL.md frontmatter 实测值逐字一致（不硬编码第二份名）', async () => {
    const parsed = parseSkillText(readFileSync(join(skillDir(), SKILL_FILE), 'utf8'));
    assert.ok(parsed, 'SKILL.md 须有合法 frontmatter（name＋description，缺任一即整包跳过）');
    assert.equal(parsed.name, SKILL_NAME, 'SKILL.md frontmatter name 与 SKILL_NAME 走散');
    assert.equal(parsed.name, 'skill-memo-ilife');
  });

  it('name 正则与宿主逐字同值（比宿主宽一格会塌全机技能目录）', () => {
    // 宿主：dsh-skill/lib/index.js:17 `const SKILL_NAME = /^[a-z0-9]+(?:-[a-z0-9]+)*$/`
    // 不合格候选会在宿主 validateCandidate（同文件 :360，该处无 try）抛出 →
    // dsh-tool-skill/lib/index.js:207 每次模型请求的 ctx.skills.snapshot()（全文无 try）→ 全机技能目录一起塌。
    // 故：插件侧只许与宿主同宽或更严，绝不许更宽。
    assert.match(SKILL_NAME, /^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'SKILL_NAME 常量须合宿主正则');
    assert.ok(parseSkillText('---\nname: skill-memo-ilife\ndescription: x\n---\nbody'), '合法名须放行');
    for (const bad of ['Skill-Memo-Ilife', 'skill_memo_ilife', 'skill--memo', '-skill-memo', 'skill memo', 'skill-memo-', '备忘录', 'skill.memo']) {
      assert.equal(parseSkillText('---\nname: ' + bad + '\ndescription: x\n---\nbody'), null,
        '宿主会拒的名，插件必须也拒（放行即全机技能目录塌）：' + bad);
    }
  });
});

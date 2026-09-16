// #242 · 两处错位变异锁（模板为准改 schema，模板逐字不动）。
//
// 覆盖：
//  ① `contact.items[].url`（布尔旗标或字符串皆收）不再 `schema-invalid`，且带标＋值以 http 开头渲染成 `<a>`；
//  ② `init_banner.steps` 对象形 `{title,desc}` 不再 `schema-invalid`，且标题与说明皆有文案；
// 回归：旧形（纯串步、无标联系人）仍绿；非法（数字步、数字 url）仍 `schema-invalid`。
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { HelpSchemaError, renderHelpShell } from '../dist/help.js';
import { CONTROL_STYLE_SECTIONS, HELP_SHELL_ID, STYLE_PREFIX } from '../dist/index.js';

const HELP_SECTION = CONTROL_STYLE_SECTIONS.find(
  (section) => STYLE_PREFIX + section.replace(/[A-Z]/g, (ch) => '-' + ch.toLowerCase()) === HELP_SHELL_ID,
) ?? '';
const CLS = STYLE_PREFIX + HELP_SECTION.replace(/[A-Z]/g, (ch) => '-' + ch.toLowerCase());
const ASSETS = { sharedHelpersJs: '(function(){return 1;})();', sharedCssText: '.x{color:red}' };

function baseData() {
  return {
    skill_name: '备忘录',
    title: '使用手册',
    groups: [
      {
        id: 'g', label: '组', subgroups: [
          {
            id: 's', label: '子', scenes: [
              { id: 'a', title: '场景', wake_word: '唤醒', status: '', prompt_template: '做事' },
            ],
          },
        ],
      },
    ],
  };
}

function attempt(data) {
  try {
    return { output: renderHelpShell({ sceneData: data, assets: ASSETS }), error: null };
  } catch (error) {
    return { output: null, error };
  }
}

describe('#242 缺陷一 contact.items[].url', () => {
  it('红绿：带 url:true 的联系人须过校验且渲染成可点链接', () => {
    const data = baseData();
    data.contact = {
      items: [
        { label: 'GitHub', value: 'https://github.com/FeatherHunter/SKILLS', url: true },
        { label: 'Issues', value: 'https://github.com/FeatherHunter/SKILLS/issues', url: true },
      ],
    };
    const { output, error } = attempt(data);
    assert.equal(error, null, '带 url:true 不得判 schema-invalid，实为：' + (error && error.message));
    assert.ok(output.html.includes('<a'), '带标联系人须渲染成 <a>');
    assert.ok(output.html.includes('href="https://github.com/FeatherHunter/SKILLS"'), '链接落点须为 value');
    assert.ok(output.html.includes('>https://github.com/FeatherHunter/SKILLS<'), '链接文本须为 value');
  });

  it('字符串 url 同收：url 为链接字串亦过校验且成链接', () => {
    const data = baseData();
    data.contact = {
      items: [{ label: 'GitHub', value: 'https://github.com/FeatherHunter/SKILLS', url: 'https://github.com/FeatherHunter/SKILLS' }],
    };
    const { output, error } = attempt(data);
    assert.equal(error, null, '字符串 url 不得判 schema-invalid，实为：' + (error && error.message));
    assert.ok(output.html.includes('<a'), '字符串 url 亦须渲染成 <a>');
  });

  it('旧形回归：无 url 的联系人仍绿且仍为纯文本', () => {
    const data = baseData();
    data.contact = { items: [{ label: '作者', value: '@feather' }] };
    const { output, error } = attempt(data);
    assert.equal(error, null);
    assert.ok(output.html.includes('<span class="' + CLS + '-about-value">@feather</span>'));
  });

  it('非法仍红：数字 url 须判 schema-invalid', () => {
    const data = baseData();
    data.contact = { items: [{ label: 'X', value: 'y', url: 1 }] };
    const { error } = attempt(data);
    assert.notEqual(error, null);
    assert.equal(error instanceof HelpSchemaError, true);
    assert.equal(error.code, 'schema-invalid');
  });
});

describe('#242 缺陷二 init_banner.steps 对象形', () => {
  it('红绿：{title,desc}[] 须过校验且标题与说明皆有文案', () => {
    const data = baseData();
    data.init_banner = {
      title: '第一次用备忘录?',
      steps: [
        { title: '检查并配置 Python', desc: '版本与依赖检测' },
        { title: '数据存储', desc: 'SQLite + FTS5 全文搜索' },
      ],
    };
    const { output, error } = attempt(data);
    assert.equal(error, null, '对象形 steps 不得判 schema-invalid，实为：' + (error && error.message));
    assert.ok(output.html.includes('检查并配置 Python'), '对象步标题须有文案');
    assert.ok(output.html.includes('版本与依赖检测'), '对象步说明须有文案');
  });

  it('对象步 desc 可选：无 desc 亦过校验且只渲标题', () => {
    const data = baseData();
    data.init_banner = { title: '首次', steps: [{ title: '只标题' }] };
    const { output, error } = attempt(data);
    assert.equal(error, null, '无 desc 的对象步不得判 schema-invalid，实为：' + (error && error.message));
    assert.ok(output.html.includes('只标题'));
  });

  it('旧形回归：纯串 steps 仍绿', () => {
    const data = baseData();
    data.init_banner = { title: '首次', steps: ['检测环境', '初始化数据库'] };
    const { output, error } = attempt(data);
    assert.equal(error, null);
    assert.ok(output.html.includes('检测环境'));
    assert.ok(output.html.includes('初始化数据库'));
  });

  it('非法仍红：数字步须判 schema-invalid', () => {
    const data = baseData();
    data.init_banner = { title: '首次', steps: [1] };
    const { error } = attempt(data);
    assert.notEqual(error, null);
    assert.equal(error instanceof HelpSchemaError, true);
    assert.equal(error.code, 'schema-invalid');
  });
});

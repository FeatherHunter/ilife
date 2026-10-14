// #1277 · 数据指纹（条目 10 后半）：复用窗口内「是不是同一份」的判据。
//
// 锁六件事：
//  ① 同一批数据、不同分钟 ⇒ **同一枚**指纹——这就是不能用整页哈希的原因（页里嵌着分钟级时刻）；
//  ② 数据变了 ⇒ 指纹变（数据没变才复用）；
//  ③ **壳（渲染器）身份也参与**指纹——模板改了页正文就变了，不把壳算进去，「改文案→打开看」当场看不见；
//  ④ 指纹形状＝32 位十六进制（它要写进 HTML 注释，只许安全字符）；
//  ⑤ **每一个真内容字段都参与**，尤其是 `meta_blocks[1]` 里那行唤醒词——它不在 `groups` 里（恰恰是
//     「没进目录」的那些词），按字段白名单枚举就会漏（#1277 对抗式审查逮到的洞）；
//  ⑥ 被对掉的**只有**那个分钟串：`subtitle`／`meta_blocks[0]` 里除时刻以外的字变一个，指纹就得变。
//
// 判据的另一半（窗口内且正文含这枚指纹才复用）住共用层：`packages/base-render/test/output-save-html-237.test.mjs`
// 的「#1277 ④f／④f2」两条。
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { buildHelpFileData, helpDataKey } from '../dist/help/helpFile.js';

const T1 = new Date(2026, 9, 15, 1, 30, 0); // 本地 2026-10-15 01:30
const T2 = new Date(2026, 9, 15, 1, 37, 0); // 本地 2026-10-15 01:37（同一批数据、下一个分钟）

/** 只哈希「数据」那一半（不含壳）——用来证明壳确实参与了指纹，不是摆设。 */
function pureDataHash(data) {
  return createHash('sha256').update(JSON.stringify({
    skill_name: data.skill_name,
    title: data.title,
    contact: data.contact,
    groups: data.groups,
    version: data.version,
    init_banner: data.init_banner,
    skill_version: data.skill_version,
  }), 'utf8').digest('hex').slice(0, 32);
}

describe('#1277 数据指纹：同一批数据 ＋ 同一个壳 ⇒ 同一枚', () => {
  it('跨分钟稳定：页内时刻不同，指纹相同', () => {
    const a = buildHelpFileData(T1);
    const b = buildHelpFileData(T2);
    assert.notEqual(a.generated_at, b.generated_at, '前提：两次的页内时刻确实不同');
    assert.notEqual(a.subtitle, b.subtitle, '前提：subtitle 也随时刻走');
    assert.equal(helpDataKey(a), helpDataKey(b), '同一批数据、不同分钟 ⇒ 同一枚指纹（否则复用＝一分钟一份）');
  });

  it('数据变了 ⇒ 指纹变', () => {
    const off = buildHelpFileData(T1, { initialized: false });
    const on = buildHelpFileData(T1, { initialized: true });
    assert.notDeepEqual(off.init_banner, on.init_banner, '前提：初始化状态确实改到了载荷');
    assert.notEqual(helpDataKey(off), helpDataKey(on), '数据变了 ⇒ 指纹变（窗口内才落新的）');
  });

  it('壳（渲染器）身份参与指纹：与纯数据哈希不同', () => {
    const data = buildHelpFileData(T1);
    assert.notEqual(
      helpDataKey(data), pureDataHash(data),
      '指纹必须把共享壳也算进去：改模板＝改页正文，窗口内要当场落新的（否则改文案看不见）',
    );
  });

  it('形状：32 位十六进制（进 HTML 注释安全）', () => {
    assert.match(helpDataKey(buildHelpFileData(T1)), /^[0-9a-f]{32}$/);
  });

  it('⑤ 唤醒词那行（meta_blocks[1] 的真内容）参与指纹', () => {
    const base = buildHelpFileData(T1);
    const words = base.meta_blocks[1];
    assert.ok(words && words.html.length > 0, '前提：第二块 meta 确实有唤醒词内容');
    const tweaked = {
      ...base,
      meta_blocks: base.meta_blocks.map((b, i) => (i === 1 ? { ...b, html: b.html.replace(/^<p>/, '<p>改：') } : b)),
    };
    assert.notEqual(
      helpDataKey(base), helpDataKey(tweaked),
      '唤醒词是页面上真印出来的内容（且不在 groups 里）⇒ 它变了必须落新的，不能继续发旧页',
    );
  });

  it('⑥ 被对掉的只有分钟串：时刻以外的字变一个，指纹就变', () => {
    const base = buildHelpFileData(T1);
    const tweaked = { ...base, subtitle: base.subtitle.replace('功能域', '功能域改') };
    assert.notEqual(helpDataKey(base), helpDataKey(tweaked), 'subtitle 里除时刻以外的内容也参与指纹');
    const sameMinute = buildHelpFileData(new Date(T1.getTime() + 1000));
    assert.equal(helpDataKey(base), helpDataKey(sameMinute), '同一分钟内的两秒差 ⇒ 指纹相同（对掉的是分钟串）');
  });
});

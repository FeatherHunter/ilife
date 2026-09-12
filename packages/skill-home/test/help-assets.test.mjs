// #188 · 居家管家内容资产锁：事实源摘要 ＋ 生成物摘要 ＋ 形状 ＋ 与口径层双向对账 ＋ 门接线自检。
// 事实源在**仓内**（`src/help/scenarios.yaml`），故这把锁可复跑：资产与事实源不一致即变红。
// 「逐字」用摘要钉死——重跑生成器只复现同一摘要，改一个字即变红。
// 期望值／夹具（数量、徽章词表、命令前缀、唤醒词 → 命令 key 全表）**自持在本文件**，不从生成器 import：
// 生成器只外放 4 个入口（`generate` ＋ 三个路径常量），夹具留在这里才做得到交叉锁。
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { PKG_DIR, SRC_YAML, OUT_TS, generate } from '../scripts/lib/help-assets.mjs';
import { parseScenarioYaml } from '../scripts/lib/yaml-subset.mjs';

const pkgDir = join(dirname(fileURLToPath(import.meta.url)), '..');
const sha256 = (buf) => createHash('sha256').update(buf).digest('hex');

/** 仓内事实源摘要（重算：`node -e "…createHash('sha256').update(readFileSync('packages/skill-home/src/help/scenarios.yaml')).digest('hex')"`）。 */
const YAML_SHA256 = 'f80184ce9a0a7b345404941dfdd21e2e0b56cc1577dc059c536df5d9bf7e665a';
const YAML_BYTES = 46267;
/** 生成物摘要（重算命令见 `src/help/helpAssets.ts` 头注释）——手改生成物即变红。 */
const ASSET_SHA256 = 'f61f49e7b36b6fa7ff79b1449e5b2cad82951c37e15b262cd6f230e444e2e732';

/** 期望形状（老骨架 9 域／30 二级组／73 场景，含联动 3 条登记位）：夹具自持，生成器改数不替它作证。 */
const EXPECT_SHAPE = { domains: 9, subgroups: 30, scenes: 73, linkScenes: 3 };
/** 徽章词表期望值（共享模板 `TYPE_DEFAULT` 的 10 个键，逐字；生成器常量已不外放）。 */
const TYPE_WORDS = ['采集', '查看', '结果', '向导', '批量', '校验', '选择', '过程', '回执', '录入'];
/** 分组 id ↔ 命令前缀期望值（生成器常量已不外放；两侧交叉锁：生成物字面量 ＋ 口径层命名空间）。 */
const GROUP_COMMAND_PREFIXES = [
  { group: 'items', prefixes: ['home.item', 'home.tag', 'home.inventory'] },
  { group: 'space', prefixes: ['home.location'] },
  { group: 'outfit', prefixes: ['home.outfit', 'home.trip'] },
  { group: 'stats', prefixes: ['home.stats'] },
  { group: 'express', prefixes: ['home.shopping'] },
  { group: 'receipt', prefixes: ['home.ticket'] },
  { group: 'family', prefixes: ['home.care'] },
  { group: 'setup', prefixes: ['home.care'] },
  { group: 'link', prefixes: [] },
];

const ASSET_TEXT = readFileSync(OUT_TS, 'utf8');
/** 生成物里的三层结构（JSON 字面量，故可直接 JSON.parse，不必先 tsc 出 dist）。 */
function assetJson(name) {
  const m = new RegExp('export const ' + name + '[^=]*= (\\[[\\s\\S]*?\\n\\s*\\]);').exec(ASSET_TEXT);
  assert.ok(m, '生成物里找不到 ' + name);
  return JSON.parse(m[1]);
}
/** 生成物里的徽章词表（`export type HelpSceneType = | '采集' …`）＝生成器 TYPE_WORDS 的落盘面。 */
const TYPE_FROM_ASSET = (() => {
  const m = /export type HelpSceneType =([\s\S]*?);/.exec(ASSET_TEXT);
  assert.ok(m, '生成物里找不到 HelpSceneType');
  return [...m[1].matchAll(/'([^']+)'/g)].map((x) => x[1]);
})();
const GROUPS = assetJson('HELP_GROUPS');
const SCENES = GROUPS.flatMap((g) => g.subgroups.flatMap((s) => s.scenes));
const DOC = parseScenarioYaml(readFileSync(SRC_YAML, 'utf8'));
const WAKE_SRC = readFileSync(join(pkgDir, 'src', 'policy', 'wakewords.ts'), 'utf8');
const WAKE_ENTRIES = [...WAKE_SRC.slice(WAKE_SRC.indexOf('export const WAKE_TABLE'), WAKE_SRC.indexOf('export const DEPRECATED_PHRASES'))
  .matchAll(/\{ phrase: '([^']*)', key: '([^']+)'/g)].map((m) => ({ phrase: m[1], key: m[2] }));
const DEPRECATED = [.../export const DEPRECATED_PHRASES = \[([^\]]*)\]/.exec(WAKE_SRC)[1].matchAll(/'([^']*)'/g)].map((m) => m[1]);
/** 速查口径的命中规则（与 `src/help/lookup.ts:53-56 lookupHelp` 同一判据：双向包含）。 */
const hits = (w) => WAKE_ENTRIES.filter((e) => w.includes(e.phrase) || e.phrase.includes(w.trim()));
/** 速查里列了、但资产里没有落点的 16 条——逐条有名有姓，不是「对不上就算了」。 */
const UNLANDED = [
  '居家管家 帮助', '居家管家帮助', '居家管家能做什么', // ① HELP 自指 3 词：从口径层派生，不进场景目录（防自指）
  '补物品', '减物品', '废物品', '借物品', '修物品', // ② 卡片附属词（老骨架里挂在「改物品」卡上，无独立场景）
  '盘物品', '盘全部', // ③ 同上（盘点卡）；查高频／查低频（统计卡）
  '查高频', '查低频',
  '看标签', '合标签', // ④ 票 13 裁定：看标签作「管标签」卡附属词，不独立成卡
  '推位置', '找位置', // ⑤ 票 13 裁定：留在「位置管理 › 管位置」卡
].sort();

/** 口径层 `WAKE_TABLE` 的「唤醒词 → 命令 key」**全表**（91 条，照文件出现序）。
 *  只比 phrase 不比 key 会漏掉「词还在、key 被改指」的洞（审查 A 实测：改 `录物品` 的 key 仍全绿），
 *  故这里把对应关系整体钉住：口径层改词或改 key，本表同步改，否则本用例红。 */
const WAKE_KEY_TABLE = [
  ['居家管家 帮助', 'home.help.lookup'],
  ['居家管家帮助', 'home.help.lookup'],
  ['居家管家能做什么', 'home.help.lookup'],
  ['查物品(HTML)', 'home.item.search'],
  ['看物品(HTML)', 'home.item.detail'],
  ['统物品(HTML)', 'home.stats.overview'],
  ['查物品', 'home.item.search'],
  ['看物品', 'home.item.detail'],
  ['录物品', 'home.item.add'],
  ['拍物品', 'home.item.add'],
  ['改物品', 'home.item.update'],
  ['移物品', 'home.item.update'],
  ['补物品', 'home.item.update'],
  ['减物品', 'home.item.update'],
  ['标物品', 'home.item.update'],
  ['废物品', 'home.item.update'],
  ['借物品', 'home.item.update'],
  ['修物品', 'home.item.update'],
  ['盘物品', 'home.inventory.round'],
  ['盘全部', 'home.inventory.round'],
  ['穿什么', 'home.outfit.pick'],
  ['带物品', 'home.trip.manage'],
  ['归物品', 'home.trip.manage'],
  ['统物品', 'home.stats.overview'],
  ['查高频', 'home.stats.overview'],
  ['查低频', 'home.stats.alert'],
  ['查过期', 'home.stats.alert'],
  ['看标签', 'home.tag.query'],
  ['合标签', 'home.tag.write'],
  ['查快递', 'home.shopping.query'],
  ['推位置', 'home.location.query'],
  ['找位置', 'home.location.query'],
  ['查账号', 'home.ticket.query'],
  ['存账号', 'home.ticket.write'],
  ['改账号', 'home.ticket.write'],
  ['看密码', 'home.ticket.write'],
  ['查异常', 'home.care.query'],
  ['借用', 'home.care.query'],
  ['家人档案', 'home.care.query'],
  ['管位置', 'home.location.write'],
  ['固定位', 'home.location.write'],
  ['收纳建议', 'home.location.query'],
  ['空间视图', 'home.location.query'],
  ['查闲置', 'home.stats.alert'],
  ['盘点统计', 'home.stats.overview'],
  ['首次使用', 'home.care.write'],
  ['备份导出', 'home.care.write'],
  ['导入恢复', 'home.care.write'],
  ['批量录入', 'home.item.add'],
  ['补录', 'home.item.add'],
  ['紧急定位', 'home.item.search'],
  ['筛选浏览', 'home.item.search'],
  ['拍照找物品', 'home.item.search'],
  ['查重复', 'home.item.search'],
  ['合并物品', 'home.item.update'],
  ['撤销操作', 'home.item.update'],
  ['物品关联', 'home.item.update'],
  ['管标签', 'home.tag.write'],
  ['管分类', 'home.tag.write'],
  ['整理建议', 'home.tag.write'],
  ['查看照片', 'home.item.detail'],
  ['管照片', 'home.item.update'],
  ['照片墙', 'home.item.search'],
  ['盘点记录', 'home.inventory.records'],
  ['差异处理', 'home.inventory.round'],
  ['搬家盘点', 'home.inventory.round'],
  ['历史', 'home.item.detail'],
  ['数量变更', 'home.item.update'],
  ['状态变更', 'home.item.update'],
  ['盘点', 'home.inventory.round'],
  ['购物清单', 'home.shopping.query'],
  ['缺货检测', 'home.shopping.query'],
  ['囤货盘点', 'home.shopping.query'],
  ['查购买记录', 'home.ticket.query'],
  ['查上月购买', 'home.ticket.query'],
  ['查今年花费', 'home.ticket.query'],
  ['查退货窗口', 'home.ticket.query'],
  ['登记购买记录', 'home.ticket.write'],
  ['查保修状态', 'home.ticket.query'],
  ['登记保修', 'home.ticket.write'],
  ['记录维修', 'home.ticket.write'],
  ['设置保养周期', 'home.ticket.write'],
  ['执行保养', 'home.ticket.write'],
  ['查证件到期', 'home.ticket.query'],
  ['登记证件', 'home.ticket.write'],
  ['证件归档', 'home.ticket.write'],
  ['更新证件', 'home.ticket.write'],
  ['衣橱分析', 'home.outfit.pick'],
  ['换季', 'home.outfit.pick'],
  ['旅行穿搭', 'home.outfit.pick'],
  ['改购物清单', 'home.shopping.write'],
];

/** 解析器用例的小样本：只覆盖「收得下」的写法（含 html／variants 子树、跨行引号标量、空集合字面量）。 */
const PARSE_SAMPLE = [
  "version: '2.0'",                   // 1
  'domains:',                         // 2
  '- key: items',                     // 3
  '  name: 物品管理',                 // 4
  '  icon: 🏠',                      // 5
  'scenarios:',                       // 6
  '- id: add_text',                   // 7
  '  domain: items',                  // 8
  '  wake_word: 录物品',              // 9
  "  prompt: '甲",                    // 10 ← 跨行引号标量开头
  "    乙'",                          // 11 ← 续行缩进 4：由引号标量吃掉，不该被缩进规则拒
  "  status: ''",                     // 12
  '  dimensions: {}',                 // 13
  '  html:',                          // 14 ← 不收子树开头
  '    template: 物品/add_form.html', // 15 ← 子树内容（缩进 4）
  '  variants:',                      // 16 ← 第二棵不收子树
  '  - direction: 同义',              // 17 ← 子树里的缩进 2 块序列项
  '    phrase: 登记物品',             // 18
  '  result: 走录入流程',             // 19 ← 子树收尾后回到字段行
];
const sampleWith = (k, text) => PARSE_SAMPLE.map((l, idx) => (idx === k ? text : l)).join('\n');

describe('#188 居家管家内容资产', () => {
  it('事实源与生成物摘要锁（改一个字即红）', () => {
    const yamlBuf = readFileSync(SRC_YAML);
    assert.equal(yamlBuf.length, YAML_BYTES, '仓内事实源字节数变了');
    assert.equal(sha256(yamlBuf), YAML_SHA256, '仓内事实源变了：重跑生成器并更新 YAML_SHA256');
    assert.equal(sha256(readFileSync(OUT_TS, 'utf8')), ASSET_SHA256, '生成物被手改或没重跑生成器');
    assert.equal(ASSET_TEXT.includes('\r'), false, '生成物必须 LF');
    assert.equal(ASSET_TEXT.charCodeAt(0) === 0xfeff, false, '生成物必须无 BOM');
    assert.equal(ASSET_TEXT.endsWith('\n'), true, '生成物必须真换行结尾');
  });

  it('资产＝重跑生成器的结果（与事实源一致，不靠自觉）', () => {
    const { text, stat } = generate();
    assert.equal(text, ASSET_TEXT);
    assert.deepEqual(EXPECT_SHAPE, { domains: 9, subgroups: 30, scenes: 73, linkScenes: 3 }, '夹具与票面口径（9／30／73＋登记位 3）不符');
    assert.deepEqual(stat, { domains: 9, subgroups: 30, scenes: 73, deprecatedScenes: 3 });
  });

  it('三层形状 9／30／73 ＋ 三层 id 唯一 ＋ types 非空且在模板词表内 ＋ status 全场同值', () => {
    assert.equal(GROUPS.length, 9);
    assert.equal(GROUPS.flatMap((g) => g.subgroups).length, 30);
    assert.equal(SCENES.length, 73);
    assert.deepEqual(GROUPS.map((g) => g.id), ['items', 'space', 'outfit', 'stats', 'express', 'receipt', 'family', 'setup', 'link']);
    for (let i = 0; i < GROUPS.length; i++) {
      const g = GROUPS[i];
      assert.ok(g.icon.length > 0, g.id + ' 缺图标');
      assert.ok(g.label.length > 0, g.id + ' 缺中文名');
      assert.ok(g.subgroups.length > 0, g.id + ' 没有二级组');
      assert.deepEqual(g.subgroups.map((s) => s.id), g.subgroups.map((_, k) => g.id + '_' + (k + 1)));
      for (const s of g.subgroups) assert.ok(s.label.length > 0, s.id + ' 缺 label');
    }
    const ids = (rows) => rows.map((r) => r.id);
    for (const [what, rows] of [['域', GROUPS], ['二级组', GROUPS.flatMap((g) => g.subgroups)], ['场景', SCENES]]) {
      assert.equal(new Set(ids(rows)).size, rows.length, what + ' id 有重复（模板把 id 当字典键）');
    }
    assert.equal(new Set(SCENES.map((s) => s.wake_word)).size, 73, '唤醒词应 73 条各不相同');
    for (const s of SCENES) {
      assert.ok(s.types.length > 0, s.id + ' types 为空');
      for (const t of s.types) assert.ok(TYPE_WORDS.includes(t), s.id + ' types 越界：' + t);
    }
    assert.deepEqual([...new Set(SCENES.map((s) => s.status))], [''], 'status 全场同值（老骨架 73/73 空串）');
  });

  it('逐字段对事实源：域顺序／组内出现序／scenario_id／types 切分／prompt 逐字', () => {
    assert.deepEqual(GROUPS.map((g) => [g.id, g.icon, g.label]), DOC.domains.map((d) => [d.key, d.icon, d.name]));
    assert.equal(SCENES.length, DOC.scenes.length, '场景条数应等于事实源记录数');
    const byId = new Map(DOC.scenes.map((s) => [s.scenario_id, s]));
    assert.equal(byId.size, DOC.scenes.length, '事实源的 scenario_id 应互不相同');
    for (const g of GROUPS) {
      // 域顺序照 domains 列表（事实源里 scenarios 的域块次序与 domains 列表并不一致），组内照出现序。
      assert.deepEqual(g.subgroups.flatMap((s) => s.scenes).map((s) => s.id),
        DOC.scenes.filter((s) => s.domain === g.id).map((s) => s.scenario_id), g.id + ' 组内场景不是事实源出现序');
    }
    for (const a of SCENES) {
      const s = byId.get(a.id);
      assert.ok(s, a.id + ' 不在事实源里');
      assert.equal(a.title, s.scenario_title);
      assert.equal(a.wake_word, s.wake_word);
      assert.equal(a.status, s.status);
      assert.deepEqual([...a.types], [...new Set(s.type.split('+').map((x) => x.trim()))], a.id + ' types 切分顺序／去重不符');
      if (s.domain !== 'link') assert.equal(a.prompt_template, s.prompt, a.id + ' prompt 不逐字');
    }
    assert.equal(new Set(SCENES.map((s) => s.id)).size, DOC.scenes.length, '资产里每个事实源场景都得有落点');
  });

  it('types 词表＝共享 help 模板 TYPE_DEFAULT 的 10 个键（模板原文为准）＋生成物落盘面同值', () => {
    const html = readFileSync(join(pkgDir, '..', 'base-render', 'assets', 'help-template.html'), 'utf8');
    const block = /var TYPE_DEFAULT = \{([\s\S]*?)\n\};/.exec(html);
    assert.ok(block, '模板里找不到 TYPE_DEFAULT');
    const words = [...block[1].matchAll(/'([^']+)':/g)].map((m) => m[1]);
    assert.deepEqual(words, TYPE_WORDS, '模板徽章表变了：改生成器的 TYPE_WORDS 并重跑');
    assert.equal(words.length, 10);
    assert.deepEqual(TYPE_FROM_ASSET, TYPE_WORDS, '生成物里的徽章词表与夹具不符：生成器的 TYPE_WORDS 漂了');
  });

  it('link 域＝登记位：唯一 deprecated 组／3 条 prompt 不迁／其余 70 条在位', () => {
    const dep = GROUPS.filter((g) => g.deprecated);
    assert.deepEqual(dep.map((g) => g.id), ['link']);
    const linkScenes = dep[0].subgroups.flatMap((s) => s.scenes);
    assert.equal(linkScenes.length, EXPECT_SHAPE.linkScenes);
    assert.deepEqual(linkScenes.map((s) => s.prompt_template), ['', '', '']);
    assert.equal(SCENES.filter((s) => s.prompt_template === '').length, 3, '空 prompt 只允许 link 那 3 条');
    assert.equal(SCENES.filter((s) => s.prompt_template !== '').length, 70);
    assert.deepEqual(linkScenes.map((s) => s.wake_word).sort(), [...DEPRECATED].sort(), '登记位词与口径层废弃词应一致');
  });

  it('与速查表 WAKE_TABLE 双向对账：资产 73 条中 70 条有落、3 条＝登记位', () => {
    assert.equal(WAKE_ENTRIES.length, 91, '速查表条数变了');
    const noHit = SCENES.filter((s) => hits(s.wake_word).length === 0).map((s) => s.wake_word).sort();
    assert.deepEqual(noHit, [...DEPRECATED].sort(), '除登记位 3 条外，资产的唤醒词必须条条能在速查命中');
    const words = SCENES.map((s) => s.wake_word);
    const unlanded = WAKE_ENTRIES.filter((e) => !words.some((w) => w.includes(e.phrase) || e.phrase.includes(w.trim())))
      .map((e) => e.phrase).sort();
    assert.deepEqual(unlanded, UNLANDED, '速查里列出的词必须条条有落点（差异＝上面逐条点名的 16 条）');
    const helpWords = WAKE_ENTRIES.filter((e) => e.key === 'home.help.lookup').map((e) => e.phrase);
    assert.equal(helpWords.length, 3, 'HELP 自指 3 词');
    assert.deepEqual(helpWords.filter((p) => words.includes(p)), [], 'HELP 自指词不进场景目录');
  });

  it('与速查表 WAKE_TABLE 对账「唤醒词 → 命令 key」全表：词还在但 key 被改指，也必须红', () => {
    const actual = new Map(WAKE_ENTRIES.map((e) => [e.phrase, e.key]));
    assert.equal(actual.size, WAKE_ENTRIES.length, '口径层有重复 phrase（后写覆盖前者，路由会丢词）');
    assert.equal(WAKE_ENTRIES.length, WAKE_KEY_TABLE.length, '口径层词表条数与期望全表不符');
    for (const [phrase, key] of WAKE_KEY_TABLE) {
      assert.equal(actual.get(phrase), key, '「' + phrase + '」的命令 key 变了（改口径层请同步本表）');
    }
  });

  it('分组 id ↔ 命令前缀：10 个功能命名空间全覆盖、link 为空、home.help 不入表', () => {
    const ns = new Set(WAKE_ENTRIES.map((e) => e.key.split('.').slice(0, 2).join('.')));
    const declared = new Set(GROUP_COMMAND_PREFIXES.flatMap((c) => c.prefixes));
    assert.ok(ns.has('home.help'));
    assert.deepEqual([...ns].filter((n) => n !== 'home.help' && !declared.has(n)), [], '有命名空间没进对照表');
    assert.deepEqual([...declared].filter((n) => !ns.has(n)), [], '对照表里有不存在的命名空间');
    assert.deepEqual(GROUP_COMMAND_PREFIXES.find((c) => c.group === 'link').prefixes, []);
    assert.deepEqual(GROUP_COMMAND_PREFIXES.map((c) => c.group), GROUPS.map((g) => g.id));
    assert.deepEqual(assetJson('HELP_GROUP_COMMAND_PREFIXES'), GROUP_COMMAND_PREFIXES, '生成物里的对照表与夹具不一致');
  });

  it('解析器 fail-closed：不支持的构造逐个带行号抛错，绝不静默跳过／截断', () => {
    const cases = [
      [sampleWith(9, '  prompt: |'), /第 10 行：块标量（`\|`）/],
      [sampleWith(9, '  prompt: >'), /第 10 行：块标量（`>`）/],
      [sampleWith(9, '    prompt: 缩进 4 的续行'), /第 10 行：缩进不符预期/],
      [sampleWith(9, '  domain: items'), /第 10 行：记录内字段重复：domain/],
      [sampleWith(4, '  icon: &base 📦'), /第 5 行：锚点（`&`）/],
      [sampleWith(12, '  dimensions: {a: 1}'), /第 13 行：非空流程集合/],
      [sampleWith(7, '  id: dup'), /第 8 行：记录内字段重复：id/],
      [sampleWith(11, '  status:'), /第 12 行：裸键/],
      [PARSE_SAMPLE.slice(0, 2).join('\n'), /事实源缺 `domains`／`scenarios` 节/],
      [['---', ...PARSE_SAMPLE].join('\n'), /第 1 行：多文档标记/],
      [sampleWith(8, '\tdomain: items'), /第 9 行：缩进里出现 tab/],
    ];
    const mutated = new Set();
    for (const [text, re] of cases) {
      mutated.add(text);
      assert.throws(() => parseScenarioYaml(text), re, '该写法应抛错：' + String(re));
    }
    assert.equal(mutated.size, cases.length, '用例里有重复样本（等价于少测一条）');
  });

  it('解析器收得下事实源用到的写法：子树／跨行引号／空集合，且解出的值逐条对', () => {
    const doc = parseScenarioYaml(PARSE_SAMPLE.join('\n'));
    assert.equal(doc.version, '2.0');
    assert.deepEqual(doc.domains.map((d) => d.key), ['items']);
    assert.equal(doc.scenes.length, 1);
    assert.equal(doc.scenes[0].prompt, '甲 乙', '跨行引号标量折行不对');
    assert.equal(doc.scenes[0].status, '');
    assert.equal(doc.scenes[0].dimensions, '{}', '空集合字面量应原样保留');
    assert.equal(doc.scenes[0].result, '走录入流程', '不收子树之后的字段行不该被吞掉');
    const real = parseScenarioYaml(readFileSync(SRC_YAML, 'utf8'));
    assert.equal(real.domains.length, 9);
    assert.equal(real.scenes.length, 73, 'fail-closed 之后事实源仍须读得下 73 条');
  });

  it('锁真的接进包内门：package.json 的 test 串跑到本用例', () => {
    const pkg = JSON.parse(readFileSync(join(pkgDir, 'package.json'), 'utf8'));
    assert.ok(pkg.scripts.test.includes('test/help-assets.test.mjs'), '锁没接进门（包内用例从不执行的洞）');
    assert.ok(pkg.scripts.test.includes('../../test/scaffold.test.mjs'), '仓根 scaffold 不该被挤掉');
    assert.ok(pkg.scripts['gen:help-assets'].includes('gen-help-assets.mjs'));
    assert.ok(pkg.scripts['gen:help-assets:check'].includes('--check'));
    assert.equal(pkg.scripts.build.includes('gen-help-assets'), false, '生成器不进 build 链（超出本票范围）');
  });

  it('生成器读的是仓内事实源，仓外路径零残留', () => {
    for (const f of ['scripts/gen-help-assets.mjs', 'scripts/lib/help-assets.mjs', 'scripts/lib/yaml-subset.mjs']) {
      const src = readFileSync(join(PKG_DIR, f), 'utf8');
      assert.equal(/D:\\|2Study|\.html'/.test(src.replace(/help-template\.html/g, '')), false, f + ' 里出现仓外路径');
    }
    assert.equal(SRC_YAML.startsWith(PKG_DIR), true);
    assert.equal(OUT_TS.startsWith(PKG_DIR), true);
  });
});

// #800 · 唤醒词→页族机器门（防回潮）：四分类检查＋三向对账＋逐行对照表＋最长匹配回归。
//
// 进包内 test 门；改内容资产（scenarios.yaml／WAKE 声明）后同批重跑 `pnpm gen`
// 与 `pnpm gen:help-assets` 并更新摘要锁。「改坏一句即红」的负向证据见
// `docs/skills/skill-home/structure-landing.md`（变异跑分记录）。
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { routeWakeword, WAKE_TABLE, DEPRECATED_PHRASES } from '../dist/policy/wakewords.js';
import { UNKNOWN_FAMILY, resolvePageFamily } from '../dist/render/pageFamilies.js';
import { SETUP_COMMANDS } from '../dist/setup/index.js';
import { SETUP_ROUTES } from '../dist/setup/index.js';

const pkgDir = join(dirname(fileURLToPath(import.meta.url)), '..');
const yaml = readFileSync(join(pkgDir, 'src', 'help', 'scenarios.yaml'), 'utf8');
const appendix = JSON.parse(readFileSync(join(pkgDir, '..', '..', 'docs', 'skills', 'skill-home', 'scene-pages-contract.appendix.json'), 'utf8'));

// —— 事实源解析（与 audit-wakewords.mjs 同一口径：CRLF／direction→phrase→route）——
const sceneOfWord = new Map();
const variantHost = new Map();
const variantNonRouted = new Set();
{
  let cur = null;
  let inV = false;
  let pending = null;
  for (const line of yaml.split(/\r?\n/)) {
    const idm = line.match(/^- id: (\S+)/);
    if (idm) { cur = idm[1]; inV = false; pending = null; continue; }
    if (/^  variants:/.test(line)) { inV = true; continue; }
    if (/^  \S/.test(line) && !/^    /.test(line) && !/^  variants:/.test(line) && !/^  - /.test(line)) {
      inV = false; pending = null;
    }
    const wm = !inV && /^  wake_word: (.+)$/.exec(line);
    if (wm) for (const w of wm[1].split('/')) sceneOfWord.set(w.trim(), cur);
    const dm = inV && /^  - direction: (.+)$/.exec(line);
    if (dm) { pending = { phrase: null, route: null }; continue; }
    const pm = inV && pending && /^    phrase: (.+)$/.exec(line);
    if (pm) { pending.phrase = pm[1].trim(); continue; }
    const rm = inV && pending && /^    route: (true|false)$/.exec(line);
    if (rm) {
      assert.ok(pending.phrase, '变体项缺 phrase');
      if (rm[1] === 'true') variantHost.set(pending.phrase, cur);
      else variantNonRouted.add(pending.phrase);
      pending = null;
    }
  }
  assert.equal(pending, null, '变体项缺 route 标记');
}
// 归宿确认 18 词→场景（唤醒词层规格三桶：无争议并入 7＋单审确认 7＋借用写侧 4）。
const HOSTED = new Map(Object.entries({
  '补物品': '3-3', '减物品': '3-3', '废物品': '3-4', '借物品': '3-4', '修物品': '3-4',
  '盘物品': '6-1', '盘全部': '6-1',
  '查高频': 'SM4-1', '查低频': 'SM4-2', '看标签': '4-1', '合标签': '4-1',
  '推位置': 'SM2-1', '找位置': 'SM2-1', '改购物清单': 'SM5-1',
  '借出': 'SM7-1', '借入': 'SM7-1', '归还': 'SM7-1', '催还': 'SM7-1',
}));
const HELP_ENTRY = new Set(['居家管家 帮助', '居家管家帮助', '居家管家能做什么']);
// 待复裁 3 词（兼容词，票 4 落默认 HTML 后复裁；路由保持现状，不擅自废弃）。
const PENDING_DEPRECATED = new Set(['查物品(HTML)', '看物品(HTML)', '统物品(HTML)']);
// 单审退回 2 词（宿主 SM2-1 复核未通过：管位置 prompt 无推荐／查找语义；路由保持现状待用户重裁）。
const REJUDGE = new Set(['推位置', '找位置']);
const sceneKey = new Map(appendix.scenarios.map((s) => [s.id, s.key]));
// 多键场景的可达键集（附录只列主键；读写两面同属一场，见 ledger）：4-1 管标签（查／合）、
// SM5-1 购物清单（查／改）、SM7-1 借用管理（查／借／还）。
const SCENE_KEYS = new Map([
  ['4-1', new Set(['home.tag.query', 'home.tag.write'])],
  ['SM5-1', new Set(['home.shopping.query', 'home.shopping.write'])],
  ['SM7-1', new Set(['home.care.query', 'home.care.write'])],
]);

describe('#800 唤醒词层四分类（出现三不管即红）', () => {
  it('125 条恰好属于五类之一（主词／变体／入口／废弃登记外／待复裁），总数 125', () => {
    assert.equal(WAKE_TABLE.length, 125);
    const deprecated = new Set(DEPRECATED_PHRASES);
    let nMain = 0;
    let nVariant = 0;
    let nEntry = 0;
    let nPending = 0;
    for (const e of WAKE_TABLE) {
      const isMain = sceneOfWord.has(e.phrase) && !deprecated.has(e.phrase);
      const isVariant = variantHost.has(e.phrase) || HOSTED.has(e.phrase);
      const isEntry = HELP_ENTRY.has(e.phrase);
      const isPending = PENDING_DEPRECATED.has(e.phrase);
      const n = Number(isMain) + Number(isVariant) + Number(isEntry) + Number(isPending);
      assert.equal(n, 1, '三不管或脚踩两类：' + e.phrase);
      if (isMain) nMain++;
      if (isVariant) nVariant++;
      if (isEntry) nEntry++;
      if (isPending) nPending++;
    }
    assert.equal(nMain, 71);
    assert.equal(nVariant, 48);
    assert.equal(nEntry, 3);
    assert.equal(nPending, 3);
  });

  it('三向对账：主词−联动全进表／route:true 全进表／route:false 全不进表／废弃＝联动 3', () => {
    const inTable = new Set(WAKE_TABLE.map((e) => e.phrase));
    for (const [w, id] of sceneOfWord) {
      if (/^联动|^记到/.test(w)) continue;
      assert.ok(inTable.has(w), '主词无路由：' + w + ' ← ' + id);
    }
    for (const w of variantHost.keys()) assert.ok(inTable.has(w), 'route:true 变体无路由：' + w);
    for (const w of variantNonRouted) assert.ok(!inTable.has(w), 'route:false 变体进了路由：' + w);
    assert.deepEqual([...DEPRECATED_PHRASES].sort(), ['联动总览', '记到卡路里', '记到记账'].sort());
    assert.equal(new Set(WAKE_TABLE.map((e) => e.phrase)).size, WAKE_TABLE.length, '路由表有重复 phrase');
  });
});

describe('#800 逐行对照（词→场景→key→页族，一行不落）', () => {
  it('125 行全解析：场景可定、key 与场景一致、页族非 UNKNOWN', () => {
    const rows = [];
    for (const e of WAKE_TABLE) {
      let scene = null;
      if (HELP_ENTRY.has(e.phrase)) scene = 'HELP';
      else if (sceneOfWord.has(e.phrase) && !DEPRECATED_PHRASES.includes(e.phrase)) scene = sceneOfWord.get(e.phrase);
      else if (PENDING_DEPRECATED.has(e.phrase)) scene = { '查物品(HTML)': '2-1', '看物品(HTML)': '2-2', '统物品(HTML)': 'SM4-1' }[e.phrase];
      else if (variantHost.has(e.phrase)) scene = variantHost.get(e.phrase);
      else if (HOSTED.has(e.phrase)) scene = HOSTED.get(e.phrase);
      assert.ok(scene, '场景不定：' + e.phrase);
      if (scene !== 'HELP' && !REJUDGE.has(e.phrase)) {
        const allowed = SCENE_KEYS.get(scene) ?? new Set([sceneKey.get(scene)]);
        assert.ok(allowed.has(e.key), 'key 与场景不一致：' + e.phrase + ' 路由 ' + e.key + '／场景 ' + scene + ' 可达 ' + [...allowed].join('、'));
      } else if (scene === 'HELP') {
        assert.equal(e.key, 'home.help.lookup');
      }
      const family = scene === 'HELP' ? 'help' : resolvePageFamily(e.key, e.preset ?? {});
      assert.notEqual(family, UNKNOWN_FAMILY, '页族未解析：' + e.phrase + ' ' + e.key + ' ' + JSON.stringify(e.preset ?? {}));
      rows.push(e.phrase + ' → ' + scene + ' → ' + e.key + ' → ' + family + (REJUDGE.has(e.phrase) ? '（待重裁）' : ''));
    }
    assert.equal(rows.length, WAKE_TABLE.length, '对照缺行');
    console.log('对照 ' + rows.length + ' 行（词 → 场景 → key → 页族）：\n' + rows.join('\n'));
  });

  it('附录 70 场景自匹配：resolve 结果与附录 family 逐条一致（防走散）', () => {
    for (const s of appendix.scenarios) {
      assert.equal(resolvePageFamily(s.key, s.preset ?? {}), s.family, '附录走散：' + s.id + ' 期望 ' + s.family);
    }
    assert.equal(appendix.families.length, 46);
  });

  it('单审退回项锁定（推位置／找位置）：路由保持现状，待用户重裁才许动', () => {
    const r1 = routeWakeword('推位置看看', { category_id: 1 });
    assert.equal(r1.key, 'home.location.query');
    assert.deepEqual(r1.params, { mode: 'suggest', category_id: 1 });
    const r2 = routeWakeword('找位置看看', { reference: '牛奶' });
    assert.equal(r2.key, 'home.location.query');
    assert.deepEqual(r2.params, { mode: 'find', reference: '牛奶' });
  });

  it('setup 空声明：目录与标准件在，命令与路由为空（care 键家在 family）', () => {
    assert.deepEqual([...SETUP_COMMANDS], []);
    assert.deepEqual([...SETUP_ROUTES], []);
  });
});

describe('#800 最长匹配回归（变体进表后短词不被长词吃掉）', () => {
  const cases = [
    ['帮我查查物品牛奶', {}, 'home.item.search'],
    ['查物品(HTML)看看', {}, 'home.item.search'],
    ['看看家里有啥呀', {}, 'home.item.search'],
    ['家里都有啥呀', {}, 'home.stats.overview'],
    ['盘点记录看看', {}, 'home.inventory.records'],
    ['盘点一下', {}, 'home.inventory.round'],
    ['数数这里有几件', {}, 'home.inventory.round'],
    ['帮我记一下牛奶', {}, 'home.item.add'],
    ['借出登记', {}, 'home.care.write'],
    ['借入登记', {}, 'home.care.write'],
    ['归还确认', {}, 'home.care.write'],
    ['催还提醒', {}, 'home.care.query'],
    ['清点物品开始', {}, 'home.inventory.round'],
    ['位置管理看看', {}, 'home.location.write'],
    ['浏览空间视图看看', {}, 'home.location.query'],
    ['客厅里都有什么呀', {}, 'home.location.query'],
  ];
  for (const [text, ctx, key] of cases) {
    it('命中 ' + text + ' → ' + key, () => {
      assert.equal(routeWakeword(text, ctx).key, key);
    });
  }

  it('负向探针（门真会红）：route:false 词无命中、未知键 UNKNOWN', () => {
    assert.throws(() => routeWakeword('它具体是啥呀'), /无命中/);
    assert.throws(() => routeWakeword('这个收进来看看'), /无命中/);
    assert.equal(resolvePageFamily('home.nope', {}), UNKNOWN_FAMILY);
    assert.equal(resolvePageFamily('home.item.search', {}), 'search_list');
  });
});

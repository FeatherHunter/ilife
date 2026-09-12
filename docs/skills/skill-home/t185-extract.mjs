#!/usr/bin/env node
// t185 抽取脚本（一次性）：老内容骨架 scenarios.yaml × 新表 WAKE_TABLE → 紧凑对账原料。
// 用法：node docs/skills/skill-home/t185-extract.mjs
// 每条一行；prompt 只打印前 40 字。只读，不改任何源码。
import { readFileSync } from 'node:fs';

const YAML = 'D:/2Study/StudyNotes/SKILLS/居家管家/references/scenarios.yaml';
const WAKE = 'D:/ilife/packages/skill-home/src/policy/wakewords.ts';

const cut = (s, n = 40) => {
  const t = String(s ?? '').trim().replace(/\s+/g, ' ');
  return t.length > n ? t.slice(0, n) + '…' : t;
};
const show = (v) => (v === undefined || v === null || v === '' ? '' : String(v));

// ---------- 老 yaml：按行头解析 ----------
function parseYaml(text) {
  const recs = [];
  let cur = null;
  let key = null;
  const WANT = ['domain', 'sub', 'wake_word', 'scenario_id', 'scenario_title', 'type', 'status'];
  const KEYLINE = /^ {2}([A-Za-z_][A-Za-z0-9_]*):(?:\s*(.*))?$/;
  let ln = 0;
  for (const raw of text.split(/\r?\n/)) {
    ln += 1;
    const line = raw.replace(/\t/g, '    ');
    const start = /^\s*-\s+id:\s*(.*?)\s*$/.exec(line);
    if (start) {
      cur = { id: start[1].replace(/^['"]|['"]$/g, ''), prompt: '', line: ln };
      recs.push(cur);
      key = null;
      continue;
    }
    if (!cur) continue;
    const kv = KEYLINE.exec(line);
    if (kv) {
      key = kv[1];
      const val = (kv[2] ?? '').trim();
      if (WANT.includes(key)) cur[key] = val.replace(/^['"]|['"]$/g, '');
      else if (key === 'prompt' && val && !/^[|>]/.test(val)) cur.prompt = val.replace(/^['"]/, '');
      continue;
    }
    const tpl = /^\s+template:\s*(.+?)\s*$/.exec(line);
    if (tpl && cur) { cur.template = tpl[1].replace(/^['"]|['"]$/g, ''); continue; }
    // 续行：只接 prompt 的块标量／多行文本
    if (key === 'prompt' && line.trim()) cur.prompt += (cur.prompt ? ' ' : '') + line.trim().replace(/^['"]|['"]$/g, '');
  }
  return recs;
}

// ---------- 新表：从 TS 源里抽字面量 ----------
function parseWake(text) {
  const entries = [];
  for (const m of text.matchAll(/\{\s*phrase:\s*'([^']*)',\s*key:\s*'([^']*)'([^}]*)\}/g)) {
    const tail = m[3] || '';
    const needs = /needs:\s*\[([^\]]*)\]/.exec(tail);
    const preset = /preset:\s*\{([^}]*)\}/.exec(tail);
    entries.push({
      phrase: m[1],
      key: m[2],
      needs: needs ? needs[1].replace(/['"\s]/g, '') : '',
      preset: preset ? preset[1].replace(/['"]/g, '').replace(/\s+/g, ' ') : '',
    });
  }
  const dep = /DEPRECATED_PHRASES\s*=\s*\[([^\]]*)\]/.exec(text);
  const deprecated = dep ? [...dep[1].matchAll(/'([^']*)'/g)].map((x) => x[1]) : [];
  const keys = new Set(entries.map((e) => e.key));
  return { entries, deprecated, keyCount: keys.size, keys: [...keys] };
}

// ---------- names 模式：从老家 HELP／SKILL.md 摘「一级分组／子功能」的现成中文说法 ----------
const OLD_ROOT = 'D:/2Study/StudyNotes/SKILLS/居家管家';
function names() {
  const yml = readFileSync(YAML, 'utf8');
  console.log('=== A. yaml 顶层注释行（可能载一级分组名）===');
  for (const l of yml.split(/\r?\n/)) if (/^\s*#/.test(l)) console.log(cut(l, 100));
  console.log('=== B. yaml 顶层非场景行（| 之前的部分，只打前 60 行非空）===');
  let n = 0;
  for (const l of yml.split(/\r?\n/)) {
    if (!/^\s*-\s+id:/.test(l) && !/^\s{2,}\S/.test(l) && l.trim()) {
      console.log(cut(l, 100));
      if (++n >= 60) break;
    }
  }
  const md = readFileSync(OLD_ROOT + '/SKILL.md', 'utf8');
  console.log('=== C. 老 SKILL.md 标题行 ===');
  for (const l of md.split(/\r?\n/)) if (/^#{1,4}\s/.test(l)) console.log(cut(l, 80));
  console.log('=== D. 老 SKILL.md 含「一级分组／域／分组／九大」的行 ===');
  for (const l of md.split(/\r?\n/)) if (/一级分组|分组|域|九大|能力/.test(l)) console.log(cut(l, 80));
  for (const f of ['templates/help_center.html', '居家管家.html']) {
    const h = readFileSync(OLD_ROOT + '/' + f, 'utf8');
    console.log('=== E. ' + f + ' 标题标签 ===');
    for (const m of h.matchAll(/<h([1-4])[^>]*>([\s\S]{0,200}?)<\/h\1>/g)) {
      const t = m[2].replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
      if (t) console.log('h' + m[1] + ' | ' + cut(t, 60));
    }
    console.log('=== F. ' + f + ' 出现 ≥2 次的中文短文本（分组标签候选，按次数降序）===');
    const cnt = new Map();
    for (const m of h.matchAll(/>([^<>]{2,16})</g)) {
      const t = m[1].trim();
      if (/^[\u4e00-\u9fa5（）()·、/\s]{2,16}$/.test(t)) cnt.set(t, (cnt.get(t) || 0) + 1);
    }
    [...cnt.entries()].sort((a, b) => b[1] - a[1]).slice(0, 45).forEach(([t, c]) => console.log(c + ' × ' + t));
  }
}

function routes() {
  const md = readFileSync(OLD_ROOT + '/SKILL.md', 'utf8');
  const lines = md.split(/\r?\n/);
  const from = lines.findIndex((l) => /^## 路由表/.test(l));
  const to = lines.findIndex((l, i) => i > from && /^## /.test(l));
  console.log('=== 老家 SKILL.md 路由表（行 ' + (from + 2) + '-' + to + '）===');
  for (let i = from; i < to; i++) {
    const m = /^\|\s*(\d+)\s*\|\s*(.+?)\s*\|(.*)$/.exec(lines[i]);
    if (!m) continue;
    const cells = m[3].split('|').map((s) => s.trim().replace(/\*\*/g, ''));
    console.log(['R', m[1], m[2].replace(/\*\*/g, ''), cells[0], cells[1], cells[2] || ''].join(' | '));
  }
  const from2 = lines.findIndex((l) => /^### 唤醒词 CLI 映射/.test(l));
  const to2 = lines.findIndex((l, i) => i > from2 && /^## /.test(l));
  console.log('=== 老家 SKILL.md 唤醒词 CLI 映射（行 ' + (from2 + 2) + '-' + to2 + '）===');
  for (let i = from2; i < to2 && i - from2 < 120; i++) {
    const l = lines[i].trim();
    if (l.startsWith('|') || l.startsWith('>') || l.startsWith('-')) console.log(cut('M ' + l, 110));
  }
}

function join() {
  const recs = parseYaml(readFileSync(YAML, 'utf8'));
  const { entries } = parseWake(readFileSync(WAKE, 'utf8'));
  const mdLines = readFileSync('D:/ilife/packages/skill-home/SKILL.md', 'utf8').split(/\r?\n/);
  const help = new Map();
  for (const l of mdLines) {
    const m = /^\|\s*(.+?)\s*\|\s*(home\.[a-z.]+)\s*\|\s*(\S+)\s*\|\s*`(.+?)`\s*\|$/.exec(l);
    if (m) help.set(m[1], { key: m[2], shape: m[3], cmd: m[4] });
  }
  const byPhrase = new Map(entries.map((e) => [e.phrase, e]));
  const used = new Set();
  console.log('=== JOIN 老场景 → 新表（每行一条）===');
  let miss = 0;
  for (const r of recs) {
    const words = String(r.wake_word).split('/').map((s) => s.trim());
    const hits = words.map((w) => byPhrase.get(w)).filter(Boolean);
    if (!hits.length) {
      miss++;
      console.log(['J', r.id, r.domain, r.sub, r.wake_word, '→ 无落点', '', '', ''].join(' | '));
      continue;
    }
    for (const w of words) if (byPhrase.has(w)) used.add(w);
    const h = help.get(hits[0].phrase) || {};
    console.log(
      [
        'J', r.id, r.domain, r.sub, r.wake_word, '→', hits.map((x) => x.phrase).join('+'),
        hits.map((x) => x.key).join('+'), h.shape || '', h.cmd || '',
      ].join(' | '),
    );
  }
  console.log('=== JOIN 新表条目：无老场景承接 ===');
  for (const e of entries) {
    if (used.has(e.phrase)) continue;
    const h = help.get(e.phrase) || {};
    console.log(['X', e.phrase, e.key, h.shape || '', h.cmd || '', e.preset ? 'preset=' + e.preset : ''].join(' | '));
  }
  console.log('=== COUNT ===');
  console.log('old=' + recs.length + ' old_no_landing=' + miss + ' new_used=' + used.size + ' new_extra=' + (entries.length - used.size));
}

function sceneLines() {
  const recs = parseYaml(readFileSync(YAML, 'utf8'));
  for (const r of recs) console.log([r.id, r.line, r.domain, r.sub, r.wake_word, r.template].join('|'));
}

// ---------- skeleton 模式：机器可读骨架清单草案（供 #188）----------
const DOMAIN_CN = { items: '物品管理', space: '空间与位置', outfit: '穿搭出行', stats: '统计总览', express: '快递购物', receipt: '票据凭证', family: '家庭协作', setup: '开始使用', link: '联动功能' };
const SUB_EN = {
  'items/录入': 'add', 'items/查找': 'search', 'items/更新': 'update', 'items/标签与分类': 'tag', 'items/照片档案': 'photo', 'items/盘点': 'inventory', 'items/物品历史': 'history',
  'space/位置管理': 'locationManage', 'space/固定位': 'fixedSpot', 'space/收纳建议': 'suggestStorage', 'space/空间视图': 'spaceView',
  'outfit/穿搭推荐': 'outfitPick', 'outfit/衣橱管理': 'wardrobe', 'outfit/出行清单': 'tripPack', 'outfit/旅行穿搭计划': 'tripOutfitPlan',
  'stats/统计总览': 'overview',
  'express/购物清单': 'shoppingList', 'express/缺货检测': 'shoppingMissing', 'express/快递跟踪': 'searchExpress', 'express/囤货盘点': 'stockCheck',
  'receipt/购买记录': 'purchase', 'receipt/保修与保养': 'warranty', 'receipt/证件管理': 'cert', 'receipt/账号密码': 'account',
  'family/借用管理': 'borrow', 'family/家人档案': 'member',
  'setup/开始使用': 'firstUse',
  'link/联动总览': 'linkOverview', 'link/食品联动': 'linkCalorie', 'link/价格联动': 'linkAccounting',
};
// 归属判定来自报告第二节（本席判断，不是老家字段）：新表补词挂在哪个承接场景上
const ATTACH = {
  '补物品': ['3-3', ''], '减物品': ['3-3', ''], '废物品': ['3-4', ''], '借物品': ['3-4', ''], '修物品': ['3-4', ''],
  '盘物品': ['6-1', ''], '盘全部': ['6-1', ''], '看标签': ['4-1', ''], '合标签': ['4-1', ''],
  '查高频': ['SM4-1', ''], '查低频': ['SM4-2', ''],
  '推位置': ['SM2-1', 'U1 待裁：老家记作录入流程子步骤 features/add.md Step 2.5'],
  '找位置': ['SM2-1', 'U1 待裁：老家记作录入流程子步骤 features/add.md Step 2.6'],
  '改购物清单': ['SM5-1', ''],
  '查物品(HTML)': ['2-1', '兼容别名，不进 HELP'], '看物品(HTML)': ['2-2', '兼容别名，不进 HELP'], '统物品(HTML)': ['SM4-1', '兼容别名，不进 HELP'],
};
const HELP_ONLY = ['居家管家 帮助', '居家管家帮助', '居家管家能做什么'];
const J = (v) => JSON.stringify(v);

function skeleton() {
  const recs = parseYaml(readFileSync(YAML, 'utf8'));
  const { entries, deprecated } = parseWake(readFileSync(WAKE, 'utf8'));
  const byPhrase = new Map(entries.map((e) => [e.phrase, e]));
  // cli 以 SKILL.md 的 HELP-AUTO「例」列为准（那是仓内既有命令，含 preset 全参）
  const helpCmd = new Map();
  for (const l of readFileSync('D:/ilife/packages/skill-home/SKILL.md', 'utf8').split(/\r?\n/)) {
    const m = /^\|\s*(.+?)\s*\|\s*(home\.[a-z.]+)\s*\|\s*(\S+)\s*\|\s*`(.+?)`\s*\|$/.exec(l);
    if (m) helpCmd.set(m[1], m[4]);
  }
  const presetOf = (e) => {
    const o = {};
    for (const kv of (e.preset || '').split(',')) {
      if (!kv) continue;
      const i = kv.indexOf(':');
      const k = kv.slice(0, i).trim();
      let v = kv.slice(i + 1).trim();
      if (/^-?\d+$/.test(v)) v = Number(v);
      o[k] = v;
    }
    return o;
  };
  const cliOf = (phrase, e) => {
    if (helpCmd.has(phrase)) return helpCmd.get(phrase);
    const p = { ...presetOf(e) };
    if (e.needs) p[e.needs] = 1;
    const keys = Object.keys(p);
    return 'home-cmd-read ' + e.key + (keys.length ? " --params '" + JSON.stringify(p) + "'" : '');
  };
  const domains = [];
  for (const r of recs) {
    let d = domains.find((x) => x.key === r.domain);
    if (!d) { d = { key: r.domain, name_cn: DOMAIN_CN[r.domain] || '', subs: [] }; domains.push(d); }
    let s = d.subs.find((x) => x.sub_cn === r.sub);
    if (!s) { s = { sub_cn: r.sub, name: SUB_EN[r.domain + '/' + r.sub] || '', scenes: [] }; d.subs.push(s); }
    const words = String(r.wake_word).split('/').map((x) => x.trim());
    const hit = byPhrase.get(words[0]);
    const sc = {
      id: r.id,
      wake: words,
      title: r.scenario_title,
      prompt_source: r.domain === 'link' ? null : 'old_yaml:' + r.line + '#prompt',
      origin: 'old_yaml',
      old_template: r.template,
      cli: hit ? cliOf(hit.phrase, hit) : null,
    };
    if (r.domain === 'link') sc.status = 'deprecated';
    const ex = [];
    for (const [ph, [host, note]] of Object.entries(ATTACH)) {
      if (host !== r.id) continue;
      const e = byPhrase.get(ph);
      const o = { phrase: ph, key: e.key, cli: cliOf(ph, e), in_help: !ph.includes('(HTML)'), origin: 'new_table' };
      if (note) o.note = note;
      ex.push(o);
    }
    if (ex.length) sc.extra_wake = ex;
    s.scenes.push(sc);
  }
  const obj = {
    schema: 'skill-home/scene-skeleton@1',
    for_ticket: '#188',
    sources: {
      old: 'D:/2Study/StudyNotes/SKILLS/居家管家/references/scenarios.yaml',
      new: 'packages/skill-home/src/policy/wakewords.ts（WAKE_TABLE 91 词／HomeKey 21 命令／DEPRECATED_PHRASES 3 词）',
      help_auto: 'packages/skill-home/SKILL.md:24-120',
      reconcile: 'docs/skills/skill-home/t185-content-reconcile.md',
    },
    counts: {
      domains: domains.length,
      subs: domains.reduce((n, d) => n + d.subs.length, 0),
      scenes: recs.length,
      scenes_with_landing: recs.filter((r) => r.domain !== 'link').length,
      scenes_deprecated: recs.filter((r) => r.domain === 'link').length,
      new_entries: entries.length,
      new_carried: 71,
      new_compensated: entries.length - 71,
    },
    help_only: HELP_ONLY.map((p) => ({ phrase: p, key: byPhrase.get(p).key, in_help: true, note: 'HELP 自身入口，不属 9 域场景' })),
    deprecated: deprecated.map((p, i) => ({ phrase: p, key: null, in_help: false, old_scene: ['SM9-1', 'SM9-2', 'SM9-3'][i], note: '不路由；prompt 复制不迁（SKILL.md:125）；combos 登记走后续票' })),
    domains,
  };
  const L = [];
  L.push('{');
  for (const [k, v] of Object.entries(obj)) {
    if (k === 'domains' || k === 'help_only' || k === 'deprecated') continue;
    L.push('  ' + J(k) + ': ' + J(v) + ',');
  }
  L.push('  ' + J('help_only') + ': [');
  L.push(obj.help_only.map((x) => '    ' + J(x)).join(',\n'));
  L.push('  ],');
  L.push('  ' + J('deprecated') + ': [');
  L.push(obj.deprecated.map((x) => '    ' + J(x)).join(',\n'));
  L.push('  ],');
  L.push('  ' + J('domains') + ': [');
  obj.domains.forEach((d, di) => {
    L.push('    { ' + J('key') + ': ' + J(d.key) + ', ' + J('name_cn') + ': ' + J(d.name_cn) + ', ' + J('subs') + ': [');
    d.subs.forEach((s, si) => {
      L.push('      { ' + J('sub_cn') + ': ' + J(s.sub_cn) + ', ' + J('name') + ': ' + J(s.name) + ', ' + J('scenes') + ': [');
      s.scenes.forEach((sc, ci) => {
        const inner = Object.entries(sc).map(([k, v]) => J(k) + ': ' + J(v)).join(', ');
        L.push('        { ' + inner + ' }' + (ci === s.scenes.length - 1 ? '' : ','));
      });
      L.push('      ] }' + (si === d.subs.length - 1 ? '' : ','));
    });
    L.push('    ] }' + (di === obj.domains.length - 1 ? '' : ','));
  });
  L.push('  ]');
  L.push('}');
  const text = L.join('\n');
  try {
    JSON.parse(text);
  } catch (e) {
    console.error('WARN: 生成的骨架 JSON 不合法：' + e.message);
  }
  console.log(text);
}

// ---------- run ----------
if (process.argv[2] === 'skeleton') {
  skeleton();
  process.exit(0);
}
if (process.argv[2] === 'lines') {
  sceneLines();
  process.exit(0);
}
if (process.argv[2] === 'names') {
  names();
  process.exit(0);
}
if (process.argv[2] === 'routes') {
  routes();
  process.exit(0);
}
if (process.argv[2] === 'join') {
  join();
  process.exit(0);
}
const recs = parseYaml(readFileSync(YAML, 'utf8'));
const { entries, deprecated, keyCount, keys } = parseWake(readFileSync(WAKE, 'utf8'));

const warn = recs.filter((r) => !r.domain || !r.sub || !r.wake_word || !r.scenario_id);
const domains = [...new Set(recs.map((r) => r.domain))];

console.log('=== OLD scenarios.yaml ===');
for (const r of recs) {
  console.log(
    [
      'O',
      show(r.id),
      show(r.domain),
      show(r.sub),
      show(r.wake_word),
      show(r.scenario_id),
      show(r.scenario_title),
      show(r.type),
      'st=' + show(r.status),
      'p:' + cut(r.prompt, 40),
    ].join(' | '),
  );
}

console.log('');
console.log('=== NEW WAKE_TABLE ===');
for (const e of entries) {
  console.log(['W', e.phrase, e.key, e.needs ? 'needs=' + e.needs : 'needs=', e.preset ? 'preset=' + e.preset : ''].join(' | '));
}

console.log('');
console.log('=== SUMMARY ===');
console.log('old.records=' + recs.length + ' old.missing_fields=' + warn.length + (warn.length ? ' -> ' + warn.map((w) => w.id).join(',') : ''));
console.log('old.domains=' + domains.length + ' -> ' + domains.join(','));
const byDomain = {};
for (const r of recs) (byDomain[r.domain] ||= []).push(r);
for (const d of domains) {
  const subs = [...new Set(byDomain[d].map((r) => r.sub))];
  console.log(
    '  old.' + d + ': scenes=' + byDomain[d].length + ' subs=' + subs.length + ' -> ' + subs.map((s) => s + '(' + byDomain[d].filter((r) => r.sub === s).length + ')').join(' '),
  );
}
console.log('old.subs.total=' + new Set(recs.map((r) => r.domain + '/' + r.sub)).size);
console.log('old.scenario_ids=' + new Set(recs.map((r) => r.scenario_id)).size + ' -> ' + [...new Set(recs.map((r) => r.scenario_id))].join(','));
console.log('new.entries=' + entries.length + ' new.keys=' + keyCount + ' deprecated=' + deprecated.join(','));
console.log('new.keys.list=' + keys.join(','));
const byKey = {};
for (const e of entries) (byKey[e.key] ||= []).push(e.phrase);
for (const k of keys) console.log('  new.' + k + ': phrases=' + byKey[k].length + ' -> ' + byKey[k].join('，'));

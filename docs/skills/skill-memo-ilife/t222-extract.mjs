#!/usr/bin/env node
// t222 抽取脚本（地图 #220 · 票 2 / issue #222）：老骨架 × 新表 → 紧凑对账原料。
// 方法照抄兄弟地图 docs/skills/skill-home/t185-extract.mjs（本席实际读的就是该文件名，未被并发改名）。
// 用法：
//   node docs/skills/skill-memo-ilife/t222-extract.mjs            # 全量证据（O/W/J/C 行 + SUMMARY）
//   node docs/skills/skill-memo-ilife/t222-extract.mjs join       # 只跑逐条对账 + 计数
//   node docs/skills/skill-memo-ilife/t222-extract.mjs skeleton   # 打印机器可读骨架 JSON
//   node docs/skills/skill-memo-ilife/t222-extract.mjs lines      # 老场景行号表
//   node docs/skills/skill-memo-ilife/t222-extract.mjs names      # 名称证据（域名/子功能名/中英对照原料）
//   node docs/skills/skill-memo-ilife/t222-extract.mjs routes     # 老 SKILL.md 各分支表（HELP/别名/CLI/HTML）
// 只读：只读源码与老技能目录，不写任何文件（产物由调用方重定向落盘）。
import { readFileSync, writeFileSync, mkdirSync, readdirSync } from 'node:fs';

const YAML = 'D:/2Study/StudyNotes/SKILLS/备忘录/references/scenarios.yaml';
const OLD_MD = 'D:/2Study/StudyNotes/SKILLS/备忘录/SKILL.md';
const OLD_RENDER = 'D:/2Study/StudyNotes/SKILLS/备忘录/script/memo_render.py';
const WAKE = 'D:/ilife/packages/skill-memo-ilife/src/policy/wakewords.ts';
const CATEGORY = 'D:/ilife/packages/skill-memo-ilife/src/policy/category.ts';
const ENVELOPE = 'D:/ilife/packages/skill-memo-ilife/src/render/envelope.ts';
const NEW_MD = 'D:/ilife/packages/skill-memo-ilife/SKILL.md';

const cut = (s, n = 40) => {
  const t = String(s ?? '').trim().replace(/\s+/g, ' ');
  return t.length > n ? t.slice(0, n) + '…' : t;
};
const show = (v) => (v === undefined || v === null || v === '' ? '' : String(v));
const unq = (s) => String(s ?? '').trim().replace(/^['"]/, '').replace(/['"]$/, '');
const stripMd = (s) => String(s ?? '').replace(/\*\*/g, '').replace(/`/g, '').trim();

// ---------- 老 scenarios.yaml：按行头解析（与 t185 同法）----------
function parseYaml(text) {
  const recs = [];
  let cur = null;
  let key = null;
  const WANT = ['domain', 'sub', 'wake_word', 'scenario_id', 'scenario_title', 'type', 'status', 'category', 'subfunction'];
  const KEYLINE = /^ {2}([A-Za-z_][A-Za-z0-9_]*):(?:\s*(.*))?$/;
  let ln = 0;
  for (const raw of text.split(/\r?\n/)) {
    ln += 1;
    const line = raw.replace(/\t/g, '    ');
    const start = /^\s*-\s+wake_word:\s*(.*?)\s*$/.exec(line);
    if (start) {
      cur = { wake_raw: unq(start[1]), line: ln, prompt: '', dims: [], dims_raw: [] };
      recs.push(cur);
      key = null;
      continue;
    }
    if (!cur) continue;
    const kv = KEYLINE.exec(line);
    if (kv) {
      key = kv[1];
      const val = (kv[2] ?? '').trim();
      if (WANT.includes(key)) cur[key] = unq(val);
      else if (key === 'prompt' && val && !/^[|>]/.test(val)) cur.prompt = unq(val);
      continue;
    }
    const tpl = /^\s+template:\s*(.+?)\s*$/.exec(line);
    if (tpl && cur) { cur.template = unq(tpl[1]); continue; }
    // dimensions 是 flow map（单行 {a: b, c: d}）或块 map
    if (/^\s{4}\S.*:/.test(line) && key === 'dimensions') {
      const m = /^\s{4}([^:]+?):\s*(.*)$/.exec(line);
      if (m) { cur.dims.push(unq(m[1]).replace(/^['"]|['"]$/g, '')); cur.dims_raw.push(unq(m[1]) + '=' + cut(m[2], 60)); }
      continue;
    }
    const flow = /^\s{2}dimensions:\s*\{(.*)\}\s*$/.exec(line);
    if (flow && cur) {
      for (const part of splitFlow(flow[1])) {
        const i = part.indexOf(':');
        if (i < 0) continue;
        const k = unq(part.slice(0, i));
        cur.dims.push(k);
        cur.dims_raw.push(k + '=' + cut(part.slice(i + 1), 60));
      }
      key = null;
      continue;
    }
    // 续行：只接 prompt 的块标量／多行文本
    if (key === 'prompt' && line.trim()) cur.prompt += (cur.prompt ? ' ' : '') + stripYamlCont(line.trim());
  }
  for (const r of recs) r.prompt = r.prompt.replace(/\\\s*/g, '').trim();
  return recs;
}
// flow map 按顶层逗号切（值里可能含引号包住的斜杠/中文，不含逗号）
function splitFlow(s) {
  const out = [];
  let depth = 0;
  let q = null;
  let cur = '';
  for (const ch of s) {
    if (q) { cur += ch; if (ch === q) q = null; continue; }
    if (ch === '"' || ch === "'") { q = ch; cur += ch; continue; }
    if (ch === '{' || ch === '[') depth += 1;
    if (ch === '}' || ch === ']') depth -= 1;
    if (ch === ',' && depth === 0) { out.push(cur.trim()); cur = ''; continue; }
    cur += ch;
  }
  if (cur.trim()) out.push(cur.trim());
  return out;
}
const stripYamlCont = (s) => unq(s);

// ---------- 老 SKILL.md：HELP 变体 / 别名 / CLI 对照 / HTML 对照 ----------
function mdLines() { return readFileSync(OLD_MD, 'utf8').split(/\r?\n/); }
function section(lines, headRe, stopRe = /^## /) {
  const from = lines.findIndex((l) => headRe.test(l));
  if (from < 0) return [];
  let to = lines.findIndex((l, i) => i > from && stopRe.test(l));
  if (to < 0) to = lines.length;
  return lines.slice(from, to).map((l, i) => ({ line: from + 1 + i, text: l }));
}
function helpVariants() {
  const lines = mdLines();
  // 只到下一个 ### 为止：1120 起的「场景资产契约(§07 §2.2)」字段表是另一张表，别混进来
  const sec = section(lines, /^### 唤醒词灵活匹配/, /^#{2,3} /);
  const out = [];
  for (const { line, text } of sec) {
    // 表里三种写法并存：`备忘录 HELP`（反引号）／`x` / `y`（一条两词）／备忘 HELP(少"录"字)（裸文本）
    const cells = text.split('|');
    if (cells.length < 5 || !text.trim().startsWith('|')) continue;
    const first = (cells[1] || '').trim();
    if (!first || /^-+$/.test(first) || first === '用户原话示例') continue;
    const quoted = [...first.matchAll(/`([^`]+)`/g)].map((x) => x[1]);
    const phrases = quoted.length ? quoted : [first.replace(/\(.*$/, '').trim()];
    for (const p of phrases) if (p) out.push({ phrase: p, kind: (cells[2] || '').trim(), line });
  }
  const literal = lines.findIndex((l) => l.includes('- **`备忘录 HELP`**'));
  return { header_line: sec.length ? sec[0].line : null, literal_line: literal >= 0 ? literal + 1 : null, rows: out };
}
function aliases() {
  const lines = mdLines();
  const out = [];
  lines.forEach((text, i) => {
    for (const m of text.matchAll(/别名[:：]\s*([^)·）*]+)/g)) {
      out.push({ line: i + 1, raw: cut(m[0], 60), owner: cut(text.split('别名')[0].replace(/^[\s|*>-]*/, ''), 40) });
    }
  });
  return out;
}
function cliTable() {
  const lines = mdLines();
  const sec = section(lines, /^## 用户原话 → 唤醒词 反向指引表/);
  const out = [];
  for (const { line, text } of sec) {
    const m = /^\|\s*(\d+)\s*\|\s*(.+?)\s*\|\s*(.+?)\s*\|\s*`(.+?)`\s*\|/.exec(text);
    if (!m) continue;
    out.push({ n: Number(m[1]), line, user_words: cut(m[2], 70), wake: stripMd(m[3]), cli: m[4] });
  }
  return out;
}
function htmlTable() {
  const lines = mdLines();
  const sec = section(lines, /^## 唤醒词 → HTML 生成对照表/);
  const out = [];
  let stat = null;
  for (const { line, text } of sec) {
    const m = /^\|\s*(\d+|-)\s*\|\s*(.+?)\s*\|\s*(✅|❌|🟡)\s*\|\s*(.+?)\s*\|\s*(.*?)\s*\|\s*$/.exec(text);
    if (m) out.push({ n: m[1], line, wake: stripMd(m[2]), html: m[3], cmd: stripMd(m[4]), template: stripMd(m[5]) });
    const s = /^\|\s*(✅ 必须生成 HTML|🟡 过程型 HTML|❌ 不生成 HTML|\*\*合计\*\*)\s*\|\s*\*{0,2}(\d+)\*{0,2}\s*\|/.exec(text);
    if (s) {
      const words = text.split('|')[3] ? text.split('|')[3].trim() : '';
      stat = { ...(stat || {}), [s[1]]: { count: Number(s[2]), line, words: cut(words, 200) } };
    }
  }
  return { header_line: sec.length ? sec[0].line : null, rows: out, stats: stat };
}
function helpSection() {
  const lines = mdLines();
  const sec = section(lines, /^## 备忘录 HELP/);
  const out = [];
  for (const { line, text } of sec) if (text.trim()) out.push({ line, text: cut(text, 100) });
  return out;
}

// ---------- 新表：从 TS 源里抽字面量（含 WAKE_TOPS 展开，照抄 wakewords.ts:32-37 的循环）----------
function parseWakeTops(text) {
  const body = /export const WAKE_TOPS[^{]*\{([\s\S]*?)\n\}/.exec(text);
  const out = [];
  if (!body) return out;
  for (const m of body[1].matchAll(/'([^']+)':\s*'([^']+)'/g)) out.push({ phrase: m[1], top: m[2] });
  return out;
}
function parseWake() {
  const text = readFileSync(WAKE, 'utf8');
  const literal = [];
  const body = /export const WAKE_TABLE[^=]*=\s*\[([\s\S]*?)\n\];/.exec(text);
  for (const m of (body ? body[1] : '').matchAll(/\{\s*phrase:\s*'([^']*)',\s*key:\s*'([^']*)'([^}]*)\}/g)) {
    const tail = m[3] || '';
    const needs = /needs:\s*\[([^\]]*)\]/.exec(tail);
    const preset = /preset:\s*\{([^}]*)\}/.exec(tail);
    literal.push({
      phrase: m[1], key: m[2],
      needs: needs ? needs[1].replace(/['"\s]/g, '').split(',').filter(Boolean) : [],
      preset: preset ? preset[1].replace(/['"]/g, '').replace(/\s+/g, ' ').trim() : '',
      origin: 'literal',
    });
  }
  const expanded = [];
  for (const t of parseWakeTops(readFileSync(CATEGORY, 'utf8'))) {
    const verb = t.phrase[0];
    if (verb === '记') expanded.push({ phrase: t.phrase, key: 'memo.create', needs: [], preset: 'category:' + t.top, origin: 'wake_tops' });
    else if (verb === '查') expanded.push({ phrase: t.phrase, key: t.phrase === '查心愿' ? 'memo.wish' : 'memo.search', needs: [], preset: 'category:' + t.top, origin: 'wake_tops' });
    else expanded.push({ phrase: t.phrase, key: 'memo.update', needs: ['id'], preset: 'category:' + t.top, origin: 'wake_tops' });
  }
  const all = [...literal, ...expanded];
  const dep = /DEPRECATED_PHRASES\s*=\s*\[([^\]]*)\]/.exec(text);
  const keys = [...new Set(all.map((e) => e.key))];
  const tops = [...new Set(parseWakeTops(readFileSync(CATEGORY, 'utf8')).map((t) => t.top))];
  return { literal, expanded, all, deprecated: dep ? [...dep[1].matchAll(/'([^']*)'/g)].map((x) => x[1]) : [], keys, tops };
}
function parseShapes() {
  const text = readFileSync(ENVELOPE, 'utf8');
  const body = /MEMO_KEY_SHAPES[^{]*\{([\s\S]*?)\n\};/.exec(text);
  const out = [];
  for (const m of (body ? body[1] : '').matchAll(/'([^']+)':\s*'([^']+)'/g)) out.push({ key: m[1], shape: m[2] });
  return out;
}
// 新 SKILL.md 的 HELP-AUTO 表：唤醒词 → 例（仓内既有命令，含 preset 全参）
function helpAuto() {
  const map = new Map();
  let inBlock = false;
  readFileSync(NEW_MD, 'utf8').split(/\r?\n/).forEach((l, i) => {
    if (l.includes('HELP-AUTO-START')) { inBlock = true; return; }
    if (l.includes('HELP-AUTO-END')) { inBlock = false; return; }
    if (!inBlock) return;
    const m = /^\|\s*(.+?)\s*\|\s*(memo\.[a-z.]+)\s*\|\s*(\S+)\s*\|\s*`(.+?)`\s*\|$/.exec(l);
    if (m) map.set(m[1], { key: m[2], shape: m[3], cli: m[4], line: i + 1 });
  });
  return map;
}

// ---------- 老目录域／二级组：计数 + 中英对照原料 ----------
const DOMAIN_CN = { memo: '备忘类', search: '查找类', remind: '提醒类', wish: '心愿类', checkin: '打卡类', mood: '情绪类', sync: '同步类', init: '初始化类' };
const OLD_DOMAIN_TO_KEY = {
  memo: ['memo.create', 'memo.update', 'memo.remove', 'memo.batch'],
  search: ['memo.search', 'memo.detail', 'memo.wish', 'memo.remind'],
  remind: ['memo.remind', 'memo.create'],
  wish: ['memo.wish', 'memo.update'],
  checkin: ['memo.create', 'memo.update', 'memo.remove'],
  mood: ['memo.create', 'memo.update', 'memo.remove'],
  sync: ['memo.sync'],
  init: [],
};
// name_en 是本席给的结构标识（不是老家字段）：优先沿用新表已冻结的 key 名，无 key 的按新表同义命令取名
const SUB_EN = {
  'memo/基础记录': 'create', 'memo/分类调整': 'batch(单条走 update)',
  'search/基础查找': 'search', 'search/时间查找': 'search(timeRange)', 'search/分类查找': 'search(category)',
  'remind/创建提醒': 'create(remindAt)', 'remind/查看提醒': 'remind',
  'wish/心愿推进': 'wish+update(done)', 'wish/心愿管理': 'wish',
  'checkin/(基础)': 'create/update(category=打卡)', 'mood/(基础)': 'create/update(category=情绪日记)',
  'sync/(基础)': 'sync', 'init/(基础)': 'init(新表无 init key)',
};

function tree(recs) {
  const domains = [];
  for (const r of recs) {
    const ck = r.category || '(缺)';
    let d = domains.find((x) => x.key === ck);
    if (!d) { d = { key: ck, name_cn: DOMAIN_CN[ck] || '', name_en: ck, subs: [] }; domains.push(d); }
    const label = r.subfunction || '（空 → 「基础」兜底）';
    let s = d.subs.find((x) => x.sub_cn === label);
    if (!s) { s = { sub_cn: label, sub_fallback: !r.subfunction, name: SUB_EN[ck + '/' + (r.subfunction || '(基础)')] || '', scenes: [] }; d.subs.push(s); }
    const words = String(r.wake_raw).split(/[/／]/).map((x) => x.trim()).filter(Boolean);
    s.scenes.push({ id: r.scenario_id, wake: words, title: r.scenario_title, type: r.type, status: r.status || '', line: r.line, n_dims: r.dims.length });
  }
  return domains;
}

// 新表口径复算：routeWakeword 是「text.includes(phrase)」+ 最长匹配（wakewords.ts:40-52）。
// 所以对一句「就只含这个老词」的用户原话，能被路由到的新短语 = 所有 phrase ⊆ 老词 的条目；
// 最长者获胜；一个都没有 = 该老词在新表下不可路由。
function routeOf(text, sorted) {
  const cands = sorted.filter((e) => text.includes(e.phrase)).map((e) => e.phrase);
  const winner = cands.length ? sorted.find((e) => e.phrase === cands[0]) : null;
  return {
    candidates: cands,
    phrase: winner ? winner.phrase : null,
    key: winner ? winner.key : null,
    ambiguous: cands.length > 1,
  };
}

// ---------- 对账 ----------
function reconcile() {
  const recs = parseYaml(readFileSync(YAML, 'utf8'));
  const wake = parseWake();
  const help = helpAuto();
  const byPhrase = new Map(wake.all.map((e) => [e.phrase, e]));
  const sorted = [...wake.all].sort((a, b) => b.phrase.length - a.phrase.length);
  const used = new Set();
  const rows = recs.map((r) => {
    const words = String(r.wake_raw).split(/[/／]/).map((x) => x.trim()).filter(Boolean);
    const hits = words.filter((w) => byPhrase.has(w));
    const partial = words.flatMap((w) => wake.all.filter((e) => e.phrase !== w && e.phrase.includes(w)).map((e) => w + ' ⊂ ' + e.phrase));
    for (const w of hits) used.add(w);
    const route = routeOf(words[0], sorted);
    return {
      scenario_id: r.scenario_id, line: r.line, category: r.category, name_cn: DOMAIN_CN[r.category] || '', subfunction: r.subfunction || '',
      wake: words, wake_raw: r.wake_raw, title: r.scenario_title, type: r.type, status: r.status || '', n_dims: r.dims.length,
      landing: hits.length ? 'hit' : 'none',
      route,
      route_kind: !route.phrase ? 'no_route' : (hits.length && route.phrase === words[0] ? 'exact' : 'substring'),
      keys: [...new Set(hits.map((w) => byPhrase.get(w).key))],
      hits: hits.map((w) => ({ phrase: w, key: byPhrase.get(w).key, needs: byPhrase.get(w).needs, preset: byPhrase.get(w).preset, origin: byPhrase.get(w).origin })),
      partial,
    };
  });
  const extra = wake.all.filter((e) => !used.has(e.phrase)).map((e) => ({
    phrase: e.phrase, key: e.key, needs: e.needs, preset: e.preset, origin: e.origin,
    in_help: help.has(e.phrase), cli: help.has(e.phrase) ? help.get(e.phrase).cli : null,
  }));
  return { recs, wake, help, rows, extra, used };
}

// ---------- 输出：全量证据 ----------
// 输出口：默认打 stdout；写证据文件时换到数组（避免 PowerShell 管道按本地码页转码，中文会被吃）。
let SINK = null;
const out = (s = '') => (SINK ? SINK.push(s) : console.log(s));

function dump() {
  const { recs, wake, help, rows, extra } = reconcile();
  out('=== OLD scenarios.yaml（' + recs.length + ' 条）===');
  for (const r of recs) {
    out(['O', r.scenario_id, r.category, r.subfunction || '(空)', r.wake_raw, 'type=' + show(r.type), 'st=' + show(r.status), 'dims=' + r.dims.length, 'p:' + cut(r.prompt, 36)].join(' | '));
  }
  out('');
  out('=== NEW WAKE_TABLE（' + wake.all.length + ' 词 = 字面 ' + wake.literal.length + ' + WAKE_TOPS 展开 ' + wake.expanded.length + '）===');
  for (const e of wake.all) {
    out(['W', e.phrase, e.key, 'src=' + e.origin, e.needs.length ? 'needs=' + e.needs.join(',') : '', e.preset ? 'preset=' + e.preset : '', help.has(e.phrase) ? 'cli=' + help.get(e.phrase).cli : ''].join(' | '));
  }
  out('');
  out('=== JOIN 老场景 → 新表（每行一条）===');
  for (const r of rows) {
    out(['J', r.scenario_id, r.category, r.subfunction || '(空)', r.wake.join('/'), '→', r.landing === 'hit' ? r.hits.map((h) => h.phrase + ':' + h.key).join('+') : '无逐字落点', 'route=' + (r.route.phrase ? r.route.phrase + ':' + r.route.key + '(' + r.route_kind + (r.route.ambiguous ? '/歧义:' + r.route.candidates.join('>') : '') + ')' : '不可路由'), r.partial.join(';')].join(' | '));
  }
  out('');
  out('=== JOIN 新表条目：无老场景承接 ===');
  for (const e of extra) out(['X', e.phrase, e.key, 'src=' + e.origin, e.in_help ? 'in_help' : '', e.preset ? 'preset=' + e.preset : ''].join(' | '));
  out('');
  out('=== COUNT ===');
  const hit = rows.filter((r) => r.landing === 'hit').length;
  out('old.scenes=' + recs.length + ' old.hit=' + hit + ' old.none=' + (recs.length - hit));
  out('old.unique_wake=' + new Set(recs.map((r) => r.wake_raw)).size);
  out('new.entries=' + wake.all.length + ' new.carried=' + new Set(rows.flatMap((r) => r.hits.map((h) => h.phrase))).size + ' new.extra=' + extra.length);
  out('old.dims.total=' + recs.reduce((n, r) => n + r.dims.length, 0));
  out('old.domains=' + new Set(recs.map((r) => r.category)).size + ' old.subs=' + new Set(recs.map((r) => r.category + '/' + (r.subfunction || '(基础)'))).size);
  out('old.sub_fallback=' + new Set(recs.filter((r) => !r.subfunction).map((r) => r.category)).size);
  const subs = rows.filter((r) => r.landing === 'none' && r.route_kind === 'substring');
  const none = rows.filter((r) => r.landing === 'none' && r.route_kind === 'no_route');
  out('old.none.route=substring=' + subs.length + ' -> ' + subs.map((r) => r.scenario_id + '(' + r.wake[0] + '→' + r.route.phrase + (r.route.ambiguous ? '/歧义' : '') + ')').join(' '));
  out('old.none.route=no_route=' + none.length + ' -> ' + none.map((r) => r.scenario_id + '(' + r.wake[0] + ')').join(' '));
  out('old.ambiguous_routes=' + rows.filter((r) => r.route.ambiguous).length + ' -> ' + rows.filter((r) => r.route.ambiguous).map((r) => r.wake[0] + '(' + r.route.candidates.join('>') + ')').join(' '));
  // 老 29 个唯一唤醒词三态（票 6 裁决／票 7 入库直接消费）
  const wm = wakeMap(rows, wake);
  out('=== 老唯一唤醒词三态：exact=' + wm.filter((x) => x.state === 'exact').length + ' substring=' + wm.filter((x) => x.state === 'substring').length + ' none=' + wm.filter((x) => x.state === 'none').length + ' ===');
  for (const x of wm) out(['M', x.wake, x.state, x.key || '-', x.state === 'substring' ? '→ ' + x.new_phrase : '', 'scene=' + x.scene, x.category].join(' | '));
  // 就「只含该老词的一句话」实测新表路由（口径复算，不导入 TS）
  out('=== 路由口径复算（最长匹配，老词单独成句）===');
  for (const x of wm) {
    const r0 = routeOf(x.wake, [...wake.all].sort((a, b) => b.phrase.length - a.phrase.length));
    out(['P', x.wake, r0.phrase ? r0.phrase + ':' + r0.key : 'POLICY_NO_MATCH', r0.ambiguous ? '歧义候选=' + r0.candidates.join('>') : '', 'cands=' + r0.candidates.length].join(' | '));
  }
  out('phrase.route=ok=' + wm.filter((x) => x.state !== 'none').length + ' phrase.route=no_match=' + wm.filter((x) => x.state === 'none').length);
  // 新仓测试覆盖：老 29 个唯一唤醒词有没有被 test/ 提到（无匹配的 10 个是否有用例）
  out('=== 新仓 test/ 对老唯一唤醒词的覆盖 ===');
  let tests = '';
  for (const f of ['policy.test.mjs', 'cli.test.mjs', 'skill.test.mjs', 'render.test.mjs', 'fetch.test.mjs']) {
    try { tests += readFileSync('D:/ilife/packages/skill-memo-ilife/test/' + f, 'utf8'); } catch { /* 缺文件即跳过 */ }
  }
  for (const x of wm) out(['C', x.wake, x.state === 'none' ? 'NO_MATCH' : x.state, tests.includes(x.wake) ? 'in_test' : 'NOT_in_test', x.key || '-'].join(' | '));
  out('phrase.no_match_in_test=' + wm.filter((x) => x.state === 'none' && tests.includes(x.wake)).length + ' / ' + wm.filter((x) => x.state === 'none').length);
  // 两边并集：老 29 ∪ 新 28 —— 有多少条短语只在一边
  const oldAll = new Set(recs.map((r) => r.wake_raw));
  const newAll = new Set(wake.all.map((e) => e.phrase));
  const onlyOld = [...oldAll].filter((p) => !newAll.has(p));
  const onlyNew = [...newAll].filter((p) => !oldAll.has(p));
  out('=== 两边并集 ===');
  out('union=' + new Set([...oldAll, ...newAll]).size + ' both=' + [...oldAll].filter((p) => newAll.has(p)).length + ' only_old=' + onlyOld.length + ' only_new=' + onlyNew.length);
  out('only_old -> ' + onlyOld.map((p) => p + (routeOf(p, [...wake.all].sort((a, b) => b.phrase.length - a.phrase.length)).phrase ? '(可子串路由→' + routeOf(p, [...wake.all].sort((a, b) => b.phrase.length - a.phrase.length)).phrase + ')' : '(不可路由)')).join(' '));
  out('only_new -> ' + onlyNew.join(' '));
  // 改名对（老名 → 新名）：同 key + 老名不可路由 + 新名含同一意图词
  const RENAME = [
    ['备忘改子分类', '改子分类', 'memo.update', '逐字不同、可子串路由（唯一一条）'],
    ['查情绪', '查情绪日记', 'memo.search', '顶层分类名对齐（情绪 → 情绪日记）'],
    ['记情绪', '记情绪日记', 'memo.create', '同上'],
    ['改情绪', '改情绪日记', 'memo.update', '同上'],
    ['删情绪', '删情绪日记', 'memo.update', '同上'],
  ];
  out('=== 改名对（老名 → 新名）===');
  for (const [o, n, k, why] of RENAME) out(['N', o, '→', n, k, 'new_in_table=' + newAll.has(n), why].join(' | '));
}

// 老 29 个唯一唤醒词 → 新表三态（逐字命中／子串可路由／不可路由）；供票 6 裁决与票 7 入库
function wakeMap(rows, wake) {
  const exact = new Map(wake.all.map((e) => [e.phrase, e]));
  const sorted = [...wake.all].sort((a, b) => b.phrase.length - a.phrase.length);
  const seen = [];
  for (const r of rows) {
    for (const w of r.wake) {
      if (seen.some((x) => x.wake === w)) continue;
      const r0 = routeOf(w, sorted);
      seen.push({
        wake: w, scene: r.scenario_id, category: r.category, subfunction: r.subfunction || null,
        state: exact.has(w) ? 'exact' : (r0.phrase ? 'substring' : 'none'),
        new_phrase: exact.has(w) ? w : r0.phrase, key: exact.has(w) ? exact.get(w).key : r0.key,
        candidates: r0.candidates,
      });
    }
  }
  return seen;
}

function sceneLines() {
  const recs = parseYaml(readFileSync(YAML, 'utf8'));
  for (const r of recs) out([r.scenario_id, r.line, r.category, DOMAIN_CN[r.category], r.subfunction || '(空)', r.wake_raw, r.scenario_title].join('|'));
}

function names() {
  const yml = readFileSync(YAML, 'utf8');
  out('=== A. yaml 顶层注释行（契约与口径）===');
  for (const l of yml.split(/\r?\n/)) if (/^\s*#/.test(l)) out(cut(l, 110));
  const recs = parseYaml(readFileSync(YAML, 'utf8'));
  out('=== B. categories 块（老域中文名 + icon）===');
  const catBlock = /^categories:\n([\s\S]*?)^scenarios:/m.exec(yml);
  for (const l of (catBlock ? catBlock[1] : '').split(/\r?\n/)) if (l.trim()) out(cut(l, 80));
  out('=== C. 老目录：category × subfunction × 场景数（域／二级组逐级计数）===');
  for (const d of tree(recs)) {
    out('D ' + d.key + ' | ' + d.name_cn + ' | name_en=' + d.name_en + ' | 新表 key=' + (OLD_DOMAIN_TO_KEY[d.key] || []).join('+') + ' | scenes=' + d.subs.reduce((n, s) => n + s.scenes.length, 0) + ' | subs=' + d.subs.length);
    for (const s of d.subs) out('  S ' + (s.sub_cn) + ' | fallback=' + s.sub_fallback + ' | name=' + s.name + ' | scenes=' + s.scenes.length + ' -> ' + s.scenes.map((x) => x.id + '(' + x.wake.join('/') + ')').join(' '));
  }
  out('=== D. 老 SKILL.md 标题行 ===');
  for (const [i, l] of readFileSync(OLD_MD, 'utf8').split(/\r?\n/).entries()) if (/^#{1,4}\s/.test(l)) out((i + 1) + ': ' + cut(l, 80));
  out('=== E. 老 SKILL.md 含「唤醒词/别名/HELP/分类子唤醒词」的行 ===');
  readFileSync(OLD_MD, 'utf8').split(/\r?\n/).forEach((l, i) => { if (/唤醒词|别名|HELP|使用说明/.test(l)) out((i + 1) + ': ' + cut(l, 100)); });
  out('=== F. 转换层证据 memo_render.py：COMMAND_CN_MAP + DIM_LABEL_MAP + 转换层映射注释 ===');
  readFileSync(OLD_RENDER, 'utf8').split(/\r?\n/).forEach((l, i) => {
    if (i + 1 >= 39 && i + 1 <= 70) out((i + 1) + ': ' + cut(l, 100));
    else if (/categories → groups|subfunction → subgroups|dimensions → editable_fields|scenario_id→/.test(l)) out((i + 1) + ': ' + cut(l, 100));
  });
  out('=== G. 新 SKILL.md HELP-AUTO 表 ===');
  for (const [k, v] of helpAuto()) out(['H', k, v.key, v.shape, v.cli, 'line=' + v.line].join(' | '));
}

function routes() {
  const hv = helpVariants();
  out('=== A. 老 SKILL.md HELP 触发词分支（## 备忘录 HELP / ### 唤醒词灵活匹配，行 ' + hv.header_line + ' 起；字面行 ' + hv.literal_line + '）===');
  for (const r of hv.rows) out(['H', r.phrase, r.kind, 'line=' + r.line].join(' | '));
  out('H.count=' + hv.rows.length);
  out('=== B. 老 SKILL.md 别名（触发层在 SKILL.md，yaml 只存主词）===');
  for (const a of aliases()) out(['A', a.owner, a.raw, 'line=' + a.line].join(' | '));
  out('=== C. 老 SKILL.md 用户原话 → 唤醒词 → CLI（行 147 起的反向指引表）===');
  for (const r of cliTable()) out(['R', String(r.n), r.wake, r.cli, 'line=' + r.line].join(' | '));
  const ht = htmlTable();
  out('=== D. 老 SKILL.md 唤醒词 → HTML 对照表（行 ' + ht.header_line + ' 起）===');
  for (const r of ht.rows) out(['T', String(r.n), r.wake, r.html, r.cmd, r.template, 'line=' + r.line].join(' | '));
  out('=== E. 老 SKILL.md 该表自报统计（29 = 10+4+15）===');
  out(JSON.stringify(ht.stats));
  out('=== F. 老 SKILL.md ## 备忘录 HELP 全节 ===');
  for (const l of helpSection()) out(l.line + ': ' + l.text);
}

// ---------- 骨架 ----------
const TOP_KEYS = ['备忘', '心愿', '打卡', '情绪日记'];
const KEY_CN = {
  'memo.search': '查（列表/全文/按时间/按分类过滤）', 'memo.detail': '看单条详情', 'memo.create': '新建笔记（含设提醒）',
  'memo.update': '改（内容/分类/子分类/排期/完成）', 'memo.remove': '删/废弃提醒', 'memo.remind': '提醒查询（有效/已触发）',
  'memo.wish': '心愿（查心愿/心愿排期）', 'memo.sync': '飞书双向对账', 'memo.batch': '批量改分类向导', 'memo.stats': '统计总览',
};
// 归属：老场景 + 新表补词挂在哪个承接场景上（本席判定，不是老家字段）
const ATTACH = {
  '查备忘': ['memo_search_alias', '老 yaml 有 查备忘(别名)、SKILL.md 表 3 又写「查备忘(搜备忘别名)」→ 同一 scenario_id memo_search_alias'],
  '添加笔记': ['memo_add_basic', '老 SKILL.md 章节标题「### 添加笔记」= 记备忘 的功能名'],
  '记一条': ['memo_add_basic', '口语化，同 添加笔记'],
  '改子分类': ['memo_change_subcategory', '老名 备忘改子分类 → 新名 改子分类（同一 scenario_id）'],
  '批量改分类': ['memo_batch_change_category', '老 yaml 里与单条共用 wake_word 备忘改分类；新表拆成独立短语'],
  '查提醒': ['memo_reminders_active', '老 yaml 的 看提醒 同义词，新表并列收录'],
  '废弃提醒': ['memo_completed_reminders', 'U2 待裁：新词 废弃提醒 对应 cmd_read 的 memo.remove mode=abandon；老 yaml 无此场景，暂挂「已完成提醒」'],
  '记情绪日记': ['memo_add_mood', '老子唤醒词叫 记情绪，新表按顶层分类名对齐为 记情绪日记'],
  '查情绪日记': ['memo_search_mood', '老名 查情绪 → 新名 查情绪日记'],
  '改情绪日记': ['memo_update_mood', '老名 改情绪 → 新名 改情绪日记'],
  '删情绪日记': ['memo_delete_mood', '老名 删情绪 → 新名 删情绪日记'],
};

function skeleton() {
  const { recs, wake, help, rows, extra } = reconcile();
  const domains = tree(recs);
  const byPhrase = new Map(wake.all.map((e) => [e.phrase, e]));
  const used = new Set(rows.flatMap((r) => r.hits.map((h) => h.phrase)));
  const hit = rows.filter((r) => r.landing === 'hit').length;
  const attachOf = (phrase) => {
    const a = ATTACH[phrase];
    if (!a) return {};
    return { host_scene: a[0], note: a[1] };
  };
  // 老场景内嵌新表补词
  for (const d of domains) for (const s of d.subs) for (const sc of s.scenes) {
    const ex = wake.all.filter((e) => used.has(e.phrase) && !sc.wake.includes(e.phrase) && (ATTACH[e.phrase] || [])[0] === sc.id);
    if (ex.length) sc.extra_wake = ex.map((e) => ({ phrase: e.phrase, key: e.key, cli: help.has(e.phrase) ? help.get(e.phrase).cli : null, origin: 'new_table', note: ATTACH[e.phrase][1] }));
  }
  // 域／子功能名对照
  const domain_map = domains.map((d) => ({
    old_key: d.key, old_name_cn: d.name_cn, new_keys: OLD_DOMAIN_TO_KEY[d.key] || [],
    new_keys_cn: (OLD_DOMAIN_TO_KEY[d.key] || []).map((k) => k + '（' + KEY_CN[k] + '）'),
    scenes: d.subs.reduce((n, s) => n + s.scenes.length, 0),
    subs: d.subs.length,
    note: d.key === 'init' ? '新表 10 命令无 init key（初始化落在技能安装层）' : (d.key === 'remind' ? '老 提醒类 同时喂 memo.remind（查询）与 memo.create（设提醒）' : ''),
  }));
  const obj = {
    schema: 'skill-memo-ilife/scene-skeleton@1',
    for_ticket: '#222',
    map: '#220',
    sources: {
      old_yaml: 'D:/2Study/StudyNotes/SKILLS/备忘录/references/scenarios.yaml（v1.3.0，8 域／13 二级组／30 场景）',
      old_skill_md: 'D:/2Study/StudyNotes/SKILLS/备忘录/SKILL.md（HELP 变体行 ' + (helpVariants().header_line) + ' 起；别名行 300；用户原话→CLI 行 156 起；HTML 对照行 235 起）',
      old_render: 'D:/2Study/StudyNotes/SKILLS/备忘录/script/memo_render.py（_scenarios_to_contract_data:527／DIM_LABEL_MAP:49／COMMAND_CN_MAP:40）',
      new_wake: 'packages/skill-memo-ilife/src/policy/wakewords.ts（WAKE_TABLE 字面 ' + wake.literal.length + ' 条 + WAKE_TOPS 展开 ' + wake.expanded.length + ' 条 = ' + wake.all.length + ' 条）',
      new_category: 'packages/skill-memo-ilife/src/policy/category.ts（WAKE_TOPS 12 条／MEMO_TOPS 4 顶层）',
      new_shapes: 'packages/skill-memo-ilife/src/render/envelope.ts（MEMO_KEY_SHAPES 10 key）',
      new_md: 'packages/skill-memo-ilife/SKILL.md:21-54（HELP-AUTO 构建期注入）',
      method: 'docs/skills/skill-home/t185-extract.mjs（兄弟地图 #183 票 2 产物，本席实际读的就是该文件名）',
      reconcile: 'docs/skills/skill-memo-ilife/t222-content-reconcile.md',
    },
    counts: {
      old_scenes: recs.length,
      old_unique_wake: new Set(recs.map((r) => r.wake_raw)).size,
      old_domains: domains.length,
      old_subs: domains.reduce((n, d) => n + d.subs.length, 0),
      old_sub_fallback: domains.reduce((n, d) => n + d.subs.filter((s) => s.sub_fallback).length, 0),
      old_dims_total: recs.reduce((n, r) => n + r.dims.length, 0),
      old_none: recs.length - hit,
      old_hit: hit,
      old_none_route_substring: rows.filter((r) => r.landing === 'none' && r.route_kind === 'substring').length,
      old_none_route_no_route: rows.filter((r) => r.landing === 'none' && r.route_kind === 'no_route').length,
      old_ambiguous_routes: rows.filter((r) => r.route.ambiguous).length,
      old_deprecated_candidates: rows.filter((r) => r.landing === 'none' && r.category === 'init').length,
      old_other_no_landing: rows.filter((r) => r.landing === 'none' && r.category !== 'init').length,
      old_route_no_match_scenes: rows.filter((r) => r.route_kind === 'no_route').length,
      new_entries: wake.all.length,
      new_literal: wake.literal.length,
      new_from_wake_tops: wake.expanded.length,
      new_carried: new Set(rows.flatMap((r) => r.hits.map((h) => h.phrase))).size,
      new_extra: extra.length,
      new_keys: wake.keys.length,
      new_help_rows: help.size,
      new_deprecated_phrases: wake.deprecated.length,
      old_unique_wake_exact: wakeMap(rows, wake).filter((x) => x.state === 'exact').length,
      old_unique_wake_substring: wakeMap(rows, wake).filter((x) => x.state === 'substring').length,
      old_unique_wake_none: wakeMap(rows, wake).filter((x) => x.state === 'none').length,
      phrase_no_match: wakeMap(rows, wake).filter((x) => x.state === 'none').length,
      phrase_no_match_list: wakeMap(rows, wake).filter((x) => x.state === 'none').map((x) => x.wake),
    },
    help_only: helpVariants().rows.map((h) => ({ phrase: h.phrase, kind: h.kind, old_line: h.line, key: null, note: 'HELP 自身入口；老口径明示「不展示 HELP 唤醒词自身」，新表 10 key 无 help key' })),
    old_aliases_not_in_yaml: aliases().map((a) => ({ line: a.line, raw: a.raw, note: '别名只在老 SKILL.md 匹配层，scenarios.yaml 只存主词（yaml 头注 #31 Q1）' })),
    key_cn: KEY_CN,
    wake_map: wakeMap(rows, wake),
    domains: domains.map((d, i) => ({ ...d, map: domain_map[i] })),
    new_table: wake.all.map((e) => ({
      phrase: e.phrase, key: e.key, needs: e.needs, preset: e.preset || null, origin: e.origin,
      in_help: help.has(e.phrase), cli: help.has(e.phrase) ? help.get(e.phrase).cli : null,
      landing: used.has(e.phrase) ? 'old_scene' : 'no_old_scene',
      ...attachOf(e.phrase),
    })),
    old_scenes: rows.map((r) => ({
      id: r.scenario_id, line: r.line, category: r.category, name_cn: r.name_cn, subfunction: r.subfunction || null,
      wake: r.wake, title: r.title, type: r.type, status: r.status, n_dims: r.n_dims,
      landing: r.landing, keys: r.keys, new_phrase: r.hits.map((h) => h.phrase), partial: r.partial,
      route: { phrase: r.route.phrase, key: r.route.key, kind: r.route_kind, candidates: r.route.candidates, ambiguous: r.route.ambiguous },
    })),
  };
  return JSON.stringify(obj, null, 2);
}

// ---------- run ----------
const mode = process.argv[2];
if (mode === 'skeleton') { const j = skeleton(); console.log(j); JSON.parse(j); process.exit(0); }
if (mode === 'lines') { sceneLines(); process.exit(0); }
if (mode === 'names') { names(); process.exit(0); }
if (mode === 'routes') { routes(); process.exit(0); }
if (mode === 'evidence') {
  const DIR = 'D:/ilife/docs/skills/skill-memo-ilife/t222-evidence';
  mkdirSync(DIR, { recursive: true });
  const runs = [
    ['extract-full.txt', () => dump()],
    ['routes.txt', () => routes()],
    ['names.txt', () => names()],
    ['lines.txt', () => sceneLines()],
    ['join.txt', () => {
      const { recs, wake, rows, extra } = reconcile();
      const hit = rows.filter((r) => r.landing === 'hit').length;
      for (const r of rows) out(['J', r.scenario_id, r.category, r.subfunction || '(空)', r.wake.join('/'), '→', r.landing === 'hit' ? r.hits.map((h) => h.phrase + ':' + h.key).join('+') : '无落点'].join(' | '));
      out('=== COUNT ===');
      out('old.scenes=' + recs.length + ' old.hit=' + hit + ' old.none=' + (recs.length - hit));
      out('new.entries=' + wake.all.length + ' new.carried=' + new Set(rows.flatMap((r) => r.hits.map((h) => h.phrase))).size + ' new.extra=' + extra.length);
    }],
    ['skeleton.json', () => { SINK.push(skeleton()); }],
  ];
  SINK = [];
  for (const [name, fn] of runs) {
    fn();
    writeFileSync(DIR + '/' + name, SINK.join('\n') + (name.endsWith('.json') ? '\n' : '\n'), 'utf8');
    const isJson = name.endsWith('.json');
    let ok = true;
    if (isJson) { try { JSON.parse(readFileSync(DIR + '/' + name, 'utf8')); } catch { ok = false; } }
    console.log('wrote ' + name + ' lines=' + SINK.length + (isJson ? ' json_valid=' + ok : ''));
    SINK = [];
  }
  console.log('files=' + readdirSync(DIR).sort().join(','));
  process.exit(0);
}
if (mode === 'join') {
  const { recs, wake, rows, extra } = reconcile();
  const hit = rows.filter((r) => r.landing === 'hit').length;
  for (const r of rows) console.log(['J', r.scenario_id, r.category, r.subfunction || '(空)', r.wake.join('/'), '→', r.landing === 'hit' ? r.hits.map((h) => h.phrase + ':' + h.key).join('+') : '无落点'].join(' | '));
  console.log('=== COUNT ===');
  console.log('old.scenes=' + recs.length + ' old.hit=' + hit + ' old.none=' + (recs.length - hit));
  console.log('new.entries=' + wake.all.length + ' new.carried=' + new Set(rows.flatMap((r) => r.hits.map((h) => h.phrase))).size + ' new.extra=' + extra.length);
  process.exit(0);
}
dump();

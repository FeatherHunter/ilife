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
  for (const raw of text.split(/\r?\n/)) {
    const line = raw.replace(/\t/g, '    ');
    const start = /^\s*-\s+id:\s*(.*?)\s*$/.exec(line);
    if (start) {
      cur = { id: start[1].replace(/^['"]|['"]$/g, ''), prompt: '' };
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

// ---------- run ----------
if (process.argv[2] === 'names') {
  names();
  process.exit(0);
}
if (process.argv[2] === 'routes') {
  routes();
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

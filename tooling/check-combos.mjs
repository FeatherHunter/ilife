#!/usr/bin/env node
// P8 #9：combos.yaml 全表校验（构建/测试期；加第 37 条只改 yaml，过本校验即合规，不碰代码）。
// 退出码对齐 skilllink 冻结：3 读表/registry/key；5 形状/载荷。stdout 纯净，诊断一律 stderr。
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const yamlPath = join(root, 'packages/base-combos/combos.yaml');

const SHAPES = ['list', 'detail', 'stat', 'receipt', 'analysis', 'fallback'];
const KEY_RE = /^[a-z][a-z0-9-]*\.[a-z0-9][a-z0-9-.]*$/;
// 通道键放宽下划线：calorie 历史 view/取数键含下划线（VIEW_KEYS/KEYS 既定），
// 其通由各背书自证（registry 11 键走 parseRegistryKey，view 4 键走 viewShapeFor），此处只验格式。
const CHAN_KEY_RE = /^[a-z][a-z0-9-]*\.[A-Za-z0-9][A-Za-z0-9-_.]*$/;
const SCN_RE = /^(L[1-5]\.\d+|CS-\d+)$/;
const CMD_RE = /^[a-z][a-z0-9-]*$/;
const SECTIONS = ['combos', 'channels', 'scenarios', 'fallbacks', 'l6_slots'];
// 0 业务表：说明书禁建表语义（呈现用对照/分组字样不在此列）。
const TABLE_RES = [/CREATE\s+TABLE/i, /DROP\s+TABLE/i, /sqlite/i, /\.db\b/, /建表/, /表结构/, /落表/, /数据表/, /schema/i];

function fail(msg) { console.error('FAIL: ' + msg); process.exit(3); }

const COMBO_FIELDS = ['key', 'skill', 'shape', 'title', 'cmd'];
const CHAN_FIELDS = ['key', 'shape', 'backing', 'note'];
const SCN_FIELDS = ['id', 'name', 'wake_word', 'external', 'external_ref', 'external_data', 'calorie_ref', 'merge_logic', 'present', 'status', 'downgrade_note'];
const FB_FIELDS = ['for', 'shape', 'reason', 'while_degraded'];

function parse(text) {
  const secs = { combos: [], channels: [], scenarios: [], fallbacks: [], l6_slots: [] };
  let cur = null;
  let curSec = '';
  for (const ln of text.replace(/\r\n/g, '\n').split('\n')) {
    if (/^\s*#/.test(ln) || /^\s*$/.test(ln)) continue;
    const sec = ln.match(/^([A-Za-z_][A-Za-z0-9_]*):\s*$/);
    if (sec) {
      if (!SECTIONS.includes(sec[1])) fail('未知顶层段：' + sec[1]);
      curSec = sec[1]; cur = null; continue;
    }
    if (!curSec) fail('段外行：' + JSON.stringify(ln));
    let m = ln.match(/^  - (key|id|for): (\S+)\s*$/);
    if (m) { cur = { [m[1]]: m[2] }; secs[curSec].push(cur); continue; }
    m = ln.match(/^    ([A-Za-z_][A-Za-z0-9_]*): (.*?)\s*$/);
    if (m && cur) { cur[m[1]] = m[2]; continue; }
    fail('冻结格式外行：' + JSON.stringify(ln));
  }
  return secs;
}

function main() {
  const text = readFileSync(yamlPath, 'utf8');
  for (const re of TABLE_RES) if (re.test(text)) fail('说明书禁业务表语义（命中 ' + re + '），0 表红线');
  const s = parse(text);

  // combos 段：P9 冻结（只许 5 字段，key 命名空间，shape 六形状，cmd 合法）。
  const ckeys = new Set();
  if (!s.combos.length) fail('combos 段为空');
  for (const c of s.combos) {
    for (const k of Object.keys(c)) if (!COMBO_FIELDS.includes(k)) fail('combos 非法字段：' + c.key + '.' + k);
    if (!c.key || !KEY_RE.test(c.key)) fail('combos 非法 key：' + c.key);
    if (ckeys.has(c.key)) fail('combos 重复 key：' + c.key);
    ckeys.add(c.key);
    if (!c.skill) fail('combos 缺 skill：' + c.key);
    if (!SHAPES.includes(c.shape)) { console.error('FAIL: combos 未知 shape：' + c.key); process.exit(5); }
    if (!c.title) fail('combos 缺 title：' + c.key);
    if (c.cmd !== undefined && !CMD_RE.test(c.cmd)) fail('combos 非法 cmd：' + c.key);
  }

  // channels 段：15 对（key×shape×背书），键须合法且有出处。
  if (s.channels.length !== 15) fail('channels 须 15 对，实 ' + s.channels.length);
  const hkeys = new Set();
  for (const c of s.channels) {
    for (const k of Object.keys(c)) if (!CHAN_FIELDS.includes(k)) fail('channels 非法字段：' + c.key + '.' + k);
    if (!c.key || !CHAN_KEY_RE.test(c.key)) fail('channels 非法 key：' + c.key);
    if (hkeys.has(c.key)) fail('channels 重复 key：' + c.key);
    hkeys.add(c.key);
    if (!SHAPES.includes(c.shape)) { console.error('FAIL: channels 未知 shape：' + c.key); process.exit(5); }
    if (!['skilllink-pilot', 'skilllink-cmd', 'render-view'].includes(c.backing)) fail('channels 非法 backing：' + c.key);
    if (!c.note) fail('channels 缺 note 出处：' + c.key);
    if (c.backing === 'skilllink-pilot' && c.key !== 'calorie.today') fail('pilot 只许 calorie.today：' + c.key);
    if (c.backing === 'render-view' && !/^calorie\.view_/.test(c.key)) fail('render-view 只许 calorie.view_*：' + c.key);
    if (c.backing === 'skilllink-cmd') {
      const e = s.combos.find((t) => t.key === c.key);
      if (!e || !e.cmd) fail('skilllink-cmd 通道缺 combos 出口：' + c.key);
      if (e.shape !== c.shape) fail('通道形状与注册不一致：' + c.key);
    }
  }

  // scenarios 段：30 联动（L6 禁入，只许 L1-5/CS；降级须注原因）。
  const ids = new Set();
  const degraded = [];
  for (const t of s.scenarios) {
    for (const k of Object.keys(t)) if (!SCN_FIELDS.includes(k)) fail('scenarios 非法字段：' + t.id + '.' + k);
    if (!t.id || !SCN_RE.test(t.id)) fail('scenarios 非法 id（L6 禁入 scenarios）：' + t.id);
    if (ids.has(t.id)) fail('scenarios 重复 id：' + t.id);
    ids.add(t.id);
    for (const f of ['name', 'wake_word', 'external', 'external_ref', 'external_data', 'calorie_ref', 'merge_logic', 'present']) {
      if (!t[f]) fail('scenarios 缺字段 ' + f + '：' + t.id);
    }
    if (!['保留', '降级'].includes(t.status)) fail('scenarios 非法 status：' + t.id);
    if (t.status === '降级') {
      if (!t.downgrade_note) fail('降级缺原因：' + t.id);
      degraded.push(t.id);
    }
  }
  if (s.scenarios.length < 30) fail('scenarios 不足 30，实 ' + s.scenarios.length);

  // fallbacks 段：降级全覆盖（每条降级场景一条 + L6.6 一条，共 6 条起）。
  for (const f of s.fallbacks) {
    for (const k of Object.keys(f)) if (!FB_FIELDS.includes(k)) fail('fallbacks 非法字段：' + f.for + '.' + k);
    if (f.shape !== 'fallback') { console.error('FAIL: fallbacks 形状须为 fallback：' + f.for); process.exit(5); }
    if (!f.reason || !f.while_degraded) fail('fallbacks 缺原因/降级行为：' + f.for);
    if (!degraded.includes(f.for) && f.for !== 'L6.6') fail('fallbacks 指向非降级位：' + f.for);
  }
  for (const d of degraded) {
    if (s.fallbacks.filter((f) => f.for === d).length !== 1) fail('降级缺唯一 fallback：' + d);
  }
  if (s.fallbacks.filter((f) => f.for === 'L6.6').length !== 1) fail('L6.6 缺 fallback 声明');
  if (s.fallbacks.length < 6) fail('fallbacks 不足 6 条，实 ' + s.fallbacks.length);

  // l6_slots 段：L6.1～L6.6 空位（只许 id+reserved，多一字段即挂，内容不记录）。
  const want = ['L6.1', 'L6.2', 'L6.3', 'L6.4', 'L6.5', 'L6.6'];
  if (s.l6_slots.length !== 6) fail('l6_slots 须 6 空位，实 ' + s.l6_slots.length);
  s.l6_slots.forEach((t, i) => {
    if (t.id !== want[i]) fail('l6_slots 错位：' + t.id);
    if (Object.keys(t).join(',') !== 'id,reserved' || t.reserved !== 'true') fail('l6_slots 只许 id+reserved:true：' + t.id);
  });

  console.log('OK: combos ' + s.combos.length + ' 注册 + channels 15 对 + scenarios ' + s.scenarios.length + ' + fallbacks ' + s.fallbacks.length + ' + l6 空位 6');
}

main();

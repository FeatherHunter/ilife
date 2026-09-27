#!/usr/bin/env node
/** 备忘录 HELP 内容资产 · **断言件**（票 #974 从 `gen-help-assets.mjs` 抽出来）。
 *
 * 生成器只做「读事实源 → 重写 → 落盘／比对」，**判据住本件**：
 *   - `assertShape`：裁决 6／7／8／14 的每一个数（域／组／场景／字段／原子／别名／kind 分布）；
 *   - `assertRewrite`：重写口径（首行形／无骨架残留／无裸预置值／`{{name}}` 集＝字段集且同序／kind 闭集／
 *     `(选填)`↔`required` 一致／select 带非空 options）；
 *   - `assertAtoms`：**信息不丢失台账**（`help-assets.atoms.mjs` 对 `help-assets.before.mjs`）——
 *     老正文的每个原子都要有去处、标了承载的 `as` 必须真的在场、有意删的必须给理由；
 *   - `assertFieldCoverage`：老字段逐个有去处（在改后字段表里，或在 `FIELD_DROPS` 里带理由）。
 * 这样切只为「一个件一件事」：改判据不动落盘，改落盘不动判据。
 */
import { REWRITE, REWRITE_FORBIDDEN } from './help-assets.rewrite.mjs';
import { PROMPT_FORBIDDEN, SCENE_FORBIDDEN, VISIBLE_FORBIDDEN } from './help-assets.data.mjs';
import { BEFORE } from './help-assets.before.mjs';
import { PROMPT_ATOMS, FIELD_DROPS } from './help-assets.atoms.mjs';
import { FIELD_ATOMS } from './help-assets.field-atoms.mjs';

export const KINDS = ['text', 'number', 'select', 'date', 'week'];
export const FIRST_LINE = (w) => '请你加载技能 备忘录,执行唤醒词「' + w + '」。';

/** 反向断言：清洗后不许再出现实现记号。 */
export function scanForbidden(where, text, tokens) {
  const low = String(text).toLowerCase();
  for (const tok of tokens) if (low.includes(tok.toLowerCase())) {
    throw new Error(where + ' 仍含实现记号 ' + JSON.stringify(tok));
  }
}

/** 形状断言（fail-closed）：裁决 6／7／8／14 的每一个数都在这里钉住（#974 起穿上重写口径）。 */
export function assertShape(groups, preClean) {
  const bad = (msg) => { throw new Error('形状断言不过：' + msg); };
  const subs = groups.flatMap((g) => g.subgroups);
  const scenes = subs.flatMap((s) => s.scenes);
  const fields = scenes.flatMap((s) => s.editable_fields || []);
  const atoms = scenes.flatMap((s) => s.types).reduce((m, t) => (m[t] = (m[t] || 0) + 1, m), {});
  const eq = (what, a, b) => { if (a !== b) bad(what + ' ＝ ' + a + '，应为 ' + b); };
  eq('域数', groups.length, 8);
  eq('二级组数', subs.length, 13);
  eq('兜底组数(基础)', subs.filter((s) => s.label === '基础').length, 4);
  eq('场景数', scenes.length, 30);
  eq('场景 id 唯一数', new Set(scenes.map((s) => s.id)).size, 30);
  eq('字段数', fields.length, 60);
  eq('带字段场景数', scenes.filter((s) => s.editable_fields).length, 27);
  eq('零参场景数', scenes.filter((s) => !s.editable_fields).length, 3);
  eq('老侧涉及场景数', preClean.filter((s) => s.editable_fields).length, 29);
  eq('老侧字段数', preClean.flatMap((s) => s.editable_fields || []).length, 76);
  eq('老侧 html 字段数', preClean.flatMap((s) => s.editable_fields || []).filter((f) => f.name === 'html').length, 12);
  eq('老侧布尔脏字段数', preClean.flatMap((s) => s.editable_fields || []).filter((f) => typeof f.name !== 'string').length, 1);
  eq('types 行数', scenes.filter((s) => s.types.length).length, 30);
  eq('原子合计', Object.values(atoms).reduce((a, b) => a + b, 0), 64);
  for (const [k, v] of Object.entries({ 回执: 30, 采集: 20, 查看: 10, 向导: 4 })) eq('原子 ' + k, atoms[k], v);
  if (atoms['选择']) bad('types 里不该出现「选择」');
  const aliasWords = scenes.flatMap((s) => s.aliases || []);
  eq('别名条数', aliasWords.length, 12);
  eq('别名唯一词数', new Set(aliasWords).size, 12);
  const mains = new Set(scenes.map((s) => s.wake_word));
  for (const a of aliasWords) if (mains.has(a)) bad('别名与主词撞词：' + a);
  const kindCount = {};
  for (const f of fields) kindCount[f.kind] = (kindCount[f.kind] || 0) + 1;
  eq('kind 都在闭集内', fields.filter((f) => !KINDS.includes(f.kind)).length, 0);
  /* #974 当场读数：本家 60 条字段落在 text／select／date 三种；`number`／`week` **零实例**
     （备忘录的参数只有名目、编号、日期与闭集枚举，没有数量；`week` 前瞻位同 REPORT §3.2）。 */
  for (const [k, v] of Object.entries({ text: 43, select: 10, date: 7, number: 0, week: 0 })) {
    eq('kind ' + k + ' 字段数', kindCount[k] || 0, v);
  }
  for (const s of scenes) {
    if (s.status !== '') bad(s.id + ' 的 status 非空串（不许标缺失）');
    for (const f of s.editable_fields || []) {
      if (typeof f.name !== 'string' || typeof f.label !== 'string' || typeof f.value !== 'string') bad(s.id + '/' + String(f.name) + ' 字段非 string');
    }
  }
  groups.forEach((g, i) => g.subgroups.forEach((s, j) => {
    if (s.id !== g.id + '_' + (j + 1)) bad('二级组 id 不是 1 起连号：' + s.id);
  }));
  if (new Set(groups.map((g) => g.id)).size !== 8) bad('域 id 有重复');
  return { scenes, subs, fields, atoms, kindCount };
}

/** #974 重写口径断言：首行形／无骨架残留／无裸预置值／`{{name}}` 集＝字段集／`(选填)` 与 `required` 一致。 */
export function assertRewrite(scenes) {
  const bad = (msg) => { throw new Error('重写断言不过：' + msg); };
  const ids = Object.keys(REWRITE);
  if (ids.length !== scenes.length) bad('重写表 ' + ids.length + ' 条 ≠ 资产场景 ' + scenes.length);
  const known = new Set(scenes.map((s) => s.id));
  for (const id of ids) if (!known.has(id)) bad('重写表多出一条不在资产里：' + id);
  for (const s of scenes) {
    if (!s.prompt_template.startsWith(FIRST_LINE(s.wake_word))) {
      bad(s.id + ' 首行不是约定形：「' + s.prompt_template.split('\n')[0] + '」');
    }
    /* 正文的**人话部分**才过实现记号表：`{{name}}` 是机器键（`due`／`note_id`／`tasklist_guid` 这些
       老列名做键是既成事实，页面只显示标签；见 `docs/skills/skill-memo-ilife/t974-实施-证据.md` §kind 表）。 */
    const prose = s.prompt_template.replace(/\{\{[a-z0-9_]+\}\}/g, '');
    scanForbidden(s.id + '.prompt', prose, PROMPT_FORBIDDEN.concat(SCENE_FORBIDDEN[s.id] || []));
    scanForbidden(s.id + '.prompt', prose, REWRITE_FORBIDDEN);
    if (/\d{4}-\d{2}-\d{2}/.test(s.prompt_template)) bad(s.id + ' 正文里有裸 ISO 日期（格式只许住 hint）');
    if (/\d{4}-W\d{2}/.test(s.prompt_template)) bad(s.id + ' 正文里有 ISO 周串');
    scanForbidden(s.id + '.title', s.title, VISIBLE_FORBIDDEN);
    const fields = s.editable_fields || [];
    const names = fields.map((f) => f.name);
    if (new Set(names).size !== names.length) bad(s.id + ' 字段名有重复');
    const holes = [...s.prompt_template.matchAll(/\{\{([a-z0-9_]+)\}\}/g)].map((m) => m[1]);
    if (holes.join(',') !== names.join(',')) {
      bad(s.id + ' 正文占位 ' + JSON.stringify(holes) + ' ≠ 字段 ' + JSON.stringify(names));
    }
    const paramLines = s.prompt_template.split('\n').filter((l) => /\{\{[a-z0-9_]+\}\}$/.test(l));
    if (paramLines.length !== fields.length) bad(s.id + ' 参数行数 ' + paramLines.length + ' ≠ 字段数 ' + fields.length);
    for (const [i, f] of fields.entries()) {
      if (paramLines[i] !== f.label + ':{{' + f.name + '}}') {
        bad(s.id + ' 第 ' + (i + 1) + ' 行「' + paramLines[i] + '」≠ 标签占位形「' + f.label + ':{{' + f.name + '}}」');
      }
      if (!KINDS.includes(f.kind)) bad(s.id + '/' + f.name + ' kind 不在闭集：' + String(f.kind));
      if (f.value !== '') bad(s.id + '/' + f.name + ' value 非空串（不预置值，相对默认词只进 hint）');
      if (/\(选填\)$/.test(f.label) === (f.required === true)) bad(s.id + '/' + f.name + ' 标签的 (选填) 与 required 不一致');
      if (f.kind === 'select') {
        if (!Array.isArray(f.options) || f.options.length === 0) bad(s.id + '/' + f.name + ' select 缺非空 options');
      } else if (f.options !== undefined) bad(s.id + '/' + f.name + ' 非 select 带了 options');
      scanForbidden(s.id + '/' + f.name + '.label', f.label, VISIBLE_FORBIDDEN);
      scanForbidden(s.id + '/' + f.name + '.hint', f.hint, VISIBLE_FORBIDDEN);
    }
  }
}

/** 老正文 → 信息原子（机械切分，与台账的 `from` 同口径）：
 *  `头句:` 首行去掉括号与尾冒号；`头注:` 首行括号里按 `·` 切（去掉唤醒词本体那段）；
 *  `参数行:<标签>|<括号>`；`正文句:` 其余非脚手架行；`效果:` 期望效果里按 `。;；` 切句。 */
export function extractAtoms(tpl) {
  const atoms = [];
  const lines = String(tpl).split('\n');
  const head = lines[0];
  const headMain = head.replace(/[（(][^）)]*[）)]/g, '').replace(/[:：]\s*$/, '').trim();
  if (headMain) atoms.push('头句:' + headMain);
  const headParen = /[（(]([^）)]*)[）)]/.exec(head);
  if (headParen) {
    for (const seg of headParen[1].split('·')) {
      const t = seg.trim();
      if (t && !/^唤醒词[:：]/.test(t)) atoms.push('头注:' + t);
    }
  }
  let inExp = false;
  for (const l of lines.slice(1)) {
    const t = l.trim();
    if (/^期望效果:/.test(t)) {
      inExp = true;
      const rest = t.replace(/^期望效果:\s*/, '');
      if (rest) atoms.push(...rest.split(/[。;；]/).map((x) => x.trim()).filter(Boolean).map((x) => '效果:' + x));
      continue;
    }
    if (inExp) {
      if (t) atoms.push(...t.split(/[。;；]/).map((x) => x.trim()).filter(Boolean).map((x) => '效果:' + x));
      continue;
    }
    if (/^请按以下格式填写你的参数[:：]?$/.test(t)) continue;
    const paren = /[（(]([^）)]*)[）)]/.exec(l);
    if (paren && /_{3,}/.test(l)) {
      atoms.push('参数行:' + l.split(':')[0].trim().replace(/\s+/g, '') + '|' + paren[1].trim());
      continue;
    }
    if (t) atoms.push('正文句:' + t);
  }
  return atoms;
}

/** #974 信息不丢失台账断言：老正文的每个原子都有去处；标了承载的必须真的在场；有意删的必须给理由。 */
export function assertAtoms(scenes) {
  const bad = (msg) => { throw new Error('信息台账不过：' + msg); };
  const byId = new Map(scenes.map((s) => [s.id, s]));
  let atomsSeen = 0;
  let entriesSeen = 0;
  for (const [id, before] of Object.entries(BEFORE)) {
    const s = byId.get(id);
    if (!s) bad('快照里有、资产里没有的场景：' + id);
    const atoms = extractAtoms(before.prompt);
    atomsSeen += atoms.length;
    const entries = PROMPT_ATOMS[id];
    if (!Array.isArray(entries) || entries.length === 0) bad(id + ' 没有台账条目');
    entriesSeen += entries.length;
    const covered = new Set(entries.map((e) => e.from));
    for (const a of atoms) {
      if (!covered.has(a)) bad(id + ' 老正文的原子没有去处：' + a);
    }
    const legal = new Set(atoms);
    for (const e of entries) {
      if (!legal.has(e.from)) bad(id + ' 台账里的 from 不是老正文的原子：' + e.from);
      if (e.to === 'say') {
        if (typeof e.as !== 'string' || !String(s.prompt_template).includes(e.as)) {
          bad(id + ' 标了 say 承载但改后正文里没有：' + JSON.stringify(e.as));
        }
      } else if (e.to.startsWith('hint:')) {
        const f = (s.editable_fields || []).find((x) => x.name === e.to.slice('hint:'.length));
        if (!f) bad(id + ' 标了 ' + e.to + ' 但字段不在：' + e.from);
        else if (typeof e.as !== 'string' || !String(f.hint).includes(e.as)) bad(id + '/' + f.name + ' 的 hint 里没有：' + JSON.stringify(e.as));
      } else if (e.to.startsWith('options:')) {
        const f = (s.editable_fields || []).find((x) => x.name === e.to.slice('options:'.length));
        /* 正文台账对的是**机器值集**（老参数行括号里列的就是可选值）；选项的显示名解释由字段面台账（FO）管。 */
        const values = (f ? (f.options || []) : [])
          .map((o) => (o && typeof o === 'object' ? String(o.value ?? o.label) : String(o))).join('/');
        if (!f) bad(id + ' 标了 ' + e.to + ' 但字段不在：' + e.from);
        else if (values !== e.as) bad(id + '/' + f.name + ' 的 options 与台账不符：' + JSON.stringify(values) + ' ≠ ' + JSON.stringify(e.as));
      } else if (e.to === 'drop' || e.to === 'wake' || e.to === 'params') {
        if (typeof e.why !== 'string' || e.why.length === 0) bad(id + ' 标了 ' + e.to + ' 但没写理由：' + e.from);
      } else {
        bad(id + ' 台账的 to 不认识：' + String(e.to));
      }
    }
  }
  for (const id of Object.keys(PROMPT_ATOMS)) if (!BEFORE[id]) bad('台账里有、快照里没有的场景：' + id);
  return { atomsSeen, entriesSeen };
}

/** #974 字段面断言：老字段逐个有去处（在改后字段表里，或在 `FIELD_DROPS` 里带理由）；留下的字段必须带提示或选项。 */
export function assertFieldCoverage(scenes) {
  const bad = (msg) => { throw new Error('字段覆盖不过：' + msg); };
  const byId = new Map(scenes.map((s) => [s.id, s]));
  const drops = new Map(FIELD_DROPS.map((d) => [d.name, d]));
  for (const d of FIELD_DROPS) if (typeof d.why !== 'string' || d.why.length === 0) bad('FIELD_DROPS 缺理由：' + d.name);
  let oldCount = 0;
  let keptCount = 0;
  let droppedCount = 0;
  for (const [id, before] of Object.entries(BEFORE)) {
    const s = byId.get(id);
    if (!s) bad('快照里有、资产里没有的场景：' + id);
    for (const of of before.fields) {
      oldCount += 1;
      const now = (s.editable_fields || []).find((x) => x.name === of.name);
      if (now) {
        keptCount += 1;
        if (String(now.hint).length === 0 && (now.options || []).length === 0) {
          bad(id + '/' + of.name + ' 留下了字段却既无 hint 又无 options（老提示里的信息没去处）');
        }
      } else if (drops.has(of.name)) {
        droppedCount += 1;
      } else {
        bad(id + '/' + of.name + ' 老字段既不在改后字段表里，也不在 FIELD_DROPS 里');
      }
    }
  }
  for (const d of FIELD_DROPS) {
    if (![...Object.values(BEFORE)].some((b) => b.fields.some((f) => f.name === d.name))) bad('FIELD_DROPS 里的字段在老快照里不存在：' + d.name);
  }
  return { oldCount, keptCount, droppedCount, dropNames: FIELD_DROPS.length };
}

/** #974 字段面台账断言：老提示里的信息逐条有去处（hint／options／正文／控件形态／有意删）。
 *  与 `assertFieldCoverage` 分工：那条管「字段还在不在」，这条管「提示里那句话的信息还在不在」。 */
export function assertFieldAtoms(scenes) {
  const bad = (msg) => { throw new Error('字段面台账不过：' + msg); };
  const byId = new Map(scenes.map((s) => [s.id, s]));
  const optionText = (f) => (f.options || [])
    .map((o) => (o && typeof o === 'object' ? String(o.label ?? o.value) : String(o))).join('/');
  let instances = 0;
  let entries = 0;
  for (const [id, before] of Object.entries(BEFORE)) {
    const s = byId.get(id);
    if (!s) bad('快照里有、资产里没有的场景：' + id);
    const table = FIELD_ATOMS[id] || {};
    for (const of of before.fields) {
      instances += 1;
      const list = table[of.name];
      if (!Array.isArray(list) || list.length === 0) {
        bad(id + '/' + of.name + ' 没有台账条目（老提示：' + JSON.stringify(of.hint) + '）');
      }
      const now = (s.editable_fields || []).find((x) => x.name === of.name);
      for (const e of list) {
        entries += 1;
        const where = id + '/' + of.name + '（老提示：' + JSON.stringify(of.hint) + '）';
        if (e.to === 'hint') {
          if (!now) bad(where + ' 标了 hint 但字段不在改后字段表里');
          else if (!String(now.hint).includes(e.as)) bad(where + ' 的 hint 里没有 ' + JSON.stringify(e.as) + '；实测 hint＝' + JSON.stringify(now.hint));
        } else if (e.to === 'options') {
          if (!now) bad(where + ' 标了 options 但字段不在改后字段表里');
          else if (!optionText(now).includes(e.as)) bad(where + ' 的 options 标签里没有 ' + JSON.stringify(e.as) + '；实测＝' + JSON.stringify(optionText(now)));
        } else if (e.to === 'say') {
          if (!String(s.prompt_template).includes(e.as)) bad(where + ' 标了 say 但正文里没有 ' + JSON.stringify(e.as));
        } else if (e.to === 'params' || e.to === 'drop') {
          if (typeof e.why !== 'string' || e.why.length === 0) bad(where + ' 标了 ' + e.to + ' 但没写理由');
        } else {
          bad(where + ' 台账的 to 不认识：' + String(e.to));
        }
      }
    }
    for (const name of Object.keys(table)) {
      if (!before.fields.some((f) => f.name === name)) bad(id + ' 字段台账里有、老快照里没有的字段：' + name);
    }
  }
  for (const id of Object.keys(FIELD_ATOMS)) if (!BEFORE[id]) bad('字段台账里有、快照里没有的场景：' + id);
  return { instances, entries };
}

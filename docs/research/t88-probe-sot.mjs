/** t88 现状探针 2：SoT → F3 的 10／54／436 对账（只读）。跑法：node .scratch/t88/probe-sot.mjs */
const out = [];
const say = (s) => out.push(s);

const trig = await import('../../packages/skill-calorie/dist/triggers/index.js');
const T = trig.TRIGGERS;

const isScene = (t) => 'key' in t && typeof t.key === 'string';
say('RESULT-TOTAL ' + T.length);
say('RESULT-SCENE-TRIGGERS ' + T.filter(isScene).length);
say('RESULT-LEGACY-TRIGGERS ' + T.filter((t) => !isScene(t)).length);

// 10 分组 = category 直方图
const cat = {};
for (const t of T) cat[t.category] = (cat[t.category] ?? 0) + 1;
say('RESULT-CATEGORY-HISTO ' + JSON.stringify(cat));

// 54 子功能 = distinct (category, subfunction)
const subs = new Map();
for (const t of T) {
  const s = isScene(t) ? String(t.subfunction ?? '') : '(legacy)';
  const k = t.category + '|' + s;
  subs.set(k, (subs.get(k) ?? 0) + 1);
}
say('RESULT-DISTINCT-SUBFUNCTION-PAIRS ' + subs.size);
const perCat = {};
for (const k of subs.keys()) { const c = k.split('|')[0]; perCat[c] = (perCat[c] ?? 0) + 1; }
say('RESULT-SUBFUNCTION-PER-CATEGORY ' + JSON.stringify(perCat));

// output_type → F3 types 徽章
const ot = {};
for (const t of T) if (isScene(t)) ot[t.output_type] = (ot[t.output_type] ?? 0) + 1;
say('RESULT-OUTPUT-TYPE-HISTO ' + JSON.stringify(ot));

// prompt_template 形状
const withTpl = T.filter((t) => isScene(t) && typeof t.prompt_template === 'string' && t.prompt_template !== '');
say('RESULT-WITH-PROMPT-TEMPLATE ' + withTpl.length);
say('RESULT-PROMPT-WITH-BLANKS ' + withTpl.filter((t) => t.prompt_template.includes('____')).length);
say('RESULT-PROMPT-WITH-TAIL ' + withTpl.filter((t) => t.prompt_template.includes('三句话')).length);
say('RESULT-PROMPT-WITH-1SENT ' + withTpl.filter((t) => t.prompt_template.includes('1 句话总结')).length);
const lens = withTpl.map((t) => t.prompt_template.length).sort((a, b) => a - b);
say('RESULT-PROMPT-LEN-MINMAX ' + lens[0] + '/' + lens[lens.length - 1]);

// 唤醒词重复
const wc = {};
for (const t of T) wc[t.wake_word] = (wc[t.wake_word] ?? 0) + 1;
say('RESULT-DUP-WAKE-WORDS ' + JSON.stringify(Object.entries(wc).filter(([, n]) => n > 1)));

// 唯一 id：新架构没有 scene.id，key 才是唯一
const keys = T.filter(isScene).map((t) => t.key);
say('RESULT-DISTINCT-KEYS ' + new Set(keys).size + '/' + keys.length);

// legacy 条目样例
say('RESULT-LEGACY-SAMPLE ' + JSON.stringify(T.filter((t) => !isScene(t)).slice(0, 3).map((t) => [t.wake_word, t.category, t.desc.slice(0, 24)])));

// 可选字段：aliases / fill_hints / variants / user_intent / data_source / html_template
const has = (f) => T.filter((t) => Array.isArray(t[f]) ? t[f].length > 0 : (t[f] !== undefined && t[f] !== '' && t[f] !== null)).length;
for (const f of ['aliases', 'fill_hints', 'variants', 'user_intent', 'data_source', 'html_template', 'data_fields', 'name', 'desc']) {
  say('RESULT-FIELD-' + f.toUpperCase() + ' ' + has(f));
}
say('RESULT-DEPENDS-EXTERNAL-TRUE ' + T.filter((t) => t.depends_on_external === true).length);
console.log(out.join('\n'));

#!/usr/bin/env node
/** #974 · 备忘录 HELP 老字段提示 → 新提示／选项 对账生成器（写进 `t974-实施-证据.md` 第八节的附表）。
 *
 *  跑法（仓根）：
 *    node docs/skills/skill-memo-ilife/t974-字段对账.mjs > <一段 markdown>
 *
 *  两侧事实源都在仓内：
 *    改前＝`packages/skill-memo-ilife/scripts/help-assets.before.mjs` 的 `fields`（重写前的 hint／required）；
 *    改后＝`packages/skill-memo-ilife/scripts/help-assets.rewrite.mjs` 的重写表（hint／options／required）。
 *  去处（hint／options／正文／控件形态／有意删）由 `help-assets.field-atoms.mjs` 的台账逐条声明，生成器与测试断言。
 */
import { BEFORE } from '../../../packages/skill-memo-ilife/scripts/help-assets.before.mjs';
import { REWRITE } from '../../../packages/skill-memo-ilife/scripts/help-assets.rewrite.mjs';
import { FIELD_ATOMS } from '../../../packages/skill-memo-ilife/scripts/help-assets.field-atoms.mjs';

const TO_ZH = { hint: 'hint', options: 'options', say: '正文', params: '控件形态', drop: '有意删' };
const optText = (f) => (f.options || [])
  .map((o) => (o && typeof o === 'object' ? String(o.label ?? o.value) : String(o))).join('／');
const out = [];
let n = 0;
for (const [id, before] of Object.entries(BEFORE)) {
  const entry = REWRITE[id];
  if (!entry) throw new Error('重写表缺场景：' + id);
  const byName = new Map(entry.fields.map((f) => [f.name, f]));
  out.push('### ' + (n + 1) + '. `' + id + '`　' + entry.title);
  out.push('');
  out.push('| 老字段 | 老提示（逐字） | 去处 | 改后 |');
  out.push('|---|---|---|---|');
  for (const of of before.fields) {
    const now = byName.get(of.name);
    const list = (FIELD_ATOMS[id] || {})[of.name] || [];
    const where = list.map((e) => TO_ZH[e.to] || e.to).join('＋') || '—';
    const after = now
      ? ('`' + now.name + '`（' + now.label + '，`' + now.kind + '`，' + (now.required ? '必填' : '选填') + '）'
        + (now.options ? '　选项：' + optText(now) : '')
        + (now.hint ? '　提示：' + now.hint : ''))
      : '**不立字段**（理由见台账）';
    out.push('| `' + of.name + '` | ' + of.hint + ' | ' + where + ' | ' + after + ' |');
  }
  out.push('');
  n += 1;
}
process.stdout.write(out.join('\n'));

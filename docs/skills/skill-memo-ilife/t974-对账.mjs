#!/usr/bin/env node
/** #974 · 备忘录 HELP 老→新逐场景对账生成器（写进 `t974-实施-证据.md` 的第三节）。
 *
 *  跑法（仓根；事实源与 dist 都在盘上时可直接跑）：
 *    node docs/skills/skill-memo-ilife/t974-对账.mjs > <一段 markdown>
 *
 *  两侧事实源：
 *    改前＝老实物契约载荷 `<SKILLS_DB_PATH>/memo_html/备忘录_HELP_*.html` 的 `window.__DATA__`（只读）；
 *    改后＝当前资产 `packages/skill-memo-ilife/dist/help/sceneData.js`（先 `tsc -b packages/skill-memo-ilife`）。
 */
import { readFileSync } from 'node:fs';
import { MEMO_HELP_GROUPS } from '../../../packages/skill-memo-ilife/dist/help/sceneData.js';

const LEGACY = process.env.M974_LEGACY
  ?? 'D:\\2Study\\StudyNotes\\.db\\memo_html\\备忘录_HELP_20260820_162453.html';
const ANCHOR = 'window.__DATA__ = ';
const raw = readFileSync(LEGACY, 'utf8');
const at = raw.indexOf(ANCHOR);
const legacy = JSON.parse(raw.slice(at + ANCHOR.length, raw.indexOf('</script>', at)).trim().replace(/;$/, ''));
const oldById = new Map(legacy.groups.flatMap((g) => g.subgroups.flatMap((s) => s.scenes)).map((s) => [s.id, s]));
const NEW = MEMO_HELP_GROUPS.flatMap((g) => g.subgroups.flatMap((s) => s.scenes));

const fenced = (t) => '```\n' + t + '\n```';
const out = [];
let n = 0;
for (const s of NEW) {
  const o = oldById.get(s.id);
  n += 1;
  out.push('### ' + n + '. `' + s.id + '`　' + s.title);
  out.push('');
  out.push('- 唤醒词（冻结）：`' + s.wake_word + '`；类型：' + s.types.join('／')
    + (s.aliases ? '；别名：' + s.aliases.join('／') : ''));
  out.push('- 改前（老骨架逐字）：');
  out.push(fenced(o.prompt_template));
  out.push('- 改后：');
  out.push(fenced(s.prompt_template));
  if (s.editable_fields) {
    out.push('- 字段表：');
    out.push('');
    out.push('| name | label | kind | required | options／hint |');
    out.push('|---|---|---|---|---|');
    for (const f of s.editable_fields) {
      const extra = f.options ? f.options.join('／') : f.hint;
      out.push('| `' + f.name + '` | ' + f.label + ' | `' + f.kind + '` | ' + f.required + ' | ' + extra + ' |');
    }
  } else {
    out.push('- 字段表：**零参**（`editable_fields` 缺席，页面无控件；沿 REPORT §2.4）。');
  }
  out.push('');
}
process.stdout.write(out.join('\n'));

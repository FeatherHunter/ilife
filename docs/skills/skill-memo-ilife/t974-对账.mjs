#!/usr/bin/env node
/** #974 · 备忘录 HELP 老→新逐场景对账生成器（写进 `t974-实施-证据.md` 的第三节）。
 *
 *  跑法（仓根；先 `tsc -b packages/skill-memo-ilife`）：
 *    node docs/skills/skill-memo-ilife/t974-对账.mjs > <一段 markdown>
 *
 *  两侧事实源（都在仓内，无外部依赖）：
 *    改前＝`packages/skill-memo-ilife/scripts/help-assets.before.mjs`（重写前那一刻的正文与字段，机器自 git 抽取）；
 *    改后＝当前资产 `packages/skill-memo-ilife/dist/help/sceneData.js`。
 *  信息原子的去处台账（每个原子／每个老字段去了哪）住 `scripts/help-assets.atoms.mjs`，由生成器与测试断言。
 */
import { BEFORE } from '../../../packages/skill-memo-ilife/scripts/help-assets.before.mjs';
import { MEMO_HELP_GROUPS } from '../../../packages/skill-memo-ilife/dist/help/sceneData.js';

const NEW = MEMO_HELP_GROUPS.flatMap((g) => g.subgroups.flatMap((s) => s.scenes));
const fenced = (t) => '```\n' + t + '\n```';
const out = [];
let n = 0;
for (const s of NEW) {
  const o = BEFORE[s.id];
  if (!o) throw new Error('快照里没有这个场景：' + s.id);
  n += 1;
  out.push('### ' + n + '. `' + s.id + '`　' + s.title);
  out.push('');
  out.push('- 唤醒词（冻结）：`' + s.wake_word + '`；类型：' + s.types.join('／')
    + (s.aliases ? '；别名：' + s.aliases.join('／') : ''));
  out.push('- 改前（重写前那一刻的资产，逐字）：');
  out.push(fenced(o.prompt));
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

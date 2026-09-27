/** #975 · 重写表的共用件：首行／约束句／正文装配／`F`／`scene` 简写。
 *
 * 为什么单独一件：分域表（`help-rewrite/<域>.mjs`）与本聚合件（`help-rewrite-table.mjs`）都要用它，
 * 放在任一侧都会绕成环；这里只放**与域无关**的写法约定，不含任何一条场景内容。
 *
 * 口径（逐字照卡路里标杆 `.scratch/help-prompt-rewrite/PROMPT-REWRITE.md`，不另起规范）：
 *  - 首行＝`请你加载技能 作息管家,执行唤醒词「<唤醒词>」。`——唤醒词本体取自路由表（裸词，无 `#0`／`T4` 序号）；
 *  - 约束句逐字保留（用户视角的呈现约束，不是机器格式）；
 *  - 参数行一行一参 `标签:{{name}}`；正文里**不留**裸 ISO 日期、不留 `____`；
 *  - 预置值剥离成字段：相对默认词（今天／明天）进 `hint`，不进 `value`。
 */

/** 首行（唯一命中原唤醒词的凭据）。 */
export function head(wakeWord) {
  return '请你加载技能 作息管家,执行唤醒词「' + wakeWord + '」。';
}

/** 交付约束句（与其它四家逐字同构）。 */
export const TAIL = '交付 HTML 时,文字只回复精简而全面概括的信息,文字不允许超过三句话。';

/** 字段简写。`value` 不在简写里（生成器一律补空串）；`extra` 只给该 kind 用得上的附属。 */
export function F(name, label, kind, required, hint, extra) {
  return { name, label, kind, required, hint, ...(extra || {}) };
}

/** 正文装配：首行 ＋ 空行 ＋ 意图句（含流程句）＋ 约束句 ＋（有字段时）空行 ＋ 参数行。 */
export function body(wakeWord, intent, fields) {
  const lines = [head(wakeWord), '', intent + TAIL];
  if (fields.length) {
    lines.push('');
    for (const f of fields) lines.push(f.label + ':{{' + f.name + '}}');
  }
  return lines.join('\n');
}

/** 一条重写记录：[场景 id, {标题／唤醒词／正文／字段表／具名丢弃}]。
 *  `drops`＝从老 `dimensions` 里**具名声明丢弃**的维度名（老维度既不在新字段、又没声明 ⇒ 生成器红）。 */
export function scene(id, title, wakeWord, intent, fields, drops) {
  return [id, {
    id,
    title,
    wake_word: wakeWord,
    prompt_template: body(wakeWord, intent, fields),
    editable_fields: fields,
    drops: drops || [],
  }];
}

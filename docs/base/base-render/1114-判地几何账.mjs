/** 判地几何账：从判地原型的内嵌 <style> 里机器抽出「选择器 → 声明」逐条账。
 *  用法：node docs/base/base-render/1114-判地几何账.mjs <out.md> <判地1.html> [判地2.html ...] */
import { readFileSync, writeFileSync } from 'node:fs';
import { basename } from 'node:path';

const [, , outPath, ...inputs] = process.argv;
const lines = ['# 判地几何账（机器抽取，勿手改）', '', '> 抽法：读判地 HTML 的内嵌 style，按「选择器{声明}」逐条拆开，原样落表。',
  '> 「声明」一列逐字保留判地写法（含单位与颜色字面）；它是判地的真值，不是本层的实现。', ''];
let totalRules = 0;
for (const file of inputs) {
  const html = readFileSync(file, 'utf8');
  const blocks = [...html.matchAll(/<style\b[^>]*>([\s\S]*?)<\/style>/g)].map((m) => m[1]);
  lines.push('## ' + basename(file), '', '| # | 选择器 | 声明 |', '|---|---|---|');
  let i = 0;
  for (const css of blocks) {
    const clean = css.replace(/\/\*[\s\S]*?\*\//g, '');
    for (const rule of clean.split('}')) {
      const k = rule.indexOf('{');
      if (k < 0) continue;
      const sel = rule.slice(0, k).trim().replace(/\s+/g, ' ');
      const body = rule.slice(k + 1).trim().replace(/\s+/g, ' ');
      if (sel === '' || body === '') continue;
      i += 1;
      lines.push('| ' + i + ' | ' + sel + ' | ' + body + ' |');
    }
  }
  totalRules += i;
  lines.push('', '（本件规则数：' + i + '）', '');
}
writeFileSync(outPath, lines.join('\n'), 'utf8');
console.log('rules total=' + totalRules + ' -> ' + outPath);
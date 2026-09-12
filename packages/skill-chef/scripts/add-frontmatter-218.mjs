// #218 一次性脚本：给 packages/skill-chef/SKILL.md 注入 frontmatter（幂等）。
// 唤醒词不手抄——从 src/policy/wakewords.ts 的 WAKE_TABLE 抽出来拼接，
// 保证「说明面与路由表不漂移」这把锁一次就绿。禁止 BOM，正文用真实换行。
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const HERE = dirname(fileURLToPath(import.meta.url));
const PKG = join(HERE, '..');
const MD = join(PKG, 'SKILL.md');

const wakeSrc = readFileSync(join(PKG, 'src', 'policy', 'wakewords.ts'), 'utf8');
const phrases = [...wakeSrc.matchAll(/\{ phrase: '([^']+)'/g)].map((m) => m[1]);
if (phrases.length === 0) throw new Error('抽不到唤醒词，检查 wakewords.ts 的写法');
if (phrases[0] !== '私家大厨HELP') throw new Error('头词应为「私家大厨HELP」，实得：' + phrases[0]);

const HEAD = '「私家大厨HELP」→chef.help.lookup 查怎么办；唯一出口 chef-cmd-read'
  + '（本地菜谱：搜菜／查看／加菜、跟着做、买菜清单合并、做菜记录与历史、体检排序）。触发词：';
const frontmatter = ['---', 'name: skill-chef', 'description: "' + HEAD + phrases.join('、') + '"', '---', ''].join('\n');

const raw = readFileSync(MD, 'utf8');
if (raw.charCodeAt(0) === 0xfeff) throw new Error('SKILL.md 以 BOM 开头，先清 BOM');
const body = raw.startsWith('---\n') ? raw.slice(raw.indexOf('\n---\n', 3) + 5) : raw;
writeFileSync(MD, frontmatter + body, { encoding: 'utf8' });

const out = readFileSync(MD, 'utf8');
console.log('phrases=' + phrases.length);
console.log('bom=' + (out.charCodeAt(0) === 0xfeff));
console.log('head=' + out.slice(0, 120).replace(/\n/g, '\\n'));

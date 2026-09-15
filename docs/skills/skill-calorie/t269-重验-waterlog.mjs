#!/usr/bin/env node
/** #269 重验 · `calorie.water.log` 取证探针（可复跑；只取证，不做裁定）。
 *
 * 用法：
 *   node docs/skills/skill-calorie/t269-重验-waterlog.mjs [--lane=<目录>]
 *
 * 问的是：当刻检出上 `calorie.water.log` 的产物是**完整文档**还是**片段**。
 * 参数取权威声明 `src/diet/commands.ts:64` 的 example（`{"ml":300}`，与
 * `src/triggers/routes.generated.ts:27` 同值）。
 * 读数：exit ／ 落盘路径 ／ 字节数 ／ 首 15 字节 ／ charset ／ <style ／ </html> 收尾 ／ 片段特征（页面装配四块）。
 */
import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, rmSync, statSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const CHECKOUT = resolve(join(HERE, '..', '..', '..'));
const argOf = (n, d) => {
  const hit = process.argv.slice(2).find((a) => a.startsWith('--' + n + '='));
  return hit === undefined ? d : hit.slice(n.length + 3);
};
const LANE = resolve(argOf('lane', join(CHECKOUT, '.scratch', 't269a2', 'waterlog')));
const CLI = join(CHECKOUT, 'packages', 'skill-calorie', 'dist', 'cli', 'cmd_read.js');

rmSync(join(LANE, 'calorie_data.db'), { force: true });
rmSync(join(LANE, 'calorie_html'), { recursive: true, force: true });
mkdirSync(LANE, { recursive: true });

const KEY = 'calorie.water.log';
const PARAMS = { ml: 300 }; // 权威声明 src/diet/commands.ts:64 的 example
const r = spawnSync(process.execPath, [CLI, KEY, '--params', JSON.stringify(PARAMS)], {
  env: { ...process.env, SKILLS_DB_PATH: LANE },
  encoding: 'utf8',
  maxBuffer: 64 * 1024 * 1024,
});
let env = null;
try { env = JSON.parse(String(r.stdout).trim().split('\n').pop()); } catch { /* 无 envelope */ }

const data = env !== null && typeof env === 'object' ? env['data'] : null;
const path = data !== null && typeof data === 'object' && typeof data['output'] === 'string'
  ? data['output']
  : (env !== null && typeof env === 'object' && env['delivery'] !== null
    && typeof env['delivery'] === 'object' && typeof env['delivery']['path'] === 'string'
    ? env['delivery']['path'] : null);

const rows = [
  ['命令', KEY],
  ['参数', JSON.stringify(PARAMS)],
  ['exit', String(r.status)],
  ['落盘路径', path ?? '(无)'],
];
if (path !== null && existsSync(path)) {
  const buf = readFileSync(path);
  const text = buf.toString('utf8');
  // 饮食回执整页的四块（#269 装配出的页面才有）
  const blocks = [
    ['页壳 <!doctype html> 起首', text.startsWith('<!doctype html>')],
    ['含 charset', text.includes('charset')],
    ['含 <style', text.includes('<style')],
    ['</html> 收尾', text.trimEnd().endsWith('</html>')],
    ['含复制区（copyArea）', text.includes('aria-label') || text.includes('复制')],
    ['含读数卡／今日累计字样', text.includes('操作回执') || text.includes('今日累计')],
  ];
  rows.push(['字节数', String(statSync(path).size)]);
  rows.push(['首 15 字节', JSON.stringify(buf.subarray(0, 15).toString('utf8'))]);
  rows.push(['末 12 字节', JSON.stringify(buf.subarray(Math.max(0, buf.length - 12)).toString('utf8'))]);
  for (const [k, v] of blocks) rows.push([k, v ? '是' : '否']);
  const complete = text.startsWith('<!doctype html>') && text.includes('charset')
    && text.includes('<style') && text.trimEnd().endsWith('</html>');
  rows.push(['小结', complete ? '完整文档' : '片段（不满足完整文档四项）']);
} else {
  rows.push(['小结', '无产物']);
}
for (const [k, v] of rows) console.log(k.padEnd(22, ' ') + ' : ' + v);

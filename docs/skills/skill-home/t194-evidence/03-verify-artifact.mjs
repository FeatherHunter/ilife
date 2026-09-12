/** 票 #194 证据 ③ 的可复跑校验脚本：对交付到手的 HELP 产物逐条核「可打开＋内容全在」。
 *
 *  用法：node docs/skills/skill-home/t194-evidence/03-verify-artifact.mjs <产物绝对路径>
 *  只读；不写文件、不建库、不碰 SKILLS_DB_PATH。
 */
import { readFileSync, statSync } from 'node:fs';

const path = process.argv[2];
if (!path) {
  console.error('用法：node 03-verify-artifact.mjs <产物绝对路径>');
  process.exit(2);
}

const html = readFileSync(path, 'utf8');

/** 内嵌 JSON 载荷（`<script id="help-data" type="application/json">…`）＝页面正文的唯一来源：
 *  三个计数按**结构**数（数数组长度），不靠正则（正则漏配一个 id 就会假红／假绿）。 */
const open = '<script id="help-data" type="application/json">';
const from = html.indexOf(open) + open.length;
const data = JSON.parse(html.slice(from, html.indexOf('</script>', from)));
const groups = data.groups.length;
const subgroups = data.groups.reduce((n, g) => n + g.subgroups.length, 0);
const scenes = data.groups.reduce((n, g) => n + g.subgroups.reduce((m, s) => m + s.scenes.length, 0), 0);
const externalRefs = (html.match(/<link[^>]+href=|<script[^>]+src=|<img[^>]+src=/g) ?? []).length;
const stamp = (html.match(/更新于 [0-9: -]+/) ?? ['(未找到)'])[0];

const rows = [
  ['字节数（文件实际大小）', statSync(path).size],
  ['`<meta charset="UTF-8">`', /<meta charset="UTF-8">/i.test(html)],
  ['移动端 viewport 声明', /name="viewport"/.test(html)],
  ['零外部引用（link／script src／img src）', externalRefs === 0],
  ['无 BOM（首字符不是 U+FEFF）', html.charCodeAt(0) !== 0xfeff],
  ['在列分组数（应 8；`link` 停用域不入组）', groups],
  ['二级组数（应 27＝骨架 30 − 联动域 3 组）', subgroups],
  ['场景条数（应 70＝骨架 73 − 联动 3 条）', scenes],
  ['停用域 `link` 未落页', data.groups.every((g) => g.id !== 'link')],
  ['停用联动 3 组名未落页（联动总览／食品联动／价格联动）', ['联动总览', '食品联动', '价格联动'].every((n) => !html.includes(n))],
  ['口径区写明「骨架 73 条，联动 3 条已停用不列」', JSON.stringify(data.meta_blocks ?? []).includes('骨架 73 条，联动 3 条已停用不列')],
  ['首次使用横幅（有库应 true／空目录应 false；只报不判）', data.init_banner?.hidden],
  ['页面内「更新于」戳', stamp],
];
for (const [k, v] of rows) console.log(String(k).padEnd(48, ' ') + ' = ' + v);

const ok = groups === 8 && subgroups === 27 && scenes === 70 && externalRefs === 0
  && /<meta charset="UTF-8">/i.test(html) && /name="viewport"/.test(html)
  && ['联动总览', '食品联动', '价格联动'].every((n) => !html.includes(n))
  && JSON.stringify(data.meta_blocks ?? []).includes('骨架 73 条，联动 3 条已停用不列');
console.log('\n判定：' + (ok ? 'PASS（8／27／70 齐 ＋ 停用联动未落页 ＋ 零外链 ＋ 可打开两声明齐）' : 'FAIL'));
process.exit(ok ? 0 : 1);

#!/usr/bin/env node
/** #95 返修 · G3 诚实性／逐件断言的**回归测试**（可复跑，真跑 `--fresh-tmp`）。
 *
 * 背景（A1-2／A2-1 两条 S2）：G3 在 `--only skill-calorie` 下 `CONTRACT = {}`，循环体一次不跑，
 * 却仍打印「G3 安装态断言全绿／cliPath 解析 + 契约键打通」；模板断言又只遍历磁盘上发现的文件，
 * 少发几件照样 PASS。本脚本把「门必须说真话 ＋ 逐件断言」变成可回归的判据：
 *
 *   A（F1）临时根在**仓库之外**——输出里 `（仓外临时根 …）` 不得指向 D:\ilife 之下。
 *   B（F8）模板断言按应发清单**逐件**：必须出现「安装态 templates/ 6 件经 loadTemplate 全部装载成功」。
 *   C（F4）契约断言在无插件包的 scope 下必须打印「未跑（本 scope 不含插件包）」，
 *          且**不得**出现「契约键打通」「断言全绿」这类没跑却宣称成功的字样。
 *   D（F3）公开出口断言必须如实记账为「未跑 ＋ 待 base-paint 发版后补」。
 *   E（F9）收尾后仓内不得残留 `ilife-fresh-*`／`ilife-pack-*`／`ilife-g3-*`。
 *
 * 用法：node docs/research/t95-g3-honesty.mjs
 *   期望全 OK（exit 0）；任一断言失败 → exit 1。
 *   变异自证：把 F4 的消息改回无条件 `ok('G3 安装态 cliPath 解析 + 契约键打通')` → C 必红。
 */
import { existsSync, readdirSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { join, dirname, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const out = spawnSync(process.execPath, ['tooling/check-publish.mjs', '--fresh-tmp', '--only', 'skill-calorie'], { cwd: root, encoding: 'utf8' });
const text = (out.stdout || '') + '\n' + (out.stderr || '');
let bad = 0;
const ok = (m) => console.log('OK: ' + m);
const fail = (m) => { console.error('FAIL: ' + m); bad++; };
const has = (s) => text.includes(s);

if (out.status !== 0) fail('G3 自身非 0（exit ' + out.status + '）');
else ok('G3 exit 0');

// A：临时根必须在仓库之外（F1 的静态判据，不依赖「跑完再扫残留」）。
const m = text.match(/（仓外临时根 (.+?)）/);
if (!m) fail('G3 未打印临时根位置（无法证明临时根在仓外）');
else if (resolve(m[1]) === resolve(root) || resolve(m[1]).startsWith(resolve(root) + sep)) fail('临时根落在仓库内：' + m[1]);
else ok('临时根在仓库之外：' + m[1]);

// B：逐件（6 件）装载（F8）。
if (has('安装态 templates/ 6 件经 loadTemplate 全部装载成功')) ok('模板断言逐件：6 件装载成功');
else fail('模板断言不是「逐件 6 件」——少发/未跑都会漏过');

// C：没跑的断言不许说成成功（F4）。
if (has('契约断言 未跑（本 scope 不含插件包')) ok('契约断言如实标注「未跑」');
else fail('契约断言未标注「未跑」');
for (const forbidden of ['契约键打通', '断言全绿']) {
  if (has(forbidden)) fail('出现没跑却宣称成功的字样：' + forbidden);
}
if (!has('契约键打通') && !has('断言全绿')) ok('无「契约键打通／断言全绿」这类无条件绿灯字样');

// D：公开出口如实记账（F3）。
if (has('公开出口断言（安装态 import(<skill>/render)）**未跑**') && has('待 base-paint 发版后补')) ok('公开出口断言如实记账（未跑 ＋ 待发版补）');
else fail('公开出口断言未如实记账');

// E：仓内无临时残留（F9）。
const leftovers = [];
for (const base of [root, join(root, '.scratch')]) {
  if (!existsSync(base)) continue;
  for (const d of readdirSync(base, { withFileTypes: true })) if (d.isDirectory() && /^ilife-(fresh|pack|g3)-/.test(d.name)) leftovers.push(join(base, d.name));
}
if (leftovers.length) fail('仓内残留：' + leftovers.join(', '));
else ok('仓内无 ilife-fresh-*／ilife-pack-*／ilife-g3-* 残留');

if (bad) { console.error('t95 G3 诚实性回归：' + bad + ' 处红'); process.exit(1); }
console.log('t95 G3 诚实性回归：PASS');

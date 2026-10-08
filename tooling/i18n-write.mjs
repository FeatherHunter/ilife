#!/usr/bin/env node
/** #1233 · 改写器**写模式**的 CLI（实现住 `i18n-codemod-write.mjs`，本件只做入口与读数）。
 *
 * 用法（仓根）：
 *   node tooling/i18n-write.mjs --dry --only base-render     # 只报会改哪些件、各写几条
 *   node tooling/i18n-write.mjs --only base-render           # 真写（先备份到 .scratch/i18n-codemod-backup/）
 *   node tooling/i18n-write.mjs --selftest                   # 自证：临时夹具上写→幂等→只动 copy 类
 *
 * ⚠ 写模式只做**机械那一半**：把 copy 类字面量换成 `__E('key')` 过渡形并落词条表；
 *   `__E` 到条目层调用的接线（语言透传、渲染消费方）归各迁移票。别拿它当迁移的完成读数。
 */
import { mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { rewriteFile, segmentOf, writableLiterals, writeAll, writeEntryTables } from './i18n-codemod-write.mjs';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const argv = process.argv.slice(2);
const flag = (name, dflt) => { const i = argv.indexOf(name); return i >= 0 && argv[i + 1] !== undefined ? argv[i + 1] : dflt; };

if (argv.includes('--selftest')) {
  const bad = [];
  const want = (cond, msg) => { if (!cond) bad.push(msg); };
  const tmp = mkdtempSync(join(tmpdir(), 'i18n-write-'));
  try {
    mkdirSync(join(tmp, 'packages', 'demo', 'src'), { recursive: true });
    const file = 'packages/demo/src/demo.ts';
    writeFileSync(join(tmp, file), [
      '// 注释里的中文不算：这是给读代码的人看的',
      'export const a = ' + String.fromCharCode(39) + '保存成功' + String.fromCharCode(39) + ';',
      'export const b = ' + String.fromCharCode(39) + '合 ' + String.fromCharCode(39) + ' + n + ' + String.fromCharCode(39) + ' 折' + String.fromCharCode(39) + ';',
      'export const c = ' + String.fromCharCode(39) + 'bill.record.add' + String.fromCharCode(39) + ';',
      '',
    ].join(String.fromCharCode(10)), 'utf8');
    const lits = writableLiterals(tmp, file);
    want(lits.length === 1, '只该认出 1 条可写（注释／拼接串／命令键都不算），实得 ' + lits.length + '：' + JSON.stringify(lits.map((l) => l.value)));
    const seg = segmentOf(file);
    want(seg === 'demo', '区段名应为 demo，实得 ' + seg);
    const rw = rewriteFile(tmp, file, seg);
    want(rw.text.includes('__E(' + JSON.stringify('i18n-demo.1') + ')'), '应换成过渡调用，实得：' + rw.text);
    want(rw.text.includes('bill.record.add'), '命令键不许动：' + rw.text);
    want(rw.text.includes('合 ' + String.fromCharCode(39) + ' + n'), '拼接串不许动：' + rw.text);
    writeEntryTables(tmp, 'demo', seg, rw.pairs);
    const zh = readFileSync(join(tmp, 'packages', 'demo', 'src', 'entries', 'i18n_demo.zh.ts'), 'utf8');
    want(zh.includes(JSON.stringify('i18n-demo.1') + ': ' + JSON.stringify('保存成功')), '中文列值须与原字面量逐字节相同：' + zh);
    console.log('SELFTEST 写模式：可写 ' + lits.length + ' 条／区段 ' + seg + '／中文列逐字相同 OK');
    // 幂等：把改写后的文本落盘再跑一遍 → 无 copy 可换
    writeFileSync(join(tmp, file), rw.text, 'utf8');
    const again = writableLiterals(tmp, file);
    want(again.length === 0, '第二遍应无可写（幂等），实得 ' + again.length);
    console.log('SELFTEST 幂等：第二遍可写 ' + again.length + ' 条');
  } finally {
    rmSync(tmp, { recursive: true, force: true });
  }
  if (bad.length) { for (const b of bad) console.error('SELFTEST FAIL ' + b); process.exit(1); }
  console.log('SELFTEST: 只动 copy 类／注释与命令键与拼接串不动／中文列逐字相同／幂等 —— 四条自证 OK');
  process.exit(0);
}

const only = flag('--only', undefined);
const dry = argv.includes('--dry');
const r = writeAll(ROOT, only, dry);
console.log('WRITE files=' + r.files + ' entries=' + r.entries + (dry ? '（--dry：未落盘）' : ''));
for (const x of r.list.slice(0, 30)) console.log('  ' + String(x.writable).padStart(4) + '  ' + x.rel);
if (r.list.length > 30) console.log('  …还有 ' + (r.list.length - 30) + ' 件');

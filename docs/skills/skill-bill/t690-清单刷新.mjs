// t690 清单刷新：给 `t403-manifest.json` 的 `check` 列**追加**本票补块后新增的确认项。
//
// 为什么要动它：`check` 是墙上那句**给人看的确认清单**（`t403-验收墙.mjs:77-93` 把它渲染成
// 「这一格该确认什么」），本票给两张页型补了六块（结论句／页内导航／分类聚合卡／截断明示／
// 口径说明行／来源脚注），原话里一条都没提，上墙会让人只按旧预期看。
//
// **为什么是「追加」不是「重写」**：`check` 是**人写的**复核提示，几行里带着机器算不出来的意图——
// 例如 `w05-查账单` 那句是「别名同页：标题查今天、笔数与第 1 格一致；无入口标记」，是**跨行**比对，
// 按产物重算会把这层意思整个抹掉。且原话逐条**仍然成立**（只是不覆盖新块），不是错话、是缺话。
// ⇒ 保留原文逐字在前，另起一段只写新块里**可机检**的读数。
//
// `check` 不是机器判据（`t403-验收墙.mjs` 只要求这个字段非空、只读 `rows[].file`），故追加不影响任何门。
//
// 跑法：node docs/skills/skill-bill/t690-清单刷新.mjs            # 只打新旧对照，不落盘
//      node docs/skills/skill-bill/t690-清单刷新.mjs --write     # 落盘（无 BOM、两空格缩进、键序不动）
import { readFileSync, writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, '..', '..', '..');
const DIR = join(root, '.scratch', 't690-wall');
const MANIFEST = join(here, 't403-manifest.json');
const write = process.argv.includes('--write');

const body = (h) => h.slice(h.indexOf('<body>'), h.indexOf('<script>'));
const one = (b, re) => { const m = re.exec(b); return m === null ? '' : m[1].replace(/<[^>]+>/g, '').trim(); };
const all = (b, re) => [...b.matchAll(re)].map((m) => m[1].replace(/<[^>]+>/g, '').trim());

const raw = readFileSync(MANIFEST, 'utf8');
const mf = JSON.parse(raw.charCodeAt(0) === 0xFEFF ? raw.slice(1) : raw);

for (const r of mf.rows) {
  const b = body(readFileSync(join(DIR, r.file), 'utf8'));
  const tb = /<tbody>([\s\S]*?)<\/tbody>/.exec(b);
  const nRows = tb === null ? 0 : (tb[1].match(/<tr>/g) ?? []).length;
  // 只装**本票补的新块**里可机检的那几样（旧话里已有的标题／副标题／胶囊／KPI／表行不重复写）。
  const add = [];
  add.push('结论句「' + one(b, /<p class="ilife-block-conclusion">([\s\S]*?)<\/p>/) + '」');
  add.push('表 ' + String(nRows) + ' 行');
  const dist = all(b, /<span class="ilife-block-dist-row-name">([\s\S]*?)<\/span>/g);
  add.push(dist.length === 0 ? '分类聚合不出（零支出）' : '分类聚合 ' + String(dist.length) + ' 行：' + dist.join('、'));
  add.push('页内导航 ' + String((b.match(/ilife-block-toc/g) ?? []).length) + ' 个');
  if (/ilife-block-disclosure/.test(b)) add.push('截断明示在');
  add.push('来源脚注「' + one(b, /<p class="ilife-block-caliber">(数据来源[\s\S]*?)<\/p>/) + '」');
  const next = r.check + '；——t690 补块后另需确认（可机检）：' + add.join('；');
  console.log(String(r.seq).padStart(2) + ' ' + r.file);
  console.log('   旧：' + r.check);
  console.log('   新：' + next);
  r.check = next;
}

if (write) {
  writeFileSync(MANIFEST, JSON.stringify(mf, null, 2) + '\n', 'utf8');
  console.log('\n已落盘：' + MANIFEST + '（无 BOM）');
} else {
  console.log('\n（演练；加 --write 才落盘）');
}

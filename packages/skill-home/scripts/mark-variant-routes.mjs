#!/usr/bin/env node
// #800 · 一次性脚本：给 `scenarios.yaml` 42 条变体逐条打 `route:` 标记。
//
// 分层标准（唤醒词层规格）：无槽位也能唯一命中的才进确定性路由（true），
// 含指代／省略／模糊只由 AI 识别（false）。判定逐条见本文件 ROUTE 表，
// 机器门 `test/wake-family-gates.test.mjs` 逐条复核（标记与路由表双向一致）。
// 跑法（仓根）：`node packages/skill-home/scripts/mark-variant-routes.mjs`（幂等：
// 已有标记的行原样保留，只补缺的行；换行保持 CRLF）。
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const YAML = join(dirname(fileURLToPath(import.meta.url)), '..', 'src', 'help', 'scenarios.yaml');

// phrase → route（true＝进确定性路由，false＝只由 AI 识别）。42 条，一条不落。
const ROUTE = new Map(Object.entries({
  '登记物品': true, '添加物品': true, '帮我记一下': true, '家里又多了个东西': true, '这个收进来': false, '新到货了': true,
  '搜索物品': true, '找一下物品': true, '帮我找找': true, '看看家里有啥': true, '那个啥在哪': false, '我之前放哪了': false,
  '查看物品': true, '物品详情': true, '给我看看这个': false, '这件东西啥情况': false, '那个东西的信息': false, '它具体是啥': false,
  '清点物品': true, '核对库存': true, '数数这里': true, '这堆对一下': false, '看看齐不齐': false, '还剩多少': false,
  '位置管理': true, '整理一下家里的位置': true, '位置怎么分的': true,
  '设置固定位': true, '钥匙固定放哪来着': false, '给我定个固定位置': true,
  '收纳位置建议': true, '这东西该放哪': false, '帮我找个地方放': true,
  '浏览空间视图': true, '看看家里每个地方都有啥': true, '客厅里都有什么': true,
  '统计物品': true, '物品总览': true, '家里都有啥': true, '给我个总数': true, '一共多少件': true, '整体啥情况': true,
}));

const raw = readFileSync(YAML, 'utf8');
const lines = raw.split(/\r?\n/);
let inVariants = false;
let marked = 0;
const seen = new Set();
const out = [];
for (let i = 0; i < lines.length; i++) {
  const ln = lines[i];
  out.push(ln);
  if (/^- id: \S+/.test(ln)) { inVariants = false; continue; }
  if (/^  variants:/.test(ln)) { inVariants = true; continue; }
  if (/^  \S/.test(ln) && !/^    /.test(ln) && !/^  variants:/.test(ln) && !/^  - /.test(ln)) inVariants = false;
  const m = inVariants && /^    phrase: (.+)$/.exec(ln);
  if (m) {
    const phrase = m[1].trim();
    if (!ROUTE.has(phrase)) throw new Error('变体缺判定（先补 ROUTE 表，不猜）：' + phrase);
    seen.add(phrase);
    const nxt = lines[i + 1] ?? '';
    if (!/^    route: (true|false)$/.test(nxt)) {
      out.push('    route: ' + ROUTE.get(phrase));
      marked++;
    }
  }
}
if (seen.size !== ROUTE.size) throw new Error('变体数对不上：yaml 见 ' + seen.size + '，判定表 ' + ROUTE.size);
writeFileSync(YAML, out.join('\r\n'), 'utf8');
console.log('MARK done：补标记 ' + marked + ' 行，共 ' + seen.size + ' 条变体（true=' + [...ROUTE.values()].filter(Boolean).length + '）');

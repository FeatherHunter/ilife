#!/usr/bin/env node
/** 体检四张 HELP 地图的正文（#183 居家／#197 作息／#208 大厨／#220 备忘）。 */
import { execFileSync } from 'node:child_process';

const REPO = 'FeatherHunter/ilife';
const FENCE = '`'.repeat(3);
const TOP = [
  '## Destination', '## 进度：', '## Notes',
  '## 计划（任务清单）', '## 任务清单',
  '## Decisions so far', '## Not yet specified', '## Out of scope', '## 用户原话采访区',
];

for (const m of [183, 197, 208, 220]) {
  const b = execFileSync('gh', ['api', `repos/${REPO}/issues/${m}`, '--jq', '.body'], { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });
  const L = b.split('\n');
  const atStart = TOP.filter((s) => s !== '## 计划（任务清单）' && s !== '## 任务清单').filter((s) => L.some((l) => l.startsWith(s))).length;
  const hasPlan = L.some((l) => l.startsWith('## 计划（任务清单）') || l.startsWith('## 任务清单'));
  const split = L.filter((l) => /^\|[^|]*$/.test(l) && l.trim() !== '|').length;
  let f = 0;
  for (const l of L) if (l.trim().startsWith(FENCE)) f++;
  const fencesOk = f % 2 === 0;
  const ok = atStart === 7 && hasPlan && split === 0 && fencesOk && !b.startsWith('\uFEFF');
  console.log(
    `#${m}  ${ok ? '✅' : '⚠️ '}  行=${String(L.length).padStart(3)} 平均行长=${String(Math.round(b.length / L.length)).padStart(3)} ` +
    `最长行=${String(Math.max(...L.map((l) => l.length))).padStart(4)} 行首节名=${atStart}/7 计划节=${hasPlan ? '有' : '无'} ` +
    `拆行表格=${split} 围栏=${f}${fencesOk ? '' : '(不配对!)'} BOM=${b.startsWith('\uFEFF')}`,
  );
}

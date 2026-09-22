#!/usr/bin/env node
/** #835 · 终审「逐页证据面」汇编：把 VLM 要核的机器读数按页切好，一页一节落一份 markdown。
 *
 * 为什么要它：票面第 4 步写死「模型是提示器不是证据」——VLM 的每条结论都要回 DOM／CSS 读数
 * 或 `文件:行` 复核。本件把三样机器读数按页并到一处，供复核逐条引用：
 *   ① `t835-计算样式面.mjs` 的渲染读数（溢出／版心占比／触摸 <44／最小字号／一屏可见文字）
 *   ② `t869-机审.mjs` 的六列读数（双端断点／触摸／本页自造样式／重复句／分隔符／英文与半角标点）
 *   ③ `t835-读数/` 的四件读数里只与该页有关的字段（分隔符命中、跨宽、版式、facts 人核位）
 *
 * 用法（仓根）：
 *   node docs/skills/skill-memo-ilife/t835-逐页证据.mjs --css <计算样式面.json> --audit <机审.json> --readings <读数目录> --out <md 落点>
 */
import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';

const argOf = (n, d) => { const i = process.argv.indexOf(n); return i >= 0 && process.argv[i + 1] ? process.argv[i + 1] : d; };
const CSS = resolve(argOf('--css', 'packages/skill-memo-ilife/.scratch/t835-读数/计算样式面.json'));
const AUDIT = resolve(argOf('--audit', 'packages/skill-memo-ilife/.scratch/t834/读数/audit-835.json'));
const READINGS = resolve(argOf('--readings', 'packages/skill-memo-ilife/.scratch/t835-读数'));
const OUT = resolve(argOf('--out', 'packages/skill-memo-ilife/.scratch/t835-读数/逐页证据.md'));

const css = JSON.parse(readFileSync(CSS, 'utf8'));
const audit = existsSync(AUDIT) ? JSON.parse(readFileSync(AUDIT, 'utf8')) : null;
const rowsOf = (name) => {
  const p = join(READINGS, name);
  if (!existsSync(p)) return null;
  const j = JSON.parse(readFileSync(p, 'utf8'));
  return j.rows ?? null;
};
const sep = rowsOf('sep.json');
const resp = rowsOf('resp.json');
const fmt = rowsOf('fmt.json');
const pick = (rows, stem) => (rows === null ? null : rows.find((r) => {
  const n = String(r.name ?? r.file ?? '');
  return n === `${stem}.html` || n === stem || n.endsWith(`/${stem}.html`);
}) ?? null);

/** 机审读数里最要紧的几列（本页的 ①–⑥ 与版式位旁证）。 */
const auditOf = (stem) => {
  if (audit === null) return null;
  const rows = audit.rows ?? audit.files ?? audit.items ?? [];
  const hit = rows.find((r) => String(r.file ?? r.name ?? '') === `${stem}.html` || String(r.file ?? r.name ?? '') === stem
    || String(r.file ?? r.name ?? '').endsWith(stem + '.html'));
  return hit ?? null;
};

const out = [];
for (const row of css.rows) {
  const { stem } = row;
  out.push(`## ${stem}`, '');
  for (const w of Object.keys(row.byWidth)) {
    const v = row.byWidth[w];
    const widest = v.widest === null ? '—' : `${v.widest.tag}.${v.widest.cls} / 宽 ${Math.round(v.widest.w)}px / 高 ${Math.round(v.widest.h)}px`;
    out.push(
      `### ${stem} · ${w} 档`,
      '',
      `- 横向溢出 = **${v.overflowPx}px**（scrollWidth ${v.scrollWidth} − innerWidth ${v.width}）`,
      `- 版心：最宽可见块 = ${widest}；左余 ${v.leftGapPx}px／右余 ${v.rightGapPx}px；占视口 **${v.viewportUsedPct}%**`,
      `- 触摸目标：共 ${v.tapTotal} 个，其中 <44px 的 ${v.tapSmallCount} 个`
        + (v.tapSmallCount > 0 ? `（${v.tapSmall.map((t) => `${t.tag}.${t.cls}「${t.text}」${t.w}×${t.h}`).join('；')}）` : ''),
      `- 正文最小字号 = ${v.minFontPxNoSvg}px（在 ${v.minFontWhere === null ? '—' : `${v.minFontWhere.tag}.${v.minFontWhere.cls}「${v.minFontWhere.text}」`}）；字号阶梯 = ${v.fontSteps.join(' / ')}`,
      `- 一屏可见文字（渲染后、剔 display:none）：${v.visibleText.length} 段`,
      '',
      '```text',
      v.visibleTextJoined,
      '```',
      '',
    );
  }
  const s = pick(sep, stem);
  const r = pick(resp, stem);
  const f = pick(fmt, stem);
  if (s !== null) {
    const node = (s.node?.hits ?? []).length;
    const line = s.line === undefined ? '—' : JSON.stringify(s.line).length;
    out.push(`### ${stem} · 机器读数`, '',
      `- 分隔符探针：节点级命中 ${node} 处；行级读数 ${line}`,
      r === null ? '- 跨宽读数：—' : '- 跨宽读数：'
        + Object.keys(r.widths ?? {}).map((w) => `${w}档=${r.widths[w].why === '' && r.widths[w].ok !== false ? '零溢出' : '**' + (r.widths[w].why || '破') + '**'}`).join('，'),
      f === null ? '- 版式读数：—' : `- 版式读数：窄档最小字号 ${f.widths?.['390']?.minFontPxNoSvg}px；触摸 <44 处数 ${Object.keys(f.widths ?? {}).map((w) => `${w}=${f.widths[w].touchSmall ?? 0}`).join('/')}；`
        + `KPI 每排 ${JSON.stringify(f.widths?.['390']?.kpiPerRow ?? [])}；页内目录 ${Object.keys(f.widths ?? {}).map((w) => `${w}=${f.widths[w].toc ?? 0}`).join('/')}`,
      '');
  }
  const a = auditOf(stem);
  if (a !== null) {
    const cols = a.cols ?? a.columns ?? a;
    out.push(`### ${stem} · 六列机审`, '', '```json', JSON.stringify(cols).slice(0, 1400), '```', '');
  }
}
mkdirSync(dirname(OUT), { recursive: true });
writeFileSync(OUT, `# t835 · 逐页证据面（${css.rows.length} 页）\n\n> 读法：每页一节，两档各一段渲染读数 ＋ 一段机器读数 ＋ 一段六列机审。\n> 生成器：\`docs/skills/skill-memo-ilife/t835-逐页证据.mjs\`。\n\n` + out.join('\n'), 'utf8');
console.log(`RESULT: ${css.rows.length} 页证据落 ${OUT}`);

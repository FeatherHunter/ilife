// 只读探针 2（审查席 B）：日期/时间戳稳定性与 95 条 non-exec 归因取证
import fs from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();
const FILES = fs.readdirSync(path.join(ROOT, '.scratch/final-db/calorie_html'))
  .filter((f) => f.endsWith('.html'))
  .map((f) => path.join(ROOT, '.scratch/final-db/calorie_html', f));
const out = (...a) => console.log(...a);

// 1. 三态产物内出现的 ISO 日期字面量（跨天稳定性风险）
for (const f of FILES) {
  const t = fs.readFileSync(f, 'utf8');
  const dates = [...new Set([...t.matchAll(/\d{4}-\d{2}-\d{2}/g)].map((m) => m[0]))];
  const times = [...new Set([...t.matchAll(/\d{4}-\d{2}-\d{2}[ T]\d{2}:\d{2}/g)].map((m) => m[0]))];
  out('DATE', path.basename(f), 'iso-dates=', JSON.stringify(dates.slice(0, 12)), 'count=', dates.length, 'datetime=', JSON.stringify(times.slice(0, 5)));
}

// 2. payload 内 cli 字段里的日期字面量（跨天漂移）
const html = fs.readFileSync(FILES.find((f) => /234219\.html$/.test(f)), 'utf8');
const m = html.match(/<script id="[^"]+" type="application\/json">([\s\S]*?)<\/script>/);
if (m) {
  const data = JSON.parse(m[1]);
  let withDate = 0; const samples = [];
  for (const g of data.groups ?? []) for (const sg of g.subgroups ?? []) for (const sc of sg.scenes ?? []) {
    const s = JSON.stringify(sc.editable_fields ?? null);
    if (/\d{4}-\d{2}-\d{2}/.test(s)) { withDate++; if (samples.length < 6) samples.push({ id: sc.id, wake: sc.wake_word, f: s }); }
  }
  out('PAYLOAD cli fields with ISO date:', withDate, 'of 341');
  for (const s of samples) out('   ', s.wake, '=>', s.f.slice(0, 220));
  out('PAYLOAD top keys:', Object.keys(data).join(','));
  out('PAYLOAD updatedAt-ish:', JSON.stringify({ updatedAt: data.updatedAt, generatedAt: data.generatedAt, subtitle: data.subtitle }));
}

// 4. 新侧 CSS 字体栈／tnum（B1 H-06／H-07 面，台账未登记）
const H = fs.readFileSync(FILES.find((f) => /234219\.html$/.test(f)), 'utf8');
const styles = H.match(/<style[^>]*>[\s\S]*?<\/style>/g) ?? [];
out('STYLE blocks', styles.length);
for (const b of styles) {
  const ff = [...b.matchAll(/font-family[^;}]*/g)].map((x) => x[0]);
  out('  CSS font-family decls', ff.length, JSON.stringify(ff.slice(0, 4)));
}
const allFf = [...H.matchAll(/font-family[^;"']*/g)].map((x) => x[0]);
out('HTML total font-family matches', allFf.length, JSON.stringify([...new Set(allFf)].slice(0, 6)));
out('HTML has -apple-system:', H.includes('-apple-system'), '| has PingFang:', H.includes('PingFang'));
out('HTML <details> count', (H.match(/<details/g) ?? []).length, '| <article> count', (H.match(/<article class="ilife-help-shell-card"/g) ?? []).length);

// 5. 旧侧 F3：editable_fields／getMissing／legacy_ 前缀（D5／D6 的「0」依据）
const OLD = 'D:\\2Study\\StudyNotes\\SKILLS\\卡路里\\卡路里.html';
if (fs.existsSync(OLD)) {
  const t = fs.readFileSync(OLD, 'utf8');
  out('OLD bytes', Buffer.byteLength(t, 'utf8'), 'has editable_fields:', t.includes('editable_fields'), 'has getMissing:', t.includes('getMissing'), 'has legacy_ prefix:', (t.match(/legacy_/g) ?? []).length);
} else out('OLD missing', OLD);

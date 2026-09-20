// 取回 #820 地图正文并存成文件（带 `## Destination` 守卫）。改正文前先跑这一步。
// 跑法：node docs/skills/skill-memo-ilife/t820-fetch-map-body.mjs
import { execFileSync } from 'node:child_process';
import { writeFileSync } from 'node:fs';

const REPO = 'FeatherHunter/ilife';
const MAP = 820;
const OUT = '.scratch/memo-scene-map/map-820-body.md';

const body = execFileSync('gh', ['api', `repos/${REPO}/issues/${MAP}`, '--jq', '.body'], {
  encoding: 'utf8',
  maxBuffer: 32 * 1024 * 1024,
});

if (!/^## Destination$/m.test(body)) {
  console.error('守卫拦住：取回的正文里没有 `## Destination` 一节 —— 不落盘，先查为什么。');
  process.exit(1);
}
if (body.charCodeAt(0) === 0xfeff) {
  console.error('守卫拦住：取回的正文带 BOM。');
  process.exit(1);
}

writeFileSync(OUT, body, 'utf8');
const lf = body.split('\n').length - 1;
console.log('已落盘 ' + OUT + '：' + lf + ' LF；' + Buffer.byteLength(body) + ' 字节；含 Destination 一节');

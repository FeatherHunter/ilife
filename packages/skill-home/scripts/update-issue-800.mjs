#!/usr/bin/env node
// #800 · 一次性： issue 正文追进度（UTF-8 无 BOM，真换行，文件方式提交）。
import { readFileSync, writeFileSync } from 'node:fs';
const src = readFileSync('.scratch/issue-800-body.txt', 'utf16le');
const body = src.replace(/^\uFEFF/, '').replace(/\r\n/g, '\n').replace(/\n+$/, '') + '\n';
const progress = `
## 进度：90%

下一步（两件待确认，未确认不得 close）：①推位置／找位置单审退回待你重裁
（管位置 prompt 无推荐／查找语义，路由保持现状，测试 REJUDGE 锁定）；
②上述确认后由你点头再 close（95% 门）。

已交付（commit bfb10523 已推，d503a817 检查点代收在前）：
①8 能力目录＋20 键搬迁（键名与出参形状不变，21 键真链全绿）；
②REGISTRY 查表分派（cmd_read 888→211 行）；
③gen-cli 生成器＋三件派生件入仓＋根 gen/gen:check 接入（CI 真跑）；
④测试 glob 加宽（包内＋根 SUITE_GLOBS 子目录一行）；
⑤借出／借入／归还／催还 4 词登记；
⑥门禁：tsc／包 test 65 项／gen:check／居家 globs 112 项全绿，已推；
全量 pnpm test 崩溃（进程级 3221225786）＋备忘／作息／记账 6 处断言红，
居家零红，崩溃与红点在他席在途线上，非本票范围；
⑦页族两层解析＋125 行对照（缺一行即红）＋42 变体分层（进表 30／非路由 12，
yaml 标记＋audit 四向转绿）；20 条中 18 条确认，推／找 2 条退回（见上）；
3 条 (HTML) 保持路由待票 4 后复裁；
⑧机器门进包内 test（四分类＋三向对账＋对照＋回归＋附录 70/70 自匹配），
help 摘要锁已更新，负向变异证据见 structure-landing.md §6；
⑨SKILL.md「输出位置」节（链路逐字写清，速查表重注 125 行；
默认落盘实施随票 4，口径先行已注记）。
迁移对账：docs/skills/skill-home/structure-landing.md（含票 2 补丁流提案）。
`;
writeFileSync('.scratch/issue-800-body-new.md', body + progress, 'utf8');
console.log('written bytes=' + Buffer.byteLength(body + progress, 'utf8'));

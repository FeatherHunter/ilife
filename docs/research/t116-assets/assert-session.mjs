/**
 * #116 断言脚本：从 `opencode export` 导出的会话 JSON 里核对"严口径真调用"。
 *
 * 用法：node assert-session.mjs <session.json> [...]
 *
 * 断言（任一失败即 exit 1）：
 *   A1 会话里出现了 AI 自己发起的 `calorie-cmd-read` 调用（tool part 的 command 含该串；
 *      人在落点目录手敲命令不会进会话 JSON，故命中即 AI 发起）；
 *   A2 该调用拿到了 envelope（某 tool 输出含 `"skill":"calorie"` 且 `"exit":0`）；
 *   A3 会话里 AI 明确识别出了 skill-calorie（skill-load 工具或文本/输出含该串，
 *      证明 AI 读了 SKILL.md）；
 *   A4 envelope 含 `data.output` 且该 HTML 文件存在、非空、含页面标记（`ilife-page`），
 *      且 AI 把该路径回给了用户（末条 assistant 文本含 `.html` 路径）。
 * 报告（不影响退出码）：
 *   R0 skill-load（读 SKILL.md）是否出现；R1 CLI 调用清单；R2 会话模型/agent/版本。
 *
 * 数据标注：会话在仓外隔离目录跑，SKILLS_DB_PATH 指向隔离空库（见证据 .md），
 * 未触碰真库。A4 的文件存在性断言依赖隔离目录当时仍存在，证据 .md 登记了目录。
 */
import { readFileSync, existsSync, statSync } from 'node:fs';

const files = process.argv.slice(2);
if (files.length === 0) {
  console.error('用法：node assert-session.mjs <session.json> [...]');
  process.exit(2);
}

let failed = 0;
for (const file of files) {
  const j = JSON.parse(readFileSync(file, 'utf8'));
  const info = j.info ?? {};
  const msgs = j.messages ?? [];
  const parts = msgs.flatMap((m) => (m.parts ?? []).map((p) => ({ ...p, role: m.info?.role })));

  const tools = parts.filter((p) => p.type === 'tool');
  const texts = parts
    .filter((p) => typeof p.text === 'string')
    .map((p) => p.text)
    .join('\n');
  const assistantTexts = msgs
    .filter((m) => m.info?.role === 'assistant')
    .flatMap((m) => m.parts ?? [])
    .filter((p) => typeof p.text === 'string')
    .map((p) => p.text);

  const cmds = [];
  for (const t of tools) {
    const input = t.state?.input ?? {};
    const cmd = input.command ?? input.cmd ?? '';
    if (typeof cmd === 'string' && cmd.length > 0) cmds.push(cmd);
  }
  const outputText = tools
    .map((t) => (typeof t.state?.output === 'string' ? t.state.output : ''))
    .join('\n');

  const cliCalls = cmds.filter((c) => c.includes('calorie-cmd-read'));
  const envelopeHit =
    /"skill"\s*:\s*"calorie"/.test(outputText) && /"exit"\s*:\s*0/.test(outputText);
  const skillSeen =
    tools.some((t) => /[Ll]oaded skill:\s*skill-calorie/.test(String(t.state?.title ?? ''))) ||
    /skill-calorie/.test(texts) ||
    /skill-calorie/.test(outputText);

  // A4：data.output HTML 落盘 + 回给用户
  const outputPaths = [
    ...outputText.matchAll(/"output"\s*:\s*"([^"]+\.html)"/g),
  ].map((m) => m[1]);
  const uniqPaths = [...new Set(outputPaths)];
  const existing = uniqPaths.filter((p) => {
    try {
      return existsSync(p) && statSync(p).size > 0;
    } catch {
      return false;
    }
  });
  const withMarker = existing.filter((p) => {
    try {
      return readFileSync(p, 'utf8').includes('ilife-page');
    } catch {
      return false;
    }
  });
  const lastAssistant = assistantTexts.length > 0 ? assistantTexts[assistantTexts.length - 1] : '';
  const pathEchoed = withMarker.some((p) => {
    const base = p.split(/[/\\]/).pop();
    return lastAssistant.includes(p) || (base && lastAssistant.includes(base));
  });
  const a4 = withMarker.length > 0 && pathEchoed;

  const a1 = cliCalls.length > 0;
  const a2 = envelopeHit;
  const a3 = skillSeen;

  console.log('=== ' + file + ' ===');
  console.log('消息数 ' + msgs.length + ' · 工具调用 ' + tools.length + ' · CLI 命中 ' + cliCalls.length);
  console.log('[A1] AI 自己发起 calorie-cmd-read：' + (a1 ? 'PASS' : 'FAIL'));
  console.log('[A2] 拿到 envelope（skill:calorie + exit:0）：' + (a2 ? 'PASS' : 'FAIL'));
  console.log('[A3] 识别出 skill-calorie（读 SKILL.md）：' + (a3 ? 'PASS' : 'FAIL'));
  console.log(
    '[A4] data.output HTML 存在非空含标记且回给用户：' + (a4 ? 'PASS' : 'FAIL') +
      '（output 路径 ' + uniqPaths.length + ' 个/存在非空 ' + existing.length +
      ' 个/含标记 ' + withMarker.length + ' 个/末条回显 ' + (pathEchoed ? 'yes' : 'no') + '）',
  );
  console.log(
    '[R0] skill-load 工具：' +
      (tools.some((t) => /[Ll]oaded skill/.test(String(t.state?.title ?? ''))) ? 'yes' : 'no'),
  );
  if (cliCalls.length > 0) {
    console.log('[R1] CLI 调用清单：');
    for (const c of cliCalls.slice(0, 12)) console.log('  - ' + c.replace(/\s+/g, ' ').slice(0, 200));
    if (cliCalls.length > 12) console.log('  …（共 ' + cliCalls.length + ' 条）');
  }
  if (withMarker.length > 0) {
    console.log('[R1b] 交付 HTML：');
    for (const p of withMarker)
      console.log('  - ' + p + '（' + statSync(p).size + ' B）');
  }
  console.log(
    '[R2] 模型 ' + JSON.stringify(info.model ?? null) + ' · agent ' + (info.agent ?? '?') +
      ' · opencode ' + (info.version ?? '?') + ' · 会话 ' + (info.id ?? '?'),
  );
  if (!(a1 && a2 && a3 && a4)) failed++;
  console.log('');
}

console.log(failed === 0 ? 'ALL SESSIONS PASS' : failed + ' session(s) FAILED');
process.exit(failed === 0 ? 0 : 1);

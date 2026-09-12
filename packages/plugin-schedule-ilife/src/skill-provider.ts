/** dsh-schedule-ilife 打包技能提供方（#206 作息线，照 #150 记账／#218 大厨同形）。
 *
 * 形态对照 `dsh-skill-badge`（出处见 `docs/agents/dsh-client-contract.md` §12）：
 * cordis 侧 `inject` 加 `skills`（见 index.ts），本文件只提供 provider 对象，
 * 由 `apply` 经 `ctx.skills.registerProvider(() => provider)` 注册。
 *
 * 单份 SKILL.md 按包名解析（`createRequire.resolve('skill-schedule/package.json')`
 * 再拼 `SKILL.md`，**不复制**，避免双份腐化；不走 `exports` 子路径，免补 `./SKILL.md` 导出）；
 * `name` 用 `skill-schedule`（与 SKILL.md frontmatter 同值，描述取文件实测值，不在插件内硬编码第二份）；
 * `rank` 内联 600（宿主 `BUNDLED_SKILL_RANK` 同值，不从宿主 import，保持零依赖）；
 * `source` 为 `bundled`；`content` 取 frontmatter 后正文（filesystem `parseSkillFile` 同形）。
 *
 * 本文件只读消费技能包的 SKILL.md（文本），从不 import 任何技能实现。
 */
import { readFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';
import type { SkillCandidate, SkillDefinition, SkillProvider } from './dsh-ctx.js';
import { SKILL_PACKAGE } from './bridge.js';

/** 注册表内的提供方名（bundling 插件；candidate.provider 须与此一致，否则校验抛）。 */
export const PROVIDER_NAME = 'dsh-schedule-ilife' as const;

/** 技能名（与 `packages/skill-schedule/SKILL.md` frontmatter `name` 同值，由 test 逐字锁）。 */
export const SKILL_NAME = 'skill-schedule' as const;

/** 打包技能标准优先级（与宿主 `BUNDLED_SKILL_RANK` 同值，内联，零依赖）。 */
export const BUNDLED_SKILL_RANK = 600 as const;

export const SKILL_FILE = 'SKILL.md' as const;

/** 按包名定位技能包根目录（安装态 `node_modules/skill-schedule`，单仓 dev 态 workspace 链接）。 */
export function skillDir(): string {
  const pkgJson = createRequire(import.meta.url).resolve(SKILL_PACKAGE + '/package.json');
  return dirname(pkgJson);
}

interface ParsedSkill {
  readonly name: string;
  readonly description: string;
  readonly body: string;
}

/** 最小 frontmatter 解析（宿主零依赖，不引 yaml；缺头／缺字段返回 null，由调用方按缺席记）。
 *  name 正则放行连字符（`skill-schedule`）。 */
export function parseSkillText(text: string): ParsedSkill | null {
  const normalized = text.replace(/\r\n/g, '\n');
  if (!normalized.startsWith('---\n')) return null;
  const lines = normalized.split('\n');
  const end = lines.indexOf('---', 1);
  if (end < 2) return null;
  const data: Record<string, string> = {};
  for (const ln of lines.slice(1, end)) {
    const m = /^([A-Za-z0-9_-]+):\s*(.*)$/.exec(ln);
    if (!m) return null;
    let v = (m[2] ?? '').trim();
    if (v.length >= 2 && ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'")))) {
      v = v.slice(1, -1);
    }
    data[m[1] as string] = v;
  }
  const name = data['name'];
  const description = data['description'];
  if (!name || !description) return null;
  if (!/^[\p{L}0-9]+(?:-[\p{L}0-9]+)*$/u.test(name)) return null;
  return { name, description, body: lines.slice(end + 1).join('\n').trim() };
}

async function loadSkill(): Promise<{ readonly dir: string; readonly parsed: ParsedSkill } | null> {
  let dir: string;
  try {
    dir = skillDir();
  } catch {
    return null;
  }
  let raw: string;
  try {
    raw = await readFile(join(dir, SKILL_FILE), 'utf8');
  } catch {
    return null;
  }
  const parsed = parseSkillText(raw);
  if (!parsed) return null;
  return { dir, parsed };
}

async function listSkills(): Promise<readonly SkillCandidate[]> {
  const loaded = await loadSkill();
  if (!loaded) return [];
  return [
    {
      name: loaded.parsed.name,
      description: loaded.parsed.description,
      invocation: { modelInvocable: true, userInvocable: true },
      provider: PROVIDER_NAME,
      source: 'bundled',
      resourceBase: { kind: 'directory', path: loaded.dir },
      rank: BUNDLED_SKILL_RANK,
      locator: { path: join(loaded.dir, SKILL_FILE) },
    },
  ];
}

async function getSkill(candidate: SkillCandidate): Promise<SkillDefinition | undefined> {
  const loaded = await loadSkill();
  if (!loaded) return undefined;
  // 候选过期（注册后 SKILL.md 改名）按宿主契约失效，不抛。
  if (!candidate || candidate.name !== loaded.parsed.name) return undefined;
  return {
    name: loaded.parsed.name,
    description: loaded.parsed.description,
    invocation: { modelInvocable: true, userInvocable: true },
    provider: PROVIDER_NAME,
    source: 'bundled',
    resourceBase: { kind: 'directory', path: loaded.dir },
    content: loaded.parsed.body,
  };
}

/** badge 同形 provider（`list` 给摘要，`get` 给全文；`get` 只认名，忽略 locator 外的候选字段）。 */
export const provider: SkillProvider = {
  name: PROVIDER_NAME,
  list: () => listSkills(),
  get: (candidate) => getSkill(candidate),
};

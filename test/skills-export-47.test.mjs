/** #47 公共安装器兼容（卡路里单线样板）：skills-cli 发现层断言，不动布局只增量。
 * skills-cli 从 git 仓库发现 skill 的规则（skills@1.5.24 实测）：扫描子目录找 SKILL.md
 * （跳过 node_modules/.git/dist/build），要求文件头 YAML frontmatter 含字符串 name + description，
 * 缺任一即整包跳过（No valid skills）。本测试钉死卡路里导出头，回退即红。
 * 范围诚实注记（双审终审 must）：本测试仅静态断言 SKILL.md 导出头
 * （frontmatter/HELP 标记块/运行时小节字符串），不覆盖 skills-cli 真跑
 * （add -l/add/list --json）、agent 落点目录、HELP→cmd_read→envelope→HTML
 * 端到端；真跑证据见 docs/public-installer-47.md「验证证据」手工实测，
 * 端到端 artifact 缺失是已知缺口，不在本测试冒充覆盖。
 * 样板复制到其余 5 包时，把 PKGS 扩展为 6 包清单即可（见 #47 通后再复制）。
 * 运行：node --test test/skills-export-47.test.mjs（零构建依赖）。
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
// #47 样板期只收敛卡路里一条线；复制到其余 5 包时扩展此清单。
const PKGS = ['skill-calorie'];

// 最小 frontmatter 解析（无依赖）：文件须以 --- 开头，第二个 --- 前为 key: value 行。
function parseFrontmatter(text) {
  const lines = text.replace(/\r\n/g, '\n').split('\n');
  assert.equal(lines[0], '---', 'SKILL.md 首行须为 ---');
  const end = lines.indexOf('---', 1);
  assert.ok(end > 1, 'frontmatter 须有结束 ---');
  const data = {};
  for (const ln of lines.slice(1, end)) {
    const m = /^([A-Za-z0-9_-]+):\s*(.*)$/.exec(ln);
    assert.ok(m, 'frontmatter 行须为 key: value：' + ln);
    let v = m[2].trim();
    if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) v = v.slice(1, -1);
    data[m[1]] = v;
  }
  return { data, rest: lines.slice(end + 1).join('\n') };
}

describe('#47 skills-cli 导出头（卡路里样板）', () => {
  for (const pkg of PKGS) {
    it(pkg + '：frontmatter name/description 合法', () => {
      const text = readFileSync(join(ROOT, 'packages', pkg, 'SKILL.md'), 'utf8');
      const { data, rest } = parseFrontmatter(text);
      assert.equal(typeof data.name, 'string');
      assert.equal(data.name, pkg, 'name 须等于目录名（装完 agent 目录名即此）');
      assert.match(data.name, /^[a-z0-9-]+$/, 'name 须小写连字符（Agent Skills 规范）');
      assert.ok(data.description && data.description.length > 0, 'description 非空');
      assert.ok(rest.includes('#'), 'frontmatter 之后正文仍在');
      assert.ok(rest.includes('<!-- HELP-AUTO-START -->') && rest.includes('<!-- HELP-AUTO-END -->'), 'HELP 标记块仍在');
    });
    it(pkg + '：公共安装器运行时小节存在', () => {
      const text = readFileSync(join(ROOT, 'packages', pkg, 'SKILL.md'), 'utf8');
      assert.ok(text.includes('## 公共安装器运行时'), '须含运行时小节（dist 不进 git，运行时走 npm）');
      // 版本钉死 @0.2.0 为硬编码（已随 #123 发版窗口同步）
      // （SKILL.md/docs/测试三处联动，登记见 docs/public-installer-47.md「版本钉死登记」）。
      assert.ok(text.includes('@0.2.0'), '须钉死 npm 运行时版本（已随 0.2.0 同步）');
    });
  }
  it('样板清单当前恰为 1 包（复制期扩展即改此断言）', () => {
    assert.deepEqual(PKGS, ['skill-calorie']);
  });
});

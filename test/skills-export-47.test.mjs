/** #47 公共安装器兼容（卡路里单线样板）：skills-cli 发现层断言，不动布局只增量。
 * skills-cli 从 git 仓库发现 skill 的规则（skills@1.5.24 实测）：扫描子目录找 SKILL.md
 * （跳过 node_modules/.git/dist/build），要求文件头 YAML frontmatter 含字符串 name + description，
 * 缺任一即整包跳过（No valid skills）。本测试钉死卡路里导出头，回退即红。
 * 范围诚实注记（双审终审 must）：本测试仅静态断言 SKILL.md 导出头
 * （frontmatter/HELP 标记块/唯一出口口径块），不覆盖 skills-cli 真跑
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
// #192 起 skill-home 入列（第二包）；bill／chef／memo-ilife／schedule 四包仍待复制。
const PKGS = ['skill-calorie', 'skill-home'];

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

describe('#47 skills-cli 导出头（卡路里样板 + 居家第二包）', () => {
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
    it(pkg + '：唯一出口口径块在（#742 起由 tooling/skill-call-form.mjs 生成，勿手改）', () => {
      const text = readFileSync(join(ROOT, 'packages', pkg, 'SKILL.md'), 'utf8');
      const start = text.indexOf('<!-- CALL-FORM-START -->');
      const end = text.indexOf('<!-- CALL-FORM-END -->');
      assert.ok(start >= 0 && end > start, '须含 CALL-FORM 标记块（口径正文由 tooling/skill-call-form.mjs 渲染）');
      const block = text.slice(start, end);
      const cmd = pkg.replace(/^skill-/, '') + '-cmd-read';
      assert.ok(block.includes(cmd), '块里须写出本包的唯一出口命令名 ' + cmd);
      assert.ok(block.includes('Base directory for this skill'), '块里须写明「技能基目录」＝宿主给的那一行');
      assert.ok(block.includes('dist/cli/cmd_read.js'), '块里须给出本包 bin 声明的入口（按声明渲染）');
      // #742：钉死版号的 npm 写法（旧口径）不许回潮；口径里也不许出现版本号。
      assert.ok(!text.includes('npm install -g'), '不许再出现推 npm 全局安装的写法（会装出第二份同名副本）');
      assert.ok(!/CALL-FORM[\s\S]*?@\d+\.\d+\.\d+[\s\S]*?CALL-FORM-END/.test(text), '口径里不许钉版本号');
    });
  }
  it('样板清单当前恰为 2 包（复制期扩展即改此断言）', () => {
    assert.deepEqual(PKGS, ['skill-calorie', 'skill-home']);
  });
});

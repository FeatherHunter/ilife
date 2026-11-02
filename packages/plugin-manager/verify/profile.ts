/**
 * 真机验证声明（票 14「其余四仓接入」）。
 * 自检入口：npm run verify:self-check（dsh-verify 由已有 devDependency 提供，零新增安装）。
 * 接入点说明：ilife 是 pnpm monorepo，web profile 里安装的插件包是 packages/plugin-manager
 *（name=dsh-life-pack），package-installed 检查用 cwd/package.json 的 name/version，
 * 因此声明与 scripts 放在该包目录，自检也从这里跑。
 */
import { defineVerificationProfile } from "dsh-featherhunter-plugin-base/real-machine-verification";

export default defineVerificationProfile({
  id: "life-pack",
  packageName: "dsh-life-pack",
  defaultProfile: "web",
  clientEntry: "dist/client.js",
  bundledSkills: false,
  model: false,
});

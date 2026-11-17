/**
 * deploy.cjs — هم‌گام‌سازی فایل‌های سایت با برنچ gh-pages و push.
 * سایت کاملاً استاتیک است؛ gh-pages دقیقاً همان فایل‌های ریشهٔ main است.
 *
 * استفاده:  npm run deploy
 */
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const FILES = ['index.html', 'css', 'js', 'fonts', 'README.md'];

function sh(cmd, opts = {}) {
  execSync(cmd, { stdio: 'inherit', cwd: ROOT, ...opts });
}

const status = execSync('git status --porcelain', { cwd: ROOT }).toString().trim();
if (status) {
  console.error('✗ ابتدا تغییرات را روی main کامیت کنید؛ gh-pages از کامیت‌های تمیز ساخته می‌شود.');
  process.exit(1);
}

// worktree برای gh-pages
try {
  sh('git fetch origin gh-pages');
  try {
    sh('git worktree add gh-pages-wt origin/gh-pages');
  } catch {
    // worktree از قبل وجود دارد
  }
} catch {
  console.error('✗ برنچ gh-pages در origin پیدا نشد.');
  process.exit(1);
}

const WT = path.join(ROOT, 'gh-pages-wt');
// پاک‌سازی و کپی
for (const f of fs.readdirSync(WT)) {
  if (f === '.git') continue;
  fs.rmSync(path.join(WT, f), { recursive: true, force: true });
}
for (const f of FILES) {
  fs.cpSync(path.join(ROOT, f), path.join(WT, f), { recursive: true });
}

sh('git -C gh-pages-wt add -A');
const dirty = execSync('git -C gh-pages-wt status --porcelain', { cwd: ROOT }).toString().trim();
if (!dirty) {
  console.log('✓ gh-pages از قبل به‌روز است.');
} else {
  sh('git -C gh-pages-wt commit -m "Deploy v4: full rebuild — clean canvas engine, collision & dialogue rework"');
  sh('git -C gh-pages-wt push origin HEAD:gh-pages');
  console.log('✓ push شد؛ چند دقیقه صبر کنید تا Pages بازسازی کند.');
}

import fs from 'node:fs';
import path from 'node:path';

interface Violation {
  path: string;
  lines: number;
}

const MAX_LINES = 200;
const EXCLUDE_DIRS = new Set(['node_modules', 'dist', 'build', '.git']);
const TARGET_EXTENSIONS = ['.ts', '.tsx'];

const violations: Violation[] = [];

/**
 * Рекурсивно обходит директории
 */
function walk(dir: string): void {
  const files = fs.readdirSync(dir);

  for (const file of files) {
    const fullPath = path.join(dir, file);
    const stat = fs.statSync(fullPath);

    if (stat.isDirectory()) {
      if (!EXCLUDE_DIRS.has(file)) {
        walk(fullPath);
      }
    } else {
      if (TARGET_EXTENSIONS.includes(path.extname(file))) {
        const content = fs.readFileSync(fullPath, 'utf8');
        const parts = content.split(/\r?\n/);
        if (parts.length && parts[parts.length - 1] === '') parts.pop();
        const lines = parts.length;

        if (lines > MAX_LINES) {
          violations.push({ path: fullPath, lines });
        }
      }
    }
  }
}

console.log(`🔍 Проверка файлов (лимит: ${MAX_LINES} строк)...`);

try {
  walk('.');

  if (violations.length > 0) {
    console.log('\n❌ Найдены нарушения:');
    violations.forEach(v => {
      console.log(`  [${v.lines} строк] ${v.path}`);
    });
    console.log(`\nИтого: ${violations.length} нарушений.`);
    process.exit(1);
  } else {
    console.log('\n✅ Все файлы в норме.');
    process.exit(0);
  }
} catch (err) {
  const error = err as Error;
  console.error('Ошибка при выполнении проверки:', error.message);
  process.exit(1);
}

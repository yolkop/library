/**
 * This file is licensed under the MPL 2.0 license.
 * For more information, see https://mozilla.org/MPL/2.0/.
 *
 * This file is part of the yolkbot library,
 * originally created by hijinks & 1ust.
 */

import fs from 'node:fs';
import path from 'node:path';

import { BANNER, COMPILE_DATE, VERSION } from './util/banner.js';

const rootDir = path.join(import.meta.dirname, '..');
const docDir = path.join(rootDir, 'docs');

if (fs.existsSync(docDir)) fs.rmSync(path.join(docDir), { recursive: true });

const rootPath = path.join(import.meta.dirname, '..');
const tsconfigPath = path.join(rootPath, 'tsconfig.json');
const tsconfig = JSON.parse(fs.readFileSync(tsconfigPath, 'utf-8'));
const newTsconfigPath = path.join(rootDir, 'tmp-bundleconfig.json');

tsconfig.compilerOptions.removeComments = false;
tsconfig.compilerOptions.skipLibCheck = false;
fs.writeFileSync(newTsconfigPath, JSON.stringify(tsconfig, null, 4));

await Promise.all([
    Bun.$`bunx --bun typedoc`.cwd(rootDir),
    Bun.$`bunx --bun typedoc --plugin typedoc-plugin-markdown --out tmp-docs-markdown --indexFormat table --hidePageHeader true --modulesFileName index.md --readme README.md`.cwd(rootDir),
    Bun.$`bunx --bun dts-bundle-generator --export-referenced-types=false --no-banner --project ${newTsconfigPath} -o ${rootPath}/docs/yolkbot.d.ts ${rootPath}/src/index.ts`
]);

fs.rmSync(newTsconfigPath);

fs.rmSync(path.join(rootDir, 'tmp-docs-markdown', 'assets'), { recursive: true });
fs.rmSync(path.join(rootDir, 'tmp-docs-markdown', 'README.md'));

fs.cpSync(path.join(rootDir, 'tmp-docs-markdown'), path.join(docDir), { recursive: true });
fs.rmSync(path.join(rootDir, 'tmp-docs-markdown'), { recursive: true });

fs.cpSync(path.join(docDir, 'enumerations'), path.join(docDir, 'enums'), { recursive: true });
fs.rmSync(path.join(docDir, 'enumerations'), { recursive: true });

fs.cpSync(path.join(docDir, 'type-aliases'), path.join(docDir, 'types'), { recursive: true });
fs.rmSync(path.join(docDir, 'type-aliases'), { recursive: true });

fs.cpSync(path.join(rootDir, 'LICENSE.md'), path.join(docDir, 'LICENSE.md'));

const glob = new Bun.Glob('**/*.{html,xml}');

for await (const file of glob.scan(docDir)) {
    const filePath = path.join(docDir, file);
    const content = fs.readFileSync(filePath, 'utf8');
    const modifiedContent = content.replaceAll('.html"', '"').replaceAll('.html#', '#').replaceAll('.html<', '<');
    await new Promise(r => fs.writeFile(filePath, modifiedContent, 'utf8', r));
}

const outputPath = path.join(rootPath, 'docs', 'yolkbot.d.ts');
const output = fs.readFileSync(outputPath, 'utf-8');

const formattedOutput = `${BANNER}\n\n// yolkbot ${VERSION}, compiled ${COMPILE_DATE}\n\n${output.replaceAll('	', '    ')}`;

const lines = formattedOutput.split('\n');
const result: string[] = [];
let ignoring = false;

for (const line of lines) {
    const trimmed = line.trim();

    if (trimmed === '/** @ignore */' || trimmed === '/** @hidden */') {
        ignoring = true;
        continue;
    }

    if (ignoring && (trimmed.startsWith('/**') || trimmed.startsWith('}'))) ignoring = false;
    if (!ignoring) result.push(line);
}

const finalOutput = result.join('\n').replaceAll('    #private;\n', '');

fs.writeFileSync(outputPath, finalOutput);

fs.cpSync(path.join(import.meta.dirname, 'typedoc', '404.html'), path.join(docDir, '404.html'));
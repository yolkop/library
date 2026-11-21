/**
 * This file is licensed under the MPL 2.0 license.
 * For more information, see https://mozilla.org/MPL/2.0/.
 *
 * This file is part of the yolkbot library,
 * originally created by hijinks & 1ust.
 */

import fs from 'node:fs';
import path from 'node:path';

import { minify } from 'terser';

import { BANNER, COMPILE_DATE, VERSION } from './util/banner.js';

const distDir = path.join(import.meta.dirname, '..', 'dist');
if (fs.existsSync(distDir)) fs.rmSync(distDir, { recursive: true });

const tscResult = await Bun.$`bunx --bun tsc -P ${path.join(import.meta.dirname, '..', 'tsconfig.build.json')}`;
if (tscResult.exitCode !== 0) process.exit(tscResult.exitCode);
else console.log('\x1b[32m✓ built node source\x1b[0m');

const globPattern = new Bun.Glob('**/*.js');
const filePaths = await Array.fromAsync(globPattern.scan({ cwd: distDir }));
const absolutePaths = filePaths.map(filePath => path.join(distDir, filePath));

if (process.argv[2] !== '--no-min') {
    await Promise.all(absolutePaths.map(async (filePath) => {
        const code = fs.readFileSync(filePath, 'utf8').replaceAll('{COMPTIME}', COMPILE_DATE).replaceAll('{VERSION}', VERSION);

        const minified = await minify(code, {
            module: true,
            compress: {
                passes: 3,
                unsafe: true,
                keep_fargs: false,
                reduce_vars: true,
                collapse_vars: true,
                inline: 3
            },
            mangle: {
                toplevel: true,
                properties: {
                    regex: /^_/
                }
            },
            format: {
                comments: false
            }
        });

        fs.writeFileSync(filePath, minified.code!);
    }));

    console.log('\x1b[32m✓ minified node files\x1b[0m');
} else absolutePaths.forEach(filePath => {
    const code = fs.readFileSync(filePath, 'utf8').replaceAll('{COMPTIME}', COMPILE_DATE).replaceAll('{VERSION}', VERSION);
    fs.writeFileSync(filePath, code);
});

const allDistFiles = await Array.fromAsync(new Bun.Glob('**/*').scan({ cwd: distDir }));
await Promise.all(allDistFiles.map(async (file) => {
    const filePath = path.join(distDir, file);
    if (fs.lstatSync(filePath).isDirectory()) return;

    const content = fs.readFileSync(filePath, 'utf8');
    fs.writeFileSync(filePath, `${BANNER}\n${content.replaceAll('    #private;\n', '')}`);
}));
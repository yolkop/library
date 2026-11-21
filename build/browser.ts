/**
 * This file is licensed under the MPL 2.0 license.
 * For more information, see https://mozilla.org/MPL/2.0/.
 *
 * This file is part of the yolkbot library,
 * originally created by hijinks & 1ust.
 */

import fs from 'node:fs';
import path from 'node:path';

import { minify as terser } from 'terser';

import { BANNER, COMPILE_DATE, VERSION } from './util/banner.js';

const buildDir = path.join(import.meta.dirname, 'out');

if (fs.existsSync(buildDir)) fs.rmSync(buildDir, { recursive: true });
fs.mkdirSync(buildDir);

const nodeShimPath = path.join(import.meta.dirname, '..', 'src', 'env', 'node');
const nodeShims = fs.readdirSync(nodeShimPath).filter(f => f.endsWith('.shim.ts'));
const replacables = nodeShims.map(f => path.join(nodeShimPath, f));

const rootDir = path.join(import.meta.dirname, '..');

const build = async (name: string, entry: string, minify: boolean) => {
    const results = await Bun.build({
        entrypoints: [entry],

        minify: minify ? {
            identifiers: true,
            syntax: true,
            whitespace: true
        } : {
            identifiers: false,
            syntax: true,
            whitespace: false
        },
        banner: BANNER,
        target: 'browser',
        format: 'esm',
        files: replacables.reduce((acc, file) => {
            acc[file] = fs.readFileSync(file.replace('/env/node/', '/env/browser/'), 'utf8');
            return acc;
        }, {} as Record<string, string>)
    });

    if (results.success) {
        const file = await results.outputs[0].text();
        let content = file.replaceAll('{COMPTIME}', COMPILE_DATE).replaceAll('{VERSION}', VERSION);

        if (minify) {
            const result = await terser(content, {
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

            content = `${BANNER}\n${result.code!}`;
        }

        fs.writeFileSync(path.join(buildDir, `${name}.js`), content);

        console.log(`\x1b[32m✓ built browser/${name}\x1b[0m`);
    } else console.error(results.logs.join('\n'));
}

const buildAll = async (name: string, entry: string) => Promise.all([
    build(name + '.max', entry, false),
    build(name + '.min', entry, true)
])

await Promise.all([
    buildAll('global', path.join(import.meta.dirname, 'util', 'globalEntry.ts')),
    buildAll('module', path.join(rootDir, 'src', 'index.ts'))
]);
/**
 * This file is licensed under the MPL 2.0 license.
 * For more information, see https://mozilla.org/MPL/2.0/.
 *
 * This file is part of the yolkbot library,
 * originally created by hijinks & 1ust.
 */

import * as yolkbot from '../../src/index.js';

if (typeof globalThis !== 'undefined') (globalThis as any).yolkbot = yolkbot;
if (typeof self !== 'undefined') (self as any).yolkbot = yolkbot;
if (typeof window !== 'undefined') (window as any).yolkbot = yolkbot;
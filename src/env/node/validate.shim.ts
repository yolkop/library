/**
 * This file is licensed under the MPL 2.0 license.
 * For more information, see https://mozilla.org/MPL/2.0/.
 *
 * This file is part of the yolkbot library,
 * originally created by hijinks & 1ust.
 */

import crypto from 'node:crypto';

import { wasmMagicString } from '../../util.js';

/**
 * Hashes a value for the matchmaker when joining a game
 * @param hash The value to hash as provided by the game
 * @returns The sha256-hashed value to send back
 */
export const validate = (hash: string): string => {
    const salt = Buffer.from(wasmMagicString, 'hex');
    return crypto.createHmac('sha256', salt).update(hash).digest('hex');
}
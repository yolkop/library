/**
 * This file is licensed under the MPL 2.0 license.
 * For more information, see https://mozilla.org/MPL/2.0/.
 *
 * This file is part of the yolkbot library,
 * originally created by hijinks & 1ust.
 */

import { WWWebSocket } from 'wwws';

import { UserAgent } from '#env/DataLoader';
import { getEnvVar } from '#env/env';

import type { WSSocket, WSOptions } from '../createWebSocket.js';

export const createWebSocket = (url: string, options: WSOptions): WSSocket => new WWWebSocket(url, {
    proxy: options.proxy ?? undefined,
    headers: {
        ...options.headers,
        'authorization': getEnvVar('SOCKET_AUTHORIZATION') ?? undefined,
        'accept-language': 'en-US,en;q=0.9',
        'cache-control': 'no-cache',
        'origin': 'https://shellshock.io',
        'pragma': 'no-cache',
        'user-agent': UserAgent
    },
    rejectUnauthorized: false
});
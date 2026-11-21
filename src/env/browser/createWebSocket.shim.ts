/**
 * This file is licensed under the MPL 2.0 license.
 * For more information, see https://mozilla.org/MPL/2.0/.
 *
 * This file is part of the yolkbot library,
 * originally created by hijinks & 1ust.
 */

import type { WSSocket, WSOptions } from '../createWebSocket.js';

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export const createWebSocket = (url: string, options: WSOptions): WSSocket => new WebSocket(url);
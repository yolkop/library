/**
 * This file is licensed under the MPL 2.0 license.
 * For more information, see https://mozilla.org/MPL/2.0/.
 *
 * This file is part of the yolkbot library,
 * originally created by hijinks & 1ust.
 */

import { PacketOut } from '../PacketOut.js';

import { CommCode } from '#env/DataLoader';

import type { Game } from '../../Game.js';

export const processPingPacket = (game: Game): void => {
    if (game.pingTimeoutId) clearTimeout(game.pingTimeoutId);

    const oldPing = game.ping ?? 0;

    game.ping = game.lastPingTime ? Date.now() - game.lastPingTime : 0;

    game.$emit('pingUpdate', oldPing, game.ping);

    game.pingTimeoutId = setTimeout(() => {
        if (game.socket.readyState !== 1) return;

        const out = new PacketOut();
        out.packInt8(CommCode.ping);
        out.send(game.socket);
        game.lastPingTime = Date.now();
    }, 1000);
}
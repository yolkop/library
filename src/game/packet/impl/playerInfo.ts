/**
 * This file is licensed under the MPL 2.0 license.
 * For more information, see https://mozilla.org/MPL/2.0/.
 *
 * This file is part of the yolkbot library,
 * originally created by hijinks & 1ust.
 */

import type { Game } from '../../Game.js';
import type { PacketIn } from '../PacketIn.js';

export const processPlayerInfoPacket = (game: Game, packet: PacketIn): void => {
    const playerId = packet.unpackInt8U();
    const playerDBId = packet.unpackString(128);
    const playerIp = packet.unpackString(32);

    const player = game.players[playerId];
    if (player) {
        player.admin = {
            ip: playerIp,
            dbId: playerDBId
        };

        game.$emit('playerInfo', player, playerIp, playerDBId);
    }
}
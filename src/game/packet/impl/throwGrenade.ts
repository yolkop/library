/**
 * This file is licensed under the MPL 2.0 license.
 * For more information, see https://mozilla.org/MPL/2.0/.
 *
 * This file is part of the yolkbot library,
 * originally created by hijinks & 1ust.
 */

import type { Game } from '../../Game.js';
import type { PacketIn } from '../PacketIn.js';

export const processThrowGrenadePacket = (game: Game, packet: PacketIn): void => {
    const id = packet.unpackInt8U();
    const x = packet.unpackFloat();
    const y = packet.unpackFloat();
    const z = packet.unpackFloat();
    const dx = packet.unpackFloat();
    const dy = packet.unpackFloat();
    const dz = packet.unpackFloat();

    const player = game.players[id];

    if (player) {
        if (player.grenades > 0) player.grenades--;
        game.$emit('playerThrowGrenade', player, { x, y, z }, { x: dx, y: dy, z: dz });
    }
}
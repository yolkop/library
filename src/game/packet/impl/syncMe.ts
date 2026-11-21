/**
 * This file is licensed under the MPL 2.0 license.
 * For more information, see https://mozilla.org/MPL/2.0/.
 *
 * This file is part of the yolkbot library,
 * originally created by hijinks & 1ust.
 */

import type { Game } from '../../Game.js';
import type { PacketIn } from '../PacketIn.js';

export const processSyncMePacket = (game: Game, packet: PacketIn): void => {
    const id = packet.unpackInt8U();
    const player = game.players[id];

    packet.unpackInt8U(); // stateIdx

    const serverStateIdx = packet.unpackInt8U();

    const newX = packet.unpackFloat();
    const newY = packet.unpackFloat();
    const newZ = packet.unpackFloat();

    game.me.climbing = !!packet.unpackInt8U();

    packet.unpackInt8U(); // rounds
    packet.unpackInt8U(); // store

    if (player) {
        game.state.serverStateIdx = serverStateIdx;

        const oldX = player.position.x;
        const oldY = player.position.y;
        const oldZ = player.position.z;

        player.position.x = newX;
        player.position.y = newY;
        player.position.z = newZ;

        if (oldX !== newX || oldY !== newY || oldZ !== newZ)
            game.$emit('playerMove', player, { x: oldX, y: oldY, z: oldZ }, { x: newX, y: newY, z: newZ });
    }
}
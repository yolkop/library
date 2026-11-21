/**
 * This file is licensed under the MPL 2.0 license.
 * For more information, see https://mozilla.org/MPL/2.0/.
 *
 * This file is part of the yolkbot library,
 * originally created by hijinks & 1ust.
 */

import type { Game } from '../../Game.js';
import type { PacketIn } from '../PacketIn.js';

export const processRemovePlayerPacket = (game: Game, packet: PacketIn): void => {
    const id = packet.unpackInt8U();
    if (!game.players[id]) return;

    const removedPlayer = game.players[id];
    game.players[id] = undefined;
    game.$emit('playerLeave', removedPlayer);
}
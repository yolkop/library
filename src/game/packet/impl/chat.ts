/**
 * This file is licensed under the MPL 2.0 license.
 * For more information, see https://mozilla.org/MPL/2.0/.
 *
 * This file is part of the yolkbot library,
 * originally created by hijinks & 1ust.
 */

import type { Game } from '../../Game.js';
import type { PacketIn } from '../PacketIn.js';

export const processChatPacket = (game: Game, packet: PacketIn): void => {
    const id = packet.unpackInt8U();
    const msgFlags = packet.unpackInt8U();
    const text = packet.unpackString();

    const player = game.players[id];
    if (player) game.$emit('chat', player, text, msgFlags);
    else game.$emit('chat', undefined, text, msgFlags);
}
/**
 * This file is licensed under the MPL 2.0 license.
 * For more information, see https://mozilla.org/MPL/2.0/.
 *
 * This file is part of the yolkbot library,
 * originally created by hijinks & 1ust.
 */

import type { Game } from '../../Game.js';
import type { PacketIn } from '../PacketIn.js';

export const processHitMePacket = (game: Game, packet: PacketIn): void => {
    const hp = packet.unpackInt8U();

    packet.unpackFloat();
    packet.unpackFloat();

    if (game.me) {
        const oldHealth = game.me.hp;
        game.me.hp = hp;
        game.$emit('playerDamage', game.me, oldHealth, game.me.hp);
    }
}
/**
 * This file is licensed under the MPL 2.0 license.
 * For more information, see https://mozilla.org/MPL/2.0/.
 *
 * This file is part of the yolkbot library,
 * originally created by hijinks & 1ust.
 */

import type { Game } from '../../Game.js';
import type { PacketIn } from '../PacketIn.js';

export const processPlayerRewardsPacket = (game: Game, packet: PacketIn): void => {
    const playerId = packet.unpackInt8U();
    packet.unpackInt16U();
    const balanceAdd = packet.unpackInt24U();

    if (playerId === game.me.id) {
        const oldBalance = game.account.eggBalance;

        game.account.eggBalance = oldBalance + balanceAdd;
        game.$emit('balanceUpdate', oldBalance, game.account.eggBalance);
    }
}
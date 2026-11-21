/**
 * This file is licensed under the MPL 2.0 license.
 * For more information, see https://mozilla.org/MPL/2.0/.
 *
 * This file is part of the yolkbot library,
 * originally created by hijinks & 1ust.
 */

import type { Game } from '../../Game.js';
import type { PacketIn } from '../PacketIn.js';

export const processUpdateBalancePacket = (game: Game, packet: PacketIn): void => {
    const newBalance = packet.unpackInt32U();
    const oldBalance = game.account.eggBalance;

    game.account.eggBalance = newBalance;
    game.$emit('balanceUpdate', oldBalance, newBalance);
}
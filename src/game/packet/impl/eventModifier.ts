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

export const processEventModifierPacket = (game: Game): void => {
    if (game.socket.readyState !== 1) return;

    const out = new PacketOut();
    out.packInt8(CommCode.eventModifier);
    out.send(game.socket);
}
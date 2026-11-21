/**
 * This file is licensed under the MPL 2.0 license.
 * For more information, see https://mozilla.org/MPL/2.0/.
 *
 * This file is part of the yolkbot library,
 * originally created by hijinks & 1ust.
 */

import { ZoneLeaveReason } from '../../Hooks.js';

import type { Game } from '../../Game.js';
import type { PacketIn } from '../PacketIn.js';

export const processPausePacket = (game: Game, packet: PacketIn): void => {
    const id = packet.unpackInt8U();
    const player = game.players[id];

    if (player) {
        player.playing = false;
        if (player.shellStreaks) player.shellStreaks = [];

        game.$emit('playerPause', player);

        if (player.inKotcZone) {
            player.inKotcZone = false;
            game.$emit('playerZoneLeave', player, ZoneLeaveReason.Despawned);
        }
    }
}
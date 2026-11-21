/**
 * This file is licensed under the MPL 2.0 license.
 * For more information, see https://mozilla.org/MPL/2.0/.
 *
 * This file is part of the yolkbot library,
 * originally created by hijinks & 1ust.
 */

import type { Game } from '../../Game.js';
import type { PacketIn } from '../PacketIn.js';

export const processSwitchTeamPacket = (game: Game, packet: PacketIn): void => {
    const id = packet.unpackInt8U();
    const toTeam = packet.unpackInt8U();

    const player = game.players[id];
    if (player) {
        const oldTeam = player.team;

        player.team = toTeam;
        player.streak = 0;

        game.$emit('playerSwitchTeam', player, oldTeam, toTeam);
    }
}
/**
 * This file is licensed under the MPL 2.0 license.
 * For more information, see https://mozilla.org/MPL/2.0/.
 *
 * This file is part of the yolkbot library,
 * originally created by hijinks & 1ust.
 */

import { ShellStreak } from '../../Player.js';

import type { Game } from '../../Game.js';
import type { PacketIn } from '../PacketIn.js';

const timedStreaks = [
    ShellStreak.EggBreaker,
    ShellStreak.OverHeal,
    ShellStreak.DoubleEggs,
    ShellStreak.MiniEgg
];

export const processEndShellStreakPacket = (game: Game, packet: PacketIn): void => {
    const id = packet.unpackInt8U();
    const ksType = packet.unpackInt8U();

    const player = game.players[id];
    if (player) {
        if (timedStreaks.includes(ksType) && player.shellStreaks.includes(ksType))
            player.shellStreaks = player.shellStreaks.filter((r) => r !== ksType);

        if (ksType === ShellStreak.MiniEgg) player.scale = 1;

        game.$emit('playerStreakEnd', player, ksType);
    }
}
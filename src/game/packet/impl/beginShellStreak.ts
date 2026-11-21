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

export const processBeginShellStreakPacket = (game: Game, packet: PacketIn): void => {
    const id = packet.unpackInt8U();
    const ksType = packet.unpackInt8U();

    const player = game.players[id];
    if (player) {
        switch (ksType) {
            case ShellStreak.HardBoiled:
                if (id === game.me.id) game.me.hpShield = 100;
                player.shellStreaks.push(ShellStreak.HardBoiled);
                break;

            case ShellStreak.EggBreaker:
                player.shellStreaks.push(ShellStreak.EggBreaker);
                break;

            case ShellStreak.Restock: {
                player.grenades = 3;

                if (player.weapons[0]) {
                    player.weapons[0].ammo.rounds = player.weapons[0].ammo.capacity;
                    player.weapons[0].ammo.store = player.weapons[0].ammo.storeMax;
                }

                if (player.weapons[1]) {
                    player.weapons[1].ammo.rounds = player.weapons[1].ammo.capacity;
                    player.weapons[1].ammo.store = player.weapons[1].ammo.storeMax;
                }
                break;
            }

            case ShellStreak.OverHeal:
                player.hp = Math.min(200, player.hp + 100);
                player.shellStreaks.push(ShellStreak.OverHeal);
                break;

            case ShellStreak.DoubleEggs:
                player.shellStreaks.push(ShellStreak.DoubleEggs);
                break;

            case ShellStreak.MiniEgg:
                player.scale = 0.5;
                player.shellStreaks.push(ShellStreak.MiniEgg);
                break;
        }

        game.$emit('playerStreakStart', player, ksType);
    }
}
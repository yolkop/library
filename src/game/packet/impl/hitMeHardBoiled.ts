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

export const processHitMeHardBoiledPacket = (game: Game, packet: PacketIn): void => {
    const shieldHealth = packet.unpackInt8U();
    const playerHealth = packet.unpackInt8U();
    const dx = packet.unpackFloat();
    const dz = packet.unpackFloat();

    if (!game.me) return;

    game.me.hpShield = shieldHealth;
    game.me.hp = playerHealth;

    if (game.me.hpShield <= 0) {
        game.me.shellStreaks = game.me.shellStreaks.filter((r) => r !== ShellStreak.HardBoiled);
        game.$emit('selfShieldLost', game.me.hp, { dx, dz });
    } else game.$emit('selfShieldHit', game.me.hpShield, game.me.hp, { dx, dz });
}
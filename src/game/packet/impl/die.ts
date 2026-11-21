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

/** The different ways an egg can die, emitted by the playerDeath hook */
export enum DeathCause {
    /** The egg was killed by someone with an EggK */
    EggK = 0,
    /** The egg was killed by someone with a Scrambler */
    Scrambler = 1,
    /** The egg was killed by someone with a Free Ranger */
    FreeRanger = 2,
    /** The egg was killed by someone with a Secondary */
    Secondary = 3,
    /** The egg was killed by someone with an RPEGG */
    RPEGG = 4,
    /** The egg was killed by someone with a Whipper */
    Whipper = 5,
    /** The egg was killed by someone with a Crackshot */
    Crackshot = 6,
    /** The egg was killed by someone with a Tri-Hard */
    TriHard = 7,
    /** The egg was killed by someone with a Grenade */
    Grenade = 8,
    /** The egg was killed by someone with a Melee */
    Melee = 9
}

export const processDiePacket = (game: Game, packet: PacketIn): void => {
    const killedId = packet.unpackInt8U();
    const killerId = packet.unpackInt8U();

    packet.unpackInt8U(); // respawnTime
    packet.unpackInt8U(); // killer lastDamageType

    const deathCause = packet.unpackInt8U();

    const killed = game.players[killedId];
    const killer = game.players[killerId];

    if (!killed || !killer) return;

    const oldKilled = { ...killed, x: killed.x, y: killed.y, z: killed.z, yaw: killed.yaw, pitch: killed.pitch };

    if (game.me) {
        if (killed.id === game.me.id) {
            game.lastDeathTime = Date.now();

            if (game.isPathing()) game.pathfinder.stop();

            game.state.controlKeys = 0;
        }

        killed.playing = false;
        killed.streak = 0;
        killed.hp = 100;
        killed.spawnShield = 0;

        killed.stats.totalDeaths++;

        if (killed.inKotcZone) {
            killed.inKotcZone = false;
            game.$emit('playerZoneLeave', killed, ZoneLeaveReason.Killed);
        }
    }

    if (killer) {
        killer.streak++;
        killer.stats.totalKills++;

        if (killer.streak > killer.stats.bestStreak) killer.stats.bestStreak = killer.streak;
    }

    game.$emit('playerDeath', killed, killer, oldKilled, deathCause);
}
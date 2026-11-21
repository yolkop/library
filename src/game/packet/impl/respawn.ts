/**
 * This file is licensed under the MPL 2.0 license.
 * For more information, see https://mozilla.org/MPL/2.0/.
 *
 * This file is part of the yolkbot library,
 * originally created by hijinks & 1ust.
 */

import type { Game } from '../../Game.js';
import type { PacketIn } from '../PacketIn.js';

export const processRespawnPacket = (game: Game, packet: PacketIn): void => {
    const id = packet.unpackInt8U();
    const seed = packet.unpackInt16U();
    const x = packet.unpackFloat();
    const y = packet.unpackFloat();
    const z = packet.unpackFloat();
    const primaryRounds = packet.unpackInt8U();
    const primaryStore = packet.unpackInt8U();
    const secondaryRounds = packet.unpackInt8U();
    const secondaryStore = packet.unpackInt8U();
    const grenades = packet.unpackInt8U();
    const player = game.players[id];

    if (player) {
        player.playing = true;
        player.randomSeed = seed;

        if (player.weapons[0] && player.weapons[0].ammo) player.weapons[0].ammo.rounds = primaryRounds;
        if (player.weapons[0] && player.weapons[0].ammo) player.weapons[0].ammo.store = primaryStore;
        if (player.weapons[1] && player.weapons[1].ammo) player.weapons[1].ammo.rounds = secondaryRounds;
        if (player.weapons[1] && player.weapons[1].ammo) player.weapons[1].ammo.store = secondaryStore;

        player.grenades = grenades;
        player.position = { x, y, z };

        player.spawnShield = 120;

        game.$emit('playerRespawn', player);
    }
}
/**
 * This file is licensed under the MPL 2.0 license.
 * For more information, see https://mozilla.org/MPL/2.0/.
 *
 * This file is part of the yolkbot library,
 * originally created by hijinks & 1ust.
 */

import { CollectType, type Game } from '../../Game.js';

import type { PacketIn } from '../PacketIn.js';

export const processCollectItemPacket = (game: Game, packet: PacketIn): void => {
    const playerId = packet.unpackInt8U();
    const type = packet.unpackInt8U() as CollectType;
    const applyToWeaponIdx = packet.unpackInt8U();
    const id = packet.unpackInt16U();

    const player = game.players[playerId];
    if (player) {
        game.collectibles[type] = game.collectibles[type].filter(c => c.id !== id);

        if (type === CollectType.Ammo) {
            const playerWeapon = player.weapons[applyToWeaponIdx];
            if (playerWeapon && playerWeapon.ammo) {
                playerWeapon.ammo.store = Math.min(playerWeapon.ammo.storeMax, playerWeapon.ammo.store + playerWeapon.ammo.pickup);
                game.$emit('playerCollectAmmo', player, playerWeapon, id);
            }
        } else if (type === CollectType.Grenade) {
            player.grenades++;
            if (player.grenades > 3) player.grenades = 3;

            game.$emit('playerCollectGrenade', player, id);
        }
    }
}
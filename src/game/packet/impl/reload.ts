/**
 * This file is licensed under the MPL 2.0 license.
 * For more information, see https://mozilla.org/MPL/2.0/.
 *
 * This file is part of the yolkbot library,
 * originally created by hijinks & 1ust.
 */

import type { Game } from '../../Game.js';
import type { PacketIn } from '../PacketIn.js';

export const processReloadPacket = (game: Game, packet: PacketIn): void => {
    const id = packet.unpackInt8U();
    const player = game.players[id];

    if (player) {
        const playerActiveWeapon = player.weapons[player.activeGun];

        if (playerActiveWeapon.ammo) {
            const maxLoad = Math.min(playerActiveWeapon.ammo.capacity, playerActiveWeapon.ammo.reload);
            const needed = Math.max(0, maxLoad - playerActiveWeapon.ammo.rounds);
            const newRounds = Math.min(needed, playerActiveWeapon.ammo.store);

            playerActiveWeapon.ammo.rounds += newRounds;
            playerActiveWeapon.ammo.store -= newRounds;
        }

        const isEmpty = playerActiveWeapon.ammo ? playerActiveWeapon.ammo.rounds === 0 : false;

        game.$emit('playerReloadStart', player, playerActiveWeapon);

        setTimeout(() => {
            if (!game || game.socket.readyState !== 1) return;

            const latestWeapon = player.weapons[player.activeGun];

            if (latestWeapon.ammo) {
                const maxLoad = Math.min(latestWeapon.ammo.capacity, latestWeapon.ammo.reload);
                const needed = Math.max(0, maxLoad - latestWeapon.ammo.rounds);
                const newRounds = Math.min(needed, latestWeapon.ammo.store);

                latestWeapon.ammo.rounds += newRounds;
                latestWeapon.ammo.store -= newRounds;
            }

            game.$emit('playerReloadEnd', player, latestWeapon);
        }, isEmpty ? playerActiveWeapon.longReloadTime : playerActiveWeapon.shortReloadTime);
    }
}
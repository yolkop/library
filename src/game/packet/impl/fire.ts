/**
 * This file is licensed under the MPL 2.0 license.
 * For more information, see https://mozilla.org/MPL/2.0/.
 *
 * This file is part of the yolkbot library,
 * originally created by hijinks & 1ust.
 */

import type { Game } from '../../Game.js';
import type { PacketIn } from '../PacketIn.js';

export const processFirePacket = (game: Game, packet: PacketIn): void => {
    const id = packet.unpackInt8U();

    const bullet = {
        posX: packet.unpackFloat(),
        posY: packet.unpackFloat(),
        posZ: packet.unpackFloat(),
        dirX: packet.unpackFloat(),
        dirY: packet.unpackFloat(),
        dirZ: packet.unpackFloat()
    };

    const player = game.players[id];
    if (player) {
        const playerWeapon = player.weapons[player.activeGun];

        if (playerWeapon && playerWeapon.ammo) {
            playerWeapon.ammo.rounds--;
            game.$emit('playerFire', player, playerWeapon, bullet);
        }
    }
}
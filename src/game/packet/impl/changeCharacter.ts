/**
 * This file is licensed under the MPL 2.0 license.
 * For more information, see https://mozilla.org/MPL/2.0/.
 *
 * This file is part of the yolkbot library,
 * originally created by hijinks & 1ust.
 */

import { initializePlayerGun } from '../../../util.js';

import { type GunIds, GunList } from '../../Guns.js';

import type { Game } from '../../Game.js';
import type { PacketIn } from '../PacketIn.js';
import type { ShellColor } from '../../Player.js';

export const processChangeCharacterPacket = (game: Game, packet: PacketIn): void => {
    const id = packet.unpackInt8U();
    const weaponIndex = packet.unpackInt8U() as GunIds;

    const primaryWeaponItem = packet.unpackInt16U();
    const secondaryWeaponItem = packet.unpackInt16U();
    const shellColor = packet.unpackInt8U();
    const hatItem = packet.unpackInt16U();
    const stampItem = packet.unpackInt16U();
    const grenadeItem = packet.unpackInt16U();
    const meleeItem = packet.unpackInt16U();

    const stampPositionX = packet.unpackInt8();
    const stampPositionY = packet.unpackInt8();

    const player = game.players[id];
    if (player) {
        const oldCharacter = structuredClone(player.character);
        const oldWeaponIdx = player.selectedGun as GunIds;

        player.character.eggColor = shellColor as ShellColor;
        player.character.primaryGun = primaryWeaponItem;
        player.character.secondaryGun = secondaryWeaponItem;
        player.character.stamp = stampItem;
        player.character.hat = hatItem;
        player.character.grenade = grenadeItem;
        player.character.melee = meleeItem;

        player.character.stampPos.x = stampPositionX;
        player.character.stampPos.y = stampPositionY;

        player.selectedGun = weaponIndex;
        player.weapons[0] = initializePlayerGun(GunList[weaponIndex]);

        if (oldWeaponIdx !== player.selectedGun) game.$emit('playerChangeGun', player, oldWeaponIdx, player.selectedGun);
        if (JSON.stringify(oldCharacter) !== JSON.stringify(player.character)) game.$emit('playerChangeCharacter', player, oldCharacter, player.character);
    }
}
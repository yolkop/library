/**
 * This file is licensed under the MPL 2.0 license.
 * For more information, see https://mozilla.org/MPL/2.0/.
 *
 * This file is part of the yolkbot library,
 * originally created by hijinks & 1ust.
 */

import { ItemType } from '../../../types/Item.js';

import type { Game } from '../../Game.js';
import type { PacketIn } from '../PacketIn.js';

export const processExplodePacket = (game: Game, packet: PacketIn): void => {
    const itemType = packet.unpackInt8U();
    const itemSkinId = packet.unpackInt16U();
    const x = packet.unpackFloat();
    const y = packet.unpackFloat();
    const z = packet.unpackFloat();
    const damage = packet.unpackInt8U();
    const radius = packet.unpackFloat();

    if (itemType === ItemType.Grenade) game.$emit('grenadeExplode', itemSkinId, { x, y, z }, damage, radius);
    else game.$emit('rocketHit', { x, y, z }, damage, radius);
}
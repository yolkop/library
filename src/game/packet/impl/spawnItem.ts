/**
 * This file is licensed under the MPL 2.0 license.
 * For more information, see https://mozilla.org/MPL/2.0/.
 *
 * This file is part of the yolkbot library,
 * originally created by hijinks & 1ust.
 */

import type { PacketIn } from '../PacketIn.js';
import type { CollectType, Game } from '../../Game.js';

export const processSpawnItemPacket = (game: Game, packet: PacketIn): void => {
    const id = packet.unpackInt16U();
    const type = packet.unpackInt8U() as CollectType;
    const x = packet.unpackFloat();
    const y = packet.unpackFloat();
    const z = packet.unpackFloat();

    game.collectibles[type].push({ id, x, y, z });
    game.$emit('spawnItem', type, { x, y, z }, id);
}
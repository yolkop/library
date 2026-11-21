/**
 * This file is licensed under the MPL 2.0 license.
 * For more information, see https://mozilla.org/MPL/2.0/.
 *
 * This file is part of the yolkbot library,
 * originally created by hijinks & 1ust.
 */

import type { Game } from '../../Game.js';
import type { DamageScale, GravityScale, RegenScale } from '../../dispatch/impl/GameOptionsDispatch.js';
import type { PacketIn } from '../PacketIn.js';

/** Game setting flags */
export enum GameOptionFlag {
    Locked = 1,
    NoTeamChange = 2,
    NoTeamShuffle = 4
}

export const processGameOptionsPacket = (game: Game, packet: PacketIn): void => {
    const oldOptions = structuredClone(game.options);

    let gravity = packet.unpackInt8U();
    let damage = packet.unpackInt8U();
    let healthRegen = packet.unpackInt8U();

    if (gravity < 1 || gravity > 4) gravity = 4;
    if (damage < 0 || damage > 8) damage = 4;
    if (healthRegen > 16) healthRegen = 4;

    game.options.gravity = (gravity / 4) as typeof GravityScale[number];
    game.options.damage = (damage / 4) as typeof DamageScale[number];
    game.options.healthRegen = (healthRegen / 4) as typeof RegenScale[number];

    const flags = packet.unpackInt8U();

    game.options.locked = !!(flags & GameOptionFlag.Locked);
    game.options.noTeamChange = !!(flags & GameOptionFlag.NoTeamChange);
    game.options.noTeamShuffle = !!(flags & GameOptionFlag.NoTeamShuffle);

    game.options.weaponsDisabled = Array.from({ length: 7 }, () => packet.unpackInt8U() === 1);

    game.$emit('gameOptionsChange', oldOptions, game.options);
}
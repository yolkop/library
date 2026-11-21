/**
 * This file is licensed under the MPL 2.0 license.
 * For more information, see https://mozilla.org/MPL/2.0/.
 *
 * This file is part of the yolkbot library,
 * originally created by hijinks & 1ust.
 */

import { CollectType, type Game } from '../../Game.js';
import { PathError } from '../../pathing/Pathfinder.js';

import type { ADispatch } from '../ADispatch.js';

/** Dispatch to pathfind to the closest ammo collectible. */
export class GoToAmmoDispatch implements ADispatch {
    validate(game: Game): boolean {
        if (!game.colliders) return false;

        game.pathfinder.warm();

        return true;
    }

    check(game: Game): boolean {
        return game.me.playing && game.collectibles[CollectType.Ammo].length > 0;
    }

    execute(game: Game): void {
        let minDistance = 2000;
        let closestAmmo = null;

        for (const ammo of game.collectibles[CollectType.Ammo]) {
            const dx = ammo.x - game.me.position.x;
            const dy = ammo.y - game.me.position.y;
            const dz = ammo.z - game.me.position.z;

            const distance = Math.sqrt(dx * dx + dy * dy + dz * dz);

            if (distance < minDistance) {
                minDistance = distance;
                closestAmmo = ammo;
            }
        }

        if (closestAmmo) game.pathfinder.goTo(closestAmmo);
        else return game.$emit('pathError', PathError.TargetNotFound);
    }
}
/**
 * This file is licensed under the MPL 2.0 license.
 * For more information, see https://mozilla.org/MPL/2.0/.
 *
 * This file is part of the yolkbot library,
 * originally created by hijinks & 1ust.
 */

import { GameMode, type Game } from '../../Game.js';
import { KOTCGame } from '../../modes/KOTCGame.js';
import { PathError } from '../../pathing/Pathfinder.js';

import type { ADispatch } from '../ADispatch.js';

/** Dispatch to pathfind to the current coop (KoTC games). */
export class GoToCoopDispatch implements ADispatch {
    validate(game: Game): boolean {
        if (!game.colliders) return false;

        game.pathfinder.warm();

        return game instanceof KOTCGame && game.mode === GameMode.KOTC;
    }

    check(game: Game): boolean {
        return game instanceof KOTCGame && game.me.playing && !Number.isNaN(game.zoneIdx) && game.zoneIdx >= 0;
    }

    execute(game: Game): void {
        if (!(game instanceof KOTCGame)) return;

        let minDistance = 20000;
        let closestZonePoint = null;

        for (const zoneCoords of game.activeZone) {
            const dx = zoneCoords.x - game.me.position.x;
            const dy = zoneCoords.y - game.me.position.y;
            const dz = zoneCoords.z - game.me.position.z;

            const distance = Math.sqrt(dx * dx + dy * dy + dz * dz);

            if (distance < minDistance) {
                minDistance = distance;
                closestZonePoint = zoneCoords;
            }
        }

        if (closestZonePoint) game.pathfinder.goTo(closestZonePoint);
        else return game.$emit('pathError', PathError.TargetNotFound);
    }
}
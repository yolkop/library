/**
 * This file is licensed under the MPL 2.0 license.
 * For more information, see https://mozilla.org/MPL/2.0/.
 *
 * This file is part of the yolkbot library,
 * originally created by hijinks & 1ust.
 */

import { Game, GameMode, Team } from '../Game.js';

import type { Position } from '../../util.js';

/** Represents a KOTC zone tile, stored in {@link KOTCGame.zones} */
export interface KOTCZoneTile extends Position {
    /** The associated zone "number" */
    zone: number;
}

/** The possible states of a game's coop in {@link KOTCGame.coopState} */
export enum CoopState {
    /** When no coop has been decided yet, either due to a lack of players or because a coop was just scored. */
    Start = 0,
    /** A team has just won a single coop */
    Score = 1,
    /** A team has just won the game */
    Win = 2,
    /** A team is currently sitting on a coop, and the progress bar is advancing */
    Capturing = 3,
    /** Both teams have players on the coop, and nothing is progressing */
    Contested = 4,
    /** A team successfully removed all other players from the coop and is now taking it over */
    Takeover = 5,
    /** No teams are on the coop, but someone has already been on that specific coop */
    Abandoned = 6,
    /** No teams are on the coop, and no one has been on that coop yet */
    Unclaimed = 7
}

/** A King of the Coop game */
export class KOTCGame extends Game {
    /** The game mode (KoTC) */
    mode = GameMode.KOTC as const;

    /** The team "score", with each index representing the {@link Team} enum value */
    teamScore: number[] = [0, 0, 0];

    /** The current state of the coop (if it's being captured, just got won, no one's on it, etc) */
    coopState: CoopState = CoopState.Capturing;
    /** The index in the map data of the current zone */
    zoneIdx = 0;
    /** The {@link Team} enum ID capturing the coop */
    teamCapturing: Team = Team.None;
    /** The number of players currently sitting on the coop */
    numPlayersCapturing = 0;
    /** The percent (0-100) of the coop captured */
    percentCaptured = 0;
    /** The zones in the map data; {@link KOTCZoneTile} is the singular coordinate set and the zone ID for the zone; the inner array is for all of the tiles in a specific zone; the outer array is for all of the overall zones indexed by "ID" (see {@link KOTCGame.zoneIdx}) */
    zones: KOTCZoneTile[][] = [];

    /**
     * Initializes the KoTC zones for the game. This is called automatically.
     * @param meshData All of the X/Y/Z coordinate sets for the map.
     */
    initZones(meshData: { x: number, y: number, z: number }[]): void {
        const len = meshData?.length;
        if (!len) return;

        let minX = Infinity, minY = Infinity, minZ = Infinity;
        let maxX = -Infinity, maxY = -Infinity, maxZ = -Infinity;

        for (let i = 0; i < len; i++) {
            const { x, y, z } = meshData[i];
            if (x < minX) minX = x;
            if (x > maxX) maxX = x;
            if (y < minY) minY = y;
            if (y > maxY) maxY = y;
            if (z < minZ) minZ = z;
            if (z > maxZ) maxZ = z;
        }

        const sizeX = (maxX - minX + 1) | 0;
        const sizeY = (maxY - minY + 1) | 0;
        const sizeZ = (maxZ - minZ + 1) | 0;
        const strideY = sizeX;
        const strideZ = sizeX * sizeY;

        const cellIndex = new Int32Array(sizeX * sizeY * sizeZ).fill(-1);
        const zoneIds = new Uint16Array(len);

        const queue = new Uint32Array(len);

        for (let i = 0; i < len; i++) {
            const { x, y, z } = meshData[i];
            cellIndex[((x - minX) | 0) + ((y - minY) | 0) * strideY + ((z - minZ) | 0) * strideZ] = i;
        }

        let zoneId = 0;

        for (let i = 0; i < len; i++) {
            if (zoneIds[i]) continue;

            const zone = ++zoneId;
            const activeZone = [];

            let head = 0, tail = 0;
            queue[tail++] = i;
            zoneIds[i] = zone;

            while (head < tail) {
                const idx = queue[head++];
                const cell = meshData[idx];
                activeZone[activeZone.length] = { ...cell, zone };

                const { x, y, z } = cell;
                const flatIdx = ((x - minX) | 0) + ((y - minY) | 0) * strideY + ((z - minZ) | 0) * strideZ;

                let nIdx;

                if (x > minX && (nIdx = cellIndex[flatIdx - 1]) !== -1 && !zoneIds[nIdx]) {
                    zoneIds[nIdx] = zone;
                    queue[tail++] = nIdx;
                }

                if (x < maxX && (nIdx = cellIndex[flatIdx + 1]) !== -1 && !zoneIds[nIdx]) {
                    zoneIds[nIdx] = zone;
                    queue[tail++] = nIdx;
                }

                if (z > minZ && (nIdx = cellIndex[flatIdx - strideZ]) !== -1 && !zoneIds[nIdx]) {
                    zoneIds[nIdx] = zone;
                    queue[tail++] = nIdx;
                }

                if (z < maxZ && (nIdx = cellIndex[flatIdx + strideZ]) !== -1 && !zoneIds[nIdx]) {
                    zoneIds[nIdx] = zone;
                    queue[tail++] = nIdx;
                }
            }

            this.zones[this.zones.length] = activeZone;
        }
    }

    /** Gets the active zone tile set (the array of coordinate objects where the zone lives) */
    get activeZone(): KOTCZoneTile[] {
        return this.zones[this.zoneIdx - 1];
    }
}
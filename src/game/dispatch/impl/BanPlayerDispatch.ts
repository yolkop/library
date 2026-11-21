/**
 * This file is licensed under the MPL 2.0 license.
 * For more information, see https://mozilla.org/MPL/2.0/.
 *
 * This file is part of the yolkbot library,
 * originally created by hijinks & 1ust.
 */

import { PacketOut } from '../../packet/PacketOut.js';

import { CommCode } from '#env/DataLoader';

import type { ADispatch } from '../ADispatch.js';
import type { Game } from '../../Game.js';

/** Duration for which a player can be banned in {@link BanPlayerDispatch} */
export enum BanDuration {
    /** 5 minutes */
    FiveMinutes = 0,
    /** 15 minutes */
    FifteenMinutes = 1,
    /** 60 minutes (1 hour) */
    OneHour = 2
}

/** (eggforcer only) Bans a player from the game */
export class BanPlayerDispatch implements ADispatch {
    #uniqueId: string;
    #duration: number;
    #reason: string;

    /**
     * Creates a BanPlayerDispatch
     * @param uniqueId The unique ID of the player to ban
     * @param duration The duration of the ban
     * @param reason The reason for the ban (optional)
     */
    constructor(uniqueId: string, duration: BanDuration, reason = '') {
        this.#uniqueId = uniqueId;
        this.#duration = duration;
        this.#reason = reason;
    }

    validate(game: Game): boolean {
        if (typeof this.#uniqueId !== 'string' || typeof this.#reason !== 'string') return false;
        if (typeof this.#duration !== 'number' || !(this.#duration in BanDuration)) return false;
        if (!(game.account.adminRoles & 4)) return false;

        return true;
    }

    check(): boolean {
        return true;
    }

    execute(game: Game): void {
        const out = new PacketOut();
        out.packInt8(CommCode.banPlayer);
        out.packString(this.#uniqueId);
        out.packString(this.#reason);
        out.packInt8(this.#duration);
        out.send(game.socket);
    }
}
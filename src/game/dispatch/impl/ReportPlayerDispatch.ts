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
import type { Player } from '../../Player.js';

/** The available parameters for {@link ReportPlayerDispatch} */
export interface ReportPlayerParams {
    /** Allows you to flag someone as a cheater */
    cheating?: boolean;
    /** Allows you to flag someone as harassing someone */
    harassment?: boolean;
    /** Allows you to flag someone as being offensive */
    offensive?: boolean;
    /** Allows you to flag someone for a misc reason */
    other?: boolean;
}

export enum ReportReason {
    /** The player is cheating */
    Cheating = 1,
    /** The player is harassing someone */
    Harassment = 2,
    /** The player is being offensive */
    Offensive = 4,
    /** Some other report reason */
    Other = 8
}

/** Reports a player ingame */
export class ReportPlayerDispatch implements ADispatch {
    #idOrName: number | string;
    #reasonInt = 0;

    /**
     * Creates a ReportPlayerDispatch
     * @param idOrName The ID or name of the player to report
     * @param reasons The reasons for reporting the player
     * @see ReportPlayerParams
     */
    constructor(idOrName: number | string, reasons: ReportPlayerParams) {
        this.#idOrName = idOrName;

        this.#reasonInt =
            (reasons.cheating ? ReportReason.Cheating : 0) |
            (reasons.harassment ? ReportReason.Harassment : 0) |
            (reasons.offensive ? ReportReason.Offensive : 0) |
            (reasons.other ? ReportReason.Other : 0) || 0;
    }

    #grabPlayer(game: Game): Player | undefined {
        return typeof this.#idOrName === 'number' ? game.players[this.#idOrName] :
            game.players.find(player => player && player.name === this.#idOrName.toString());
    }

    validate(): boolean {
        if (typeof this.#idOrName !== 'string' && typeof this.#idOrName !== 'number') return false;
        if (this.#reasonInt === 0) return false;

        return true;
    }

    check(game: Game): boolean {
        return !!this.#grabPlayer(game);
    }

    execute(game: Game): void {
        const target = this.#grabPlayer(game);
        if (!target || !target.position) return;

        const out = new PacketOut();
        out.packInt8(CommCode.reportPlayer);
        out.packString(target.uniqueId);
        out.packInt8(this.#reasonInt);
        out.send(game.socket);
    }
}
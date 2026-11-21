/**
 * This file is licensed under the MPL 2.0 license.
 * For more information, see https://mozilla.org/MPL/2.0/.
 *
 * This file is part of the yolkbot library,
 * originally created by hijinks & 1ust.
 */

import { PacketOut } from '../../packet/PacketOut.js';

import { CommCode } from '#env/DataLoader';

import { GameMode, type Game } from '../../Game.js';

import type { ADispatch } from '../ADispatch.js';

/** Switches the bot's team (if possible) */
export class SwitchTeamDispatch implements ADispatch {
    validate(): boolean {
        return true;
    }

    check(game: Game): boolean {
        if (game.me.playing) return false;
        if (game.isObserving) return false;
        if (game.mode === GameMode.FFA) return false;

        if (game.isPrivate) return !game.options.noTeamChange;

        const players = game.players;
        const myTeam = game.me.team;

        const playersWithMyTeam = players.filter((p) => p && p.team === myTeam).length;
        const playersWithOtherTeam = players.filter((p) => p && p.team !== myTeam).length;

        if (playersWithOtherTeam > playersWithMyTeam) return false;
        if (playersWithMyTeam === playersWithOtherTeam) return false;

        return true;
    }

    execute(game: Game): void {
        const out = new PacketOut();
        out.packInt8(CommCode.switchTeam);
        out.send(game.socket);
    }
}
/**
 * This file is licensed under the MPL 2.0 license.
 * For more information, see https://mozilla.org/MPL/2.0/.
 *
 * This file is part of the yolkbot library,
 * originally created by hijinks & 1ust.
 */

import { GameAction, type Game } from '../../Game.js';

import { CoopState, KOTCGame } from '../../modes/KOTCGame.js';
import { SpatulaGame } from '../../modes/SpatulaGame.js';
import { TeamsGame } from '../../modes/TeamsGame.js';

import type { PacketIn } from '../PacketIn.js';

export const processGameActionPacket = (game: Game, packet: PacketIn): void => {
    const action = packet.unpackInt8U();

    if (action === GameAction.Pause) {
        game.$emit('gameForcePause');

        setTimeout(() => {
            if (game.me) game.me.playing = false;
        }, 3000);
    }

    if (action === GameAction.Reset) {
        game.players.forEach((player) => player && (player.streak = 0));

        if (game instanceof TeamsGame) game.teamScore = [0, 0, 0];

        if (game instanceof SpatulaGame) {
            game.teamScore = [0, 0, 0];
            game.playerHoldingSpatula = 0;
            game.teamHoldingSpatula = 0;
            game.spatula = { x: 0, y: 0, z: 0 };
        }

        if (game instanceof KOTCGame) {
            game.teamScore = [0, 0, 0];
            game.coopState = CoopState.Capturing;
            game.zoneIdx = 0;
            game.teamCapturing = 0;
            game.numPlayersCapturing = 0;
            game.percentCaptured = 0.0;
        }

        game.$emit('gameReset');
    }
}
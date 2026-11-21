/**
 * This file is licensed under the MPL 2.0 license.
 * For more information, see https://mozilla.org/MPL/2.0/.
 *
 * This file is part of the yolkbot library,
 * originally created by hijinks & 1ust.
 */

import { GameMode, type Game, type Team } from '../../Game.js';
import { ZoneLeaveReason } from '../../Hooks.js';

import { SpatulaGame } from '../../modes/SpatulaGame.js';
import { TeamsGame } from '../../modes/TeamsGame.js';
import { KOTCGame, type CoopState } from '../../modes/KOTCGame.js';

import { diffObjects, type Position } from '../../../util.js';

import type { PacketIn } from '../PacketIn.js';
import type { Player } from '../../Player.js';

/** Changes that are in a metaGameState {@link GameEvents} event when in Team mode */
export interface TeamsChanges {
    /** The team scores, indexed by {@link Team} */
    teamScore: number[];
}

/** Changes that are in a metaGameState {@link GameEvents} event when in Spatula mode */
export interface SpatulaChanges extends TeamsChanges {
    /** The team scores, indexed by {@link Team} */
    teamScore: number[];
    /** The spatula position */
    spatula: Position;
    /** The {@link Player} ID holding the spatula */
    playerHoldingSpatula: number;
    /** The {@link Team} holding the spatula */
    teamHoldingSpatula: Team;
}

/** Changes that are in a metaGameState {@link GameEvents} event when in KOTC mode */
export interface KOTCChanges extends TeamsChanges {
    /** The team scores, indexed by {@link Team} */
    teamScore: number[];
    /** The state of the coop */
    coopState: CoopState;
    /** The active zone index */
    zoneIdx: number;
    /** The {@link Team} capturing the coop */
    teamCapturing: Team;
    /** The coop capture progress percentage */
    percentCaptured: number;
    /** The number of players sitting on the coop */
    numPlayersCapturing: number;
    /** The {@link Player} IDs on the coop */
    playersOnZone: number[];
}

export const processMetaGameStatePacket = (game: Game, packet: PacketIn): void => {
    if (game instanceof SpatulaGame) {
        const oldTeamScores = structuredClone(game.teamScore);
        const oldSpatula = structuredClone(game.spatula);
        const oldPlayerHoldingSpatula = game.playerHoldingSpatula;
        const oldTeamHoldingSpatula = game.teamHoldingSpatula;

        game.teamScore[1] = packet.unpackInt16U();
        game.teamScore[2] = packet.unpackInt16U();

        game.spatula = {
            x: packet.unpackFloat(),
            y: packet.unpackFloat(),
            z: packet.unpackFloat()
        };

        game.playerHoldingSpatula = packet.unpackInt8U();
        game.teamHoldingSpatula = packet.unpackInt8U();

        const changeObject = diffObjects<SpatulaChanges>({
            teamScore: oldTeamScores,
            spatula: oldSpatula,
            playerHoldingSpatula: oldPlayerHoldingSpatula,
            teamHoldingSpatula: oldTeamHoldingSpatula
        }, {
            teamScore: game.teamScore,
            spatula: game.spatula,
            playerHoldingSpatula: game.playerHoldingSpatula,
            teamHoldingSpatula: game.teamHoldingSpatula
        });

        game.$emit('gameStateChange', changeObject);
    } else if (game instanceof KOTCGame) {
        const oldTeamScores = structuredClone(game.teamScore);
        const oldCoopState = game.coopState;
        const oldZoneIdx = game.zoneIdx;
        const oldTeamCapturing = game.teamCapturing;
        const oldPercentCaptured = game.percentCaptured;
        const oldNumPlayersCapturing = game.numPlayersCapturing;
        const oldPlayersOnZone = game.players.filter((p): p is Player => !!p).filter((p) => p.inKotcZone && p.playing).map((p) => p.id);

        game.coopState = packet.unpackInt8U(); // CoopState
        game.zoneIdx = packet.unpackInt8U(); // a number to represent which 'active zone' kotc is using
        game.teamCapturing = packet.unpackInt8U(); // the team capturing
        const captureProgress = packet.unpackInt16U(); // progress of the coop capture
        game.numPlayersCapturing = packet.unpackInt8U(); // number of players capturing
        game.teamScore[1] = packet.unpackInt8U(); // team 1 (blue) score
        game.teamScore[2] = packet.unpackInt8U(); // team 2 (red) score

        game.percentCaptured = captureProgress / 1000; // progress of the capture as a percentage

        if (game.activeZone) game.players.forEach((player) => game.mode === GameMode.KOTC && player && player.updateKotcZone(game.activeZone));

        if (game.numPlayersCapturing <= 0) game.players.forEach((player) => {
            if (player && player.inKotcZone) {
                player.inKotcZone = false;
                game.$emit('playerZoneLeave', player, ZoneLeaveReason.RoundEnded);
            }
        });

        const diffObject = diffObjects<KOTCChanges>({
            teamScore: oldTeamScores,
            coopState: oldCoopState,
            zoneIdx: oldZoneIdx,
            teamCapturing: oldTeamCapturing,
            percentCaptured: oldPercentCaptured,
            numPlayersCapturing: oldNumPlayersCapturing,
            playersOnZone: oldPlayersOnZone
        }, {
            teamScore: game.teamScore,
            coopState: game.coopState,
            zoneIdx: game.zoneIdx,
            teamCapturing: game.teamCapturing,
            percentCaptured: game.percentCaptured,
            numPlayersCapturing: game.numPlayersCapturing,
            playersOnZone: game.players.filter((p): p is Player => !!p).filter((p) => p.inKotcZone && p.playing).map((p) => p.id)
        });

        game.$emit('gameStateChange', diffObject);
    } else if (game instanceof TeamsGame) {
        const oldTeamScores = structuredClone(game.teamScore);

        game.teamScore[1] = packet.unpackInt16U();
        game.teamScore[2] = packet.unpackInt16U();

        const objectDiff = diffObjects<TeamsChanges>(
            { teamScore: oldTeamScores },
            { teamScore: game.teamScore }
        );

        game.$emit('gameStateChange', objectDiff);
    }
}
/**
 * This file is licensed under the MPL 2.0 license.
 * For more information, see https://mozilla.org/MPL/2.0/.
 *
 * This file is part of the yolkbot library,
 * originally created by hijinks & 1ust.
 */

import { FramesBetweenSyncs, type Game } from '../../Game.js';
import { ZoneLeaveReason } from '../../Hooks.js';
import { KOTCGame } from '../../modes/KOTCGame.js';
import { Movement } from '../../pathing/physics.js';

import type { PacketIn } from '../PacketIn.js';
import type { PlayerView } from '../../Player.js';

export interface PlayerSyncFrame extends PlayerView {
    /** The scale of the player at the frame (usually 1, unless {@link ShellStreak.MiniEgg} is active) */
    scale: number;
}

export const processSyncThemPacket = (game: Game, packet: PacketIn): void => {
    const id = packet.unpackInt8U();
    const x = packet.unpackFloat();
    const y = packet.unpackFloat();
    const z = packet.unpackFloat();
    const climbing = !!packet.unpackInt8U();

    const player = game.players[id];
    if (!player || (game.isReady() && player.id === game.me.id)) {
        for (let i2 = 0; i2 < FramesBetweenSyncs; i2++) {
            packet.unpackInt8U();
            packet.unpackRadU();
            packet.unpackRad();
            packet.unpackInt8U();
        }
        return; // syncMe has a job
    }

    const state: PlayerSyncFrame[] | null = game.bot.hasHook('playerSync') ? [] : null;

    for (let i2 = 0; i2 < FramesBetweenSyncs; i2++) {
        const controlKeys = packet.unpackInt8U();

        player.jumping = !!(controlKeys & Movement.Jump);
        player.scoping = !!(controlKeys & Movement.Scope);

        const oldView = structuredClone(player.view);

        player.view.yaw = packet.unpackRadU();
        player.view.pitch = packet.unpackRad();

        if (player.view.yaw !== oldView.yaw || player.view.pitch !== oldView.pitch)
            game.$emit('playerRotate', player, oldView, player.view);

        player.scale = packet.unpackInt8U();

        if (state) state.push({ yaw: player.view.yaw, pitch: player.view.pitch, scale: player.scale });
    }

    const px = player.position;
    const posChanged = px.x !== x || px.y !== y || px.z !== z;
    const climbingChanged = player.climbing !== climbing;
    const didChange = posChanged || climbingChanged;

    const oldPosition = didChange ? structuredClone(px) : null;

    if (px.x !== x) px.x = x;
    if (px.z !== z) px.z = z;
    if (!player.jumping || Math.abs(px.y - y) > 0.5) px.y = y;
    if (climbingChanged) player.climbing = climbing;

    if (didChange && oldPosition) {
        game.$emit('playerMove', player, oldPosition, px);

        if (game instanceof KOTCGame) {
            const wasInZone = player.inKotcZone;

            if (!game.activeZone && wasInZone) {
                player.inKotcZone = false;
                game.$emit('playerZoneLeave', player, ZoneLeaveReason.RoundEnded);
                return;
            }

            if (game.activeZone) player.updateKotcZone(game.activeZone);

            const nowIn = player.inKotcZone;
            if (wasInZone !== nowIn) {
                player.inKotcZone = nowIn;
                if (nowIn) game.$emit('playerZoneEnter', player);
                else game.$emit('playerZoneLeave', player, ZoneLeaveReason.WalkedOut);
            }
        }
    }
}
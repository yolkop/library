/**
 * This file is licensed under the MPL 2.0 license.
 * For more information, see https://mozilla.org/MPL/2.0/.
 *
 * This file is part of the yolkbot library,
 * originally created by hijinks & 1ust.
 */

import type { Game } from './Game.js';

import { ColliderType, type Collider, type ColliderSet } from './pathing/ColliderSet.js';
import { clamp } from './pathing/math.js';
import {
    ACCELERATION,
    CLIMB_ACCELERATION,
    DRAG,
    GRAVITY,
    JUMP_BUFFER,
    JUMP_IMPULSE,
    JUMP_PAD_IMPULSE,
    LADDER_JUMP_IMPULSE,
    MAX_STEP,
    Movement,
    PLAYER_RADIUS,
    TERMINAL_VELOCITY
} from './pathing/physics.js';

import type { Bot } from '../Bot.js';
import type { Position } from '../util.js';

const PI90 = Math.PI / 2;

/** Runs the game's movement physics locally, so the bot knows where it is between server syncs. */
export class Simulator {
    /** The {@link Bot} the simulator moves */
    bot: Bot;
    /** The {@link Game} the simulator reads its inputs from */
    game: Game;
    /** The map geometry the simulator collides against */
    colliders: ColliderSet;

    #resolve: Position = { x: 0, y: 0, z: 0 };
    #normal: Position = { x: 0, y: 0, z: 0 };
    #probe: Position = { x: 0, y: 0, z: 0 };

    /**
     * Creates a movement simulator
     * @param bot The bot to move
     * @param game The game the bot is in
     * @param colliders The map's collision geometry
     */
    constructor(bot: Bot, game: Game, colliders: ColliderSet) {
        this.bot = bot;
        this.game = game;
        this.colliders = colliders;
    }

    /** Whether the player is standing on something, or hanging off a ladder */
    canJump(): boolean {
        return this.game.me.climbing || this.game.state.onGround > 0;
    }

    #startJump(jumping: boolean): void {
        this.game.state.jumpQueued = 0;
        this.game.state.onGround = 0;
        this.game.me.jumping = jumping;
    }

    #jump(): void {
        if (this.game.me.climbing) {
            this.game.state.dy = LADDER_JUMP_IMPULSE;
            this.game.me.climbing = false;
            this.#startJump(true);
        }

        if (this.canJump()) {
            this.game.state.dy = JUMP_IMPULSE;
            this.#startJump(true);
        }
    }

    /**
     * Decides whether a ladder the player just bumped into can be grabbed. It can if they are
     * holding forward, are level enough with the ladder's cell, are facing along the axis the
     * ladder is mounted on, and walked into it roughly head-on rather than scraping past it.
     * @param collider The ladder that was hit
     * @param normal The surface normal at the contact
     */
    #tryClimb(collider: Collider, normal: Position): void {
        if (!(this.game.state.controlKeys & Movement.Forward)) return;
        if (Math.abs(collider.origin.y - (this.game.me.position.y + 0.18)) > 0.9) return;

        const facing = Math.round(this.game.state.yaw / PI90) % 4;
        if (facing !== collider.ry && (facing + 2) % 4 !== collider.ry) return;

        const flat = Math.hypot(normal.x, normal.z);
        if (flat < 1e-6) return;

        const dot = Math.cos(this.game.state.yaw) * (normal.x / flat) + -Math.sin(this.game.state.yaw) * (normal.z / flat);
        if (Math.abs(dot) >= 0.4) return;

        this.game.me.climbing = true;

        this.game.state.climbX = clamp(Math.floor(collider.origin.x), 0, this.colliders.width - 1);
        this.game.state.climbZ = clamp(Math.floor(collider.origin.z), 0, this.colliders.depth - 1);
        this.game.state.climbRY = collider.ry;
        this.game.state.dy = 0;

        this.#startJump(false);
    }

    /**
     * Moves the player by a velocity, pushing them back out of anything they end up inside of.
     * @param ndx The X velocity
     * @param ndy The Y velocity
     * @param ndz The Z velocity
     */
    #move(ndx: number, ndy: number, ndz: number): void {
        const state = this.game.state;
        const me = this.game.me;

        state.onGround = Math.max(state.onGround - 1, 0);
        me.position.y += PLAYER_RADIUS;

        let velX = ndx, velY = ndy, velZ = ndz;

        const speed = Math.hypot(velX, velY, velZ);
        if (speed > MAX_STEP) {
            const scale = MAX_STEP / speed;
            velX *= scale;
            velY *= scale;
            velZ *= scale;
        }

        this.#probe.x = clamp(me.position.x + velX, 0.1, this.colliders.width - 0.1);
        this.#probe.y = me.position.y + velY;
        this.#probe.z = clamp(me.position.z + velZ, 0.1, this.colliders.depth - 0.1);

        let resolved = false;

        for (let attempt = 0; attempt < 8; attempt++) {
            const collider = this.colliders.sweep(this.#probe, PLAYER_RADIUS, this.#resolve, this.#normal);

            if (!collider) {
                resolved = true;
                break;
            }

            if (this.#normal.y < -0.707) state.onGround = 4;

            if (!me.climbing && (collider.type & ColliderType.Ladder)) this.#tryClimb(collider, this.#normal);

            this.#probe.x += this.#resolve.x;
            this.#probe.y += this.#resolve.y;
            this.#probe.z += this.#resolve.z;

            if (state.onGround) {
                if (me.jumping) {
                    me.jumping = false;
                    state.dy = 0;
                } else if (state.controlKeys & Movement.Backward) me.climbing = false;
            }
        }

        if (!resolved) {
            this.#probe.x -= velX * 0.9;
            this.#probe.y -= velY * 0.9;
            this.#probe.z -= velZ * 0.9;
        }

        me.position.x = this.#probe.x;
        me.position.y = this.#probe.y;
        me.position.z = this.#probe.z;

        if (me.climbing && (!state.onGround || !me.jumping)) this.#recheckLadder();
        if (!me.climbing) this.#checkJumpPad();

        me.position.y -= PLAYER_RADIUS;
    }

    /** Drops the player off a ladder once neither the cell at their waist nor the one at their head is still that ladder */
    #recheckLadder(): void {
        const state = this.game.state;
        const me = this.game.me;

        const cx = clamp(Math.floor(state.climbX), 0, this.colliders.width - 1);
        const cz = clamp(Math.floor(state.climbZ), 0, this.colliders.depth - 1);

        me.climbing = false;

        for (const offset of [-0.25, 0.25]) {
            const cy = clamp(Math.floor(me.position.y + offset), 0, this.colliders.height - 1);
            const cell = this.colliders.cellAt(cx, cy, cz);

            if (cell && cell.type === ColliderType.Ladder && cell.ry === state.climbRY) me.climbing = true;
        }
    }

    /** Launches the player if they are standing near enough to the middle of a jump pad */
    #checkJumpPad(): void {
        const me = this.game.me;

        const cx = Math.floor(me.position.x);
        const cz = Math.floor(me.position.z);

        const below = this.colliders.cellAt(cx, Math.floor(me.position.y - 0.5), cz);
        if (below?.shortName !== 'jump-pad' || !this.canJump()) return;

        if (Math.hypot(cx + 0.5 - me.position.x, cz + 0.5 - me.position.z) >= 0.3) return;

        me.position.y += JUMP_PAD_IMPULSE;
        this.#startJump(true);
    }

    /**
     * Advances the player by one tick, using the inputs recorded for that tick
     * @param index The index into {@link Game.state}'s buffer to replay
     */
    simulate(index: number): void {
        const state = this.game.state;
        const me = this.game.me;

        const frame = state.buffer[index];
        if (!frame) return;

        const keys = frame.controlKeys ?? 0;
        const yaw = frame.yaw ?? state.yaw;

        let dx = 0;
        let dy = 0;
        let dz = 0;

        if (keys & Movement.Left) {
            dx -= Math.cos(yaw);
            dz += Math.sin(yaw);
        }

        if (keys & Movement.Right) {
            dx += Math.cos(yaw);
            dz -= Math.sin(yaw);
        }

        if (keys & Movement.Forward) {
            if (me.climbing) dy += 1;
            else {
                dx -= Math.sin(yaw);
                dz -= Math.cos(yaw);
            }
        }

        if (keys & Movement.Backward) {
            if (me.climbing) dy -= 1;
            else {
                dx += Math.sin(yaw);
                dz += Math.cos(yaw);
            }
        }

        if (keys & Movement.Jump) {
            state.jumpQueued = JUMP_BUFFER;
            state.controlKeys ^= state.controlKeys & Movement.Jump;
        }

        if (state.jumpQueued > 0) {
            state.jumpQueued--;
            this.#jump();
        }

        if (me.climbing) {
            me.jumping = false;

            const previous = state.dy;
            state.dy += dy * CLIMB_ACCELERATION;

            const step = (state.dy + previous) * 0.5;

            me.position.y += step;
            state.dy *= 0.5;

            if (Math.floor(me.position.y) >= this.colliders.height) me.climbing = false;

            this.#move(0, step, 0);
        } else {
            const length = Math.hypot(dx, dz);

            if (length > 0) {
                state.dx += (dx / length) * ACCELERATION;
                state.dz += (dz / length) * ACCELERATION;
            }

            state.dy = Math.max(TERMINAL_VELOCITY, state.dy - this.game.options.gravity * GRAVITY);

            const fromX = me.position.x;
            const fromY = me.position.y;
            const fromZ = me.position.z;

            this.#move(state.dx, state.dy, state.dz);

            state.dx = me.position.x - fromX;
            state.dy = me.position.y - fromY;
            state.dz = me.position.z - fromZ;

            if (state.onGround && state.dy > 0) {
                const travelled = Math.hypot(state.dx, state.dy, state.dz);
                const scrub = travelled > 0 ? 1 - (state.dy / travelled) * 0.5 : 1;

                state.dx *= scrub;
                state.dz *= scrub;
            }
        }

        state.dx *= DRAG;
        state.dz *= DRAG;
        if (me.climbing) state.dy *= DRAG;
    }
}

/**
 * This file is licensed under the MPL 2.0 license.
 * For more information, see https://mozilla.org/MPL/2.0/.
 *
 * This file is part of the yolkbot library,
 * originally created by hijinks & 1ust.
 */

import { FACING, LinkKind, PathGraph, type PathNode } from './PathGraph.js';
import { flatDistance } from './math.js';

import { LEAP_SPEED, LEAP_WINDOW, LEDGE_OVERHANG, Movement, WALK_SPEED } from './physics.js';

import type { Game } from '../Game.js';

import type { Bot } from '../../Bot.js';
import type { ColliderSet } from './ColliderSet.js';
import type { Position } from '../../util.js';

/** Why a navigation attempt gave up */
export enum PathError {
    /** The bot joined with `skipMapLoad`, so there is no geometry to navigate */
    NoMapData = 'no_map_data',
    /** Nothing was found to navigate towards */
    TargetNotFound = 'target_not_found',
    /** The bot is not standing anywhere the graph recognises, usually mid-air or out of bounds */
    LostStart = 'lost_start',
    /** The destination is not anywhere the graph recognises */
    LostDestination = 'lost_destination',
    /** Both ends are on the map but nothing connects them */
    NoRoute = 'no_route',
    /** The bot stopped making progress and could not find its way back onto the route */
    Stuck = 'stuck'
}

/** Why the bot planned, or re-planned, a path */
export enum PathReason {
    /** Something asked it to go somewhere */
    Requested = 'requested',
    /** The destination moved out from under the plan */
    TargetMoved = 'target_moved',
    /** The bot came down somewhere the plan never mentioned */
    Drifted = 'drifted',
    /** The bot stopped making progress and is trying a different way round */
    Stuck = 'stuck'
}

/** A path the bot has just planned, emitted as {@link GameEvents.pathPlan} */
export interface PathPlan {
    /** Why it planned */
    reason: PathReason;
    /** Where the bot was when it planned */
    from: Position;
    /** Where it is trying to get to */
    to: Position;
    /** Every waypoint, in order */
    waypoints: Position[];
    /** How each leg has to be travelled; one shorter than the waypoints */
    legs: LinkKind[];
    /** Whether the destination is unreachable and this only gets as close as it can */
    partial: boolean;
}

/** What the bot decided on a single tick, emitted as {@link GameEvents.pathStep} */
export interface PathStep {
    /** Which waypoint it is heading for */
    cursor: number;
    /** How many waypoints the path has */
    length: number;
    /** Where the bot is */
    position: Position;
    /** The waypoint it is walking to */
    waypoint: Position;
    /** How this leg is meant to be travelled */
    kind: LinkKind | null;
    /** The control keys it is about to hold */
    keys: number;
    /** The yaw it is about to face */
    yaw: number;
    /** How far it still is from the waypoint, horizontally */
    distance: number;
    /** Its ground ticker; 0 means airborne */
    onGround: number;
    /** Whether it is on a ladder */
    climbing: boolean;
    /** How many ticks it has gone without getting closer */
    idle: number;
    /** How many ticks of patience are left before it gives up */
    budget: number;
}

/** Options for a {@link Pathfinder.goTo} */
export interface PathOptions {
    /** How close the bot has to get before the destination counts as reached; defaults to 1 */
    reach?: number;
    /** Whether to keep re-routing as the destination moves, for chasing a player; defaults to true */
    follow?: boolean;
}

/** A planned route, and how far along it the bot is */
export interface ActivePath {
    /** The nodes to travel through, in order */
    nodes: PathNode[];
    /** Which node the bot is heading for */
    cursor: number;
    /** Where the route was asked to end up */
    destination: Position;
    /** How close counts as arrived */
    reach: number;
    /** Whether the route re-plans when the destination moves */
    follow: boolean;
    /** Whether the route only gets as close as the map allows, because the destination is unreachable */
    partial: boolean;
}

/** How far the destination has to move before a following route re-plans */
const REPLAN_DISTANCE = 2.5;

/** How far off the next waypoint the bot can land before the plan is worth redoing */
const DRIFT_DISTANCE = 2.5;

/** How many ticks of going nowhere it takes to start jumping at the problem */
const NUDGE_TICKS = 20;

/** How many ticks of going nowhere it takes to give up on the current plan */
const STUCK_TICKS = 50;

/** How many times a single path may be re-planned around an obstacle before the bot admits defeat */
const MAX_RECOVERIES = 3;

/** How many ticks of slack, on top of the plan's own estimate, before the bot stops trying */
const BUDGET_SLACK = 300;

/** How many times over the plan's own estimate the bot is allowed to take */
const BUDGET_FACTOR = 3;

/** How many ticks must pass between re-plans */
const REPLAN_COOLDOWN = 12;

/** How close to a waypoint counts as having got there. Landing on a one block pillar can leave the bot most of a tile from its centre, and a tighter radius has it walk straight off the far side looking for the middle */
const WAYPOINT_REACH = 0.62;

/** How far above or below a waypoint the bot can be and still count as having reached it */
const WAYPOINT_RISE = 0.6;

/** How far in front of a ladder the bot aims, to line itself up with the middle of the rung */
const LADDER_AIM = 0.75;

/** How much closer to the waypoint the bot has to get for a tick to count as progress */
const PROGRESS_EPSILON = 0.02;

const TAU = Math.PI * 2;
const mod = (n: number, m: number): number => ((n % m) + m) % m;

/**
 * Plans routes across a {@link PathGraph} and steers the bot along them.
 *
 * Steering happens one tick at a time and only ever writes control keys and yaw, exactly as if
 * something were at the keyboard - so while a route is active the navigator owns
 * {@link Game.state}'s yaw, and a {@link LookAtDispatch} will fight it for the mouse.
 * {@link Pathfinder.stop} hands it back.
 */
export class Pathfinder {
    /** The bot being steered */
    bot: Bot;
    /** The game being navigated */
    game: Game;
    /** The map's collision geometry */
    colliders: ColliderSet;

    /** The route currently being walked, if any */
    route: ActivePath | null = null;

    #graph: PathGraph | null = null;
    #lastDistance = Infinity;
    #idleTicks = 0;
    #recoveries = 0;
    #budget = 0;
    #cooldown = 0;

    /**
     * Creates a navigator
     * @param bot The bot to steer
     * @param game The game to navigate
     * @param colliders The map's collision geometry
     */
    constructor(bot: Bot, game: Game, colliders: ColliderSet) {
        this.bot = bot;
        this.game = game;
        this.colliders = colliders;
    }

    /** The walkable graph, built on first use. Building it takes a moment on a big map */
    get graph(): PathGraph {
        this.#graph ??= new PathGraph(this.colliders);
        return this.#graph;
    }

    /** Whether the graph has already been built, so that touching {@link Pathfinder.graph} is free */
    isReady(): boolean {
        return !!this.#graph;
    }

    /**
     * Builds the walkable graph now, so that the first {@link Pathfinder.goTo} does not have to
     * @returns The graph
     */
    warm(): PathGraph {
        return this.graph;
    }

    /**
     * Plans a route to a position and starts walking it
     * @param destination Where to end up
     * @param options How to get there
     * @param reason Why the bot is planning; only affects what {@link GameEvents.pathPlan} reports
     * @returns Whether a route was found; a failure also emits {@link GameEvents.pathError}
     */
    goTo(destination: Position, options: PathOptions = {}, reason = PathReason.Requested): boolean {
        const start = this.graph.nearest(this.game.me.position);
        if (!start) return this.#fail(PathError.LostStart);

        const finish = this.graph.nearest(destination);
        if (!finish) return this.#fail(PathError.LostDestination);

        const result = this.graph.route(start, finish);
        if (result.partial && result.nodes.length < 2) return this.#fail(PathError.NoRoute);

        this.route = {
            nodes: result.nodes,
            cursor: 0,
            destination: { ...destination },
            reach: options.reach ?? 1,
            follow: options.follow ?? true,
            partial: result.partial
        };

        this.#lastDistance = Infinity;
        this.#idleTicks = 0;
        this.#cooldown = REPLAN_COOLDOWN;
        this.#budget = BUDGET_SLACK + BUDGET_FACTOR * result.nodes.reduce(
            (total, node, index) => total + (index ? flatDistance(node.position, result.nodes[index - 1].position) / WALK_SPEED : 0),
            0
        );

        if (this.bot.hasHook('pathPlan')) this.bot.$emit('pathPlan', {
            reason,
            from: { ...this.game.me.position },
            to: { ...destination },
            waypoints: result.nodes.map(node => ({ ...node.position })),
            legs: result.nodes.slice(1).map((node, index) => this.#legKind(result.nodes[index], node) ?? LinkKind.Walk),
            partial: result.partial
        });

        return true;
    }

    /** How the leg between two consecutive waypoints is meant to be travelled */
    #legKind(from: PathNode | undefined, to: PathNode): LinkKind | null {
        return from?.links.find(link => link.to === to.id)?.kind ?? null;
    }

    /** Abandons the current route and lets go of the controls */
    stop(): void {
        if (!this.route) return;

        this.route = null;
        this.game.state.controlKeys = 0;
        this.#recoveries = 0;
    }

    /**
     * Re-plans to the same destination from wherever the bot has ended up, without resetting how
     * patient it is - a plan that has already been re-thought three times is not going to be
     * salvaged by a fourth.
     */
    #replan(from: ActivePath, reason: PathReason): boolean {
        const destination = from.destination;
        const options: PathOptions = { reach: from.reach, follow: from.follow };

        const recoveries = this.#recoveries;
        const budget = this.#budget;

        this.route = null;

        if (!this.goTo(destination, options, reason)) return false;

        this.#recoveries = recoveries;
        this.#budget = budget;

        return true;
    }

    #fail(error: PathError): false {
        this.stop();
        this.bot.$emit('pathError', error);
        return false;
    }

    #arrive(partial: boolean): void {
        this.route = null;
        this.game.state.controlKeys = 0;

        if (partial) this.bot.$emit('pathError', PathError.NoRoute);
        else this.bot.$emit('pathComplete');
    }

    /** Points the bot at a position, using the same yaw the aiming dispatches use */
    #face(target: Position): void {
        this.#faceDirection(target.x - this.game.me.position.x, target.z - this.game.me.position.z);
    }

    /** Points the bot along a direction */
    #faceDirection(dx: number, dz: number): void {
        this.game.state.yaw = mod(Math.atan2(-dx, -dz), TAU);
    }

    /** Steers one tick along the active route. Called for you by the game's update loop */
    update(): void {
        const route = this.route;
        if (!route || !this.game.me.playing) return;

        if (--this.#budget < 0) {
            this.#fail(PathError.Stuck);
            return;
        }

        if (this.#cooldown > 0) this.#cooldown--;

        if (this.#cooldown === 0 && route.follow
            && flatDistance(route.destination, route.nodes[route.nodes.length - 1].position) > REPLAN_DISTANCE) {
            const budget = this.#budget;

            this.route = null;
            if (!this.goTo(route.destination, { reach: route.reach, follow: route.follow }, PathReason.TargetMoved)) return;

            this.#budget = Math.min(this.#budget, budget + BUDGET_SLACK);
        }

        const current = this.route;
        if (!current) return;

        const me = this.game.me;

        if (this.#cooldown === 0 && current.cursor > 0 && this.game.state.onGround > 0
            && flatDistance(me.position, current.nodes[current.cursor].position) > DRIFT_DISTANCE) {
            this.#replan(current, PathReason.Drifted);
            return;
        }

        while (current.cursor < current.nodes.length && this.#reached(current.nodes[current.cursor], current)) {
            current.cursor++;
            this.#lastDistance = Infinity;
            this.#idleTicks = 0;
        }

        if (current.cursor >= current.nodes.length) return this.#arrive(current.partial);

        const waypoint = current.nodes[current.cursor];
        const previous = current.nodes[current.cursor - 1];
        const link = previous?.links.find(candidate => candidate.to === waypoint.id);

        this.#face(waypoint.position);

        let keys: number = Movement.Forward;

        if (link?.kind === LinkKind.Hop || link?.kind === LinkKind.Pad) keys |= Movement.Jump;

        if (link?.kind === LinkKind.Leap && previous) {
            const runX = waypoint.position.x - previous.position.x;
            const runZ = waypoint.position.z - previous.position.z;
            const run = Math.hypot(runX, runZ);

            if (run > 0) {
                const dirX = runX / run;
                const dirZ = runZ / run;

                const along = (me.position.x - previous.position.x) * dirX + (me.position.z - previous.position.z) * dirZ;
                const lip = 0.5 / Math.max(Math.abs(runX), Math.abs(runZ)) * run;

                const speed = this.game.state.dx * dirX + this.game.state.dz * dirZ;

                if (along >= lip - LEAP_WINDOW && along <= lip + LEDGE_OVERHANG && speed >= WALK_SPEED * LEAP_SPEED)
                    keys |= Movement.Jump;
            }
        }

        const rung = waypoint.ladder ? waypoint : previous?.ladder ? previous : null;

        if (link?.kind === LinkKind.Ladder && rung && !me.climbing) {
            const [fx, fz] = FACING[rung.ry];
            const inCell = Math.floor(me.position.x) === rung.cx && Math.floor(me.position.z) === rung.cz;

            if (!inCell) this.#face(rung.position);
            else {
                const aim = { x: rung.position.x + fx * LADDER_AIM, y: 0, z: rung.position.z + fz * LADDER_AIM };
                if (flatDistance(me.position, aim) > LADDER_AIM * 0.5) this.#face(aim);
                else this.#faceDirection(fx, fz);
            }
        }

        if (this.#idleTicks > NUDGE_TICKS && this.game.state.onGround && !me.climbing
            && waypoint.position.y > me.position.y + PROGRESS_EPSILON
            && link?.kind !== LinkKind.Ladder && link?.kind !== LinkKind.Drop) keys |= Movement.Jump;

        if (link?.kind === LinkKind.Drop && !this.game.state.onGround && !me.climbing
            && me.position.y < previous.position.y - 0.1
            && Math.floor(me.position.x) === waypoint.cx && Math.floor(me.position.z) === waypoint.cz) keys = 0;

        if (link?.kind === LinkKind.Ladder && me.climbing && waypoint.position.y < me.position.y)
            keys = Movement.Backward;

        this.game.state.controlKeys = keys;

        const distance = flatDistance(me.position, waypoint.position);

        if (this.bot.hasHook('pathStep')) this.bot.$emit('pathStep', {
            cursor: current.cursor,
            length: current.nodes.length,
            position: { ...me.position },
            waypoint: { ...waypoint.position },
            kind: link?.kind ?? null,
            keys,
            yaw: this.game.state.yaw,
            distance,
            onGround: this.game.state.onGround,
            climbing: me.climbing,
            idle: this.#idleTicks,
            budget: Math.round(this.#budget)
        });

        if (distance < this.#lastDistance - PROGRESS_EPSILON) {
            this.#lastDistance = distance;
            this.#idleTicks = 0;
        } else if (++this.#idleTicks > STUCK_TICKS) {
            if (++this.#recoveries > MAX_RECOVERIES) this.#fail(PathError.Stuck);
            else this.#replan(current, PathReason.Stuck);
        }
    }

    /** Whether the bot is close enough to a waypoint to move on to the next one */
    #reached(node: PathNode, route: ActivePath): boolean {
        const me = this.game.me;
        const last = node.id === route.nodes[route.nodes.length - 1].id;

        const radius = last ? route.reach : WAYPOINT_REACH;
        const headroom = node.ladder ? 0.6 : WAYPOINT_RISE;

        if (!last && !this.game.state.onGround && !me.climbing) return false;

        return flatDistance(me.position, node.position) < radius && Math.abs(me.position.y - node.position.y) < headroom;
    }
}

/**
 * This file is licensed under the MPL 2.0 license.
 * For more information, see https://mozilla.org/MPL/2.0/.
 *
 * This file is part of the yolkbot library,
 * originally created by hijinks & 1ust.
 */

import { ColliderType, type ColliderSet } from './ColliderSet.js';
import { flatDistance } from './math.js';

import {
    CLIMB_SPEED,
    GRAVITY,
    HOP_HEIGHT,
    LADDER_REACH_DOWN,
    LADDER_REACH_UP,
    LADDER_STEP_OFF,
    JUMP_HEIGHT,
    JUMP_REACH,
    LEAP_DROP,
    LEAP_GAP,
    LEAP_RISE,
    LEDGE_OVERHANG,
    MAX_CLIMB,
    MAX_DROP,
    PAD_HEIGHT,
    PAD_REACH,
    PLAYER_RADIUS,
    PROBE_STEP,
    STEP_HEIGHT,
    SURFACE_STEP,
    WALK_SPEED
} from './physics.js';

import type { Position } from '../../util.js';

/** Which way a cell's quarter-turn rotation points, used to find the face a ladder is mounted on */
export const FACING = [[0, -1], [-1, 0], [0, 1], [1, 0]] as const;

/** How a link between two {@link PathNode}s is meant to be travelled */
export enum LinkKind {
    /** Walk straight across; the step is small enough that the collision sphere rides over it */
    Walk = 0,
    /** Hold jump to get over the lip */
    Hop = 1,
    /** Walk off the edge and fall */
    Drop = 2,
    /** Hold forward against a ladder and ride it up or down */
    Ladder = 3,
    /** Ride a jump pad up */
    Pad = 4,
    /** Run at the edge and jump the gap */
    Leap = 5
}

/** A place the player can be, and the ways out of it */
export interface PathNode {
    /** The node's index in {@link PathGraph.nodes} */
    id: number;
    /** Where the player's feet sit */
    position: Position;
    /** The cell column the node belongs to */
    cx: number;
    /** The cell column the node belongs to */
    cz: number;
    /** Whether the node is a rung on a ladder rather than a place to stand */
    ladder: boolean;
    /** For a rung, the quarter-turn the ladder is mounted at; you have to push into that face to grab it */
    ry: number;
    /** For a spot on a ramp, the quarter-turn its slope runs along; -1 anywhere else */
    ramp: number;
    /** Whether the player would be standing on a jump pad here */
    pad: boolean;
    /** Every way out of the node */
    links: PathLink[];
}

/** The outcome of a {@link PathGraph.route} */
export interface PathResult {
    /** The nodes to travel through, starting where the search started */
    nodes: PathNode[];
    /** Whether the destination turned out to be unreachable, so these nodes only get as close as the map allows */
    partial: boolean;
}

/** A one-way connection between two {@link PathNode}s */
export interface PathLink {
    /** The node being travelled to */
    to: number;
    /** Roughly how many ticks travelling it costs */
    cost: number;
    /** How it has to be travelled */
    kind: LinkKind;
}

/** How finely a link's clearance is sampled along its length */
const CLEARANCE_STEP = 0.25;

const NEIGHBOURS = [
    [1, 0], [-1, 0], [0, 1], [0, -1],
    [1, 1], [1, -1], [-1, 1], [-1, -1]
] as const;

/** A binary min-heap over node ids, keyed by their estimated total cost */
class Heap {
    #ids: number[] = [];
    #keys: number[] = [];

    get size(): number {
        return this.#ids.length;
    }

    push(id: number, key: number): void {
        this.#ids.push(id);
        this.#keys.push(key);

        let i = this.#ids.length - 1;

        while (i > 0) {
            const parent = (i - 1) >> 1;
            if (this.#keys[parent] <= this.#keys[i]) break;

            this.#swap(i, parent);
            i = parent;
        }
    }

    pop(): number {
        const top = this.#ids[0];
        const id = this.#ids.pop() ?? 0;
        const key = this.#keys.pop() ?? 0;

        if (this.#ids.length) {
            this.#ids[0] = id;
            this.#keys[0] = key;

            let i = 0;

            for (;;) {
                const left = i * 2 + 1;
                const right = left + 1;
                let smallest = i;

                if (left < this.#ids.length && this.#keys[left] < this.#keys[smallest]) smallest = left;
                if (right < this.#ids.length && this.#keys[right] < this.#keys[smallest]) smallest = right;
                if (smallest === i) break;

                this.#swap(i, smallest);
                i = smallest;
            }
        }

        return top;
    }

    #swap(a: number, b: number): void {
        [this.#ids[a], this.#ids[b]] = [this.#ids[b], this.#ids[a]];
        [this.#keys[a], this.#keys[b]] = [this.#keys[b], this.#keys[a]];
    }
}

/**
 * The walkable graph for a map: everywhere the player can stand, and how to get between those
 * places. Built once per map by probing a {@link ColliderSet} with the player's own collision
 * sphere, so the graph is a consequence of the real geometry rather than of block names - a prop
 * you can walk over produces nodes, and a prop you cannot does not, without anything having to
 * classify it.
 *
 * Building is the expensive part of navigation and takes a moment on a large map, so a
 * {@link Pathfinder} only does it the first time something actually asks for a route.
 */
export class PathGraph {
    /** The geometry the graph was probed out of */
    colliders: ColliderSet;

    /** Every node in the graph */
    nodes: PathNode[] = [];

    /** How long the graph took to build, in milliseconds */
    buildTime = 0;

    #columns: Map<number, PathNode[]> = new Map();

    /**
     * Builds the walkable graph for a map
     * @param colliders The map's collision geometry
     */
    constructor(colliders: ColliderSet) {
        this.colliders = colliders;

        const started = Date.now();

        this.#placeNodes();
        this.#placeLadders();
        this.#linkNodes();

        this.buildTime = Date.now() - started;
    }

    #columnKey(cx: number, cz: number): number {
        return cx * (this.colliders.depth + 1) + cz;
    }

    /**
     * Every node standing in a cell column, ordered from the ground up.
     * @param cx The column X
     * @param cz The column Z
     * @returns The nodes in that column, or nothing if it is off the map
     */
    column(cx: number, cz: number): PathNode[] {
        if (cx < 0 || cz < 0 || cx >= this.colliders.width || cz >= this.colliders.depth) return [];
        return this.#columns.get(this.#columnKey(cx, cz)) ?? [];
    }

    #addNode(cx: number, cz: number, y: number, ladder: boolean, pad: boolean, ry = 0, ramp = -1): PathNode {
        const node: PathNode = {
            id: this.nodes.length,
            position: { x: cx + 0.5, y, z: cz + 0.5 },
            cx,
            cz,
            ladder,
            ry,
            ramp,
            pad,
            links: []
        };

        this.nodes.push(node);

        const key = this.#columnKey(cx, cz);
        const column = this.#columns.get(key);

        if (column) column.push(node);
        else this.#columns.set(key, [node]);

        return node;
    }

    /** Whether the player's collision sphere fits with their feet at a height, anywhere on the map rather than at a cell's centre */
    #fitsAt(x: number, z: number, feet: number): boolean {
        return this.colliders.fits(x, feet + PLAYER_RADIUS, z, PLAYER_RADIUS);
    }

    /**
     * Drops the player at any point on the map to find what they would land on
     * @param x The world X
     * @param z The world Z
     * @param from The height to drop from
     * @returns The height the player's feet would come to rest at, or null if there is nothing to land on within a block
     */
    #restingHeightAt(x: number, z: number, from: number): number | null {
        if (!this.#fitsAt(x, z, from)) return null;

        let blocked = from - 1;
        let clear = from;

        if (this.#fitsAt(x, z, blocked)) return null;

        for (let i = 0; i < 7; i++) {
            const middle = (blocked + clear) * 0.5;
            if (this.#fitsAt(x, z, middle)) clear = middle;
            else blocked = middle;
        }

        return clear;
    }

    /**
     * Walks the surface between two nodes a sample at a time and works out what the trip takes.
     *
     * The height difference between two nodes says nothing on its own about whether the player can
     * get up it: two stair cells in a row sit a full block apart at their centres, but the surface
     * between them is one unbroken slope you stroll up, while a half-block ledge is a step you
     * have to jump. What matters is the biggest rise between consecutive footholds, not the total.
     *
     * @param from The node being left
     * @param to The node being entered
     * @returns How the trip has to be made, or null if it cannot be made at all
     */
    #profile(from: PathNode, to: PathNode): LinkKind | null {
        const steps = Math.max(2, Math.ceil(flatDistance(from.position, to.position) / SURFACE_STEP));

        let height = from.position.y;
        let hops = 0;

        for (let i = 1; i <= steps; i++) {
            const t = i / steps;
            const x = from.position.x + (to.position.x - from.position.x) * t;
            const z = from.position.z + (to.position.z - from.position.z) * t;

            const surface = this.#restingHeightAt(x, z, height + HOP_HEIGHT);
            if (surface === null) return null;

            const rise = surface - height;

            if (rise > HOP_HEIGHT) return null;
            if (rise > STEP_HEIGHT && ++hops > 1) return null;

            height = surface;
        }

        if (Math.abs(height - to.position.y) > STEP_HEIGHT) return null;

        return hops ? LinkKind.Hop : LinkKind.Walk;
    }

    /**
     * Finds every standing spot on the map.
     *
     * Each cell with something in it is scanned from its floor to two cells above, looking for the
     * moment the player's sphere stops overlapping the map - the bottom of each of those clear
     * runs is somewhere they can stand, refined to the exact height they would settle at.
     */
    #placeNodes(): void {
        const seen: Set<number> = new Set();

        for (let cx = 0; cx < this.colliders.width; cx++)
            for (let cz = 0; cz < this.colliders.depth; cz++) {
                const x = cx + 0.5;
                const z = cz + 0.5;

                for (let cy = 0; cy < this.colliders.height; cy++) {
                    if (!this.colliders.cellAt(cx, cy, cz)) continue;

                    let blocked = !this.#fitsAt(x, z, cy - PROBE_STEP);

                    for (let feet = cy; feet <= cy + 2; feet += PROBE_STEP) {
                        const clear = this.#fitsAt(x, z, feet);

                        if (clear && blocked) {
                            const rest = this.#settle(x, z, feet - PROBE_STEP, feet);
                            const key = this.#columnKey(cx, cz) * 4096 + Math.round(rest * 8);

                            if (!seen.has(key)) {
                                seen.add(key);

                                const below = this.colliders.cellAt(cx, Math.floor(rest - 0.5), cz);
                                const on = this.colliders.cellAt(cx, Math.floor(rest), cz);
                                const ramp = on && (on.type & (ColliderType.Wedge | ColliderType.IWedge)) ? on.ry % 4 : -1;

                                this.#addNode(cx, cz, rest, false, below?.shortName === 'jump-pad', 0, ramp);
                            }
                        }

                        blocked = !clear;
                    }
                }
            }

        for (const column of this.#columns.values()) column.sort((a, b) => a.position.y - b.position.y);
    }

    /**
     * Narrows down the exact height the player settles at, between a height they overlap the map
     * at and one they do not
     * @param x The world X
     * @param z The world Z
     * @param blocked A height the player does not fit at
     * @param clear A height the player does fit at
     * @returns The lowest height they fit at
     */
    #settle(x: number, z: number, blocked: number, clear: number): number {
        for (let i = 0; i < 7; i++) {
            const middle = (blocked + clear) * 0.5;
            if (this.#fitsAt(x, z, middle)) clear = middle;
            else blocked = middle;
        }

        return clear;
    }

    /** Puts a rung in every ladder cell, and chains each ladder together top to bottom */
    #placeLadders(): void {
        const rungs: Map<number, PathNode[]> = new Map();

        for (let cx = 0; cx < this.colliders.width; cx++)
            for (let cz = 0; cz < this.colliders.depth; cz++)
                for (let cy = 0; cy < this.colliders.height; cy++) {
                    const cell = this.colliders.cellAt(cx, cy, cz);
                    if (cell?.type !== ColliderType.Ladder) continue;

                    const node = this.#addNode(cx, cz, cy + 0.05, true, false, cell.ry % 4);
                    const key = this.#columnKey(cx, cz);

                    const stack = rungs.get(key);
                    if (stack) stack.push(node);
                    else rungs.set(key, [node]);
                }

        for (const stack of rungs.values()) {
            stack.sort((a, b) => a.position.y - b.position.y);

            for (let i = 0; i + 1 < stack.length; i++) {
                const lower = stack[i];
                const upper = stack[i + 1];

                if (upper.position.y - lower.position.y > 1.5) continue;

                const cost = (upper.position.y - lower.position.y) / CLIMB_SPEED;

                lower.links.push({ to: upper.id, cost, kind: LinkKind.Ladder });
                upper.links.push({ to: lower.id, cost: cost * 0.6, kind: LinkKind.Ladder });
            }
        }

        for (const column of this.#columns.values()) column.sort((a, b) => a.position.y - b.position.y);
    }

    /**
     * Whether the player's sphere can travel between two columns at a height without clipping
     * anything, sampled along the way
     */
    #clear(fromX: number, fromZ: number, toX: number, toZ: number, feet: number): boolean {
        const dx = toX - fromX;
        const dz = toZ - fromZ;

        const steps = Math.max(1, Math.ceil(Math.hypot(dx, dz) / CLEARANCE_STEP));

        for (let i = 0; i <= steps; i++) {
            const t = i / steps;

            if (!this.colliders.fits(fromX + 0.5 + dx * t, feet + PLAYER_RADIUS, fromZ + 0.5 + dz * t, PLAYER_RADIUS))
                return false;
        }

        return true;
    }

    /** Whether anything in a node's own column would catch the player before they got down to it */
    #obstructed(node: PathNode, from: number): boolean {
        for (const other of this.column(node.cx, node.cz))
            if (other !== node && !other.ladder && other.position.y > node.position.y && other.position.y <= from + STEP_HEIGHT)
                return true;

        return false;
    }

    /** Whether a diagonal move would squeeze through a gap that neither of its cardinal halves allows */
    #cornerClear(node: PathNode, dx: number, dz: number, feet: number): boolean {
        if (!dx || !dz) return true;

        return this.#clear(node.cx, node.cz, node.cx + dx, node.cz, feet)
            && this.#clear(node.cx, node.cz, node.cx, node.cz + dz, feet);
    }

    /** Connects every standing node to its neighbours, and wires up ladder and jump pad entries */
    #linkNodes(): void {
        for (const node of this.nodes) {
            if (node.ladder) this.#linkLadderEnds(node);
            else {
                this.#linkNeighbours(node);
                this.#linkLeaps(node);
                if (node.pad) this.#linkPad(node);
            }
        }
    }

    #linkNeighbours(node: PathNode): void {
        for (const [dx, dz] of NEIGHBOURS) {
            const diagonal = dx !== 0 && dz !== 0;
            const span = diagonal ? Math.SQRT2 : 1;

            for (const other of this.column(node.cx + dx, node.cz + dz)) {
                if (other.ladder) continue;
                if (this.#offRamp(node, other, dx, dz)) continue;

                const rise = other.position.y - node.position.y;
                if (rise > MAX_CLIMB || rise < -MAX_DROP) continue;

                const feet = Math.max(node.position.y, other.position.y);

                if (!this.#cornerClear(node, dx, dz, feet)) continue;
                if (!this.#clear(node.cx, node.cz, other.cx, other.cz, feet)) continue;

                let kind = LinkKind.Walk;
                let cost = span / WALK_SPEED;

                if (rise > STEP_HEIGHT) {
                    const climb = this.#profile(node, other);
                    if (climb === null) continue;

                    kind = climb;
                    if (kind === LinkKind.Hop) cost += 12;
                } else if (rise < -STEP_HEIGHT) {
                    if (this.#obstructed(other, node.position.y)) continue;

                    kind = LinkKind.Drop;
                    cost += Math.sqrt((2 * -rise) / GRAVITY);
                }

                node.links.push({ to: other.id, cost, kind });
            }
        }
    }

    /** Wires up the gaps a jump can clear. */
    #linkLeaps(node: PathNode): void {
        for (let dx = -LEAP_GAP; dx <= LEAP_GAP; dx++)
            for (let dz = -LEAP_GAP; dz <= LEAP_GAP; dz++) {
                if (Math.max(Math.abs(dx), Math.abs(dz)) < LEAP_GAP) continue;

                const span = Math.hypot(dx, dz);

                const edge = 0.5 / Math.max(Math.abs(dx), Math.abs(dz)) * span + LEDGE_OVERHANG;
                if (span - edge * 2 > JUMP_REACH) continue;

                for (const other of this.column(node.cx + dx, node.cz + dz)) {
                    if (other.ladder) continue;
                    if (this.#offRamp(node, other, dx, dz)) continue;

                    const rise = other.position.y - node.position.y;
                    if (rise > LEAP_RISE || rise < -LEAP_DROP) continue;

                    if (this.#crossable(node, dx, dz)) continue;

                    if (!this.#clear(node.cx, node.cz, other.cx, other.cz, node.position.y + JUMP_HEIGHT * 0.5)) continue;

                    node.links.push({ to: other.id, cost: span / WALK_SPEED + 30, kind: LinkKind.Leap });
                }
            }
    }

    /**
     * Whether a move on or off a ramp is being attempted from a side it cannot be attempted from.
     *
     * A ramp is only a slope along one axis; from any other direction it is a wall with a sloped
     * top, and you cannot get onto it - not by walking and not by jumping. Anything touching a
     * ramp therefore has to travel along its axis, which also rules out approaching one diagonally.
     *
     * @param from The node being left
     * @param to The node being entered
     * @param dx The move's X direction
     * @param dz The move's Z direction
     * @returns Whether the move is off-axis for a ramp at either end
     */
    #offRamp(from: PathNode, to: PathNode, dx: number, dz: number): boolean {
        for (const node of [from, to]) {
            if (node.ramp < 0) continue;

            const [fx, fz] = FACING[node.ramp];

            if (fx !== 0 && dz !== 0) return true;
            if (fz !== 0 && dx !== 0) return true;
        }

        return false;
    }

    /** Whether there is anywhere to stand between a node and something it is thinking of jumping to */
    #crossable(node: PathNode, dx: number, dz: number): boolean {
        for (let step = 1; step < LEAP_GAP * 2; step++) {
            const t = step / (LEAP_GAP * 2);
            const cx = node.cx + Math.round(dx * t);
            const cz = node.cz + Math.round(dz * t);

            if (cx === node.cx && cz === node.cz) continue;
            if (cx === node.cx + dx && cz === node.cz + dz) continue;

            if (this.column(cx, cz).some(between => Math.abs(between.position.y - node.position.y) < 1)) return true;
        }

        return false;
    }

    /**
     * Wires a ladder rung to whatever is next to it. A ladder is mounted on one face of its cell,
     * so the two columns along that axis are the ones you can step on and off from.
     *
     * Getting on is much fussier than getting off: the game only lets you grab a ladder whose cell
     * is roughly level with you, so a rung well above your head is not an entrance no matter how
     * close you stand to it. Stepping off the top is the tail end of a climb, and reaches further.
     */
    #linkLadderEnds(node: PathNode): void {
        const cell = this.colliders.cellAt(node.cx, Math.floor(node.position.y), node.cz);
        if (!cell) return;

        for (const [dx, dz] of FACING)
            for (const other of this.column(node.cx + dx, node.cz + dz)) {
                if (other.ladder) continue;

                const rise = other.position.y - node.position.y;
                if (!this.#clear(other.cx, other.cz, node.cx, node.cz, Math.max(node.position.y, other.position.y))) continue;

                const cost = 1 / WALK_SPEED + 6;

                if (rise > -LADDER_STEP_OFF && rise < LADDER_STEP_OFF)
                    node.links.push({ to: other.id, cost, kind: LinkKind.Ladder });

                if (-rise > -LADDER_REACH_DOWN && -rise < LADDER_REACH_UP)
                    other.links.push({ to: node.id, cost, kind: LinkKind.Ladder });
            }
    }

    /** Wires a jump pad to everywhere it could plausibly throw the player */
    #linkPad(node: PathNode): void {
        for (let dx = -PAD_REACH; dx <= PAD_REACH; dx++)
            for (let dz = -PAD_REACH; dz <= PAD_REACH; dz++)
                for (const other of this.column(node.cx + dx, node.cz + dz)) {
                    if (other.ladder || other.id === node.id) continue;

                    const rise = other.position.y - node.position.y;
                    if (rise <= HOP_HEIGHT || rise > PAD_HEIGHT) continue;
                    if (!this.colliders.canSee(node.position, other.position)) continue;

                    node.links.push({
                        to: other.id,
                        cost: rise / WALK_SPEED + Math.hypot(dx, dz) / WALK_SPEED,
                        kind: LinkKind.Pad
                    });
                }
    }

    /**
     * Finds the node closest to a position, preferring nodes the player could actually be standing on
     * @param position The position to snap
     * @param radius How many cells sideways to look
     * @returns The nearest node, or null if the position is nowhere near the walkable map
     */
    nearest(position: Position, radius = 3): PathNode | null {
        const cx = Math.floor(position.x);
        const cz = Math.floor(position.z);

        let best: PathNode | null = null;
        let bestScore = Infinity;

        for (let dx = -radius; dx <= radius; dx++)
            for (let dz = -radius; dz <= radius; dz++)
                for (const node of this.column(cx + dx, cz + dz)) {
                    const drop = position.y - node.position.y;

                    const score = flatDistance(position, node.position) + (drop < 0 ? -drop * 4 : drop);

                    if (score < bestScore) {
                        bestScore = score;
                        best = node;
                    }
                }

        return best;
    }

    /**
     * Searches for the cheapest route between two nodes.
     *
     * Plenty of the map is one-way - a standing jump clears about two thirds of a block, so any
     * ledge you drop off is a ledge you cannot climb back up. Rather than refusing to move at all
     * when the destination is on the wrong side of one, the search falls back to the closest place
     * it did manage to reach and says so.
     *
     * @param from The node to start at
     * @param to The node to finish at
     * @returns The route, flagged as partial if the destination could not actually be reached
     */
    route(from: PathNode, to: PathNode): PathResult {
        if (from.id === to.id) return { nodes: [from], partial: false };

        const count = this.nodes.length;

        const best = new Float64Array(count).fill(Infinity);
        const cameFrom = new Int32Array(count).fill(-1);
        const closed = new Uint8Array(count);

        const open = new Heap();

        best[from.id] = 0;
        open.push(from.id, this.#heuristic(from, to));

        let nearest = from;
        let nearestGap = this.#heuristic(from, to);

        while (open.size) {
            const current = open.pop();

            if (current === to.id) return { nodes: this.#unwind(cameFrom, to), partial: false };
            if (closed[current]) continue;

            closed[current] = 1;

            const gap = this.#heuristic(this.nodes[current], to);
            if (gap < nearestGap) {
                nearestGap = gap;
                nearest = this.nodes[current];
            }

            for (const link of this.nodes[current].links) {
                if (closed[link.to]) continue;

                const cost = best[current] + link.cost;
                if (cost >= best[link.to]) continue;

                best[link.to] = cost;
                cameFrom[link.to] = current;

                open.push(link.to, cost + this.#heuristic(this.nodes[link.to], to));
            }
        }

        return { nodes: this.#unwind(cameFrom, nearest), partial: true };
    }

    #heuristic(node: PathNode, to: PathNode): number {
        return (flatDistance(node.position, to.position) + Math.abs(node.position.y - to.position.y)) / WALK_SPEED;
    }

    #unwind(cameFrom: Int32Array, to: PathNode): PathNode[] {
        const out: PathNode[] = [];

        for (let id = to.id; id !== -1; id = cameFrom[id]) out.push(this.nodes[id]);

        return out.reverse();
    }
}

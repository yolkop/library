/**
 * This file is licensed under the MPL 2.0 license.
 * For more information, see https://mozilla.org/MPL/2.0/.
 *
 * This file is part of the yolkbot library,
 * originally created by hijinks & 1ust.
 */

import { Shapes } from '#env/DataLoader';

import { clamp, fromEuler, fromQuat, isIdentity, mul, transform, untransform, type Mat3 } from './math.js';

import { getPositionKey, type Position } from '../../util.js';

import type { MapCell, MapJSON } from '../../types/Map.js';

/** The collision shape a map mesh resolves to, as a bitmask. Anything not in here (`none`, decorative trims) has no collision at all */
export enum ColliderType {
    /** A plain unit cube */
    Full = 1,
    /** A ramp; a big box tilted 45 degrees so its top face forms the slope */
    Wedge = 2,
    /** An upside-down {@link ColliderType.Wedge}, used for ceilings */
    IWedge = 4,
    /** A prop that keeps the cell's own orientation */
    AABB = 8,
    /** A prop carrying its own orientation on top of the cell's */
    OBB = 16,
    /** A climbable plate stuck to one face of the cell */
    Ladder = 32
}

const TYPE_BY_NAME: Record<string, ColliderType> = {
    full: ColliderType.Full,
    wedge: ColliderType.Wedge,
    iwedge: ColliderType.IWedge,
    aabb: ColliderType.AABB,
    obb: ColliderType.OBB,
    ladder: ColliderType.Ladder
};

const PI90 = Math.PI / 2;

/** A plain `MeshBuilder.CreateBox({ size: 1 })` */
const FULL_MIN = [-0.5, -0.5, -0.5] as const;
const FULL_MAX = [0.5, 0.5, 0.5] as const;

/** A `size: 1.5` box shifted down by 0.75, so that tilting it 45 degrees leaves a ramp inside the cell */
const WEDGE_MIN = [-0.75, -1.5, -0.75] as const;
const WEDGE_MAX = [0.75, 0, 0.75] as const;

/** {@link WEDGE_MIN}/{@link WEDGE_MAX}, shifted up instead of down */
const IWEDGE_MIN = [-0.75, 0, -0.75] as const;
const IWEDGE_MAX = [0.75, 1.5, 0.75] as const;

/** Used when a prop has no baked collision proxy, matching what the server falls back to */
const FALLBACK_SHAPE = { min: FULL_MIN, max: FULL_MAX, rot: undefined };

/** A single oriented box in the collision world. Props decompose into several of these, one per box of their collision proxy */
export interface Collider {
    /** The box's local minimum corner */
    minX: number; minY: number; minZ: number;
    /** The box's local maximum corner */
    maxX: number; maxY: number; maxZ: number;
    /** The centre of the cell the box belongs to, which its local space is relative to */
    origin: Position;
    /** The box's rotation, from local space into world space */
    rot: Mat3;
    /** What kind of collision this box provides */
    type: ColliderType;
    /** The map cell that placed the box */
    cell: MapCell;
    /** The cell's quarter-turn rotation around Y, which ladders match the player's facing against */
    ry: number;
    /** The mesh's short name, e.g. `jump-pad` */
    shortName: string;
}

/** What sits in a single map cell, as far as the physics cares */
export interface CellInfo {
    /** The full mesh name, e.g. `generic.jump-pad.full` */
    mesh: string;
    /** The mesh's short name, e.g. `jump-pad` */
    shortName: string;
    /** The cell's collision shape */
    type: ColliderType;
    /** The cell's quarter-turn rotation around Y */
    ry: number;
    /** The raw cell out of the map data */
    cell: MapCell;
}

/** The result of a {@link ColliderSet.raycast} */
export interface RayHit {
    /** The box the ray hit */
    collider: Collider;
    /** How far along the ray the hit is */
    distance: number;
    /** The surface normal at the hit */
    normal: Position;
}

const scratchA: Position = { x: 0, y: 0, z: 0 };
const scratchB: Position = { x: 0, y: 0, z: 0 };
const scratchResolve: Position = { x: 0, y: 0, z: 0 };
const scratchNormal: Position = { x: 0, y: 0, z: 0 };
const probeCenter: Position = { x: 0, y: 0, z: 0 };
const probeResolve: Position = { x: 0, y: 0, z: 0 };
const probeNormal: Position = { x: 0, y: 0, z: 0 };
const rayDirection: Position = { x: 0, y: 0, z: 0 };

/**
 * Overlaps a sphere with one oriented box.
 *
 * The sphere is not quite a sphere: the radius is scaled down towards the box's horizontal faces
 * and left alone towards its vertical ones, so a player is really a slightly squashed ellipsoid
 * that is easier to squeeze between walls than to stand on the corner of something.
 *
 * @param center The sphere's centre
 * @param radius The sphere's radius
 * @param box The box to test against
 * @param resolve Receives the vector that separates the sphere from the box
 * @param normal Receives the surface normal at the contact
 * @returns Whether the sphere overlaps the box
 */
export const sphereVsBox = (center: Position, radius: number, box: Collider, resolve: Position, normal: Position): boolean => {
    const relX = center.x - box.origin.x;
    const relY = center.y - box.origin.y;
    const relZ = center.z - box.origin.z;

    if (isIdentity(box.rot)) {
        scratchA.x = relX;
        scratchA.y = relY;
        scratchA.z = relZ;
    } else untransform(box.rot, relX, relY, relZ, scratchA);

    const nearX = clamp(scratchA.x, box.minX, box.maxX);
    const nearY = clamp(scratchA.y, box.minY, box.maxY);
    const nearZ = clamp(scratchA.z, box.minZ, box.maxZ);

    if (Math.hypot(nearX - scratchA.x, nearY - scratchA.y, nearZ - scratchA.z) >= radius) return false;

    if (isIdentity(box.rot)) {
        scratchB.x = nearX - scratchA.x;
        scratchB.y = nearY - scratchA.y;
        scratchB.z = nearZ - scratchA.z;
    } else transform(box.rot, nearX - scratchA.x, nearY - scratchA.y, nearZ - scratchA.z, scratchB);

    const pointX = clamp(scratchB.x + relX, -0.5, 0.5) + box.origin.x;
    const pointY = clamp(scratchB.y + relY, -0.5, 0.5) + box.origin.y;
    const pointZ = clamp(scratchB.z + relZ, -0.5, 0.5) + box.origin.z;

    let toPointX = pointX - center.x;
    let toPointY = pointY - center.y;
    let toPointZ = pointZ - center.z;

    const distance = Math.hypot(toPointX, toPointY, toPointZ);
    if (distance > 0) {
        toPointX /= distance;
        toPointY /= distance;
        toPointZ /= distance;
    }

    const effective = radius * (Math.abs(toPointY) * 0.16 + 0.84);
    if (distance >= effective) return false;

    normal.x = toPointX;
    normal.y = toPointY;
    normal.z = toPointZ;

    const push = distance - effective - 1e-3;

    resolve.x = toPointX * push;
    resolve.y = toPointY * push;
    resolve.z = toPointZ * push;

    return true;
};

const AXES = ['x', 'y', 'z'] as const;

/**
 * Slab-tests a ray against one oriented box, in the box's local space
 * @param origin Where the ray starts
 * @param direction The ray's direction; must be normalised
 * @param box The box to test against
 * @param maxDistance How far along the ray to look
 * @param normal Receives the surface normal at the hit
 * @returns The distance to the hit, or null
 */
export const rayVsBox = (origin: Position, direction: Position, box: Collider, maxDistance: number, normal: Position): number | null => {
    untransform(box.rot, origin.x - box.origin.x, origin.y - box.origin.y, origin.z - box.origin.z, scratchA);
    untransform(box.rot, direction.x, direction.y, direction.z, scratchB);

    const min = [box.minX, box.minY, box.minZ];
    const max = [box.maxX, box.maxY, box.maxZ];

    let near = 0;
    let far = maxDistance;
    let hitAxis = -1;
    let hitSign = 0;

    for (let axis = 0; axis < 3; axis++) {
        const from = scratchA[AXES[axis]];
        const along = scratchB[AXES[axis]];

        if (Math.abs(along) < 1e-9) {
            if (from < min[axis] || from > max[axis]) return null;
            continue;
        }

        let enter = (min[axis] - from) / along;
        let exit = (max[axis] - from) / along;
        let sign = -1;

        if (enter > exit) {
            const swap = enter;
            enter = exit;
            exit = swap;
            sign = 1;
        }

        if (enter > near) {
            near = enter;
            hitAxis = axis;
            hitSign = sign;
        }

        if (exit < far) far = exit;
        if (near > far) return null;
    }

    if (hitAxis === -1) return null;

    transform(
        box.rot,
        hitAxis === 0 ? hitSign : 0,
        hitAxis === 1 ? hitSign : 0,
        hitAxis === 2 ? hitSign : 0,
        normal
    );

    return near;
};

/** Every collider on a map, plus the queries the physics and the {@link PathGraph} run against them. */
export class ColliderSet {
    /** The map this was built from */
    map: MapJSON;

    /** The map's size along X */
    width: number;
    /** The map's size along Y */
    height: number;
    /** The map's size along Z */
    depth: number;

    #byCell: Map<number, Collider[]> = new Map();
    #cells: Map<number, CellInfo> = new Map();

    /** How many boxes the map resolved to */
    size = 0;

    /**
     * Builds the collision world for a map
     * @param map The raw map data
     */
    constructor(map: MapJSON) {
        this.map = map;

        this.width = map.width;
        this.height = map.height;
        this.depth = map.depth;

        for (const [mesh, cells] of Object.entries(map.data)) {
            const fields = mesh.split('.');
            const type = TYPE_BY_NAME[fields[2]];
            if (!type) continue;

            const shortName = fields[1] ?? '';
            const shapes = Shapes[mesh];

            for (const cell of cells) {
                this.#cells.set(getPositionKey(cell.x, cell.y, cell.z), { mesh, shortName, type, ry: cell.ry ?? 0, cell });

                switch (type) {
                    case ColliderType.Full:
                        this.#add(cell, type, shortName, FULL_MIN, FULL_MAX, null);
                        break;
                    case ColliderType.Wedge:
                        this.#add(cell, type, shortName, WEDGE_MIN, WEDGE_MAX, fromEuler(0, Math.PI / 4, 0));
                        break;
                    case ColliderType.IWedge:
                        this.#add(cell, type, shortName, IWEDGE_MIN, IWEDGE_MAX, fromEuler(0, Math.PI / 4, 0));
                        break;
                    default:
                        for (const shape of shapes ?? [FALLBACK_SHAPE])
                            this.#add(cell, type, shortName, shape[0], shape[1], shape[2] ? fromQuat(shape[2]) : null);
                        break;
                }
            }
        }
    }

    #add(
        cell: MapCell,
        type: ColliderType,
        shortName: string,
        min: readonly [number, number, number],
        max: readonly [number, number, number],
        meshRot: Mat3 | null
    ): void {
        const cellRot = fromEuler((cell.ry ?? 0) * PI90, (cell.rx ?? 0) * PI90, (cell.rz ?? 0) * PI90);

        const collider: Collider = {
            minX: min[0], minY: min[1], minZ: min[2],
            maxX: max[0], maxY: max[1], maxZ: max[2],
            origin: { x: cell.x + 0.5, y: cell.y + 0.5, z: cell.z + 0.5 },
            rot: meshRot ? mul(meshRot, cellRot) : cellRot,
            type,
            cell,
            ry: cell.ry ?? 0,
            shortName
        };

        const key = getPositionKey(cell.x, cell.y, cell.z);
        const bucket = this.#byCell.get(key);

        if (bucket) bucket.push(collider);
        else this.#byCell.set(key, [collider]);

        this.size++;
    }

    /**
     * Looks up what occupies a cell
     * @param x The cell X
     * @param y The cell Y
     * @param z The cell Z
     * @returns The cell's contents, or null if the cell is air
     */
    cellAt(x: number, y: number, z: number): CellInfo | null {
        if (x < 0 || y < 0 || z < 0 || x >= this.width || y > this.height || z >= this.depth) return null;
        return this.#cells.get(getPositionKey(x, y, z)) ?? null;
    }

    /**
     * Runs a callback over every box that could touch an axis-aligned region
     * @param minX The region's minimum X
     * @param minY The region's minimum Y
     * @param minZ The region's minimum Z
     * @param maxX The region's maximum X
     * @param maxY The region's maximum Y
     * @param maxZ The region's maximum Z
     * @param visit Called once per candidate box
     */
    each(
        minX: number, minY: number, minZ: number,
        maxX: number, maxY: number, maxZ: number,
        visit: (collider: Collider) => void
    ): void {
        const x0 = Math.floor(minX), x1 = Math.floor(maxX);
        const y0 = Math.floor(minY), y1 = Math.floor(maxY);
        const z0 = Math.floor(minZ), z1 = Math.floor(maxZ);

        for (let x = x0; x <= x1; x++)
            for (let y = y0; y <= y1; y++)
                for (let z = z0; z <= z1; z++) {
                    const bucket = this.#byCell.get(getPositionKey(x, y, z));
                    if (bucket) for (const collider of bucket) visit(collider);
                }
    }

    /**
     * Finds the deepest overlap between a sphere and the map, and how to push the sphere back out.
     * This is the one query the movement code runs, eight times per tick.
     * @param center The sphere's centre
     * @param radius The sphere's radius
     * @param outResolve Receives the vector that separates the sphere from the box
     * @param outNormal Receives the surface normal at the contact
     * @returns The box that produced the deepest overlap, or null if the sphere is clear
     */
    sweep(center: Position, radius: number, outResolve: Position, outNormal: Position): Collider | null {
        outResolve.x = 0;
        outResolve.y = 0;
        outResolve.z = 0;

        let best: Collider | null = null;
        let bestDepth = 0;

        this.each(
            center.x - radius, center.y - radius, center.z - radius,
            center.x + radius, center.y + radius, center.z + radius,
            (collider) => {
                if (!sphereVsBox(center, radius, collider, scratchResolve, scratchNormal)) return;

                if (scratchNormal.y < -0.707) {
                    scratchResolve.y = Math.hypot(scratchResolve.x, scratchResolve.y, scratchResolve.z);
                    scratchResolve.x = 0;
                    scratchResolve.z = 0;
                }

                const depth = Math.hypot(scratchResolve.x, scratchResolve.y, scratchResolve.z);

                if (depth > bestDepth) {
                    bestDepth = depth;
                    best = collider;

                    outResolve.x = scratchResolve.x;
                    outResolve.y = scratchResolve.y;
                    outResolve.z = scratchResolve.z;

                    outNormal.x = scratchNormal.x;
                    outNormal.y = scratchNormal.y;
                    outNormal.z = scratchNormal.z;
                }
            }
        );

        return best;
    }

    /**
     * Checks whether a sphere fits somewhere without touching the map.
     * @param x The sphere's centre X
     * @param y The sphere's centre Y
     * @param z The sphere's centre Z
     * @param radius The sphere's radius
     * @returns Whether the sphere is clear
     */
    fits(x: number, y: number, z: number, radius: number): boolean {
        probeCenter.x = x;
        probeCenter.y = y;
        probeCenter.z = z;

        let clear = true;

        this.each(
            x - radius, y - radius, z - radius,
            x + radius, y + radius, z + radius,
            (collider) => {
                if (clear && sphereVsBox(probeCenter, radius, collider, probeResolve, probeNormal)) clear = false;
            }
        );

        return clear;
    }

    /**
     * Casts a ray against the map, using the same boxes every other query uses
     * @param origin Where the ray starts
     * @param direction The ray's direction; must be normalised
     * @param maxDistance How far along the ray to look
     * @returns The nearest hit, or null
     */
    raycast(origin: Position, direction: Position, maxDistance: number): RayHit | null {
        const endX = origin.x + direction.x * maxDistance;
        const endY = origin.y + direction.y * maxDistance;
        const endZ = origin.z + direction.z * maxDistance;

        let bestDistance = maxDistance;
        let best: Collider | null = null;
        const bestNormal: Position = { x: 0, y: 0, z: 0 };

        this.each(
            Math.min(origin.x, endX), Math.min(origin.y, endY), Math.min(origin.z, endZ),
            Math.max(origin.x, endX), Math.max(origin.y, endY), Math.max(origin.z, endZ),
            (collider) => {
                const hit = rayVsBox(origin, direction, collider, bestDistance, scratchNormal);
                if (hit === null || hit >= bestDistance) return;

                bestDistance = hit;
                best = collider;

                bestNormal.x = scratchNormal.x;
                bestNormal.y = scratchNormal.y;
                bestNormal.z = scratchNormal.z;
            }
        );

        return best ? { collider: best, distance: bestDistance, normal: bestNormal } : null;
    }

    /**
     * Checks whether nothing solid sits between two points
     * @param from The first point
     * @param to The second point
     * @returns Whether the two points can see each other
     */
    canSee(from: Position, to: Position): boolean {
        const dx = to.x - from.x;
        const dy = to.y - from.y;
        const dz = to.z - from.z;

        const dist = Math.hypot(dx, dy, dz);
        if (dist < 1e-6) return true;

        rayDirection.x = dx / dist;
        rayDirection.y = dy / dist;
        rayDirection.z = dz / dist;

        return !this.raycast(from, rayDirection, dist);
    }
}


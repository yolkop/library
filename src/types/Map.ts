/**
 * This file is licensed under the MPL 2.0 license.
 * For more information, see https://mozilla.org/MPL/2.0/.
 *
 * This file is part of the yolkbot library,
 * originally created by hijinks & 1ust.
 */

import type { Position } from '../util';

/** The status of a map on different modes in {@link Maps} and {@link MapJSON} */
export interface MapModes {
    /** Whether or not the map can be used in FFA; basically always true */
    FFA: boolean;
    /** Whether or not the map can be used in Teams; basically always true */
    Teams: boolean;
    /** Whether or not the map can be used in Spatula; basically always true */
    Spatula: boolean;
    /** Whether or not the map can be used in King; usually true for big maps but may not be on smaller maps */
    King?: boolean;
}

/** Represents a single Map in {@link Maps} */
export interface Map {
    /** The filename of the map */
    filename: string;
    /** A hash used for cachebusting */
    hash: string;
    /** The stylized map name */
    name: string;
    /** The modes the map may be used in */
    modes: MapModes;
    /** Whether the map is available in private only or pubs & privs */
    availability: 'private' | 'both';
    /** The recommended number of players for the map (stringified number) */
    numPlayers: string;
}

/** A cell on a {@link MapJSON} */
export interface MapCell extends Position {
    /** The cell X rotation */
    rx?: number;
    /** The cell Y rotation */
    ry?: number;
    /** The cell Z rotation */
    rz?: number;
}

/** Represents a map's sun on a {@link MapJSON} */
export interface MapSun {
    /** The direction of the sun */
    direction: Position;
    /** A hex code, such as "#FFFFFF" */
    color: string;
}

/** The different render properties on a {@link MapJSON} */
export interface MapRender {
    /** A stringified number from around 0 to 2 */
    AO?: string;
    /** A stringified number from around 0.95 to 1.4 */
    Diffuse: string;
    /** A stringified number from around 0.6 to 1.75 */
    Direct: string;
    /** A stringified number from around 0 to 0.35 */
    Dirt: string;
    /** A stringified number from around 0 to 1.5 */
    Environment?: string;
    /** A stringified number from around 0 to 0.04 */
    FogDensity: string;
    /** A stringified number from around 0.25 to 1.3 */
    Indirect: string;
    /** A stringified number from around 0 to 3 */
    Lights?: string;
    /** A stringified number from around 0.2 to 1.95 */
    LightsReflect?: string;
    /** A number from around 0.25 to 1000 */
    pointLightIntensity: number;
    /** A stringified number from around 0.15 to 2 */
    Reflect: string;
    /** A stringified number from around 0 to 2 */
    Sun?: string;
    /** A stringified number from around 0 to 2 */
    SunReflect?: string;
}

/** The size of a map in each dimension (x/y/z), represented by min/max on a {@link MapJSON} */
export interface MapExtents {
    /** The X coordinate on the extents */
    x: {
        /** The minimum X */
        min: number;
        /** The maximum X */
        max: number;
    }
    /** The Y coordinate on the extents */
    y: {
        /** The minimum Y */
        min: number;
        /** The maximum Y */
        max: number;
    }
    /** The Z coordinate on the extents */
    z: {
        /** The minimum Z */
        min: number;
        /** The maximum Z */
        max: number;
    }
    /** The map width */
    width: number;
    /** The map height */
    height: number;
    /** The map depth */
    depth: number;
}

/** Represents a map's fog on a {@link MapJSON} */
export interface MapFog {
    /** The raw fog value, from 0 to 0.04 */
    density: string;
    /** A hex code, such as "#FFFFFF" */
    color: string;
}

/** The full map JSON fetched when you join a game {@link loadMap} */
export interface MapJSON {
    /** The map "file version" */
    fileVersion: 2;
    /** Sun properties */
    sun: MapSun;
    /** Ambient properties */
    ambient: string;
    /** Fog properties */
    fog: MapFog;
    /** An object of each map mesh along with all of the places it occurs */
    data: Record<string, MapCell[]>;
    /** A list of map meshes the map uses */
    palette: string[];
    /** Special render keys for Babylon */
    render: MapRender;
    /** The map width */
    width: number;
    /** The map height */
    height: number;
    /** The map depth */
    depth: number;
    /** The stylized map name */
    name: string;
    /** The map surface area */
    surfaceArea: number;
    /** The map extents */
    extents: MapExtents;
    /** The map's skybox used */
    skybox: 'default' | 'moonbase' | 'night' | 'whimsical';
    /** The modes the map may be used in */
    modes: MapModes;
    /** Whether the map is available in private only or pubs & privs */
    availability: 'public' | 'private' | 'both';
    /** The number of players the map is recommended for */
    numPlayers: string;
}
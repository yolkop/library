/**
 * This file is licensed under the MPL 2.0 license.
 * For more information, see https://mozilla.org/MPL/2.0/.
 *
 * This file is part of the yolkbot library,
 * originally created by hijinks & 1ust.
 */

/** Different movement options (passable to {@link MovementDispatch}) */
export enum Movement {
    /** W key */
    Forward = 1,
    /** S key */
    Backward = 2,
    /** A key */
    Left = 4,
    /** D key */
    Right = 8,
    /** Space key */
    Jump = 16,
    /** This does not actually fire; see {@link FireDispatch} */
    Fire = 32,
    /** This does not actually melee; see {@link MeleeDispatch} */
    Melee = 64,
    /** This ONLY slows down your speed and does not improve accuracy */
    Scope = 128
}

/** How far the player's collision sphere sits above their feet, and its radius */
export const PLAYER_RADIUS = 0.31;

/** The furthest the player is allowed to travel in one tick, before collision */
export const MAX_STEP = 0.29;

/** The impulse a jump off the ground gives */
export const JUMP_IMPULSE = 0.13;

/** The (much weaker) impulse a jump off a ladder gives */
export const LADDER_JUMP_IMPULSE = 0.065;

/** The impulse a jump pad gives, applied straight to the player's height */
export const JUMP_PAD_IMPULSE = 0.26;

/** How fast the player falls, per unit of the game's gravity option */
export const GRAVITY = 0.012;

/** The fastest the player can fall */
export const TERMINAL_VELOCITY = -0.29;

/** How much horizontal speed survives each tick */
export const DRAG = 0.64;

/** How much a held direction key adds to horizontal speed each tick */
export const ACCELERATION = 0.025;

/** How much a held direction key adds to climbing speed each tick */
export const CLIMB_ACCELERATION = 0.028;

/** How many ticks a jump press stays buffered, so a jump pressed just before landing still fires */
export const JUMP_BUFFER = 10;

/** How far the player's feet move horizontally each tick once they are up to speed */
export const WALK_SPEED = 0.0694;

/** How far the player's feet move up each tick on a ladder once they are up to speed */
export const CLIMB_SPEED = 0.0175;

/** The tallest lip the collision sphere rides over without any help */
export const STEP_HEIGHT = 0.31;

/** How high a standing jump actually gets you */
export const JUMP_HEIGHT = (JUMP_IMPULSE * JUMP_IMPULSE) / (2 * GRAVITY);

/** The tallest lip a jump can be relied on to clear while also moving forwards */
export const HOP_HEIGHT = JUMP_HEIGHT * 0.88;

/**
 * The most a single link may climb. A slope is walked in footholds rather than jumped in one go,
 * so a link can rise further than a jump ever could - what it cannot do is rise faster than a jump
 * anywhere along the way, which is what {@link PathGraph} actually checks.
 */
export const MAX_CLIMB = 2;

/** How finely a cell column is scanned for places to stand */
export const PROBE_STEP = 0.25;

/** How finely a climb's surface is followed when deciding whether it can be walked */
export const SURFACE_STEP = 0.2;

/** How many cells out from a standing spot the graph looks for somewhere to jump to */
export const LEAP_GAP = 2;

/**
 * How much open air a jump clears, measured edge to edge rather than centre to centre.
 *
 * Measured against the simulator: a jump carries the player about 1.46 blocks horizontally before
 * their feet come back to the height they left at, and it barely depends on the run-up - 0 ticks
 * gives 1.33 and 40 ticks gives 1.46, because horizontal speed tops out almost immediately. What
 * makes a gap jumpable is therefore not how far apart the two tiles' centres are but how much
 * nothing is actually between them, since the player can launch from an overhang and land on one.
 */
export const JUMP_REACH = 1.35;

/** How far the player's sphere can hang off a ledge and still be standing on it */
export const LEDGE_OVERHANG = 0.26;

/** The most a leap across a gap may climb */
export const LEAP_RISE = 0.31;

/**
 * The most a leap across a gap may fall. Measured against the simulator: a level gap is cleared
 * about 95% of the time and a two block drop about 80%, but past that the bot is guessing, and a
 * link it cannot fly is worse than no link at all.
 */
export const LEAP_DROP = 2;

/**
 * How far back from the edge a leap may be launched. Measured against the simulator: a jump that
 * clears a gap leaves the ground anywhere from just over half a tile before the lip to a little
 * past it, so the window is anchored to the lip rather than to the tile's centre - a diagonal
 * leap's lip is 0.707 out from the centre, not 0.5, and launching at the centre wastes most of
 * the jump's reach before the gap even starts.
 */
export const LEAP_WINDOW = 0.15;

/** How much of walking speed the bot must already have in the leap's direction before it goes, so it does not jump off sideways the moment it arrives */
export const LEAP_SPEED = 0.6;

/** The furthest the graph is willing to drop in one link */
export const MAX_DROP = 8;

/** How high a jump pad is assumed to throw you */
export const PAD_HEIGHT = 5;

/** How far sideways a jump pad is assumed to carry you */
export const PAD_REACH = 3;

/** How far above you a ladder rung can be and still be grabbable, derived from the game's own reach check */
export const LADDER_REACH_UP = 0.63;

/** How far below you a ladder rung can be and still be grabbable */
export const LADDER_REACH_DOWN = 1.17;

/** How far off a rung you can step onto a ledge, in either direction */
export const LADDER_STEP_OFF = 1.2;

/**
 * This file is licensed under the MPL 2.0 license.
 * For more information, see https://mozilla.org/MPL/2.0/.
 *
 * This file is part of the yolkbot library,
 * originally created by hijinks & 1ust.
 */

import type { Position } from '../../util.js';

/**
 * A 3x3 rotation matrix in row-major order, using the same row-vector convention Babylon.js
 * uses (`v * M`, not `M * v`). Every matrix the collision system builds is a pure rotation,
 * so the inverse is always the transpose - see {@link untransform}.
 */
export type Mat3 = Float64Array;

/** A quaternion in glTF/Babylon order (x, y, z, w) */
export type Quat = [number, number, number, number];

/** The identity rotation */
export const identity = (): Mat3 => Float64Array.from([1, 0, 0, 0, 1, 0, 0, 0, 1]);

/**
 * Builds a rotation matrix from a quaternion, matching Babylon's `Matrix.FromQuaternionToRef`
 * @param q The quaternion, in (x, y, z, w) order
 * @returns The equivalent rotation matrix
 */
export const fromQuat = ([x, y, z, w]: Quat): Mat3 => {
    const xx = x * x, yy = y * y, zz = z * z;
    const xy = x * y, zw = z * w, zx = z * x;
    const yw = y * w, yz = y * z, xw = x * w;

    return Float64Array.from([
        1 - 2 * (yy + zz), 2 * (xy + zw), 2 * (zx - yw),
        2 * (xy - zw), 1 - 2 * (zz + xx), 2 * (yz + xw),
        2 * (zx + yw), 2 * (yz - xw), 1 - 2 * (yy + xx)
    ]);
};

/**
 * Builds a quaternion from euler angles, matching Babylon's `Quaternion.RotationYawPitchRoll`
 * @param yaw Rotation around Y
 * @param pitch Rotation around X
 * @param roll Rotation around Z
 * @returns The equivalent quaternion, in (x, y, z, w) order
 */
export const quatFromEuler = (yaw: number, pitch: number, roll: number): Quat => {
    const sr = Math.sin(roll * 0.5), cr = Math.cos(roll * 0.5);
    const sp = Math.sin(pitch * 0.5), cp = Math.cos(pitch * 0.5);
    const sy = Math.sin(yaw * 0.5), cy = Math.cos(yaw * 0.5);

    return [
        cy * sp * cr + sy * cp * sr,
        sy * cp * cr - cy * sp * sr,
        cy * cp * sr - sy * sp * cr,
        cy * cp * cr + sy * sp * sr
    ];
};

/**
 * Builds a rotation matrix from euler angles, matching Babylon's `Matrix.RotationYawPitchRoll`
 * @param yaw Rotation around Y
 * @param pitch Rotation around X
 * @param roll Rotation around Z
 * @returns The equivalent rotation matrix
 */
export const fromEuler = (yaw: number, pitch: number, roll: number): Mat3 =>
    fromQuat(quatFromEuler(yaw, pitch, roll));

/**
 * Multiplies two rotations. Because of the row-vector convention, `mul(a, b)` applies `a`
 * first and then `b` - the same ordering as Babylon's `a.multiply(b)`.
 * @param a The rotation applied first
 * @param b The rotation applied second
 * @returns The combined rotation
 */
export const mul = (a: Mat3, b: Mat3): Mat3 => {
    const out = new Float64Array(9);

    for (let row = 0; row < 3; row++)
        for (let col = 0; col < 3; col++)
            out[row * 3 + col] = a[row * 3] * b[col] + a[row * 3 + 1] * b[3 + col] + a[row * 3 + 2] * b[6 + col];

    return out;
};

/** Whether a rotation is (near enough) the identity, letting hot paths skip the multiply entirely */
export const isIdentity = (m: Mat3): boolean =>
    m[0] === 1 && m[4] === 1 && m[8] === 1 && !m[1] && !m[2] && !m[3] && !m[5] && !m[6] && !m[7];

/**
 * Rotates a vector from local space into world space (`v * M`)
 * @param m The rotation
 * @param x The X component
 * @param y The Y component
 * @param z The Z component
 * @param out The vector to write the result into
 */
export const transform = (m: Mat3, x: number, y: number, z: number, out: Position): void => {
    out.x = x * m[0] + y * m[3] + z * m[6];
    out.y = x * m[1] + y * m[4] + z * m[7];
    out.z = x * m[2] + y * m[5] + z * m[8];
};

/**
 * Rotates a vector from world space back into local space (`v * M^-1`). Valid only because
 * every collision matrix is a pure rotation, so the inverse is just the transpose.
 * @param m The rotation
 * @param x The X component
 * @param y The Y component
 * @param z The Z component
 * @param out The vector to write the result into
 */
export const untransform = (m: Mat3, x: number, y: number, z: number, out: Position): void => {
    out.x = x * m[0] + y * m[1] + z * m[2];
    out.y = x * m[3] + y * m[4] + z * m[5];
    out.z = x * m[6] + y * m[7] + z * m[8];
};

/** The length of a vector */
export const length = (x: number, y: number, z: number): number => Math.sqrt(x * x + y * y + z * z);

/** The distance between two points */
export const distance = (a: Position, b: Position): number => length(a.x - b.x, a.y - b.y, a.z - b.z);

/** The horizontal (XZ only) distance between two points */
export const flatDistance = (a: Position, b: Position): number => Math.hypot(a.x - b.x, a.z - b.z);

/** Clamps a number between a minimum and a maximum */
export const clamp = (value: number, min: number, max: number): number => value < min ? min : value > max ? max : value;

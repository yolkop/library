/**
 * This file is licensed under the MPL 2.0 license.
 * For more information, see https://mozilla.org/MPL/2.0/.
 *
 * This file is part of the yolkbot library,
 * originally created by hijinks & 1ust.
 */

/** Possible values for the "subType" prop on {@link Challenge} */
export enum ChallengeSubType {
    /** Always has the {@link ChallengeType.Kill} type. Involves any challenge that has the user getting a killstreak of X */
    Killstreak = 0,
    /** Always has the {@link ChallengeType.Kill} type. Involves any challenge that has the user getting a X kills with a specific gun */
    KillWithWeapon = 1,
    /** Always has the {@link ChallengeType.Movement} type. Involves any challenge that has the user traveling for X distance */
    MovementDistance = 3,
    /** Has either the {@link ChallengeType.Movement} or {@link ChallengeType.Kill} type. Involves any challenge that has the user jumping X times or doing an action while jumping */
    Jumping = 4,
    /** Has either the {@link ChallengeType.Kill} or {@link ChallengeType.Time} type. Involves any challenge that has the user playing for a specific duration or getting a killstreak in a specific duration */
    TimePlayed = 6,
    /** Always has the {@link ChallengeType.Time} type. Involves any challenge that has the user staying alive for a certain amount of time */
    TimeAlive = 7,
    /** Always has the {@link ChallengeType.Kill} type. Involves any challenge that has the user killing with some extra condition */
    KillWithCondition = 8,
    /** Has either the {@link ChallengeType.Kill} or {@link ChallengeType.Spatula} type. Involves any challenge that has the user getting a certain number of total kills, or kills involving the spatula */
    TotalOrSpatulaKills = 10,
    /** Always has the {@link ChallengeType.Collect} type. Involves any challenge that has the user collecting ammo */
    Collecting = 18,
    /** Always has the {@link ChallengeType.KOTC} type. Involves any challenge that has the user doing stuff based around the coop */
    FromTheCoop = 20,
    /** Has either the {@link ChallengeType.KOTC} or {@link ChallengeType.Spatula} type. Involves any challenge that has the user doing some offensive action, such as capturing the Spatula or Coop */
    SpecialOffensive = 21,
    /** Has either the {@link ChallengeType.KOTC} or {@link ChallengeType.Spatula} type. Involves any challenge that has the user winning KoTC matches or gaining kills with the spatula */
    WinKOTCOrKillWithSpatula = 23
}

/** Possible values for the "type" prop on {@link Challenge} */
export enum ChallengeType {
    /** Involves any challenge with kills (get X kills, get X kills with gun, etc) */
    Kill = 0,
    /** Involves any challenge with damage (deal X damage) */
    Damage = 1,
    /** Involves any challenge with death (die X times) */
    Death = 2,
    /** Involves any challenge with movement (travel Xm, jump X times) */
    Movement = 3,
    /** Involves any challenge with resource collection (collect X grenades, collect X ammo boxes) */
    Collect = 4,
    /** Involves any challenge with time (stay alive for X, play for X) */
    Time = 5,
    /** Involves any KoTC-specific challenges (stand on coop for X, capture X coops, etc) */
    KOTC = 6,
    /** Involves any CTS-specific challenges (pick up spat, hold spat for X time, gain X kills with spat, etc) */
    Spatula = 7
}

/** Possible values for the "conditional" prop on {@link Challenge} */
export enum ChallengeConditional {
    /** Involves any challenge that needs a streak of X */
    Killstreak = 0,
    /** Involves the single challenge where you and a killed victim are both airborne */
    BothAirborne = 4,
    /** Involves any challenge that needs you to play for X minutes */
    PlayForTime = 6,
    /** Involves any challenge that needs you to stay alive, potentially while doing something */
    AliveFor = 7,
    /** Involves the two challenges where you kill an egg on the coop, or vice versa */
    KillOnCoop = 10,
    /** Involves the single challenge where you kill an egg in one shot */
    KillOneShot = 11,
    /** Involves the single challenge where you kill an egg when you are <10 health */
    KillLowSelfHealth = 12,
    /** Involves any challenge where you need to be scoped */
    ScopeRequired = 13,
    /** Involves any challenge where you either need to kill multiple eggs at once or collect a specific amount of ammo boxes */
    KillMultipleOrCollectAmmo = 16,
    /** Involves the single challenge where you kill an egg as they reload or collect a specific amount of grenades */
    KillReloadOrCollectGrenades = 17
}

/** Represents the raw challenge data in {@link ChallengeList} */
export interface Challenge {
    /** An incrementing challenge ID */
    id: number;
    /** The string referencing the localization keys that describe the challenge. These are automatically resolved as {@link Challenge.loc} */
    loc_ref: string;
    /** The challenge "type" */
    type: ChallengeType;
    /** The challenge "subtype". This is null if it's a challenge that deals damage or involves death */
    subType?: ChallengeSubType;
    /** The numeric "goal". For killstreak challenges, this is the intended streak, for damage challenges, the damage, etc. If there is no goal, this is set to "1" */
    goal: number;
    /** The reward, in eggs */
    reward: number;
    /** A value that helps the backend decide when to award challenge points */
    conditional?: ChallengeConditional;
    /** A challenge-specific value that is function-dependant on the values of type, subType, and conditional */
    value?: string;
    /** A second challenge-specific value that is function-dependant on the values of type, subType, and conditional */
    valueTwo?: string;
    /** A tier rating that describes how hard the challenge is. Accounts that meet certain conditions are given higher tiers */
    tier: 0 | 1 | 2 | 3;
    /** The resolved localization of the challenge (in English) */
    loc: {
        /** The title of the challenge. This often has no relevant information about it */
        title: string;
        /** The description of the challenge. This often describes the challenge best */
        desc: string;
    }
}
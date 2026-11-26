// Copyright © 2026 Lucia Medina Fretes. All rights reserved.
// Licensed under the MIT License. See LICENSE in the project root for details.
//
// Named as in the macOS port (AnimationID.swift).

/// A standalone animation, by its position in the `anims` list of `data/res.json`.
export const AnimationID = {
    rings:         0,
    guideArrow:    1,
    fire1:         2,
    fire2:         3,
    helpSelect:    4,
    helpMove:      5,
    helpAttack:    6,
    helpObjective: 7,
    helpScroll:    8,
    helpHud:       9,
    helpHeal:      10,
    helpTips:      11,
    helpWin:       12,
} as const
export type AnimationID = typeof AnimationID[keyof typeof AnimationID]

/// The number of animations in `data/res.json`.
export const animationCount = Object.keys(AnimationID).length

/// The help screen animations, in order (matching `helpPages` in StringID.ts).
export const helpScreens: readonly AnimationID[] = [
    AnimationID.helpSelect, AnimationID.helpMove, AnimationID.helpAttack,
    AnimationID.helpObjective, AnimationID.helpScroll, AnimationID.helpHud,
    AnimationID.helpHeal, AnimationID.helpTips, AnimationID.helpWin,
]

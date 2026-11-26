// Copyright © 2026 Lucia Medina Fretes. All rights reserved.
// Licensed under the MIT License. See LICENSE in the project root for details.
//
// Named as in the macOS port (UnitType.swift).

/// A kind of soldier, by its position in the `unidades` list of `data/res.json`.
export const UnitType = {
    patricio: 0,
    british:  1,
} as const
export type UnitType = typeof UnitType[keyof typeof UnitType]

/// A soldier sprite, by its position in the `sprites` list of `data/res.json`.
export const SpriteID = {
    patricio: 0,
    british:  1,
} as const
export type SpriteID = typeof SpriteID[keyof typeof SpriteID]

/// The number of soldier sprites in `data/res.json`.
export const spriteCount = Object.keys(SpriteID).length

// Copyright © 2026 Lucia Medina Fretes. All rights reserved.
// Licensed under the MIT License. See LICENSE in the project root for details.
//
// Named as in the macOS port (ImageID.swift). The values are positions in the lists of
// data/res.json, so reordering that file means reordering these.

/// An image, by its position in the `imagenes` list of `data/res.json`.
export const ImageID = {
    swordCursor:     0,
    infirmaryCursor: 1,
    cursor:          2,
    arrow:           3,
    icon:            4,
    logo:            5,
    splash:          6,
    background:      7,
    greyTile:        8,
    hud:             9,
} as const
export type ImageID = typeof ImageID[keyof typeof ImageID]

/// A font family, by its position in the `fuentes` list of `data/res.json`.
export const FontFamily = {
    sans:   0,
    lblack: 1,
} as const
export type FontFamily = typeof FontFamily[keyof typeof FontFamily]

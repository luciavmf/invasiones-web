// Copyright © 2026 Lucia Medina Fretes. All rights reserved.
// Licensed under the MIT License. See LICENSE in the project root for details.
//
// Named as in the macOS port (TilesetID.swift).

/// A tileset, by its position in the `escenarios.tilesets` list of `data/res.json`.
export const TilesetID = {
    debug:       0,
    grass:       1,
    dirt:        2,
    water:       3,
    trees:       4,
    units:       5,
    rocks:       6,
    textures:    7,
    rocks2:      8,
    infirmary:   9,
    buildings:   10,
    invalidated: 11,
    objectives:  12,
    fort:        13,
} as const
export type TilesetID = typeof TilesetID[keyof typeof TilesetID]

/// The number of tilesets. The maps come after them in `escenarios`.
export const tilesetCount = Object.keys(TilesetID).length

/// The tileset with the given `name` attribute in its .tsx file.
///
/// "debug" and "objetivos" are not listed, as in the original: they fall back to
/// `debug`, which hides their tiles when drawn as obstacles.
export function tilesetIDFromTsxName(name: string): TilesetID {
    switch (name.toLowerCase()) {
        case 'tierra':      return TilesetID.dirt
        case 'agua':        return TilesetID.water
        case 'pasto':       return TilesetID.grass
        case 'arboles':     return TilesetID.trees
        case 'unidades':    return TilesetID.units
        case 'piedras':     return TilesetID.rocks
        case 'texturas':    return TilesetID.textures
        case 'piedras2':    return TilesetID.rocks2
        case 'enfermeria':  return TilesetID.infirmary
        case 'edificios':   return TilesetID.buildings
        case 'invalidados': return TilesetID.invalidated
        case 'fuerte':      return TilesetID.fort
        default:            return TilesetID.debug
    }
}

/// What a tagged tile in a tileset stands for (its `id` / `unidad` property in the .tsx file).
export const TileKind = {
    /// Units tileset: where Patricio soldiers start.
    patricio:  'patricio',
    /// Units tileset: where British soldiers start.
    british:   'british',
    /// Invalidated tileset: an infirmary, where units heal.
    infirmary: 'infirmary',
    /// Invalidated tileset: a house.
    house:     'house',
} as const
export type TileKind = typeof TileKind[keyof typeof TileKind]

/// The kind named by a tile's property value in the .tsx file, if it's one the game uses.
export function tileKindFromProperty(value: string): TileKind | null {
    switch (value) {
        case 'PATRICIO':   return TileKind.patricio
        case 'INGLES':     return TileKind.british
        case 'ENFERMERIA': return TileKind.infirmary
        case 'CASA':       return TileKind.house
        default:           return null
    }
}

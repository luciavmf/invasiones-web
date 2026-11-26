// Copyright © 2026 Lucia Medina Fretes. All rights reserved.
// Licensed under the MIT License. See LICENSE in the project root for details.
/// A single tile entry in a Tileset — stores optional game-logic properties.
import type { TileKind } from './TilesetID'

export class Tile {
    /// What the tile stands for, if it is tagged in its tileset.
    kind: TileKind | null = null
    count = 0
}

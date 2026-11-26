// Copyright © 2026 Lucia Medina Fretes. All rights reserved.
// Licensed under the MIT License. See LICENSE in the project root for details.
//
// The map and camera of the battle being played, passed to everything placed on the
// map. Replaces the static MapObject.map, MapObject.camera and Group.map, as in the
// macOS port (Battlefield.swift).

import type { Camera } from '../map/Camera'
import type { WalkableGrid } from '../pathfinding/PathFinder'

/// What map objects need from the map: walkability and the size of a map tile.
/// `Map` provides it in the game; tests use small hand-made grids.
export interface BattleMap extends WalkableGrid {
    /// Width of a map tile in pixels.
    readonly tileWidth: number
    /// Height of a map tile in pixels.
    readonly tileHeight: number
}

/// The map and camera of the current battle. `Episode` creates them; map objects,
/// units and groups receive this when they are created.
export interface Battlefield {
    readonly map: BattleMap
    readonly camera: Camera
}

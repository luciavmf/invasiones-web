// Copyright © 2026 Lucia Medina Fretes. All rights reserved.
// Licensed under the MIT License. See LICENSE in the project root for details.
//
// Fakes shared by the tests.

import type { Map } from '../game/map/Map'
import { MapObject } from '../game/level/MapObject'
import { PathFinder } from '../game/pathfinding/PathFinder'
import type { SoundPlayer } from '../game/audio/Sound'
import { Unit, type UnitFaction } from '../game/units/Unit'

/// A walkability grid built from strings (`.` = walkable), with 64×32 tiles like the
/// game's map, so the pathfinder and units can use it in place of a loaded `Map`.
export class TestGrid {
    readonly tileWidth = 64
    readonly tileHeight = 32
    readonly physicalTilesLayer: number[][]

    constructor(rows: string[]) {
        this.physicalTilesLayer = rows.map(row => [...row].map(c => (c === '.' ? 1 : 0)))
    }

    isWalkable(x: number, y: number): boolean {
        return this.physicalTilesLayer[x]?.[y] === 1
    }

    /// The grid where the game expects a `Map`.
    get asMap(): Map { return this as unknown as Map }
}

/// Records the sounds played.
export class FakeSound implements SoundPlayer {
    played: number[] = []
    play(id: number): void { this.played.push(id) }
}

/// An open field of the given size, set as the map every unit is placed on, with a
/// pathfinder and a fake sound for the units the test creates.
export function openField(size = 40) {
    const grid = new TestGrid(Array(size).fill('.'.repeat(size)))
    MapObject.map = grid.asMap
    const pathFinder = new PathFinder()
    pathFinder.loadMap(grid.asMap)
    const sound = new FakeSound()

    function makeUnit(j: number, i = 20, faction: UnitFaction = 'argentine'): Unit {
        const unit = new Unit(undefined, pathFinder, sound)
        unit.faction = faction
        unit.setTilePosition(i, j)
        return unit
    }

    return { grid, pathFinder, sound, makeUnit }
}

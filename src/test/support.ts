// Copyright © 2026 Lucia Medina Fretes. All rights reserved.
// Licensed under the MIT License. See LICENSE in the project root for details.
//
// Fakes shared by the tests.

import type { BattleMap, Battlefield } from '../game/level/Battlefield'
import { Camera } from '../game/map/Camera'
import { PathFinder } from '../game/pathfinding/PathFinder'
import type { SoundPlayer } from '../game/audio/Sound'
import { Unit, type UnitFaction } from '../game/units/Unit'

/// A walkability grid built from strings (`.` = walkable), with 64×32 tiles like the
/// game's map, so the pathfinder and units can use it in place of a loaded `Map`.
export class TestGrid implements BattleMap {
    readonly tileWidth = 64
    readonly tileHeight = 32
    private readonly cells: boolean[][]

    constructor(rows: string[]) {
        this.cells = rows.map(row => [...row].map(c => c === '.'))
    }

    isWalkable(x: number, y: number): boolean {
        return this.cells[x]?.[y] ?? false
    }

    /// Blocks a tile, as `Map.invalidateTile` does during a level.
    block(x: number, y: number): void {
        if (this.cells[x]?.[y] !== undefined) this.cells[x][y] = false
    }
}

/// A battlefield on the given grid, with a camera at the origin.
export function battlefieldOn(grid: TestGrid): Battlefield {
    return { map: grid, camera: new Camera(0, 0, 600) }
}

/// Records the sounds played.
export class FakeSound implements SoundPlayer {
    played: number[] = []
    play(id: number): void { this.played.push(id) }
}

/// An open field of the given size, with a pathfinder and a fake sound for the units
/// the test places on it.
export function openField(size = 40) {
    const grid = new TestGrid(Array(size).fill('.'.repeat(size)))
    const battlefield = battlefieldOn(grid)
    const pathFinder = new PathFinder()
    pathFinder.loadMap(grid)
    const sound = new FakeSound()

    function makeUnit(j: number, i = 20, faction: UnitFaction = 'argentine'): Unit {
        const unit = new Unit(undefined, battlefield, pathFinder, sound)
        unit.faction = faction
        unit.setTilePosition(i, j)
        return unit
    }

    return { grid, battlefield, pathFinder, sound, makeUnit }
}

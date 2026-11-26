// Copyright © 2026 Lucia Medina Fretes. All rights reserved.
// Licensed under the MIT License. See LICENSE in the project root for details.
//
// Fakes shared by the tests.

import type { BattleMap, Battlefield } from '../game/level/Battlefield'
import { Camera } from '../game/map/Camera'
import { PathFinder } from '../game/pathfinding/PathFinder'
import type { SoundPlayer } from '../game/audio/Sound'
import type { PointerDevice } from '../game/input/PointerDevice'
import type { InputMap } from '../game/units/PlayerInput'
import type { Surface } from '../game/rendering/Surface'
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

/// A mouse the test moves and clicks by hand.
export class FakePointer implements PointerDevice {
    x = 0
    y = 0
    readonly pressedButtons = new Set<number>()
    dragRect = { x: 0, y: 0, width: 0, height: 0 }
    dragging = false
    finishedDragging = false
    cursor: Surface | null = null

    isDragging(): boolean { return this.dragging }
    didFinishDragging(): boolean { return this.finishedDragging }
    releaseButton(button: number): void { this.pressedButtons.delete(button) }
    setCursor(surface: Surface | null): void { this.cursor = surface }

    press(button: number): void { this.pressedButtons.add(button) }
}

/// The one tile under the pointer, as player input sees it.
export class FakeInputMap implements InputMap {
    /// The map tile and the physical tile under the pointer.
    tile = { x: 1, y: 2 }
    physicalTile = { x: 3, y: 4 }
    /// Whether the physical tile under the pointer is walkable.
    walkable = true
    /// Whether the map tile under the pointer is part of an infirmary.
    infirmary = false

    tiles(): { tile: { x: number; y: number }; physicalTile: { x: number; y: number } } {
        return { tile: this.tile, physicalTile: this.physicalTile }
    }

    isWalkable(x: number, y: number): boolean {
        return this.walkable && x === this.physicalTile.x && y === this.physicalTile.y
    }

    isInfirmary(x: number, y: number): boolean {
        return this.infirmary && x === this.tile.x && y === this.tile.y
    }
}

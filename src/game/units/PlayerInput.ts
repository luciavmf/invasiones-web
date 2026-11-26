// Copyright © 2026 Lucia Medina Fretes. All rights reserved.
// Licensed under the MIT License. See LICENSE in the project root for details.
//
// Turns the mouse into the player's intents and picks the cursor, as in the macOS port
// (PlayerInput.swift). The rules are described in the macOS repo's
// docs/specs/selection-and-orders.md.

import { Mouse } from '../input/Mouse'
import type { PointerDevice } from '../input/PointerDevice'
import type { WalkableGrid } from '../pathfinding/PathFinder'
import { ResourceManager } from '../resources/ResourceManager'
import { ImageID } from '../resources/ImageID'
import type { PlayerIntent } from './PlayerIntent'
import type { Unit } from './Unit'

/// What player input needs from the map: walkability, the tiles under a screen point,
/// and where the infirmaries are. `Map` provides it in the game.
export interface InputMap extends WalkableGrid {
    /// The map tile and the physical tile (2× resolution) under a screen point.
    tiles(atScreenX: number, y: number): { tile: { x: number; y: number }; physicalTile: { x: number; y: number } }
    /// Whether a map tile is part of an infirmary.
    isInfirmary(x: number, y: number): boolean
}

/// The cursor shapes used in battle.
export type Cursor =
    | 'normal'
    /// Over an enemy, with a selection: a right click attacks.
    | 'attack'
    /// Over an infirmary, with a hurt selection: a right click heals.
    | 'heal'

export class PlayerInput {

    /// A drag only counts when it is at least this many pixels in both directions.
    static readonly minimumDragSize = 4

    private readonly map: InputMap
    private readonly pointer: PointerDevice

    constructor(map: InputMap, pointer: PointerDevice = Mouse.shared) {
        this.map = map
        this.pointer = pointer
    }

    /// The pointer's position in screen coordinates.
    get position(): { x: number; y: number } {
        return { x: Math.trunc(this.pointer.x), y: Math.trunc(this.pointer.y) }
    }

    /// A drag that ended this frame selects the units inside it.
    dragSelection(): PlayerIntent | null {
        // Fire on the frame the drag ends (as the original's TerminoDeArrastrar() check).
        if (!this.pointer.didFinishDragging()) return null
        const r = this.pointer.dragRect
        if (Math.trunc(r.width) < PlayerInput.minimumDragSize ||
            Math.trunc(r.height) < PlayerInput.minimumDragSize) return null
        return { kind: 'selectInRect', x: Math.trunc(r.x), y: Math.trunc(r.y),
                 w: Math.trunc(r.width), h: Math.trunc(r.height) }
    }

    /// Left clicks select or deselect; right clicks give the selection an order.
    /// Handled clicks are released, so they aren't read again next frame.
    clickIntents(unitUnderPointer: Unit | null, hasSelection: boolean): PlayerIntent[] {
        const intents: PlayerIntent[] = []
        let willHaveSelection = hasSelection
        const left = Mouse.Constants.leftButton, right = Mouse.Constants.rightButton

        // Left click on an Argentine unit: select it.
        if (this.isClicking(left) && unitUnderPointer?.faction === 'argentine') {
            intents.push({ kind: 'select', unit: unitUnderPointer })
            willHaveSelection = true
            this.pointer.releaseButton(left)
        }

        // Without a selection, right clicks are left alone.
        if (!willHaveSelection) return intents

        // Right click: attack, move or heal.
        if (this.pointer.pressedButtons.has(right)) {
            this.pointer.releaseButton(right)
            const order = this.order(unitUnderPointer)
            if (order) intents.push(order)
        }

        // Left click anywhere else: deselect.
        if (this.isClicking(left)) intents.push({ kind: 'deselect' })
        return intents
    }

    /// The cursor for the current pointer position.
    cursor(unitUnderPointer: Unit | null, hasSelection: boolean, selectionNeedsHealing: boolean): Cursor {
        if (!hasSelection) return 'normal'
        const { tile } = this.map.tiles(this.position.x, this.position.y)
        if (selectionNeedsHealing && this.map.isInfirmary(tile.x, tile.y)) return 'heal'
        if (unitUnderPointer?.faction === 'enemy') return 'attack'
        return 'normal'
    }

    /// Shows a cursor shape.
    show(cursor: Cursor): void {
        const image = cursor === 'attack' ? ImageID.swordCursor
                    : cursor === 'heal'   ? ImageID.infirmaryCursor
                    : ImageID.cursor
        this.pointer.setCursor(ResourceManager.shared.getImageSync(image))
    }

    // MARK: - Private

    /// A button held down without dragging a rectangle.
    private isClicking(button: number): boolean {
        if (!this.pointer.pressedButtons.has(button)) return false
        const r = this.pointer.dragRect
        const isDraggingARectangle = this.pointer.isDragging()
            && Math.trunc(r.width) >= PlayerInput.minimumDragSize
            && Math.trunc(r.height) >= PlayerInput.minimumDragSize
        return !isDraggingARectangle
    }

    /// The order a right click gives: attack an enemy, move to a walkable tile, or heal at an infirmary.
    private order(unitUnderPointer: Unit | null): PlayerIntent | null {
        const { tile, physicalTile: target } = this.map.tiles(this.position.x, this.position.y)

        if (this.map.isWalkable(target.x, target.y)) {
            if (unitUnderPointer && unitUnderPointer.faction === 'enemy' && !unitUnderPointer.isDead()) {
                return { kind: 'attack', enemy: unitUnderPointer }
            }
            return { kind: 'move', x: target.x, y: target.y }
        }
        if (this.map.isInfirmary(tile.x, tile.y)) return { kind: 'heal', x: target.x, y: target.y }
        return null
    }
}

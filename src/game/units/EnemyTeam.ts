// Copyright © 2026 Lucia Medina Fretes. All rights reserved.
// Licensed under the MIT License. See LICENSE in the project root for details.
import { Player }  from './Player'
import { Group }   from './Group'
import { IA }      from '../ai/IA'
import { Res }     from '../resources/Res'
import { Mouse }   from '../input/Mouse'
import type { Map }          from '../map/Map'
import type { Camera }       from '../map/Camera'
import type { ObjectTable }  from '../level/ObjectTable'
import type { Hud }          from '../level/Hud'

/// The AI-controlled enemy faction.
export class EnemyTeam extends Player {

    constructor(map: Map, camera: Camera, objectsToDraw: ObjectTable, hud: Hud) {
        super(map, camera, objectsToDraw, hud)
        this.faction = 'enemy'
    }

    override update(): void {
        switch (this.stateValue) {
            case 'start':   this.stateValue = 'loading'; break
            case 'loading': this.stateValue = 'game';    break
            case 'game':    this.updateGameplayState();  break
        }
    }

    override async loadUnits(levelIndex: number): Promise<void> {
        const unitsTileset = this.map.tilesets
            .filter(ts => ts !== null)
            .find(ts => ts!.id === Res.TLS_UNIDADES)
        if (!unitsTileset) return

        this.units = []

        for (let i = 0; i < this.map.width; i++) {
            for (let j = 0; j < this.map.height; j++) {
                const tileId = this.map.unitsLayer[i]?.[j] ?? 0
                if (!tileId) continue

                const localId = tileId - unitsTileset.firstGid
                const tile    = unitsTileset.tiles[localId]
                if (!tile || tile.id !== Res.TILE_UNIDADES_ID_INGLES) continue

                const list = this.placeUnits(Res.UNIDAD_INGLES, tile.count, i << 1, j << 1)

                if (list.length > 1) {
                    if (!this.groups) this.groups = []
                    const newGroup = new Group(list)
                    const ia = new IA()
                    await ia.load(i, j, levelIndex)
                    newGroup.setAI(ia)
                    this.groups.push(newGroup)
                } else {
                    list.forEach(u => u.patrol())
                }
            }
        }
    }

    private updateGameplayState(): void {
        this.selectedUnits = []
        this.updateUnits()
        this.removeDeadUnits()
        this.updateOrders()
        this.updateGroups()
    }

    private updateGroups(): void { this.groups?.forEach(g => g.update()) }

    private updateOrders(): void {
        if (this.selectedUnits.length === 0) return
        if (Mouse.shared.pressedButtons.has(Mouse.Constants.leftButton)) {
            this.selectedUnits.forEach(u => u.isSelected = false)
            this.clearSelection()
        }
    }
}

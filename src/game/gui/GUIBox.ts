// Copyright © 2026 Lucia Medina Fretes. All rights reserved.
// Licensed under the MIT License. See LICENSE in the project root for details.
import type { Surface } from '../rendering/Surface'
import type { GameFont } from '../resources/GameFont'
import type { Video } from '../rendering/Video'

/// Abstract base class for all GUI components.
export abstract class GUIBox {

    posX   = 0
    posY   = 0
    width  = 0
    height = 0
    font:  GameFont | null = null
    image: Surface  | null = null
    label  = 0

    abstract setPosition(x: number, y: number, anchor: number): void
    abstract update(): number
    abstract draw(video: Video): void
}

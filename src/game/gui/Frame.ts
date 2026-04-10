// Copyright © 2026 Lucia Medina Fretes. All rights reserved.
// Licensed under the MIT License. See LICENSE in the project root for details.
import { Surface } from '../rendering/Surface'
import { Video }   from '../rendering/Video'

/// Position and size of a GUI component.
export class Frame {
    posX   = 0
    posY   = 0
    width  = 0
    height = 0

    constructor(width = 0, height = 0) {
        this.width  = width
        this.height = height
    }

    setPosition(x: number, y: number, anchor: number): void {
        this.posX = x
        this.posY = y
        if (anchor & Surface.centerVertical)   this.posY += (Video.height >> 1) - (this.height >> 1)
        if (anchor & Surface.centerHorizontal) this.posX += (Video.width  >> 1) - (this.width  >> 1)
    }
}

// Copyright © 2026 Lucia Medina Fretes. All rights reserved.
// Licensed under the MIT License. See LICENSE in the project root for details.
import { Video } from '../rendering/Video'

/// Represents the visible portion of the map (viewport).
export class Camera {

    x: number
    y: number

    startX = 0
    startY = 0
    width  = Video.width
    height: number
    border = 20
    speed  = 20

    constructor(x: number, y: number, height: number) {
        this.x      = x
        this.y      = y
        this.height = height
    }

    setScreenCoords(x: number, y: number, w: number, h: number): void {
        this.startX = Math.max(0, x)
        this.startY = Math.max(0, y)
        this.width  = (w + x <= Video.width)  ? w : (Video.width  - x)
        this.height = (h + y <= Video.height) ? h : (Video.height - y)
    }
}

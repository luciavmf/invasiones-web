// Copyright © 2026 Lucia Medina Fretes. All rights reserved.
// Licensed under the MIT License. See LICENSE in the project root for details.
import type { Surface } from '../rendering/Surface'
import type { Video } from '../rendering/Video'
import { Video as VideoClass } from '../rendering/Video'

export const MOUSE_LEFT   = 0
export const MOUSE_RIGHT  = 2
export const MOUSE_MIDDLE = 1

/// Singleton tracking mouse position, buttons, and drag rectangle.
/// Replaces NSEvent-based Mouse.swift — events are wired up in startGame().
export class Mouse {

    static readonly shared = new Mouse()

    static readonly Constants = {
        leftButton:   MOUSE_LEFT,
        rightButton:  MOUSE_RIGHT,
        middleButton: MOUSE_MIDDLE,
    }

    private _x = 0
    private _y = 0
    private dragging = false
    private finishedDragging = false
    private dragStartX = 0
    private dragStartY = 0

    dragRect = { x: 0, y: 0, width: 0, height: 0 }

    private cursorSurface: Surface | null = null
    private cursorHidden = false

    readonly pressedButtons = new Set<number>()

    private constructor() {}

    get x(): number { return this._x }
    get y(): number { return this._y }

    /// Call once from the PixiJS ticker each frame.
    update(): void {
        if (this.pressedButtons.has(MOUSE_LEFT)) {
            this.finishedDragging = false
            if (!this.dragging) {
                this.dragging     = true
                this.dragStartX   = this._x
                this.dragStartY   = this._y
                this.dragRect     = { x: 0, y: 0, width: 0, height: 0 }
            } else {
                const x = Math.min(this._x, this.dragStartX)
                const y = Math.min(this._y, this.dragStartY)
                this.dragRect = {
                    x, y,
                    width:  Math.abs(this._x - this.dragStartX),
                    height: Math.abs(this._y - this.dragStartY),
                }
            }
        } else {
            this.finishedDragging = this.dragging
            this.dragging         = false
        }
    }

    isDragging():        boolean { return this.dragging }
    didFinishDragging(): boolean { return this.finishedDragging }

    releaseButton(button: number): void { this.pressedButtons.delete(button) }

    setCursor(surface: Surface | null): void { this.cursorSurface = surface }
    hideCursor(): void { this.cursorHidden = true }
    showCursor(): void { this.cursorHidden = false }

    drawCursor(video: Video): void {
        if (this.cursorHidden || !this.cursorSurface) return
        video.draw(this.cursorSurface, this._x, this._y, 255, 0)
    }

    /// Wire up DOM events on the canvas element. Call once at startup.
    attachTo(canvas: HTMLCanvasElement): void {
        const scaleX = () => VideoClass.width  / canvas.clientWidth
        const scaleY = () => VideoClass.height / canvas.clientHeight

        canvas.addEventListener('mousemove', e => {
            const rect = canvas.getBoundingClientRect()
            this._x = Math.round((e.clientX - rect.left) * scaleX())
            this._y = Math.round((e.clientY - rect.top)  * scaleY())
        })

        canvas.addEventListener('mousedown', e => {
            this.pressedButtons.add(e.button)
        })

        canvas.addEventListener('mouseup', e => {
            this.pressedButtons.delete(e.button)
        })

        // Prevent context menu on right-click inside the game.
        canvas.addEventListener('contextmenu', e => e.preventDefault())
    }
}

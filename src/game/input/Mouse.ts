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

    /// Touch taps fire touchstart + touchend in the same JS task on iOS Safari,
    /// so we defer the release by one frame: the touchend handler sets
    /// `pendingTouchRelease`, then the *next* update() removes MOUSE_LEFT.
    /// This guarantees per-frame button polling observes the press.
    private pendingTouchRelease = false

    dragRect = { x: 0, y: 0, width: 0, height: 0 }

    private cursorSurface: Surface | null = null
    private cursorHidden = false

    /// True on touch-only devices (iPhone, iPad) — detected via media query.
    /// We never draw the software cursor here, regardless of showCursor() calls.
    private isTouchDevice = false

    /// True if the most recent press came from a touch event. ArgentineTeam
    /// uses this to treat a left-tap-with-selection as a move/attack command
    /// (the touch equivalent of a desktop right-click).
    lastPressWasTouch = false

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

        // Consume a deferred touch release scheduled by an earlier touchend.
        // Runs at end of update() so this frame's state.update() saw the press;
        // next frame will see the release.
        if (this.pendingTouchRelease) {
            this.pressedButtons.delete(MOUSE_LEFT)
            this.pendingTouchRelease = false
        }
    }

    isDragging():        boolean { return this.dragging }
    didFinishDragging(): boolean { return this.finishedDragging }

    releaseButton(button: number): void { this.pressedButtons.delete(button) }

    setCursor(surface: Surface | null): void { this.cursorSurface = surface }
    hideCursor(): void { this.cursorHidden = true }
    showCursor(): void { this.cursorHidden = false }

    drawCursor(video: Video): void {
        if (this.isTouchDevice || this.cursorHidden || !this.cursorSurface) return
        video.draw(this.cursorSurface, this._x, this._y, 255, 0)
    }

    /// Wire up DOM events on the canvas element. Call once at startup.
    attachTo(canvas: HTMLCanvasElement): void {
        // Detect touch-only devices (iPhone, iPad) via media query so we can
        // hide the software cursor and switch input behavior.
        this.isTouchDevice = window.matchMedia('(hover: none) and (pointer: coarse)').matches

        const scaleX = () => VideoClass.width  / canvas.clientWidth
        const scaleY = () => VideoClass.height / canvas.clientHeight

        const setPosFromMouse = (e: MouseEvent) => {
            const rect = canvas.getBoundingClientRect()
            this._x = Math.round((e.clientX - rect.left) * scaleX())
            this._y = Math.round((e.clientY - rect.top)  * scaleY())
        }

        const setPosFromTouch = (touch: Touch) => {
            const rect = canvas.getBoundingClientRect()
            this._x = Math.round((touch.clientX - rect.left) * scaleX())
            this._y = Math.round((touch.clientY - rect.top)  * scaleY())
        }

        canvas.addEventListener('mousemove', setPosFromMouse)

        canvas.addEventListener('mousedown', e => {
            setPosFromMouse(e)
            this.pressedButtons.add(e.button)
            this.lastPressWasTouch = false
        })

        canvas.addEventListener('mouseup', e => {
            this.pressedButtons.delete(e.button)
        })

        // Prevent context menu on right-click inside the game.
        canvas.addEventListener('contextmenu', e => e.preventDefault())

        // Touch handlers synthesize MOUSE_LEFT events. preventDefault stops
        // iOS from also firing synthetic mouse events (which would double-press)
        // and from scrolling/zooming the page on tap.
        canvas.addEventListener('touchstart', e => {
            if (e.touches.length === 0) return
            setPosFromTouch(e.touches[0])
            this.pressedButtons.add(MOUSE_LEFT)
            this.pendingTouchRelease = false
            this.lastPressWasTouch   = true
            e.preventDefault()
        }, { passive: false })

        canvas.addEventListener('touchmove', e => {
            if (e.touches.length === 0) return
            setPosFromTouch(e.touches[0])
            e.preventDefault()
        }, { passive: false })

        canvas.addEventListener('touchend', e => {
            if (e.changedTouches.length > 0) setPosFromTouch(e.changedTouches[0])
            this.pendingTouchRelease = true
            e.preventDefault()
        }, { passive: false })

        canvas.addEventListener('touchcancel', () => {
            this.pressedButtons.delete(MOUSE_LEFT)
            this.pendingTouchRelease = false
        })
    }
}

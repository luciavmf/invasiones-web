// Copyright © 2026 Lucia Medina Fretes. All rights reserved.
// Licensed under the MIT License. See LICENSE in the project root for details.
//
// The parts of the mouse that player input reads, so tests can use a fake pointer, as in
// the macOS port (PointerDevice.swift).

import type { Surface } from '../rendering/Surface'

export interface PointerDevice {
    /// Position in screen coordinates (top-left origin).
    readonly x: number
    readonly y: number
    /// Buttons held down (`Mouse.Constants`).
    readonly pressedButtons: ReadonlySet<number>
    /// The rectangle of the current or last drag.
    readonly dragRect: { x: number; y: number; width: number; height: number }
    isDragging(): boolean
    /// `true` on the frame a drag ends.
    didFinishDragging(): boolean
    /// Treats a button as released, so a click is only handled once.
    releaseButton(button: number): void
    setCursor(surface: Surface | null): void
}

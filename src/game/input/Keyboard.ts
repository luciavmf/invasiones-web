// Copyright © 2026 Lucia Medina Fretes. All rights reserved.
// Licensed under the MIT License. See LICENSE in the project root for details.
/// Singleton tracking currently pressed keys.
/// Uses standard KeyboardEvent.code strings (browser equivalent of Carbon keycodes).
export class Keyboard {

    static readonly shared = new Keyboard()

    readonly pressedKeys = new Set<string>()

    private constructor() {}

    isDown(code: string): boolean { return this.pressedKeys.has(code) }
    clearKeys(): void { this.pressedKeys.clear() }

    /// Wire up DOM events. Call once at startup.
    attachTo(target: Window): void {
        target.addEventListener('keydown', e => {
            this.pressedKeys.add(e.code)
        })
        target.addEventListener('keyup', e => {
            this.pressedKeys.delete(e.code)
        })
    }
}

/// Mirrors the key constants used in the Swift port, mapped to KeyboardEvent.code.
export const Key = {
    U:         'KeyU',
    escape:    'Escape',
    enter:     'Enter',
    backspace: 'Backspace',
    left:      'ArrowLeft',
    right:     'ArrowRight',
    up:        'ArrowUp',
    down:      'ArrowDown',
} as const

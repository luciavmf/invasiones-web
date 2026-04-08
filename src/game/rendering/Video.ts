// Copyright © 2026 Lucia Medina Fretes. All rights reserved.
// Licensed under the MIT License. See LICENSE in the project root for details.
import * as PIXI from 'pixi.js'
import { Surface } from './Surface'
import type { GameFont } from '../resources/GameFont'
import { GameText } from '../resources/GameText'

/// The drawing surface that represents the screen.
/// Wraps PixiJS and exposes the same draw API as the Swift/SpriteKit port.
///
/// Coordinate system: origin (0, 0) at top-left, Y increases downward —
/// same as C#/SDL. No Y-flip needed (unlike SpriteKit).
export class Video {

    static readonly width  = 1024
    static readonly height = 768

    private canvas: PIXI.Container
    private currentColor = 0x000000
    private currentFont: GameFont | null = null
    private fontColor = 0xffffff

    private clipX = 0
    private clipY = 0
    private clipW = Video.width
    private clipH = Video.height

    constructor(app: PIXI.Application) {
        this.canvas = new PIXI.Container()
        app.stage.addChild(this.canvas)
    }

    // MARK: - Frame management

    clear(): void {
        this.canvas.removeChildren()
    }

    // MARK: - Draw surfaces

    /// Draws a surface at (x, y) with anchor flags.
    draw(surface: Surface | null, x: number, y: number, anchor: number): void
    /// Draws a surface with explicit alpha (0–255) and anchor flags.
    draw(surface: Surface | null, x: number, y: number, alpha: number, anchor: number): void
    /// Draws a sub-region of a surface at a destination position.
    draw(surface: Surface | null, srcX: number, srcY: number, srcW: number, srcH: number, destX: number, destY: number): void

    draw(
        surface: Surface | null,
        a1: number, a2: number, a3: number,
        a4?: number, a5?: number, a6?: number,
    ): void {
        if (!surface) return

        if (a6 !== undefined) {
            // draw(surface, srcX, srcY, srcW, srcH, destX, destY)
            this.drawSubregion(surface, a1, a2, a3, a4!, a5!, a6)
        } else if (a4 !== undefined) {
            // draw(surface, x, y, alpha, anchor)
            this.drawSurface(surface, a1, a2, a3, a4)
        } else {
            // draw(surface, x, y, anchor)
            this.drawSurface(surface, a1, a2, surface.currentAlpha * 255, a3)
        }
    }

    private drawSurface(surface: Surface, x: number, y: number, alpha: number, anchor: number): void {
        const tex = surface.activeTex
        if (!tex) return

        let px = x, py = y
        if (anchor & Surface.centerHorizontal) px += Video.width  / 2 - tex.width  / 2
        if (anchor & Surface.centerVertical)   py += Video.height / 2 - tex.height / 2

        const sprite = new PIXI.Sprite(tex)
        sprite.x     = px
        sprite.y     = py
        sprite.alpha = Math.max(0, Math.min(alpha, 255)) / 255
        this.canvas.addChild(sprite)
    }

    private drawSubregion(surface: Surface, srcX: number, srcY: number, srcW: number, srcH: number, destX: number, destY: number): void {
        const tex = surface.texture
        if (!tex || srcW <= 0 || srcH <= 0) return

        const subTex = new PIXI.Texture({
            source: tex.source,
            frame:  new PIXI.Rectangle(srcX, srcY, srcW, srcH),
        })

        const sprite = new PIXI.Sprite(subTex)
        sprite.x     = destX
        sprite.y     = destY
        sprite.alpha = surface.currentAlpha
        this.canvas.addChild(sprite)
    }

    // MARK: - Clip

    getClip(): { x: number; y: number; w: number; h: number } {
        return { x: this.clipX, y: this.clipY, w: this.clipW, h: this.clipH }
    }

    setClip(x: number, y: number, w: number, h: number): void {
        this.clipX = x; this.clipY = y; this.clipW = w; this.clipH = h
    }

    // MARK: - Write text

    /// Writes the string identified by its Res.STR_* index.
    writeId(stringId: number, x: number, y: number, anchor: number): void {
        const text = GameText.strings[stringId]
        if (text !== undefined) this.writeText(text, x, y, anchor)
    }

    /// Writes a string literal (dynamic text or debug output).
    write(text: string, x: number, y: number, anchor: number): void {
        this.writeText(text, x, y, anchor)
    }

    private writeText(text: string, x: number, y: number, anchor: number): void {
        let px = x, py = y
        if (anchor & Surface.centerHorizontal) px += Video.width  / 2
        if (anchor & Surface.centerVertical)   py += Video.height / 2

        const style = new PIXI.TextStyle({
            fontFamily:    this.currentFont?.family ?? 'sans-serif',
            fontSize:      this.currentFont?.size   ?? 14,
            fill:          this.fontColor,
            align:         (anchor & Surface.centerHorizontal) ? 'center' : 'left',
            wordWrap:      true,
            wordWrapWidth: Video.width - 80,
        })

        const label = new PIXI.Text({ text, style })
        label.anchor.set(
            (anchor & Surface.centerHorizontal) ? 0.5 : 0,
            (anchor & Surface.centerVertical)   ? 0.5 : 0,
        )
        label.x = px
        label.y = py
        this.canvas.addChild(label)
    }

    // MARK: - Fill primitives

    /// Fills a rectangle with the current colour.
    fillRect(x: number, y: number, w: number, h: number, alpha = 255, anchor = 0): void {
        let px = x, py = y
        if (anchor & Surface.centerHorizontal) px += Video.width  / 2 - w / 2
        if (anchor & Surface.centerVertical)   py += Video.height / 2 - h / 2

        const g = new PIXI.Graphics()
        g.rect(px, py, w, h).fill({ color: this.currentColor, alpha: alpha / 255 })
        this.canvas.addChild(g)
    }

    /// Fills a rounded rectangle with the current colour.
    fillRoundedRect(x: number, y: number, w: number, h: number, radius: number, alpha = 255, anchor = 0): void {
        let px = x, py = y
        if (anchor & Surface.centerHorizontal) px += Video.width  / 2 - w / 2
        if (anchor & Surface.centerVertical)   py += Video.height / 2 - h / 2

        const g = new PIXI.Graphics()
        g.roundRect(px, py, w, h, radius).fill({ color: this.currentColor, alpha: alpha / 255 })
        this.canvas.addChild(g)
    }

    /// Fills the entire screen with a solid colour.
    fillScreen(color: number): void {
        this.setColor(color)
        this.fillRect(0, 0, Video.width, Video.height)
    }

    /// Draws the outline of a rectangle (no fill).
    drawRect(x: number, y: number, w: number, h: number, anchor = 0): void {
        let px = x, py = y
        if (anchor & Surface.centerHorizontal) px += Video.width  / 2 - w / 2
        if (anchor & Surface.centerVertical)   py += Video.height / 2 - h / 2

        const g = new PIXI.Graphics()
        g.rect(px, py, w, h).stroke({ color: this.currentColor, width: 1 })
        this.canvas.addChild(g)
    }

    // MARK: - Drawing state

    setColor(color: number): void {
        this.currentColor = color
    }

    setFont(font: GameFont | null, color: number): void {
        this.currentFont = font
        this.fontColor   = color
    }

    refresh(): void { /* PixiJS manages rendering automatically */ }
}

// Copyright © 2026 Lucia Medina Fretes. All rights reserved.
// Licensed under the MIT License. See LICENSE in the project root for details.
import './style.css'
import * as PIXI from 'pixi.js'
import { GameFrame } from './game/GameFrame'
import { Mouse } from './game/input/Mouse'
import { Keyboard } from './game/input/Keyboard'
import { Video } from './game/rendering/Video'

// Match the canvas to the device viewport so it fills the screen without
// stretching. The map renders more/less of the world depending on device
// aspect ratio; tiles stay at native scale either way.
Video.width  = Math.floor(window.innerWidth)
Video.height = Math.floor(window.innerHeight)

const app = new PIXI.Application()

await app.init({
    width:            Video.width,
    height:           Video.height,
    backgroundColor:  0x000000,
    antialias:        false,
    // Cap at integer 2 — non-integer ratios cause sprite positions to land on
    // sub-pixels, which shows as visible seams between adjacent tiles.
    resolution:       Math.min(window.devicePixelRatio || 1, 2),
    autoDensity:      true,
    roundPixels:      true,
})

document.querySelector<HTMLDivElement>('#app')!.appendChild(app.canvas)

Mouse.shared.attachTo(app.canvas as HTMLCanvasElement)
Keyboard.shared.attachTo(window)

const game = new GameFrame()
try {
    await game.startGame(app)
} catch (e) {
    console.error('startGame failed:', e)
}

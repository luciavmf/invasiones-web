// Copyright © 2026 Lucia Medina Fretes. All rights reserved.
// Licensed under the MIT License. See LICENSE in the project root for details.
import './style.css'
import * as PIXI from 'pixi.js'
import { GameFrame } from './game/GameFrame'
import { Mouse } from './game/input/Mouse'
import { Keyboard } from './game/input/Keyboard'
import { Video } from './game/rendering/Video'

const app = new PIXI.Application()

await app.init({
    width:            Video.width,
    height:           Video.height,
    backgroundColor:  0x000000,
    antialias:        false,
    resolution:       window.devicePixelRatio || 1,
    autoDensity:      true,
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

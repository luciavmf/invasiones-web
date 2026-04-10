// Copyright © 2026 Lucia Medina Fretes. All rights reserved.
// Licensed under the MIT License. See LICENSE in the project root for details.
import { Frame } from './Frame'
import { ResourceManager } from '../resources/ResourceManager'
import { Theme, FontConstants } from '../Definitions'
import { Surface } from '../rendering/Surface'
import { Video } from '../rendering/Video'
import { Mouse, MOUSE_LEFT } from '../input/Mouse'
import type { GameFont } from '../resources/GameFont'
import type { Video as VideoType } from '../rendering/Video'

export class Button {

    static readonly Constants = {
        screenEdgeOffset: 15,
        defaultHeight:    25,
        defaultWidth:     100,
    }

    frame = new Frame(Button.Constants.defaultWidth, Button.Constants.defaultHeight)
    font:  GameFont | null
    label: number
    isUnderCursor = false

    constructor(label: number, font: GameFont | null) {
        this.label = label
        this.font  = font ?? ResourceManager.shared.fonts[FontConstants.buttonFont]
    }

    setPosition(x: number, y: number, anchor: number): void {
        this.frame.setPosition(x, y, anchor)
    }

    update(): number {
        const mx = Mouse.shared.x
        const my = Mouse.shared.y
        this.isUnderCursor = mx > this.frame.posX && mx < this.frame.posX + this.frame.width
                          && my > this.frame.posY && my < this.frame.posY + this.frame.height

        if (this.isUnderCursor && Mouse.shared.pressedButtons.has(MOUSE_LEFT)) {
            Mouse.shared.releaseButton(MOUSE_LEFT)
            return 1
        }
        return 0
    }

    draw(video: VideoType): void {
        video.setColor(this.isUnderCursor ? Theme.buttonHover : Theme.menus)
        video.fillRoundedRect(this.frame.posX, this.frame.posY, this.frame.width, this.frame.height, 6, this.isUnderCursor ? Theme.buttonHoverAlpha : Theme.alpha)

        video.setFont(this.font, Theme.text)
        video.writeId(
            this.label,
            this.frame.posX - Video.width  / 2 + this.frame.width  / 2,
            this.frame.posY - Video.height / 2 + this.frame.height / 2,
            Surface.centerHorizontal | Surface.centerVertical,
        )
    }
}

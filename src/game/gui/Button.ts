// Copyright © 2026 Lucia Medina Fretes. All rights reserved.
// Licensed under the MIT License. See LICENSE in the project root for details.
import { GUIBox } from './GUIBox'
import { ResourceManager } from '../resources/ResourceManager'
import { Theme, FontConstants } from '../Definitions'
import { Surface } from '../rendering/Surface'
import { Video } from '../rendering/Video'
import { Mouse, MOUSE_LEFT } from '../input/Mouse'
import type { GameFont } from '../resources/GameFont'
import type { Video as VideoType } from '../rendering/Video'

export class Button extends GUIBox {

    static readonly Constants = {
        screenEdgeOffset: 15,
        defaultHeight:    25,
        defaultWidth:     100,
    }

    isUnderCursor = false

    constructor(label: number, font: GameFont | null) {
        super()
        this.label  = label
        this.height = Button.Constants.defaultHeight
        this.width  = Button.Constants.defaultWidth
        this.font   = font ?? ResourceManager.shared.fonts[FontConstants.buttonFont]
    }

    setPosition(x: number, y: number, anchor: number): void {
        this.posX = x
        this.posY = y
        if (anchor & Surface.centerVertical)   this.posY += (Video.height >> 1) - (this.height >> 1)
        if (anchor & Surface.centerHorizontal) this.posX += (Video.width  >> 1) - (this.width  >> 1)
    }

    update(): number {
        const mx = Mouse.shared.x
        const my = Mouse.shared.y
        this.isUnderCursor = mx > this.posX && mx < this.posX + this.width
                          && my > this.posY && my < this.posY + this.height

        if (this.isUnderCursor && Mouse.shared.pressedButtons.has(MOUSE_LEFT)) {
            Mouse.shared.releaseButton(MOUSE_LEFT)
            return 1
        }
        return 0
    }

    draw(video: VideoType): void {
        video.setColor(this.isUnderCursor ? Theme.buttonHover : Theme.menus)
        video.fillRoundedRect(this.posX, this.posY, this.width, this.height, 6, this.isUnderCursor ? Theme.buttonHoverAlpha : Theme.alpha)

        video.setFont(this.font, Theme.text)
        video.writeId(
            this.label,
            this.posX - Video.width  / 2 + this.width  / 2,
            this.posY - Video.height / 2 + this.height / 2,
            Surface.centerHorizontal | Surface.centerVertical,
        )
    }
}

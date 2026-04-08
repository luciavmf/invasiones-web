// Copyright © 2026 Lucia Medina Fretes. All rights reserved.
// Licensed under the MIT License. See LICENSE in the project root for details.
import { GUIBox } from './GUIBox'
import { Button } from './Button'
import { ResourceManager } from '../resources/ResourceManager'
import { UIColors, FontConstants } from '../Definitions'
import { Surface } from '../rendering/Surface'
import { Video } from '../rendering/Video'
import type { Video as VideoType } from '../rendering/Video'

export const ConfirmationSelection = { none: -1, left: 0, right: 1 } as const

export class ConfirmationMenu extends GUIBox {

    static readonly Constants = {
        alpha:         128,
        defaultWidth:  350,
        defaultHeight: 150,
    }

    private leftButton:  Button
    private rightButton: Button

    constructor(label: number, btn1: number, btn2: number) {
        super()
        this.label  = label
        this.width  = ConfirmationMenu.Constants.defaultWidth
        this.height = ConfirmationMenu.Constants.defaultHeight

        this.leftButton  = new Button(btn1, null)
        this.rightButton = new Button(btn2, null)
    }

    setPosition(x: number, y: number, anchor: number): void {
        this.posX = x
        this.posY = y
        if (anchor & Surface.centerHorizontal) this.posX += (Video.width  >> 1) - (this.width  >> 1)
        if (anchor & Surface.centerVertical)   this.posY += (Video.height >> 1) - (this.height >> 1)

        this.leftButton.setPosition(
            this.posX + Button.Constants.screenEdgeOffset,
            this.posY + this.height - this.leftButton.height - Button.Constants.screenEdgeOffset,
            0,
        )
        this.rightButton.setPosition(
            this.posX + this.width - this.rightButton.width - Button.Constants.screenEdgeOffset,
            this.posY + this.height - this.rightButton.height - Button.Constants.screenEdgeOffset,
            0,
        )
    }

    update(): number {
        if (this.leftButton.update()  !== 0) return ConfirmationSelection.left
        if (this.rightButton.update() !== 0) return ConfirmationSelection.right
        return ConfirmationSelection.none
    }

    draw(video: VideoType): void {
        video.setColor(UIColors.menus)
        video.fillRect(this.posX, this.posY, this.width, this.height, ConfirmationMenu.Constants.alpha)

        video.setFont(ResourceManager.shared.fonts[FontConstants.menuFont], UIColors.text)
        video.writeId(
            this.label,
            this.posX - (Video.width >> 1) + (this.width >> 1),
            this.posY + this.height / 5,
            Surface.centerHorizontal,
        )

        this.leftButton.draw(video)
        this.rightButton.draw(video)
    }
}

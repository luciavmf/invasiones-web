// Copyright © 2026 Lucia Medina Fretes. All rights reserved.
// Licensed under the MIT License. See LICENSE in the project root for details.
import { Frame } from './Frame'
import { Button } from './Button'
import { ResourceManager } from '../resources/ResourceManager'
import { Theme, FontConstants } from '../Definitions'
import { Surface } from '../rendering/Surface'
import { Video } from '../rendering/Video'
import type { Video as VideoType } from '../rendering/Video'

export const ConfirmationSelection = { none: -1, left: 0, right: 1 } as const

export class ConfirmationMenu {

    static readonly Constants = {
        alpha:         128,
        defaultWidth:  350,
        defaultHeight: 150,
    }

    frame = new Frame(ConfirmationMenu.Constants.defaultWidth, ConfirmationMenu.Constants.defaultHeight)
    label: number

    private leftButton:  Button
    private rightButton: Button

    constructor(label: number, btn1: number, btn2: number) {
        this.label       = label
        this.leftButton  = new Button(btn1, null)
        this.rightButton = new Button(btn2, null)
    }

    setPosition(x: number, y: number, anchor: number): void {
        this.frame.posX = x
        this.frame.posY = y
        if (anchor & Surface.centerHorizontal) this.frame.posX += (Video.width  >> 1) - (this.frame.width  >> 1)
        if (anchor & Surface.centerVertical)   this.frame.posY += (Video.height >> 1) - (this.frame.height >> 1)

        this.leftButton.setPosition(
            this.frame.posX + Button.Constants.screenEdgeOffset,
            this.frame.posY + this.frame.height - this.leftButton.frame.height - Button.Constants.screenEdgeOffset,
            0,
        )
        this.rightButton.setPosition(
            this.frame.posX + this.frame.width - this.rightButton.frame.width - Button.Constants.screenEdgeOffset,
            this.frame.posY + this.frame.height - this.rightButton.frame.height - Button.Constants.screenEdgeOffset,
            0,
        )
    }

    update(): number {
        if (this.leftButton.update()  !== 0) return ConfirmationSelection.left
        if (this.rightButton.update() !== 0) return ConfirmationSelection.right
        return ConfirmationSelection.none
    }

    draw(video: VideoType): void {
        video.setColor(Theme.menus)
        video.fillRect(this.frame.posX, this.frame.posY, this.frame.width, this.frame.height, ConfirmationMenu.Constants.alpha)

        video.setFont(ResourceManager.shared.fonts[FontConstants.menuFont], Theme.text)
        video.writeId(
            this.label,
            this.frame.posX - (Video.width >> 1) + (this.frame.width >> 1),
            this.frame.posY + this.frame.height / 5,
            Surface.centerHorizontal,
        )

        this.leftButton.draw(video)
        this.rightButton.draw(video)
    }
}

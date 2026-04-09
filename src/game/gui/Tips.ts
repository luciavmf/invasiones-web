// Copyright © 2026 Lucia Medina Fretes. All rights reserved.
// Licensed under the MIT License. See LICENSE in the project root for details.
import { GUIBox }     from './GUIBox'
import { Button }     from './Button'
import { Surface }    from '../rendering/Surface'
import { Video }      from '../rendering/Video'
import { ResourceManager } from '../resources/ResourceManager'
import { Res }        from '../resources/Res'
import { FontConstants, Theme } from '../Definitions'
import type { Video as VideoType } from '../rendering/Video'

/// Floating window that shows random gameplay tips.
export class Tips extends GUIBox {

    private static readonly INITIAL_TIP_TIME = 250
    private static readonly MAX_BLINK  = 40
    private static readonly MIN_BLINK  = 20
    private static readonly ALPHA      = 100
    private static readonly W          = 450
    private static readonly H          = 100

    private tipButton: Button
    private shouldShow = false
    private tipCount   = 0
    private blinkCount = 0

    constructor() {
        super()
        this.tipButton = new Button(Res.STR_TIP_00, null)
        this.tipButton.posX = Video.width  - this.tipButton.width  - 20
        this.tipButton.posY = Video.height - 90 - this.tipButton.height

        this.width  = Tips.W
        this.height = Tips.H
        this.generateRandomTip()
        this.tipCount  = Tips.INITIAL_TIP_TIME
        this.shouldShow = false
    }

    setPosition(x: number, y: number, anchor: number): void {
        this.posX = x
        this.posY = y
        if (anchor & Surface.centerHorizontal) this.posX += (Video.width  >> 1) - (this.width  >> 1)
        if (anchor & Surface.centerVertical)   this.posY += (Video.height >> 1) - (this.height >> 1)
    }

    update(): number {
        this.blinkCount++

        if (this.shouldShow) {
            if (this.tipCount <= 0) this.shouldShow = false
            if (this.blinkCount > Tips.MAX_BLINK) this.blinkCount = 0
        } else {
            if (Math.floor(Math.random() * 300) === 99) {
                this.shouldShow  = true
                this.blinkCount  = 0
                this.tipCount    = Tips.INITIAL_TIP_TIME
                this.generateRandomTip()
            }
        }

        this.tipButton.update()
        return -1
    }

    draw(video: VideoType): void {
        if (!this.shouldShow) return

        if (this.tipButton.isUnderCursor) {
            video.setColor(Theme.menus)
            video.fillRect(this.posX, this.posY, this.width, this.height, Tips.ALPHA)
            video.setFont(ResourceManager.shared.fonts[FontConstants.objectivesReminderFont], Theme.text)
            video.writeId(
                this.label,
                this.posX - (Video.width >> 1) + (this.width >> 1),
                this.posY + Math.trunc(this.height / 5),
                Surface.centerHorizontal,
            )
            this.tipButton.draw(video)
        } else {
            this.tipCount--
            if (this.blinkCount > Tips.MIN_BLINK && this.blinkCount < Tips.MAX_BLINK) {
                this.tipButton.draw(video)
            }
        }
    }

    private generateRandomTip(): void {
        this.label = Res.STR_TIP_01 + Math.floor(Math.random() * (Res.STR_TIP_23 - Res.STR_TIP_01))
    }
}

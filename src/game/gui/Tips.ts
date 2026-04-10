// Copyright © 2026 Lucia Medina Fretes. All rights reserved.
// Licensed under the MIT License. See LICENSE in the project root for details.
import { Frame }   from './Frame'
import { Button }  from './Button'
import { Res }     from '../resources/Res'
import { Surface } from '../rendering/Surface'
import { Video }   from '../rendering/Video'
import { ResourceManager } from '../resources/ResourceManager'
import { GameText } from '../resources/GameText'
import { FontConstants, Theme } from '../Definitions'
import type { Video as VideoType } from '../rendering/Video'

/// Floating window that shows random gameplay tips.
export class Tips {

    private static readonly INITIAL_TIP_TIME = 250
    private static readonly MAX_BLINK  = 40
    private static readonly MIN_BLINK  = 20
    private static readonly ALPHA      = 100
    private static readonly W          = 450
    private static readonly H          = 100

    frame = new Frame(Tips.W, Tips.H)

    private tipButton: Button
    private tipText    = ''
    private shouldShow = false
    private tipCount   = 0
    private blinkCount = 0

    constructor() {
        this.tipButton = new Button(Res.STR_TIP_00, null)
        this.tipButton.frame.posX = Video.width  - this.tipButton.frame.width  - 20
        this.tipButton.frame.posY = Video.height - 90 - this.tipButton.frame.height

        this.generateRandomTip()
        this.tipCount   = Tips.INITIAL_TIP_TIME
        this.shouldShow = false
    }

    setPosition(x: number, y: number, anchor: number): void {
        this.frame.posX = x
        this.frame.posY = y
        if (anchor & Surface.centerHorizontal) this.frame.posX += (Video.width  >> 1) - (this.frame.width  >> 1)
        if (anchor & Surface.centerVertical)   this.frame.posY += (Video.height >> 1) - (this.frame.height >> 1)
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
            video.fillRect(this.frame.posX, this.frame.posY, this.frame.width, this.frame.height, Tips.ALPHA)
            video.setFont(ResourceManager.shared.fonts[FontConstants.objectivesReminderFont], Theme.text)
            video.write(
                this.tipText,
                this.frame.posX - (Video.width >> 1) + (this.frame.width >> 1),
                this.frame.posY + Math.trunc(this.frame.height / 5),
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
        const tips = GameText.tips
        if (tips.length > 0) this.tipText = tips[Math.floor(Math.random() * tips.length)]
    }
}

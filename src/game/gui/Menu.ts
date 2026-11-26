// Copyright © 2026 Lucia Medina Fretes. All rights reserved.
// Licensed under the MIT License. See LICENSE in the project root for details.
import { Frame } from './Frame'
import { Theme, GameColor } from '../Definitions'
import { Surface } from '../rendering/Surface'
import { Video } from '../rendering/Video'
import { Mouse, MOUSE_LEFT } from '../input/Mouse'
import type { GameFont } from '../resources/GameFont'
import type { Surface as SurfaceType } from '../rendering/Surface'
import type { Video as VideoType } from '../rendering/Video'
import type { StringID } from '../resources/StringID'

export class Menu {

    static readonly Constants = {
        maxItemCount: 15,
        itemVisible:  1 << 1,
        itemHidden:   1 << 2,
        itemHover:    1 << 3,
        itemSelected: 1 << 4,
    }

    frame = new Frame()
    font:  GameFont | null = null
    image: SurfaceType | null = null

    /// Each item's flags (`Menu.Constants.item*`) and label.
    private itemFlags:    number[]
    private itemLabels:   (StringID | null)[]
    private itemCount   = 0
    private buttonWidth  = 160
    private buttonHeight = 26
    private lineSpacing  = 1
    private originalX    = 0
    private originalY    = 0
    private anchor       = 0

    constructor(image: SurfaceType | null, _itemCount: number, x: number, y: number, anchor: number) {
        this.itemFlags  = new Array(Menu.Constants.maxItemCount).fill(0)
        this.itemLabels = new Array(Menu.Constants.maxItemCount).fill(null)
        this.originalX = x
        this.originalY = y
        this.anchor    = anchor
        this.image     = image
    }

    addItem(index: number, label: StringID, flag: number): boolean {
        if (index > Menu.Constants.maxItemCount - 1) return false

        if (this.itemCount === index) this.itemCount++
        this.itemFlags[index]  = flag
        this.itemLabels[index] = label

        if (this.anchor & Surface.centerHorizontal) {
            this.frame.posX = (Video.width >> 1) - (this.buttonWidth >> 1) + this.originalX
        }
        if (this.anchor & Surface.centerVertical) {
            this.frame.posY = (Video.height >> 1) + this.originalY
                - (((this.buttonHeight + this.lineSpacing) * this.itemCount - this.lineSpacing) >> 1)
        }

        this.frame.height = (this.buttonHeight + this.lineSpacing) * this.itemCount - this.lineSpacing
        this.frame.width  = this.image?.width ?? this.buttonWidth
        return true
    }

    setPosition(x: number, y: number, anchor: number): void {
        this.originalX     = x
        this.frame.posX    = x
        this.originalY     = y
        this.frame.posY    = y
        this.anchor        = anchor

        if (anchor & Surface.centerHorizontal) {
            this.frame.posX = (Video.width >> 1) - (this.buttonWidth >> 1) + x
        }
        if (anchor & Surface.centerVertical) {
            this.frame.posY = (Video.height >> 1) + y
                - (((this.buttonHeight + this.lineSpacing) * this.itemCount - this.lineSpacing) >> 1)
        }
    }

    update(): number {
        let selectedItem = -1
        let y = this.frame.posY

        for (let i = 0; i < this.itemCount; i++) {
            const flags = this.itemFlags[i]
            if (flags !== Menu.Constants.itemHidden) {
                const mx = Mouse.shared.x
                const my = Mouse.shared.y
                if (mx > this.frame.posX && mx < this.frame.posX + this.buttonWidth
                 && my > y && my < y + this.buttonHeight) {
                    this.itemFlags[i] |= Menu.Constants.itemHover
                    if (Mouse.shared.pressedButtons.has(MOUSE_LEFT)) {
                        this.itemFlags[i] |= Menu.Constants.itemSelected
                        selectedItem = i
                    }
                } else {
                    this.itemFlags[i] &= ~Menu.Constants.itemHover
                }
                y += this.lineSpacing + this.buttonHeight
            }
        }

        return selectedItem
    }

    draw(video: VideoType): void {
        if (this.image) {
            video.draw(this.image, this.frame.posX, this.frame.posY - 6, 0)
        } else {
            const padding     = 6
            const totalHeight = (this.buttonHeight + this.lineSpacing) * this.itemCount - this.lineSpacing
            video.setColor(Theme.menus)
            video.fillRoundedRect(
                this.frame.posX - padding, this.frame.posY - padding,
                this.buttonWidth + padding * 2, totalHeight + padding * 2,
                10, Theme.alpha,
            )
        }

        let y = this.frame.posY
        for (let i = 0; i < this.itemCount; i++) {
            const flags = this.itemFlags[i]
            const label = this.itemLabels[i]
            if (flags !== Menu.Constants.itemHidden && label !== null) {
                if (flags & Menu.Constants.itemHover) {
                    video.setColor(GameColor.black)
                    video.fillRect(this.frame.posX, y, this.buttonWidth, this.buttonHeight)
                }
                video.setFont(this.font, Theme.text)
                video.writeId(
                    label,
                    this.frame.posX - (Video.width  >> 1) + (this.buttonWidth  >> 1),
                    y              - (Video.height >> 1) + (this.buttonHeight >> 1),
                    Surface.centerHorizontal | Surface.centerVertical,
                )
                y += this.lineSpacing + this.buttonHeight
            }
        }
    }
}

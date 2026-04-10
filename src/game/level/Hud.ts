// Copyright © 2026 Lucia Medina Fretes. All rights reserved.
// Licensed under the MIT License. See LICENSE in the project root for details.
import { ResourceManager } from '../resources/ResourceManager'
import { Res }         from '../resources/Res'
import { GameText }    from '../resources/GameText'
import { Tips }        from '../gui/Tips'
import { Video }       from '../rendering/Video'
import { FontIndex, GameColor } from '../Definitions'
import type { Unit }   from '../units/Unit'
import type { Video as VideoType } from '../rendering/Video'

export class Hud {

    private static readonly C = {
        avatarX:              61,
        avatarY:              11,
        avatarNameX:          128,
        avatarNameY:          6,
        attrsStartX1:         141,
        attrsStartX2:         215,
        attrsStartX3:         338,
        attrsStartY:          25,
        attrsCountY:          35,
        attrsEnemyCountX:     705,
        attrsArgentineCountX: 570,
    }

    private image = ResourceManager.shared.getImageSync(Res.IMG_HUD)
    private unitToShow: Unit | null = null
    enemyCount    = 0
    argentineCount = 0
    private posY: number
    private readonly lineSpacing = 12
    private tipsWindow: Tips

    get selectedUnit(): Unit | null { return this.unitToShow }
    set selectedUnit(u: Unit | null) { this.unitToShow = u }
    get height(): number { return this.image?.height ?? 0 }

    constructor() {
        this.posY = Video.height - this.height
        this.tipsWindow = new Tips()
        this.tipsWindow.setPosition(
            ((Video.width - this.tipsWindow.frame.width) / 2) + 175,
            this.posY - this.tipsWindow.frame.height - 75,
            0,
        )
    }

    update(): void {
        if (this.unitToShow?.isDead()) this.unitToShow = null
        this.tipsWindow.update()
    }

    draw(video: VideoType): void {
        if (this.image) video.draw(this.image, 0, this.posY, 0)
        this.tipsWindow.draw(video)

        video.setFont(ResourceManager.shared.fonts[FontIndex.sans12], GameColor.black)
        video.write(`${this.enemyCount}`,    Hud.C.attrsEnemyCountX,    this.posY + Hud.C.attrsCountY, 0)
        video.write(`${this.argentineCount}`, Hud.C.attrsArgentineCountX, this.posY + Hud.C.attrsCountY, 0)

        video.setFont(ResourceManager.shared.fonts[FontIndex.sans12], GameColor.white)
        const uni = this.unitToShow
        if (!uni) return

        if (uni.avatar) video.draw(uni.avatar, Hud.C.avatarX, this.posY + Hud.C.avatarY, 0)
        video.write(uni.name, Hud.C.avatarNameX, this.posY + Hud.C.avatarNameY, 0)

        video.setColor(GameColor.black)
        const s = GameText.strings
        const sY = this.posY + Hud.C.attrsStartY
        const l  = this.lineSpacing

        video.write(`${s[Res.STR_ALCANCE] ?? ''}: ${uni.range}`,         Hud.C.attrsStartX1, sY,     0)
        video.write(`${s[Res.STR_PUNTERIA] ?? ''}: ${uni.aim}`,          Hud.C.attrsStartX1, sY + l, 0)
        video.write(`${s[Res.STR_PUNTOS_DE_ATAQUE] ?? ''}: ${uni.attackPoints}`,
                                                                          Hud.C.attrsStartX2, sY,     0)
        video.write(`${s[Res.STR_PUNTOS_DE_RESISTENCIA] ?? ''}: ${uni.health}/${uni.resistancePoints}`,
                                                                          Hud.C.attrsStartX2, sY + l, 0)
        video.write(`${s[Res.STR_VELOCIDAD] ?? ''}: ${uni.defaultSpeed}`, Hud.C.attrsStartX3, sY,     0)
        video.write(`${s[Res.STR_VISIBILIDAD] ?? ''}: ${uni.visibility}`, Hud.C.attrsStartX3, sY + l, 0)
    }
}

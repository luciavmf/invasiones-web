// Copyright © 2026 Lucia Medina Fretes. All rights reserved.
// Licensed under the MIT License. See LICENSE in the project root for details.
import * as PIXI from 'pixi.js'
import { Surface } from '../rendering/Surface'
import { GameFont } from './GameFont'
import { Animation } from '../sprites/Animation'
import { Sprite } from '../sprites/Sprite'
import { Res } from './Res'
import { FontIndex } from '../Definitions'

/// Singleton that loads and caches all game resources from /data/.
/// Replaces file-system paths with fetch() URLs served by Vite / Netlify.
export class ResourceManager {

    static readonly shared = new ResourceManager()

    private imageById   = new Map<number, Surface>()
    private imageByName = new Map<string, Surface>()

    fonts:      (GameFont | null)[] = []
    sprites:    (Sprite   | null)[] = []
    animations: (Animation | null)[] = []

    /// Unit-type template objects. Populated by loadUnitTypes().
    /// Each entry is a plain data object used to clone into new Unit instances.
    unitTypeData: any[] = []

    /// Cached res.json for use by Map and Episode.
    resJson: any = null

    private imagePaths:  string[] = []
    private fontPaths:   string[] = []
    private animConfigs: any[]    = []
    private spriteConfigs: any[]  = []
    private unitConfigs:   any[]  = []

    private constructor() {}

    // MARK: - Load resource manifest

    async loadResourcePaths(): Promise<void> {
        const res = await this.fetchResJSON()
        this.resJson       = res
        this.fontPaths     = res.fuentes.map((p: string) => `${import.meta.env.BASE_URL}data/${p}`)
        this.imagePaths    = res.imagenes.map((p: string) => `${import.meta.env.BASE_URL}data/${p}`)
        this.animConfigs   = res.anims ?? []
        this.spriteConfigs = res.sprites ?? []
        this.unitConfigs   = res.unidades ?? []
    }

    // MARK: - Images

    /// Preloads all images listed in res.json so getImage() can be called synchronously.
    async preloadImages(): Promise<void> {
        await Promise.all(
            this.imagePaths.map((_, i) =>
                this.getImage(i).catch(e => console.warn('preloadImages: failed to load image', i, e))
            )
        )
    }

    /// Returns a cached image by Res.IMG_* id. Returns null if not yet preloaded.
    getImageSync(id: number): Surface | null {
        return this.imageById.get(id) ?? null
    }

    /// Loads (and caches) an image by its Res.IMG_* id.
    async getImage(id: number): Promise<Surface | null> {
        const cached = this.imageById.get(id)
        if (cached) return cached

        const url = this.imagePaths[id]
        if (!url) return null

        const tex = await PIXI.Assets.load<PIXI.Texture>(url)
        tex.source.scaleMode = 'nearest'
        const surface = new Surface(tex)
        this.imageById.set(id, surface)
        this.imageByName.set(url, surface)
        return surface
    }

    /// Loads (and caches) an image by relative path (e.g. 'imagenes/cursor.png').
    async getImageByPath(path: string): Promise<Surface | null> {
        const url = `${import.meta.env.BASE_URL}data/${path}`
        const cached = this.imageByName.get(url)
        if (cached) return cached

        const tex = await PIXI.Assets.load<PIXI.Texture>(url)
        tex.source.scaleMode = 'nearest'
        const surface = new Surface(tex)
        this.imageByName.set(url, surface)
        return surface
    }

    // MARK: - Fonts

    async loadFonts(): Promise<void> {
        if (this.fonts.length > 0) return

        this.fonts = new Array(FontIndex.total).fill(null)

        const lblackUrl = this.fontPaths[Res.FNT_LBLACK]
        await GameFont.load('LBlack', lblackUrl, 14)

        // FreeSans is replaced by the browser's built-in sans-serif.
        this.fonts[FontIndex.sans12]   = new GameFont('sans-serif', 12)
        this.fonts[FontIndex.sans14]   = new GameFont('sans-serif', 14)
        this.fonts[FontIndex.sans18]   = new GameFont('sans-serif', 18)
        this.fonts[FontIndex.sans20]   = new GameFont('sans-serif', 20)
        this.fonts[FontIndex.sans24]   = new GameFont('sans-serif', 24)
        this.fonts[FontIndex.sans28]   = new GameFont('sans-serif', 28)
        this.fonts[FontIndex.lblack12] = new GameFont('LBlack',     12)
        this.fonts[FontIndex.lblack14] = new GameFont('LBlack',     14)
        this.fonts[FontIndex.lblack18] = new GameFont('LBlack',     18)
        this.fonts[FontIndex.lblack20] = new GameFont('LBlack',     20)
        this.fonts[FontIndex.lblack28] = new GameFont('LBlack',     28)
    }

    // MARK: - Animations

    async loadAnimations(): Promise<void> {
        this.animations = new Array(Res.ANIM_COUNT).fill(null)
        await Promise.all(
            this.animConfigs.slice(0, Res.ANIM_COUNT).map(async (cfg: any, i: number) => {
                const url = `/data/${cfg.imagepath}`
                const surface = await this.getImageByPath(cfg.imagepath)
                if (!surface) return
                const anim = new Animation(
                    0, url, cfg.frameticks,
                    cfg.framewidth, cfg.frameheight,
                    cfg.offsetX ?? 0, cfg.offsetY ?? 0,
                )
                anim.image = surface
                anim.init()
                this.animations[i] = anim
            })
        )
    }

    // MARK: - Sprites

    async loadSprites(): Promise<void> {
        if (this.sprites.length > 0) return
        this.sprites = new Array(Res.SPR_COUNT).fill(null)

        for (let idx = 0; idx < this.spriteConfigs.length && idx < Res.SPR_COUNT; idx++) {
            const cfg = this.spriteConfigs[idx]
            const sprite = new Sprite()
            const animpaks: (Animation | null)[] = []

            for (const pak of (cfg.animpaks ?? [])) {
                const img = pak.image
                if (!img) continue
                const surface = await this.getImageByPath(img.path)
                if (!surface) continue
                const anim = new Animation(
                    0, img.path,
                    img.frameticks,
                    img.framewidth,
                    img.frameheight,
                    img.offsetX ?? 0,
                    img.offsetY ?? 0,
                )
                anim.image = surface
                anim.init()
                animpaks.push(anim)
            }

            sprite.reserveSlots(animpaks.length)
            animpaks.forEach((a, i) => { if (a) sprite.addAnimation(i, a) })
            // Set the first animation as active
            if (animpaks.length > 0) sprite.setAnimation(0)
            this.sprites[idx] = sprite
        }
    }

    // MARK: - Unit type data (CSV)

    async loadUnitTypes(): Promise<void> {
        if (this.unitTypeData.length > 0) return

        for (const cfg of this.unitConfigs) {
            const url = `${import.meta.env.BASE_URL}data/${cfg.file}`
            try {
                const resp = await fetch(url)
                if (!resp.ok) { this.unitTypeData.push(null); continue }
                const text = await resp.text()
                const data: any = { name: cfg.name }
                for (const line of text.split('\n')) {
                    const parts = line.split(';')
                    if (parts.length < 2) continue
                    const key = parts[0].trim()
                    const val = parts[1].trim()
                    switch (key) {
                        case 'Velocidad':             data.speed          = parseInt(val, 10) || 2; break
                        case 'Puntos_Resistencia':    data.resistance     = parseInt(val, 10) || 100; break
                        case 'Puntos_Ataque':         data.attack         = parseInt(val, 10) || 10; break
                        case 'Visibilidad':           data.visibility     = parseInt(val, 10) || 10; break
                        case 'Punteria':              data.aim            = parseInt(val, 10) || 5; break
                        case 'Alcance_Tiro':          data.range          = parseInt(val, 10) || 5; break
                        case 'Intervalo_Entre_Ataques': data.attackInterval = parseInt(val, 10) || 30; break
                        case 'Nombre':                data.unitName       = val; break
                        case 'Puntos_De_Recuperacion':  data.recoveryPoints = parseInt(val, 10) || 20; break
                        case 'Ticks_Entre_Recuparacion': data.recoveryTicks  = parseInt(val, 10) || 50; break
                        case 'Avatar':
                            data.avatar = await this.getImageByPath(val)
                            break
                        case 'Sprite':
                            data.spriteIdx = val === 'patricio' ? Res.SPR_PATRICIO : Res.SPR_INGLES
                            break
                    }
                }
                this.unitTypeData.push(data)
            } catch {
                this.unitTypeData.push(null)
            }
        }
    }

    // MARK: - Private

    private async fetchResJSON(): Promise<any> {
        const response = await fetch(`${import.meta.env.BASE_URL}data/res.json`)
        if (!response.ok) throw new Error('ResourceManager: failed to load res.json')
        return response.json()
    }
}

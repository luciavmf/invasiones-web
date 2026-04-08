// Copyright © 2026 Lucia Medina Fretes. All rights reserved.
// Licensed under the MIT License. See LICENSE in the project root for details.
/// Wrapper over a loaded web font, mirroring the SDL_ttf-based Fuente class.
/// Fonts are loaded via the CSS Font Loading API before the game starts.
export class GameFont {

    readonly family: string
    readonly size: number

    constructor(family: string, size: number) {
        this.family = family
        this.size   = size
    }

    /// Registers a custom TTF font from a URL so it can be used in PixiJS text.
    static async load(family: string, url: string, size: number): Promise<GameFont> {
        const face = new FontFace(family, `url(${url})`)
        await face.load()
        document.fonts.add(face)
        return new GameFont(family, size)
    }
}

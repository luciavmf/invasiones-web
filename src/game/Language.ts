// Copyright © 2026 Lucia Medina Fretes. All rights reserved.
// Licensed under the MIT License. See LICENSE in the project root for details.
/// Supported UI languages. Resets to Spanish on each launch (no persistence).
export class Language {

    static readonly all: Language[] = []

    static readonly spanish = new Language('es', 'Español')
    static readonly english = new Language('en', 'English')
    static readonly german  = new Language('de', 'Deutsch')

    static current: Language = Language.spanish

    readonly code:        string
    readonly displayName: string

    private constructor(code: string, displayName: string) {
        this.code        = code
        this.displayName = displayName
        Language.all.push(this)
    }

    get filename(): string { return `strings_${this.code}.json` }

    get next(): Language {
        const i = Language.all.indexOf(this)
        return Language.all[(i + 1) % Language.all.length]
    }
}

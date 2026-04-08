// Copyright © 2026 Lucia Medina Fretes. All rights reserved.
// Licensed under the MIT License. See LICENSE in the project root for details.
import type { Command } from './Command'

/// A level objective: an ordered stack of Commands.
export class Objective {
    commands: Command[] = []   // LIFO: pop from end

    nextCommand(): Command | null {
        return this.commands.length > 0 ? this.commands.pop()! : null
    }
}

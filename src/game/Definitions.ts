// Copyright © 2026 Lucia Medina Fretes. All rights reserved.
// Licensed under the MIT License. See LICENSE in the project root for details.
/// Font slot indices into ResourceManager.fonts — mirrors FontIndex in Swift.
export const FontIndex = {
    sans12:   0,
    sans14:   1,
    sans18:   2,
    sans20:   3,
    sans24:   4,
    sans28:   5,
    lblack12: 6,
    lblack14: 7,
    lblack18: 8,
    lblack20: 9,
    lblack28: 10,
    total:    11,
} as const

/// Eight compass directions used for unit sprite animation.
export const Direction = {
    north: 0, northEast: 1, east: 2, southEast: 3,
    south: 4, southWest: 5, west: 6, northWest: 7,
    count: 8,
} as const

/// RGB hex colour constants for the Video drawing API.
export const GameColor = {
    gray:        0xC8C8C8,
    red:         0xFF0000,
    black:       0x000000,
    white:       0xFFFFFF,
    green:       0x00FF00,
    blue:        0x0000FF,
    cyan:        0x00FFFF,
    magenta:     0xFF00FF,
    transparent: 0xFF00FF,
} as const

/// Colors used in the UI.
export const Theme = {
    menus:          GameColor.black,
    selection:      GameColor.red,
    buttonHover:    GameColor.black,
    buttonHoverAlpha: 200,
    text:           GameColor.white,
    alpha:          128,
    title:          GameColor.white,
    objectivesText: GameColor.black,
} as const

/// Font slot constants for each UI context.
export const FontConstants = {
    titleFont:              FontIndex.lblack28,
    helpTitleFont:          FontIndex.sans24,
    helpFont:               FontIndex.sans18,
    menuFont:               FontIndex.sans20,
    buttonFont:             FontIndex.sans14,
    objectivesReminderFont: FontIndex.sans14,
    objectivesFont:         FontIndex.sans20,
} as const

/// Layout constants.
export const Layout = {
    objectivesOffset: 7,
    objectivesHeight: 22,
    titleYPosition:   30,
} as const

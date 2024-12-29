// minimal types
export interface Emoji {
    id: string
    animated: boolean
    name: string
    available: boolean
    type: 0 | 1
    managed: boolean
    guildId?: string
    roles?: string[]
}

export interface Sticker {
    format_type: 1 | 2 | 4
    pack_id?: number
    name: string
    available: boolean
    guild_id?: string
    width: number
    height: number
}

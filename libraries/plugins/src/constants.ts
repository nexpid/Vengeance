import type { InternalPluginDefinition } from './internals'

export const PluginIdRegex = /^[a-z0-9-_\.]{1,128}$/

export const WhitelistedPluginObjectKeys = [
    'description',
    'disable',
    'icon',
    'id',
    'name',
    'version',
    'stop',
    'author',
    'errors',
    'SettingsComponent',
    // biome-ignore lint/suspicious/noExplicitAny: get out
] as const satisfies ReadonlyArray<keyof InternalPluginDefinition<any, any, any>>

export const PluginStatus = {
    Stopped: 1,
    Fetching: 2,
    StartedEarly: 3,
    Starting: 4,
    Started: 5,
}

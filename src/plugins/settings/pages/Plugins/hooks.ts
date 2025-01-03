import type { PluginManifest } from '@revenge-mod/plugins/schemas'
import { useMemo } from 'react'

export function useFilteredPlugins<const P extends PluginManifest & { external?: boolean; manageable?: boolean }>(
    plugins: P[],
    query: string,
    options: { showInternal: boolean; showVengeance: boolean; showUnmanageable: boolean },
) {
    const { showInternal, showVengeance } = options

    const _plugins = useMemo(
        () =>
            plugins.filter(
                plugin =>
                    plugin.name.toLowerCase().replaceAll(/\s/g, '').includes(query) ||
                    plugin.id.toLowerCase().includes(query),
            ),
        [plugins, query],
    )

    const externalPlugins = useMemo(
        () =>
            _plugins.filter(
                plugin => (plugin.external ?? true) && (!options.showUnmanageable ? (plugin.manageable ?? true) : true),
            ),
        [_plugins, options.showUnmanageable],
    )

    const vengeancePlugins = useMemo(
        () =>
            _plugins.filter(
                plugin =>
                    !(plugin.external ?? true) &&
                    plugin.id.startsWith('vengeance.') &&
                    (!options.showUnmanageable ? (plugin.manageable ?? true) : true),
            ),
        [_plugins, options.showUnmanageable],
    )

    const internalPlugins = useMemo(
        () =>
            _plugins.filter(
                plugin =>
                    !(plugin.external ?? true) && (!options.showUnmanageable ? (plugin.manageable ?? true) : true),
            ),
        [_plugins, options.showUnmanageable],
    )

    const empty = ![
        showInternal && internalPlugins.length,
        showVengeance && vengeancePlugins.length,
        externalPlugins.length,
    ].reduce<number>((a, b) => a + (b || 0), 0)

    // TODO: Maybe create 2 separate data lists for non-filtered and filtered plugins
    const noSearchResults = empty && !!query

    return { plugins: _plugins, externalPlugins, vengeancePlugins, internalPlugins, empty, noSearchResults }
}

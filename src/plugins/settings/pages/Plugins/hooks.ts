import type { PluginManifest } from '@revenge-mod/plugins/schemas'
import { useMemo } from 'react'

export function useFilteredPlugins<const P extends PluginManifest & { core?: boolean }>(
    plugins: P[],
    query: string,
    options: { showCorePlugins: boolean; showVengeancePlugins: boolean; sortMode: 'asc' | 'dsc' },
) {
    const { showCorePlugins, showVengeancePlugins, sortMode } = options

    const _plugins = useMemo(
        () =>
            plugins
                .filter(
                    plugin =>
                        plugin.name.toLowerCase().replaceAll(/\s/g, '').includes(query) ||
                        plugin.id.toLowerCase().includes(query),
                )
                .sort((a, b) => (sortMode === 'asc' ? a.name.localeCompare(b.name) : b.name.localeCompare(a.name))),
        [plugins, query, sortMode],
    )

    const externalPlugins = useMemo(() => _plugins.filter(plugin => !plugin.core), [_plugins])
    const vengeancePlugins = useMemo(
        () => _plugins.filter(plugin => plugin.core && plugin.id.startsWith('vengeance.')),
        [_plugins],
    )
    const corePlugins = useMemo(
        () => _plugins.filter(plugin => plugin.core && !plugin.id.startsWith('vengeance.')),
        [_plugins],
    )
    const empty = ![
        showCorePlugins && corePlugins.length,
        showVengeancePlugins && vengeancePlugins.length,
        externalPlugins.length,
    ].reduce<number>((a, b) => a + (b || 0), 0)

    // TODO: Maybe create 2 separate data lists for non-filtered and filtered plugins
    const noSearchResults = empty && !!query

    return { plugins: _plugins, externalPlugins, vengeancePlugins, corePlugins, empty, noSearchResults }
}

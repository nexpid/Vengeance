import { FormSwitch } from '@revenge-mod/ui/components'

import { NavigationNative, openAlert } from '@revenge-mod/modules/common'
import { AlertActionButton, AlertModal, IconButton } from '@revenge-mod/modules/common/components'
import { BundleUpdaterManager } from '@revenge-mod/modules/native'

import { registeredPlugins } from '@revenge-mod/plugins/internals'

import { useState, type FC } from 'react'

import PluginCard, { type PluginCardProps } from './PluginCard'
import { getAssetIndexByName } from '@revenge-mod/assets'

// TODO: Settings components
// ^ The guy who wrote this is a nerd btw
export default function InstalledPluginCard({
    enabled: _enabled,
    name,
    manageable,
    id,
    SettingsComponent,
    ...props
}: InstalledPluginCardProps) {
    const [enabled, setEnabled] = useState(_enabled)

    const navigation = NavigationNative.useNavigation()

    return (
        <PluginCard
            name={name}
            {...props}
            trailing={
                <>
                    {SettingsComponent && (
                        <IconButton
                            variant="secondary"
                            size="sm"
                            icon={getAssetIndexByName('SettingsIcon')}
                            onPress={() =>
                                navigation.push('RevengeCustomPage', {
                                    render: SettingsComponent,
                                    title: name,
                                })
                            }
                            disabled={!enabled}
                        />
                    )}
                    <FormSwitch
                        value={enabled}
                        disabled={!manageable}
                        onValueChange={async enabled => {
                            const plugin = registeredPlugins[id]!

                            if (enabled) {
                                plugin.enable()
                                if (plugin.lifecycles.beforeAppRender || plugin.lifecycles.subscribeModules)
                                    showReloadRequiredAlert(enabled)
                                else await plugin.start()
                            } else {
                                const { reloadRequired } = plugin.disable()
                                if (reloadRequired) showReloadRequiredAlert(enabled)
                            }

                            setEnabled(enabled)
                        }}
                    />
                </>
            }
        />
    )
}

interface InstalledPluginCardProps extends PluginCardProps {
    id: string
    enabled: boolean
    manageable: boolean
    SettingsComponent?: FC<any>
}

function showReloadRequiredAlert(enabling: boolean) {
    openAlert(
        'revenge.plugins.reload-required',
        <AlertModal
            title="Reload required"
            content={
                enabling
                    ? 'The plugin you have enabled requires a reload to take effect. Would you like to reload now?'
                    : 'The plugin you have disabled requires a reload to reverse its effects. Would you like to reload now?'
            }
            actions={
                <>
                    <AlertActionButton
                        variant="destructive"
                        text="Reload"
                        onPress={() => BundleUpdaterManager.reload()}
                    />
                    <AlertActionButton variant="secondary" text="Not now" />
                </>
            }
        />,
    )
}

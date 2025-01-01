import type { FreeNitroPluginContext } from '../..'
import { FluxDispatcher } from '@revenge-mod/modules/common'

export function patchNitroThemes({ revenge: { modules }, patcher, storage }: FreeNitroPluginContext) {
    const getPremiumSubscription = modules.findProp<() => null | { type: number }>('getPremiumSubscription')!

    // shrug
    patcher.before(
        FluxDispatcher as {
            dispatch: (event: {
                type: 'SELECTIVELY_SYNCED_USER_SETTINGS_UPDATE'
                changes: {
                    appearance?: {
                        shouldSync?: boolean
                        settings: {
                            theme: string
                            clientThemeSettings?: {
                                backgroundGradientPresetId?: number
                            }
                        }
                    }
                }
            }) => void
        },
        'dispatch',
        args => {
            const [event] = args
            if (
                event.type === 'SELECTIVELY_SYNCED_USER_SETTINGS_UPDATE' &&
                event.changes.appearance?.settings.clientThemeSettings?.backgroundGradientPresetId &&
                (getPremiumSubscription() || storage.bypassNitroCheck)
            ) {
                event.changes.appearance.shouldSync = false
                return args
            }
        },
        'nitrothemes.shouldSync',
    )
}

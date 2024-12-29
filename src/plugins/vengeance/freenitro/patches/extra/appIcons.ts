import type { FC } from 'react'
import type { FreeNitroPluginContext } from '../..'

export function patchAppIcons({ revenge: { modules }, storage, patcher, cleanup }: FreeNitroPluginContext) {
    const icons = modules.findByProps('getIcons', 'getOfficialAlternateIcons') as Record<
        'getIcons' | 'getOfficialAlternateIcons',
        () => { isPremium: boolean }[]
    > & { getIconById: () => { isPremium: boolean } }
    const iconsIds = modules.findByProps('FreemiumAppIconIds', 'MasterAppIconIds') as Record<
        'FreemiumAppIconIds' | 'MasterAppIconIds',
        Record<string, string>
    >
    const upsellObj = modules.findByProps('useIsPremiumAppIconUpsellEnabled') as {
        useIsPremiumAppIconUpsellEnabled: () => boolean
    }
    const upsellComponent = modules.findByName('PremiumAppIconFeatureUpsell', false) as unknown as {
        default: FC
    }

    let patched = true
    const _Freemiums = iconsIds.FreemiumAppIconIds
    Object.defineProperty(iconsIds, 'FreemiumAppIconIds', {
        get() {
            return patched && storage.extra.appIcons ? iconsIds.MasterAppIconIds : _Freemiums
        },
    })

    cleanup(
        patcher.after(
            icons,
            'getIcons',
            (_, ret) =>
                storage.extra.appIcons
                    ? ret.map(x => ({
                          ...x,
                          isPremium: false,
                      }))
                    : ret,
            'appicons.getIcons',
        ),
        patcher.after(
            icons,
            'getOfficialAlternateIcons',
            (_, ret) =>
                storage.extra.appIcons
                    ? ret.map(x => ({
                          ...x,
                          isPremium: false,
                      }))
                    : ret,
            'appicons.getOfficialAlternateIcons',
        ),
        patcher.after(
            icons,
            'getIconById',
            (_, ret) =>
                storage.extra.appIcons
                    ? {
                          ...ret,
                          isPremium: false,
                      }
                    : ret,
            'appicons.getIconById',
        ),

        () => (patched = false),

        // setting useIsPremiumAppIconUpsellEnabled to true will force Discord to use "PremiumAppIconFeatureUpsell" instead of "PremiumFeatureUpsellPill" (a component I can't find)
        patcher.instead(
            upsellObj,
            'useIsPremiumAppIconUpsellEnabled',
            () => storage.extra.appIcons,
            'appicons.upsellObj',
        ),
        patcher.instead(
            upsellComponent,
            'default',
            function (args, original) {
                return storage.extra.appIcons ? null : original.apply(this, args)
            },
            'appicons.upsellComponent',
        ),
    )
}

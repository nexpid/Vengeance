import { registerPlugin } from '@revenge-mod/plugins/internals'

registerPlugin(
    {
        name: 'Restore Devices Setting',
        author: 'Palm',
        description: 'Brings the Devices settings page back',
        id: 'vengeance.palmdevs.restore-devices-setting',
        version: '1.0.0',
        icon: 'LaptopPhoneIcon',
    },
    {
        beforeAppRender({ patcher, revenge: { modules } }) {
            const DevicesSetting = modules.findByFilePath<{ usePredicate(): boolean }, true>(
                'modules/main_tabs_v2/native/settings/definitions/DevicesSetting.tsx',
                true,
            )

            patcher.instead(DevicesSetting!, 'usePredicate', () => true)
        },
    },
    { external: false, manageable: true, enabled: false },
)

import { lazyValue } from '@revenge-mod/utils/lazy'
import type { SimpleCommand } from '..'
import { messages } from '@revenge-mod/modules/common'
import { ApplicationCommandInputType, ApplicationCommandOptionType } from 'libraries/modules/src/commands'
import { plugins } from 'libraries/plugins/src/internals'
import { Platform } from 'react-native'
import { findByProps } from '@revenge-mod/modules/finders'
import { ClientInfoModule } from '@revenge-mod/modules/native'

const { getDeviceInfo, getDeviceManufacturer } = lazyValue(() => findByProps('getDeviceInfo'))! as Record<
    'getDeviceInfo' | 'getDeviceManufacturer',
    () => string
>

const message = ({
    title,
    discord,
    os,
    device,
    plugins,
}: Record<'title' | 'discord' | 'os' | 'device' | 'plugins', string>) => `
\`\`\`ansi
[0;31m ▄▀▀▀▀▀▄▄▄▄▄▄▄▀▀▀▀▀▄     [1;4;37mRevenge[0;30m ${title}
[0;31m█                   █    [0;35mDiscord[0m ${discord}
[0;31m█   ▄▄▄▄      ▄▄▄▄   █   [0;35mOS[0m ${os}
[0;31m█   ▀███▀    ▀███▀   █   [0;35mDevice[0m ${device}
[0;31m █                   █   [0;35mPlugins[0m ${plugins}
[0;31m ▀▄▄▄▄▄▄▄▄▄▄        █    [0m
[0;31m          █      ▄▄▀     [0m[0;40;30m█▓▒▒░ [0m   [0;41;31m█▓▒▒░ [0m   [0;44;32m█▓▒▒░ [0m   [0;44;33m█▓▒▒░ [0m
[0;31m           ▀▀▀▀▀▀▀       [0m[0;43;34m█▓▒▒░ [0m   [0;41;35m█▓▒▒░ [0m   [0;44;36m█▓▒▒░ [0m   [0;42;37m█▓▒▒░ [0m
\`\`\`
`

export default (<SimpleCommand>{
    inputType: ApplicationCommandInputType.BuiltIn,
    name: 'venfetch',
    aliases: ['neofetch', 'fastfetch', 'revfetch'],
    description: 'Sends a neofetch/fastfetch inspired message',
    options: [
        {
            name: 'ephemeral',
            description: 'Sends the message as ephemeral',
            type: ApplicationCommandOptionType.Boolean,
        },
    ],
    execute([ephemeral], ctx) {
        // biome-ignore lint/suspicious/noExplicitAny: RN weird types
        const PlatformConstants = Platform.constants as any

        const allPlugins = Object.values(plugins)
        const externalPlugins = allPlugins.filter(plugin => !plugin.core && plugin.enabled)
        const vengeancePlugins = allPlugins.filter(
            plugin => plugin.core && plugin.id.startsWith('vengeance.') && plugin.manageable && plugin.enabled,
        )
        const corePlugins = allPlugins.filter(
            plugin => plugin.core && !plugin.id.startsWith('vengeance.') && plugin.manageable && plugin.enabled,
        )

        const content = message({
            title: `${__REVENGE_RELEASE__} (${__REVENGE_HASH__}${__REVENGE_HASH_DIRTY__ ? '-dirty' : ''}) (${__PYON_LOADER__.loaderName} ${__PYON_LOADER__.loaderVersion})`,
            discord: `${ClientInfoModule.Version} (${ClientInfoModule.Build})`,
            os: `${PlatformConstants.systemName ?? 'Android'} ${PlatformConstants.Release ?? PlatformConstants.osVersion} ${PlatformConstants.Version ? ` (SDK ${PlatformConstants.Version})` : ''}`,
            device: `${getDeviceInfo()} (by ${getDeviceManufacturer()})`,
            plugins: [
                externalPlugins.length && `${externalPlugins.length} (external)`,
                vengeancePlugins.length && `${vengeancePlugins.length} (vengeance)`,
                corePlugins.length && `${corePlugins.length} (core)`,
            ]
                .filter(section => !!section)
                .join(', '),
        })

        if (ephemeral?.value) messages.sendBotMessage(ctx.channel.id, content)
        else messages.sendMessage(ctx.channel.id, { content })
    },
})

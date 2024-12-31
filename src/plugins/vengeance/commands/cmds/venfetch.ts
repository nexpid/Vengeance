import { lazyValue } from '@revenge-mod/utils/lazy'
import type { SimpleCommand } from '..'
import { messages } from '@revenge-mod/modules/common'
import { ApplicationCommandInputType, ApplicationCommandOptionType } from 'libraries/modules/src/commands'
import { plugins } from 'libraries/plugins/src/internals'
import { Platform } from 'react-native'
import { findByProps, findProp } from '@revenge-mod/modules/finders'
import { ClientInfoModule } from '@revenge-mod/modules/native'

const MinimumSupportedBuildNumber = ReactNative.Platform.select({ default: 254000, ios: 66559 })

const { getDeviceInfo, getDeviceManufacturer } = lazyValue(() => findByProps('getDeviceInfo'))! as Record<
    'getDeviceInfo' | 'getDeviceManufacturer',
    () => string
>
const getCurrentUser = lazyValue(() => findProp('getCurrentUser'))! as () => {
    username: string
} | null

const message = ({
    baseClr,
    keyClr,
    titleClr,
    username,
    title,
    discord,
    os,
    device,
    plugins,
}: Record<
    'baseClr' | 'keyClr' | 'titleClr' | 'username' | 'title' | 'discord' | 'os' | 'device' | 'plugins',
    string | number
>) => `
\`\`\`ansi
[0;3${baseClr}m ▄▀▀▀▀▀▄▄▄▄▄▄▀▀▀▀▀▄     [1;4;3${baseClr}mVengeance@${username}[0;3${titleClr}m ${title}
[0;3${baseClr}m█                  █    [1;3${keyClr}mDiscord[0m ${discord}
[0;3${baseClr}m█   ▄▄▄▄     ▄▄▄▄   █   [1;3${keyClr}mOS[0m ${os}
[0;3${baseClr}m█   ▀███▀   ▀███▀   █   [1;3${keyClr}mDevice[0m ${device}
[0;3${baseClr}m █                  █   [1;3${keyClr}mPlugins[0m ${plugins}
[0;3${baseClr}m ▀▄▄▄▄▄▄▄▄▄        █    [0m
[0;3${baseClr}m         █      ▄▄▀     [0m[0;40;30m█▓▒▒░ [0m   [0;41;31m█▓▒▒░ [0m   [0;44;32m█▓▒▒░ [0m   [0;44;33m█▓▒▒░ [0m
[0;3${baseClr}m          ▀▀▀▀▀▀▀       [0m[0;43;34m█▓▒▒░ [0m   [0;41;35m█▓▒▒░ [0m   [0;44;36m█▓▒▒░ [0m   [0;42;37m█▓▒▒░ [0m
\`\`\`
`

const prime = 2147483647
const colorRange = 8

export default (<SimpleCommand>{
    inputType: ApplicationCommandInputType.BuiltIn,
    name: 'venfetch',
    aliases: ['neofetch', 'fastfetch', 'revfetch'],
    description: 'Sends a neofetch/fastfetch inspired message. Like /debug, but more stylish!',
    options: [
        {
            name: 'ephemeral',
            description: 'Sends the message as ephemeral',
            type: ApplicationCommandOptionType.Boolean,
        },
        {
            name: 'color',
            description: 'Coolor',
            type: ApplicationCommandOptionType.Integer,
        },
    ],
    execute(args, ctx) {
        const ephemeral = args.find(a => a.name === 'ephemeral')
        const color = args.find(a => a.name === 'color')

        // biome-ignore lint/suspicious/noExplicitAny: RN weird types
        const PlatformConstants = Platform.constants as any
        const isOutdated = !(Number(ClientInfoModule.Build) > MinimumSupportedBuildNumber)

        const allPlugins = Object.values(plugins)
        const externalPlugins = allPlugins.filter(plugin => !plugin.core && plugin.enabled)
        const vengeancePlugins = allPlugins.filter(
            plugin => plugin.core && plugin.id.startsWith('vengeance.') && plugin.manageable && plugin.enabled,
        )
        const corePlugins = allPlugins.filter(
            plugin => plugin.core && !plugin.id.startsWith('vengeance.') && plugin.manageable && plugin.enabled,
        )
        const username = getCurrentUser()?.username ?? 'johndoe'

        const clrMap = [
            [0, 7],
            [1, 5],
            [2, 3],
            [4, 6],
        ]

        const baseClr =
            color && Number.isFinite(Number(color.value))
                ? Math.abs(Number(color.value) % colorRange)
                : username
                      .split('')
                      .map(x => x.charCodeAt(0))
                      .reduce((curr, a) => (curr * 31 + a) % prime, 0) % colorRange

        const keyClr = clrMap.find(([a, b]) => a === baseClr || b === baseClr)?.find(x => x !== baseClr) ?? 0

        const content = message({
            baseClr,
            keyClr,
            titleClr: baseClr === 0 ? 7 : 0,
            username,
            title: `${__REVENGE_HASH__}${__REVENGE_HASH_DIRTY__ ? '-dirty' : ''} (${__PYON_LOADER__.loaderName} v${__PYON_LOADER__.loaderVersion})`,
            discord: `${ClientInfoModule.Version} (${ClientInfoModule.Build}) ${isOutdated ? '⚰' : ''}${ClientInfoModule.ReleaseChannel.includes('canary') ? '🌩' : ''}`,
            os: `${PlatformConstants.systemName ?? 'Android'} ${PlatformConstants.Release ?? PlatformConstants.osVersion}${PlatformConstants.Version ? ` (SDK ${PlatformConstants.Version})` : ''}`,
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

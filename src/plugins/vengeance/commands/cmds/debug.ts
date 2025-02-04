/// <reference path="./debug.d.ts" />

import { messages } from '@revenge-mod/modules/common'
import { findByProps } from '@revenge-mod/modules/finders'
import { ClientInfoModule } from '@revenge-mod/modules/native'
import { lazyValue } from '@revenge-mod/utils/lazy'
import { ApplicationCommandInputType, ApplicationCommandOptionType } from 'libraries/modules/src/common/commands'
import { Platform } from 'react-native'
import type { SimpleCommand } from '..'

const MinimumSupportedBuildNumber = ReactNative.Platform.select({ default: 254000, ios: 66559 })

const { getDeviceInfo, getDeviceManufacturer } = lazyValue(() => findByProps('getDeviceInfo'))! as Record<
    'getDeviceInfo' | 'getDeviceManufacturer',
    () => string
>

export default (<SimpleCommand>{
    inputType: ApplicationCommandInputType.BuiltIn,
    name: 'debug',
    description: 'Sends helpful debug information in chat',
    options: [
        {
            name: 'ephemeral',
            description: 'Sends the message as ephemeral',
            type: ApplicationCommandOptionType.Boolean,
        },
    ],
    execute([ephemeral], ctx) {
        const isOutdated = !(Number(ClientInfoModule.Build) > MinimumSupportedBuildNumber)
        const runtimeProps = (HermesInternal as HermesInternalObject).getRuntimeProperties()
        const PlatformConstants = Platform.constants as any

        const content = [
            '**Vengeance Debug**',
            `> **Vengeance:** ${__REVENGE_HASH__}${__REVENGE_HASH_DIRTY__ ? '-dirty' : ''} (${__PYON_LOADER__.loaderName} v${__PYON_LOADER__.loaderVersion})`,
            `> **Discord:** ${ClientInfoModule.Version} (${ClientInfoModule.Build})`,
            `> **React:** ${React.version} (**RN** ${runtimeProps['OSS Release Version']?.slice(7)})`,
            `> **Hermes:** ${runtimeProps['OSS Release Version']} (bytecode ${runtimeProps['Bytecode Version']})`,
            `> **OS:** ${PlatformConstants.systemName ?? 'Android'} ${PlatformConstants.Release ?? PlatformConstants.osVersion}${PlatformConstants.Version ? ` (SDK ${PlatformConstants.Version})` : ''}`,
            `> **Device:** ${getDeviceInfo()} (by ${getDeviceManufacturer()})`,
            isOutdated && '> :warning: Using outdated and unsupported version',
            ClientInfoModule.ReleaseChannel.includes('canary') &&
                `> :warning: Using release **${ClientInfoModule.ReleaseChannel}**`,
        ]
            .filter(row => !!row)
            .join('\n')

        if (ephemeral?.value) messages.sendBotMessage(ctx.channel.id, content)
        else messages.sendMessage(ctx.channel.id, { content })
    },
})

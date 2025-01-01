import { messages } from '@revenge-mod/modules/common'
import { ApplicationCommandInputType, ApplicationCommandOptionType } from 'libraries/modules/src/commands'
import { registeredPlugins } from 'libraries/plugins/src/internals'
import type { SimpleCommand } from '..'

export default (<SimpleCommand>{
    inputType: ApplicationCommandInputType.BuiltIn,
    name: 'plugins',
    description: 'Sends a formatted list of your enabled plugins',
    options: [
        {
            name: 'ephemeral',
            description: 'Sends the message as ephemeral',
            type: ApplicationCommandOptionType.Boolean,
        },
    ],
    execute([ephemeral], ctx) {
        const allPlugins = Object.values(registeredPlugins)
        const externalPlugins = allPlugins.filter(plugin => !plugin.core && plugin.enabled)
        const vengeancePlugins = allPlugins.filter(
            plugin => plugin.core && plugin.id.startsWith('vengeance.') && plugin.manageable && plugin.enabled,
        )
        const corePlugins = allPlugins.filter(
            plugin => plugin.core && !plugin.id.startsWith('vengeance.') && plugin.manageable && plugin.enabled,
        )

        const mapPlugin = (plugin: (typeof allPlugins)[number]) => plugin.name

        const content = [
            externalPlugins.length && `> **External Plugins** (${externalPlugins.length})`,
            externalPlugins.map(mapPlugin).join(',  '),
            vengeancePlugins.length && `> **Vengeance Plugins** (${vengeancePlugins.length})`,
            vengeancePlugins.map(mapPlugin).join(',  '),
            corePlugins.length && `> **Core Plugins** (${corePlugins.length})`,
            corePlugins.map(mapPlugin).join(',  '),
        ]
            .filter(row => !!row)
            .join('\n')

        if (ephemeral?.value) messages.sendBotMessage(ctx.channel.id, content)
        else messages.sendMessage(ctx.channel.id, { content })
    },
})

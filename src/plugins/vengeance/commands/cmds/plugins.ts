import { messages } from '@revenge-mod/modules/common'
import { ApplicationCommandInputType, ApplicationCommandOptionType } from 'libraries/modules/src/common/commands'
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
        const externalPlugins = allPlugins.filter(plugin => plugin.external && plugin.enabled)
        const vengeancePlugins = allPlugins.filter(
            plugin => !plugin.external && plugin.id.startsWith('vengeance.') && plugin.manageable && plugin.enabled,
        )
        const internalPlugins = allPlugins.filter(
            plugin => !plugin.external && !plugin.id.startsWith('vengeance.') && plugin.manageable && plugin.enabled,
        )

        const mapPlugin = (plugin: (typeof allPlugins)[number]) => plugin.name

        const content = [
            externalPlugins.length && `> **External Plugins** (${externalPlugins.length})`,
            externalPlugins.map(mapPlugin).join(',  '),
            vengeancePlugins.length && `> **Vengeance Plugins** (${vengeancePlugins.length})`,
            vengeancePlugins.map(mapPlugin).join(',  '),
            internalPlugins.length && `> **Internal Plugins** (${internalPlugins.length})`,
            internalPlugins.map(mapPlugin).join(',  '),
        ]
            .filter(row => !!row)
            .join('\n')

        if (ephemeral?.value) messages.sendBotMessage(ctx.channel.id, content)
        else messages.sendMessage(ctx.channel.id, { content })
    },
})

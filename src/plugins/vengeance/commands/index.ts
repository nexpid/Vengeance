import { commands } from '@revenge-mod/modules/common'
import { registerPlugin } from '@revenge-mod/plugins/internals'
import {
    type ApplicationCommandInputType,
    type ApplicationCommandOptionType,
    ApplicationCommandType,
    type Argument,
    type Command,
    type CommandContext,
    type CommandReturnValue,
} from 'libraries/modules/src/commands'
import debug from './cmds/debug'
import plugins from './cmds/plugins'
import venfetch from './cmds/venfetch'

export interface SimpleCommand {
    inputType: ApplicationCommandInputType
    name: string
    aliases?: string[]
    description: string
    options: {
        name: string
        description: string
        type: ApplicationCommandOptionType
        required?: boolean
    }[]
    execute(args: Argument[], ctx: CommandContext): void | CommandReturnValue | Promise<void | CommandReturnValue>
}

const cmds = [debug, plugins, venfetch]

registerPlugin(
    {
        name: 'Commands',
        author: 'Vengeance',
        description: `Adds ${cmds.length} awesome QOL commands to the client (${cmds.map(({ name }) => `/${name}`).join(', ')})`,
        id: 'vengeance.commands',
        version: '1.0.0',
        icon: 'SlashBoxIcon',
    },
    {
        afterAppRender({ patcher }) {
            patcher.after(commands, 'getBuiltInCommands', (_, ret) => {
                const lastId = Math.min(...ret.map(a => Number(a.id))) - 1

                const cmdussy = [...cmds]
                for (const cmd of cmds)
                    for (const alias of cmd.aliases ?? [])
                        cmdussy.push({
                            ...cmd,
                            name: alias,
                        })

                return [
                    ...ret,
                    ...cmdussy.map(
                        ({ inputType, name, description, options, execute }, i) =>
                            ({
                                id: (lastId - i).toString(),
                                untranslatedName: name,
                                displayName: name,
                                type: ApplicationCommandType.ChatInput,
                                inputType,
                                applicationId: '-1',
                                untranslatedDescription: description,
                                displayDescription: description,
                                options: options.map(({ name, description, type, required }) => ({
                                    name,
                                    displayName: name,
                                    type,
                                    description,
                                    displayDescription: description,
                                    required,
                                })),
                                execute,
                            }) as Command,
                    ),
                ]
            })
        },
    },
    { external: false, manageable: true, enabled: true },
)

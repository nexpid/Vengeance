import { getAssetIndexByName } from '@revenge-mod/assets'
import type { PluginContextFor } from '@revenge-mod/plugins'
import { sleep } from '@revenge-mod/utils/functions'
import { registerPlugin } from 'libraries/plugins/src/internals'
import DebuggerSettingsPage from './pages/Debugger'
import { connectToDebugger, DebuggerContext } from './debugger'
import { BundleUpdaterManager } from '@revenge-mod/modules/native'

const plugin = registerPlugin<{
    connectOnStartup: boolean
    debuggerUrl: string
}>(
    {
        name: 'Debugger',
        author: 'Vengeance',
        description: "Ports Vendetta's WebSocket debugger to Vengeance for easier development",
        id: 'vengeance.debugger',
        version: '1.0.0',
        icon: 'LinkIcon',
        async afterAppRender(context) {
            const {
                revenge: {
                    ui: { settings: sui },
                },
                patcher,
                cleanup,
                storage: { connectOnStartup, debuggerUrl },
            } = context

            if (connectOnStartup) connectToDebugger(debuggerUrl, context)

            // Wait for the section to be added by the Settings plugin
            await sleep(0)

            // biome-ignore lint/suspicious/noExplicitAny: globalThis can be anything
            const win = globalThis as any

            cleanup(
                sui.addRowsToSection('Revenge', {
                    Debugger: {
                        type: 'route',
                        label: 'Debugger',
                        icon: getAssetIndexByName('LinkIcon'),
                        component: () => (
                            <PluginContext.Provider value={context}>
                                <DebuggerSettingsPage />
                            </PluginContext.Provider>
                        ),
                    },
                }),

                (() => {
                    win.vengeance = {
                        reload: () => BundleUpdaterManager.reload(),
                    }

                    return () => (win.vengeance = undefined)
                })(),

                patcher.before(
                    win,
                    'nativeLoggingHook',
                    ([message, level]) => {
                        if (DebuggerContext.ws?.readyState === WebSocket.OPEN)
                            DebuggerContext.ws.send(
                                JSON.stringify({
                                    level: level === 3 ? 'error' : level === 2 ? 'warn' : 'info',
                                    message,
                                }),
                            )
                    },
                    'loggerPatch',
                ),
            )
        },
        initializeStorage() {
            return {
                connectOnStartup: false,
                debuggerUrl: 'localhost:9090',
            }
        },
    },
    true,
    true,
)

export type DebuggerContextType = PluginContextFor<typeof plugin, 'AfterAppRender'>
export const PluginContext = React.createContext<DebuggerContextType>(null!)

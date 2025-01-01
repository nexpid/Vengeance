import { registerPlugin } from '@revenge-mod/plugins/internals'
import { lazyValue } from '@revenge-mod/utils/lazy'
import type { FC, ReactElement, ReactNode } from 'react'

type BasicNavigationObject = {
    navigate(screen: string): void
}

const ScreenName = 'palmdevs.messages-tab.messages'

registerPlugin(
    {
        name: 'Messages Tab',
        author: 'Palm',
        description: 'Brings the messages tab back',
        id: 'vengeance.palmdevs.messages-tab',
        version: '1.0.0',
        icon: 'ic_message',
        beforeAppRender({ patcher, revenge: { modules } }) {
            const Messages = modules.findByFilePath<{ type: FC<{ renderedViaPlugin?: boolean }> }, true>(
                'modules/main_tabs_v2/native/tabs/messages/Messages.tsx',
                true,
            )!

            const useTabBarTabOptions = modules.findByName<
                () => { messages: (opts: { navigation: BasicNavigationObject }) => unknown },
                true
            >('useTabBarTabOptions')!

            const SelectedGuildStore = revenge.modules.findByProps('getLastSelectedGuildId')!

            const RouterUtils = modules.findByProps<{
                transitionTo: (path: string, opts?: { navigationReplace: boolean; openChannel: boolean }) => void
                transitionToGuild: (
                    guildId: string,
                    channelId?: string,
                    messageId?: string,
                    __unknown?: unknown,
                ) => void
            }>('transitionTo')!

            const NavigationBottomTabs = modules.findByProps<{
                createBottomTabNavigator: () => {
                    Navigator: FC<{
                        tabBar: (props: { navigation: BasicNavigationObject }) => ReactNode
                        children: ReactElement<{ children: Array<ReactElement<{ name: string }> | undefined> }>
                    }>
                    Screen: FC<{
                        options: unknown
                        name: string
                        component: FC
                    }>
                }
            }>('createBottomTabNavigator')!

            let navigation: BasicNavigationObject

            patcher.after(NavigationBottomTabs!, 'createBottomTabNavigator', (_, Tab) => {
                patcher.before(Tab, 'Navigator', ([props]) => {
                    const screens = props.children.props.children

                    const origTabBar = props.tabBar
                    props.tabBar = tbProps => {
                        navigation = tbProps.navigation
                        return origTabBar(tbProps)
                    }

                    const tabBarTabOptions = useTabBarTabOptions()

                    if (!screens.some(screen => screen?.props?.name === ScreenName))
                        screens.splice(
                            1,
                            0,
                            <Tab.Screen
                                options={tabBarTabOptions.messages({ navigation: lazyValue(() => navigation) })}
                                name={ScreenName}
                                component={() => Messages.type({ renderedViaPlugin: true })}
                            />,
                        )
                })
            })

            patcher.instead(Messages, 'type', ([props], orig) => {
                if (props.renderedViaPlugin) return orig(props)

                // The user will get stuck in the empty messages tab so:
                // - we transition to a guild
                // - we navigate to the messages tab
                setImmediate(() => {
                    const lastSelectedGuildId = SelectedGuildStore.getLastSelectedGuildId()
                    RouterUtils.transitionToGuild(lastSelectedGuildId)
                    navigation.navigate(ScreenName)
                })

                return null
            })

            patcher.instead(RouterUtils, 'transitionTo', ([path, opts], orig) => {
                if (path.startsWith('/channels/@me')) {
                    // Navigate to the messages tab if specified
                    if (opts?.navigationReplace) navigation.navigate(ScreenName)
                    if (opts?.openChannel)
                        orig(path, { navigationReplace: false, openChannel: opts?.openChannel ?? true })
                } else orig(path, opts)
            })

            patcher.instead(modules.findProp<{ type: FC }>('Messages', 'DragPreview')!, 'type', () => null)
        },
    },
    true,
    true,
)

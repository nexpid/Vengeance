import { getAssetIndexByName } from '@revenge-mod/assets'
import { createStyles, openAlert } from '@revenge-mod/modules/common'
import { AlertActionButton, AlertModal, Card, Stack, Text } from '@revenge-mod/modules/common/components'
import { registerPlugin, registeredPlugins } from '@revenge-mod/plugins/internals'
import { SemanticColor } from '@revenge-mod/ui/colors'
import { Image } from 'react-native'

registerPlugin<{
    checkedPlugins: string[]
}>(
    {
        name: 'Plugin Notifier',
        author: 'Vengeance',
        description: 'Notifies you when a new plugin is added to Vengeance',
        id: 'vengeance.pluginnotifier',
        version: '1.0.0',
        icon: 'PencilSparkleIcon',
    },
    {
        afterAppRender({ storage }) {
            const plugs = Object.entries(registeredPlugins)

            storage.checkedPlugins = storage.checkedPlugins.filter(x => plugs.find(([key]) => x === key))

            const newPlugs = plugs.filter(([key]) => !storage.checkedPlugins.includes(key))
            if (newPlugs.length) {
                storage.checkedPlugins = plugs.map(([key]) => key)

                openAlert(
                    'vengeance.pluginnotifier.newpluginsalert',
                    <NewPluginsAlert plugins={newPlugs.map(([_, val]) => val)} />,
                )
            }
        },
        initializeStorage() {
            return {
                checkedPlugins: Object.keys(registeredPlugins),
            }
        },
    },
    { external: false, manageable: true, enabled: true },
)

const useAlertStyles = createStyles({
    icon: {
        tintColor: SemanticColor.TEXT_NORMAL,
        width: 20,
        height: 20,
        marginTop: 3,
    },
})

function NewPluginsAlert({ plugins }: { plugins: (typeof registeredPlugins)[string][] }) {
    const styles = useAlertStyles()

    return (
        <AlertModal
            title="New Grub Alert"
            content={`${plugins.length} new plugin${plugins.length !== 1 ? 's have' : ' has'} been added to Vengeance!`}
            extraContent={plugins.map((pluh, i, a) => (
                <Card key={pluh.id} border="subtle" style={i !== a.length - 1 && { marginBottom: -12 }}>
                    <Stack direction="horizontal" spacing={8}>
                        <Image
                            source={
                                (pluh.icon && getAssetIndexByName(pluh.icon)) ?? getAssetIndexByName('UnknownGameIcon')
                            }
                            style={styles.icon}
                        />
                        <Stack direction="vertical" spacing={0} style={{ flexShrink: 1 }}>
                            <Text variant="heading-lg/semibold">{pluh.name}</Text>
                            <Text variant="heading-md/medium" color="text-muted" style={{ marginBottom: 4 }}>
                                by {pluh.author}
                            </Text>
                            <Text variant="text-md/medium">{pluh.description}</Text>
                        </Stack>
                    </Stack>
                </Card>
            ))}
            actions={<AlertActionButton variant="secondary" text="Okay" />}
        />
    )
}

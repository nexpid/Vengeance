import { getAssetIndexByName } from '@revenge-mod/assets'
import { Card, TableRowGroup, TableRowIcon, TableSwitchRow, Text } from '@revenge-mod/modules/common/components'
import { registerPlugin } from '@revenge-mod/plugins/internals'
import { useObserveStorage } from '@revenge-mod/storage'
import { ScrollView } from 'react-native'
import PageWrapper from 'src/plugins/settings/pages/(Wrapper)'

registerPlugin<{
    blockedRequests: number
    blockScience: boolean
    countRequests: boolean
}>(
    {
        name: 'NoTrack',
        author: 'Vengeance',
        description: 'Prevents Discord from tracking your every move by disabling sentry functions',
        id: 'vengeance.notrack',
        version: '1.0.0',
        icon: 'EyeIcon',
    },
    {
        beforeAppRender({ revenge: { modules }, patcher, storage }) {
            const http = modules.findByProps('HTTP', 'post') as any

            patcher.instead(
                http.HTTP,
                'post',
                (args, original) => {
                    const { url } = args?.[0] ?? {}
                    if (url?.startsWith('/science') && storage.blockScience) {
                        if (storage.countRequests) storage.blockedRequests++
                        return Promise.resolve()
                    }
                    return original.apply(this, args)
                },
                'http.post',
            )
        },
        initializeStorage() {
            return {
                blockedRequests: 0,
                blockScience: true,
                countRequests: true,
            }
        },
        SettingsComponent({ storage }) {
            useObserveStorage([storage])

            return (
                <ScrollView>
                    <PageWrapper>
                        <Card>
                            <Text variant="text-md/medium">
                                NoTrack has successfully blocked{' '}
                                <Text variant="text-md/bold">
                                    {storage.blockedRequests} tracking request
                                    {storage.blockedRequests !== 1 ? 's' : ''}
                                </Text>{' '}
                                so far
                            </Text>
                        </Card>

                        <TableRowGroup title="Settings">
                            <TableSwitchRow
                                label="Block /science"
                                subLabel={'Blocks requests to Discord\'s "science" analytics API endpoint'}
                                icon={<TableRowIcon source={getAssetIndexByName('BeakerIcon')!} />}
                                value={storage.blockScience}
                                onValueChange={v => (storage.blockScience = v)}
                            />
                            <TableSwitchRow
                                label="Save count"
                                subLabel={'Count the number of blocked requests'}
                                icon={<TableRowIcon source={getAssetIndexByName('ClockIcon')!} />}
                                value={storage.countRequests}
                                onValueChange={v => (storage.countRequests = v)}
                            />
                        </TableRowGroup>
                    </PageWrapper>
                </ScrollView>
            )
        },
    },
    { external: false, manageable: true, enabled: true },
)

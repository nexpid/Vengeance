import { getAssetIndexByName } from '@revenge-mod/assets'
import { createStyles } from '@revenge-mod/modules/common'
import {
    Slider,
    TableRow,
    TableRowGroup,
    TableRowIcon,
    TableSwitchRow,
    Text,
} from '@revenge-mod/modules/common/components'
import type { PluginContextFor } from '@revenge-mod/plugins'
import { registerPlugin } from '@revenge-mod/plugins/internals'
import { useObservable } from '@revenge-mod/storage'
import { SemanticColor } from '@revenge-mod/ui/colors'
import { ScrollView, View } from 'react-native'
import PageWrapper from 'src/plugins/settings/pages/(Wrapper)'
import { patchAppIcons } from './patches/extra/appIcons'
import { patchNitroThemes } from './patches/extra/nitroThemes'
import { patchFakeify } from './patches/fakeify'
import { patchRealify } from './patches/realify'

const emojiSizeLadder = [32, 48, 64, 128, 160, 256, 512] as const
const stickerSizeLadder = [32, 64, 128, 160, 256, 512] as const

const useSettingsStyles = createStyles({
    icon: {
        tintColor: SemanticColor.INTERACTIVE_NORMAL,
    },
    slider: {
        backgroundColor: SemanticColor.CARD_PRIMARY_BG,
        paddingHorizontal: 12,
        paddingVertical: 8,
    },
})

const plugin = registerPlugin<{
    bypassNitroCheck: boolean
    hyperlinks: boolean
    ignoreEmbeds: boolean
    emoji: {
        enabled: boolean
        size: (typeof emojiSizeLadder)[number]
        realify: boolean
    }
    stickers: {
        enabled: boolean
        size: (typeof stickerSizeLadder)[number]
        realify: boolean
    }
    extra: {
        nitroThemes: boolean
        appIcons: boolean
        soundboard: boolean
    }
}>(
    {
        name: 'FreeNitro',
        author: 'Vengeance',
        description:
            'Lets you send fake custom/animated emoji and stickers and use profile themes without having nitro.',
        id: 'vengeance.freenitro',
        version: '1.0.0',
        icon: 'GiftIcon',
    },
    {
        beforeAppRender(context) {
            const {
                revenge: { modules },
                storage,
                patcher,
            } = context

            const emojiPickerOpen = { current: new Set<string>() }

            const canUseObj = modules.findByProps('canUseCustomStickersEverywhere') as Record<string, () => boolean>
            const predicates = [
                // Part of solution
                {
                    key: 'canUseEmojisEverywhere',
                    predicate: () => !!emojiPickerOpen.current.size,
                },
                {
                    key: 'canUseAnimatedEmojis',
                    predicate: () => !!emojiPickerOpen.current.size,
                },
                // Part of solution
                {
                    key: 'canUseCustomStickersEverywhere',
                    predicate: () => storage.stickers.enabled,
                },
                // Part of solution
                {
                    key: 'canUseClientThemes',
                    predicate: () => storage.extra.nitroThemes,
                },
                // Resolves soundboard
                {
                    key: 'canUseSoundboardEverywhere',
                    predicate: () => storage.extra.soundboard,
                },
            ] satisfies { key: string; predicate: () => boolean }[]

            for (const { key, predicate } of predicates)
                patcher.instead(canUseObj, key, (args, original) => predicate() || original.apply(this, args))

            // Emoji & Stickers
            patchFakeify(context, emojiPickerOpen)
            patchRealify(context)
            // Extra
            patchAppIcons(context)
            patchNitroThemes(context)
        },
        initializeStorage() {
            return {
                bypassNitroCheck: true,
                hyperlinks: true,
                ignoreEmbeds: false,
                emoji: {
                    enabled: true,
                    size: 48,
                    realify: true,
                },
                stickers: {
                    enabled: true,
                    size: 160,
                    realify: true,
                },
                extra: {
                    nitroThemes: true,
                    appIcons: true,
                    soundboard: true,
                },
            }
        },
        SettingsComponent({ storage }) {
            useObservable([storage])
            const settingsStyles = useSettingsStyles()

            return (
                <ScrollView>
                    <PageWrapper>
                        <TableRowGroup title="Global">
                            <TableSwitchRow
                                label="Bypass Nitro check"
                                subLabel="Forces the plugin to work even if you have Nitro"
                                icon={<TableRowIcon source={getAssetIndexByName('NitroWheelIcon')!} />}
                                value={storage.bypassNitroCheck}
                                onValueChange={v => (storage.bypassNitroCheck = v)}
                            />
                            <TableSwitchRow
                                label="Hyperlink"
                                subLabel="Turns fake emojis and fake stickers into hyperlinks"
                                icon={<TableRowIcon source={getAssetIndexByName('LinkIcon')!} />}
                                value={storage.hyperlinks}
                                onValueChange={v => (storage.hyperlinks = v)}
                            />
                            <TableSwitchRow
                                label={'Ignore no embed permissions alert'}
                                icon={<TableRowIcon source={getAssetIndexByName('WarningIcon')!} />}
                                value={storage.ignoreEmbeds}
                                onValueChange={v => (storage.ignoreEmbeds = v)}
                            />
                        </TableRowGroup>
                        <TableRowGroup title="Emoji">
                            <TableSwitchRow
                                label="Enabled"
                                subLabel="Allows sending fake emojis"
                                icon={<TableRowIcon source={getAssetIndexByName('emoji-neutral')!} />}
                                value={storage.emoji.enabled}
                                onValueChange={v => (storage.emoji.enabled = v)}
                            />
                            <TableRow
                                label="Size"
                                subLabel="Size of the emojis when sending"
                                icon={<TableRowIcon source={getAssetIndexByName('ImageIcon')!} />}
                                trailing={<Text variant="text-md/medium">{storage.emoji.size}</Text>}
                            />
                            <View style={settingsStyles.slider}>
                                <Slider
                                    value={emojiSizeLadder.indexOf(storage.emoji.size) + 1}
                                    step={1}
                                    minimumValue={1}
                                    maximumValue={emojiSizeLadder.length}
                                    onValueChange={v => (storage.emoji.size = emojiSizeLadder[v - 1]!)}
                                />
                            </View>
                            <TableSwitchRow
                                label="Realify"
                                subLabel="Turn fake emojis into real ones"
                                icon={<TableRowIcon source={getAssetIndexByName('PencilSparkleIcon')!} />}
                                value={storage.emoji.realify}
                                onValueChange={v => (storage.emoji.realify = v)}
                            />
                        </TableRowGroup>
                        <TableRowGroup title="Stickers">
                            <TableSwitchRow
                                label="Enabled"
                                subLabel="Allows sending fake stickers"
                                icon={<TableRowIcon source={getAssetIndexByName('StickerIcon')!} />}
                                value={storage.stickers.enabled}
                                onValueChange={v => (storage.stickers.enabled = v)}
                            />
                            <TableRow
                                label="Size"
                                subLabel="Size of the stickers when sending"
                                icon={<TableRowIcon source={getAssetIndexByName('ImageIcon')!} />}
                                trailing={<Text variant="text-md/medium">{storage.stickers.size}</Text>}
                            />
                            <View style={settingsStyles.slider}>
                                <Slider
                                    value={stickerSizeLadder.indexOf(storage.stickers.size) + 1}
                                    step={1}
                                    minimumValue={1}
                                    maximumValue={stickerSizeLadder.length}
                                    onValueChange={v => (storage.stickers.size = stickerSizeLadder[v - 1]!)}
                                />
                            </View>
                            <TableSwitchRow
                                label="Realify"
                                subLabel="Turn fake stickers into real ones"
                                icon={<TableRowIcon source={getAssetIndexByName('PencilSparkleIcon')!} />}
                                value={storage.stickers.realify}
                                onValueChange={v => (storage.stickers.realify = v)}
                            />
                        </TableRowGroup>
                        <TableRowGroup title="Extras">
                            <TableSwitchRow
                                label="Nitro client themes"
                                icon={<TableRowIcon source={getAssetIndexByName('PencilIcon')!} />}
                                value={storage.extra.nitroThemes}
                                onValueChange={v => (storage.extra.nitroThemes = v)}
                            />
                            <TableSwitchRow
                                label="Custom app icons"
                                icon={<TableRowIcon source={getAssetIndexByName('PencilIcon')!} />}
                                value={storage.extra.appIcons}
                                onValueChange={v => (storage.extra.appIcons = v)}
                            />
                            <TableSwitchRow
                                label="Free soundboard sounds"
                                icon={<TableRowIcon source={getAssetIndexByName('PencilIcon')!} />}
                                value={storage.extra.soundboard}
                                onValueChange={v => (storage.extra.soundboard = v)}
                            />
                        </TableRowGroup>
                        {/* SafeAreaView breaks the padding for some reason */}
                        <View style={{ height: 12 }} />
                    </PageWrapper>
                </ScrollView>
            )
        },
    },
    { external: false, manageable: true, enabled: false },
)

export type FreeNitroPluginContext = PluginContextFor<typeof plugin, 'BeforeAppRender'>

import { useEffect, type FC } from 'react'
import type { FreeNitroPluginContext } from '..'
import { openAlert } from '@revenge-mod/modules/common'
import { AlertActionButton, AlertModal } from '@revenge-mod/modules/common/components'
import { FormSwitch } from '@revenge-mod/ui/components'
import { findProp } from '@revenge-mod/modules/finders'
import type { Emoji, Sticker } from '../types'

const FormCheckboxRow =
    findProp<
        FC<{
            // minimal types
            label: string
            selected: boolean
            onPress(): void
        }>
    >('FormCheckboxRow')!

export function patchFakeify(
    { revenge: { modules }, patcher, storage }: FreeNitroPluginContext,
    emojiPickerOpen: { current: Set<string> },
) {
    const messagesModule = modules.findByProps('sendMessage', 'editMessage') as {
        sendMessage(
            channelId: string,
            data: {
                content: string
                validNonShortcutEmojis?: Emoji[]
                ignoreFakeNitro?: boolean
            },
            _: string,
            __: object,
        ): Promise<unknown>
        editMessage(
            channelId: string,
            messageId: string,
            data: {
                content: string
                validNonShortcutEmojis?: Emoji[]
            },
        ): Promise<unknown>
        sendStickers(channelId: string, stickerIds: string[], _: string, __: object): Promise<unknown>
    }
    const EmojiPickerList = modules.findByTypeName('EmojiPickerList') as {
        type: FC<{
            // minimal types
            channel?: unknown
            categories: { isNitroLocked: boolean; emojisDisabled: Set<string> }[]
        }>
    }
    const ChatInputSendButton = modules.findByTypeName('ChatInputSendButton') as {
        type: FC<{ messageHasContent: boolean }>
    }
    const PermissionsBits = modules.findProp('Permissions') as Record<string, unknown>

    // ChannelStore
    const getChannel =
        modules.findProp<
            (id: string) => null | {
                // minimal types
                isPrivate(): boolean
                guild_id?: string
            }
        >('getChannel')!
    // GuildMemberStore
    const getSelfMember =
        modules.findProp<
            (guildId: string) => null | {
                // minimal types
                roles: string[]
            }
        >('getSelfMember')!
    // PermissionStore
    const can = modules.findProp<(permission: unknown, channel: unknown) => boolean>('can')!
    // SelectedChannelStore
    const getChannelId = modules.findProp<() => string>('getChannelId')!
    // StickerStore
    const getStickerById = modules.findProp<(id: string) => null | Sticker>('getStickerById')!
    // SubscriptionStore
    const getPremiumSubscription = modules.findProp<() => null | { type: number }>('getPremiumSubscription')!

    function hasPermission(channelId: string, permission: unknown) {
        const channel = getChannel(channelId)

        if (!channel || channel.isPrivate()) return true

        return can(permission, channel)
    }

    const hasExternalEmojiPerms = (channelId: string) => hasPermission(channelId, PermissionsBits.USE_EXTERNAL_EMOJIS!)
    const hasExternalStickerPerms = (channelId: string) =>
        hasPermission(channelId, PermissionsBits.USE_EXTERNAL_STICKERS!)
    const hasEmbedLinksPerms = (channelId: string) => hasPermission(channelId, PermissionsBits.EMBED_LINKS!)

    const guildId = () => getChannel(getChannelId())?.guild_id

    function canUseEmote(e: Emoji, channelId: string) {
        if (getPremiumSubscription() && storage.bypassNitroCheck) return false
        if (e.type === 0) return true
        if (!e.available) return false

        let twitchSubEmote = false
        if (e.managed && e.guildId) {
            const myRoles = getSelfMember(e.guildId)?.roles ?? []
            twitchSubEmote = e.roles?.some(r => myRoles.includes(r)) || false
        }

        const hasNitro = getPremiumSubscription() && !storage.bypassNitroCheck
        if (hasNitro || twitchSubEmote) return e.guildId === guildId() || hasExternalEmojiPerms(channelId)
        return !e.animated && e.guildId === guildId()
    }

    // TODO upload sticker as image :!!!!!
    patcher.instead(
        messagesModule,
        'sendStickers',
        async function (args, original) {
            if (!storage.stickers.enabled) return original.apply(this, args)

            const [channelId, stickerIds, extra, something] = args
            const stickers = stickerIds.map(id => {
                const sticker = getStickerById(id)

                const canUseStickers =
                    getPremiumSubscription() && !storage.bypassNitroCheck && hasExternalStickerPerms(channelId)
                if (
                    !sticker ||
                    'pack_id' in sticker ||
                    (sticker.available && (canUseStickers || sticker.guild_id === guildId()))
                )
                    return

                const link = `https://media.discordapp.net/stickers/${id}.${sticker.format_type === 4 ? 'gif' : 'png'}?size=${storage.stickers.size}&name=${encodeURIComponent(sticker.name)}`
                return storage.hyperlinks ? `[${sticker.name}](${link})` : link
            })

            if (stickers[0]) {
                if (!hasEmbedLinksPerms(channelId) && !storage.ignoreEmbeds)
                    if (!(await showNoEmbedPermsAlert(() => (storage.ignoreEmbeds = true))))
                        return await Promise.reject()

                return await messagesModule.sendMessage(
                    channelId,
                    {
                        content: stickers.join(' '),
                    },
                    extra,
                    something,
                )
            }
            return await original.apply(this, args)
        },
        'fakeify.sendStickers',
    )

    // Fake emojis unlocked when EmojiPickerList is open
    patcher.instead(
        EmojiPickerList,
        'type',
        function (args, original) {
            const [props] = args
            if (!storage.emoji.enabled || !props?.categories || !props.channel) return original.apply(this, args)

            for (const category of props.categories) {
                category.isNitroLocked = false
                category.emojisDisabled?.clear()
            }

            // biome-ignore lint/correctness/useExhaustiveDependencies: onMount/onUnmount
            useEffect(() => {
                emojiPickerOpen.current.add('picker')
                return () => void emojiPickerOpen.current.delete('picker')
            }, [])

            return original.apply(this, args)
        },
        'fakeify.EmojiPickerList',
    )
    // Fake emojis unlocked when chat has content
    patcher.before(
        ChatInputSendButton,
        'type',
        ([{ messageHasContent }]) =>
            void (messageHasContent ? emojiPickerOpen.current.add('chat') : emojiPickerOpen.current.delete('chat')),
        'fakeify.ChatInputSendButton',
    )

    patcher.instead(
        messagesModule,
        'sendMessage',
        async function (args, original) {
            if (!storage.emoji.enabled) return await original.apply(this, args)
            const [channelId, data] = args

            let didBypass = false

            let i = -1
            const didIs = new Set<number>()
            for (const emoji of data.validNonShortcutEmojis ?? []) {
                i++
                if (canUseEmote(emoji, channelId)) continue

                didBypass = true
                const emojiString = `<${emoji.animated ? 'a' : ''}:${emoji.name}:${emoji.id}>`

                const link = `https://cdn.discordapp.com/emojis/${emoji.id}.${emoji.animated ? 'gif' : 'webp'}?size=${storage.emoji.size}&name=${encodeURIComponent(emoji.name)}`
                const text = storage.hyperlinks ? `[${emoji.name}](${link})` : link

                data.content = data.content.replace(emojiString, text)
                didIs.add(i)
            }
            if (data.validNonShortcutEmojis)
                data.validNonShortcutEmojis = data.validNonShortcutEmojis.filter((_, i) => !didIs.has(i))

            if (didBypass && !hasEmbedLinksPerms(channelId) && !storage.ignoreEmbeds)
                if (!(await showNoEmbedPermsAlert(() => (storage.ignoreEmbeds = true)))) return await Promise.reject()

            return await original.apply(this, args)
        },
        'fakeify.sendMessage',
    )
    patcher.instead(
        messagesModule,
        'editMessage',
        async function (args, original) {
            if (!storage.emoji.enabled) return await original.apply(this, args)
            const [channelId, _, data] = args

            let didBypass = false

            let i = -1
            const didIs = new Set<number>()
            for (const emoji of data.validNonShortcutEmojis ?? []) {
                i++
                if (canUseEmote(emoji, channelId)) continue

                didBypass = true
                const emojiString = `<${emoji.animated ? 'a' : ''}:${emoji.name}:${emoji.id}>`

                const link = `https://cdn.discordapp.com/emojis/${emoji.id}.${emoji.animated ? 'gif' : 'webp'}?size=${storage.emoji.size}`
                const text = storage.hyperlinks
                    ? `[${emoji.name}](${link})`
                    : `${link}&name=${encodeURIComponent(emoji.name)}`

                data.content = data.content.replace(emojiString, text)
                didIs.add(i)
            }
            if (data.validNonShortcutEmojis)
                data.validNonShortcutEmojis = data.validNonShortcutEmojis.filter((_, i) => !didIs.has(i))

            if (didBypass && !hasEmbedLinksPerms(channelId) && !storage.ignoreEmbeds)
                if (!(await showNoEmbedPermsAlert(() => (storage.ignoreEmbeds = true)))) return await Promise.reject()

            return await original.apply(this, args)
        },
        'fakeify.editMessage',
    )
}

function NoEmbedPermsAlertModal({ outcome, disable }: { outcome: (val: boolean) => void; disable: () => void }) {
    // biome-ignore lint/correctness/useExhaustiveDependencies: ONMOUNT/ONUNMOUNT HOOK
    useEffect(() => () => outcome(false), [])
    const [meow, setMeow] = React.useState(false)

    FormSwitch

    return (
        <AlertModal
            title="Hold on!"
            content="You are trying to send/edit a message that has a fake emoji or sticker, however you do not have permissions to embed links in the current channel. Are you sure you want to send this message? Your fake items will appear as a link only."
            extraContent={<FormCheckboxRow label="Do not show again" selected={meow} onPress={() => setMeow(!meow)} />}
            actions={
                <>
                    <AlertActionButton
                        variant="primary"
                        text="Send anyway"
                        onPress={() => {
                            if (meow) disable()
                            outcome(true)
                        }}
                    />
                    <AlertActionButton variant="secondary" text="Cancel" onPress={() => outcome(false)} />
                </>
            }
        />
    )
}

function showNoEmbedPermsAlert(disable: () => void) {
    return new Promise<boolean>(res =>
        openAlert(
            'vengeance.plugins.freenitro.fakeify.no-embed-perms',
            <NoEmbedPermsAlertModal outcome={res} disable={disable} />,
        ),
    )
}

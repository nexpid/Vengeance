import { DebuggerContext } from 'src/plugins/developer-settings/debugger'
import type { FreeNitroPluginContext } from '..'
import type { Emoji, Sticker } from '../types'
import { View } from 'react-native'

interface FakeEmoji {
    name: string
    id: string
    animated: boolean
    src: string
}

interface FakeSticker {
    format_type: 1 | 2 | 4
    name: string
    id: string
    src: string
    width: number
    height: number
}

// minimal types
type ContentSkeleton =
    | {
          type: 'link'
          content: { type: 'text'; content: string }[]
          target: string | { action: `bind${string}` }
      }
    | {
          type: 'customEmoji'
          id: string
          alt: string
          src: string
          frozenSrc: string
          jumboable: boolean
          animated?: boolean
      }
    | {
          type: 'text'
          content: string
      }
    | {
          content: ContentSkeleton[]
      }
    | {
          items: ContentSkeleton[][]
      }
    | null

const cdnLinks = ['cdn.discordapp.com', 'media.discordapp.net']
const emojiUrlRegex = /\/emojis\/(\d+?)\.(png|webp|gif)/
const stickerUrlRegex = /\/stickers\/(\d+?)\.(png|webp|gif)/
const attachmentUrlRegex = /\/attachments\/\d+?\/\d+?\/(\d+?)\.gif/
const isFakerAlt = '\u200b [FreeNitro fake]'

const shouldDebug = false

export function patchRealify({ revenge: { modules }, cleanup, storage, patcher }: FreeNitroPluginContext) {
    const StickerDetailActionSheet = modules.findByTypeName('StickerDetailActionSheet') as {
        type(props: {
            renderableSticker: {
                name: string
            }
        }): {
            props: {
                children: {
                    props: {
                        children: {
                            props: {
                                sticker: {
                                    name: string
                                }
                            }
                        }
                    }
                }
            }
        }
    }

    // EmojiStore
    const getCustomEmojiById = modules.findProp<(id: string) => Emoji>('getCustomEmojiById')!
    // StickerStore
    const getStickerById = modules.findProp<(id: string) => null | Sticker>('getStickerById')!

    const { prototype: RowManager } = modules.findByName('RowManager') as unknown as {
        prototype: {
            generate(): {
                // minimal types..but that should be pretty obvious
                type: 1
                message: {
                    content?: ContentSkeleton[]
                    stickers?: {
                        format_type: 1 | 2 | 4
                        id: string
                        asset: string
                        name: string
                        url: string
                        width: number
                        height: number
                        renderMode: 0
                    }[]
                    embeds?: {
                        type: 'image'
                        url?: string
                    }[]
                    attachments?: {
                        url: string
                        filename: string
                        attachmentType?: 'image'
                        isAnimated?: boolean
                        width?: number
                        height?: number
                        description?: string
                    }[]
                }
            }
        }
    }

    function findFakeEmoji(src: string, loadCache: (id: string) => FakeEmoji | undefined): FakeEmoji | null {
        if (!storage.emoji.realify || !storage.emoji.enabled) return null
        if (!cdnLinks.some(x => src.includes(x))) return null

        const fakeEmojiMatch = src.match(emojiUrlRegex) as [string, string, string] | null
        if (fakeEmojiMatch) {
            const temp = loadCache(fakeEmojiMatch[1])
            if (temp) return temp

            let url: URL | null = null
            try {
                url = new URL(src)
            } catch {}

            const name = getCustomEmojiById(fakeEmojiMatch[1])?.name ?? url?.searchParams.get('name') ?? 'FakeEmoji'

            return {
                name,
                id: fakeEmojiMatch[1],
                animated: fakeEmojiMatch[2] === 'gif',
                src,
            }
        }

        return null
    }

    function findFakeSticker(src: string, loadCache: (id: string) => FakeSticker | undefined): FakeSticker | null {
        if (!storage.stickers.realify || !storage.stickers.enabled) return null
        if (!cdnLinks.some(x => src.includes(x))) return null

        const fakeStickerMatch = src.match(stickerUrlRegex) as [string, string, string] | null
        if (fakeStickerMatch) {
            const temp = loadCache(fakeStickerMatch[1])
            if (temp) return temp

            let url: URL | null = null
            try {
                url = new URL(src)
            } catch {}

            const sticker = getStickerById(fakeStickerMatch[1])
            const name = sticker?.name ?? url?.searchParams.get('name') ?? 'FakeSticker'
            const width = Number(sticker?.width ?? url?.searchParams.get('size') ?? storage.stickers.size)
            const height = Number(sticker?.height ?? url?.searchParams.get('size') ?? storage.stickers.size)
            const formatType = fakeStickerMatch[2] === 'gif' ? 4 : (sticker?.format_type ?? 1)

            return {
                format_type: formatType,
                name,
                id: fakeStickerMatch[1],
                src,
                width,
                height,
            }
        }

        return null
    }

    cleanup(
        patcher.after(
            RowManager,
            'generate',
            (_, row) => {
                if (row.type !== 1 || !row.message) return
                const { message } = row

                const membeds = message.embeds ?? []
                const removeEmbeds = new Set<number>()

                // look for embed emotes & stickers
                const emojis = new Map<string, FakeEmoji>()
                const stickers = new Map<string, FakeSticker>()
                for (const i in membeds) {
                    const embed = membeds[i]!
                    if (embed.type !== 'image' || !embed.url) continue

                    const fakeEmoji = findFakeEmoji(embed.url, id => emojis.get(id))
                    if (fakeEmoji) {
                        removeEmbeds.add(Number(i))
                        emojis.set(fakeEmoji.id, fakeEmoji)
                    }

                    const fakeSticker = findFakeSticker(embed.url, id => stickers.get(id))
                    if (fakeSticker) {
                        removeEmbeds.add(Number(i))
                        stickers.set(fakeSticker.id, fakeSticker)
                    }
                }

                // remove embeds
                message.embeds = membeds.filter((_, i) => !removeEmbeds.has(i))

                // yay!
                if (!message.content?.length)
                    message.content = [...emojis.values()].map(({ id, name, src, animated }) => ({
                        type: 'customEmoji',
                        id,
                        alt: name + isFakerAlt,
                        src,
                        frozenSrc: src.replace('.gif', '.webp'),
                        animated,
                        jumboable: emojis.size <= 30,
                    }))
                // nay!
                else {
                    let isJumboable = true
                    function recursiveCheck(contents: ContentSkeleton[] | ContentSkeleton[][]) {
                        for (const i in contents) {
                            const cnt = contents[i]
                            if (!cnt) continue

                            if (Array.isArray(cnt)) recursiveCheck(cnt)
                            else {
                                if ('type' in cnt && cnt.type === 'link') {
                                    if (typeof cnt.target === 'string') {
                                        const e = findFakeEmoji(cnt.target, id => emojis.get(id))
                                        if (e) {
                                            emojis.set(e.id, e)

                                            contents[i] = {
                                                type: 'customEmoji',
                                                id: e.id,
                                                alt: e.name + isFakerAlt,
                                                src: e.src,
                                                frozenSrc: e.src.replace('.gif', '.webp'),
                                                get jumboable() {
                                                    return isJumboable
                                                },
                                                animated: e.animated,
                                            }
                                        } else {
                                            const s = findFakeSticker(cnt.target, id => stickers.get(id))
                                            if (s) {
                                                stickers.set(s.id, s)
                                                contents[i] = {
                                                    type: 'text',
                                                    content: '',
                                                }
                                            }
                                        }
                                    }
                                } else if ('content' in cnt && Array.isArray(cnt.content)) recursiveCheck(cnt.content)
                                else if ('items' in cnt && Array.isArray(cnt.items)) recursiveCheck(cnt.items)
                            }
                        }

                        if (shouldDebug) console.log('Rec check ', contents)

                        if (
                            contents.find(
                                x =>
                                    x &&
                                    (!('type' in x) ||
                                        (x.type === 'text' && x.content?.length > 0) ||
                                        x.type !== 'customEmoji'),
                            ) ||
                            contents.filter(x => x && 'type' in x && x.type === 'customEmoji').length > 30
                        )
                            isJumboable = false
                    }

                    if (shouldDebug ? DebuggerContext.connected : true) recursiveCheck(message.content)
                }

                // check attachments for stickers
                const mattachments = message.attachments ?? []
                const removeAttachments = new Set<number>()
                for (const i in mattachments) {
                    if (!storage.stickers.realify || !storage.stickers.enabled) continue

                    const attachment = mattachments[i]!
                    if (
                        attachment.attachmentType !== 'image' ||
                        !attachment.filename.endsWith('.gif') ||
                        !attachment.isAnimated ||
                        !attachment.width ||
                        !attachment.height
                    )
                        continue

                    if (attachmentUrlRegex.test(attachment.url)) {
                        const id = attachment.filename.slice(0, -4)
                        if (!id || !getStickerById(id)) continue

                        if (stickers.get(id)) {
                            removeAttachments.add(Number(i))
                            continue
                        }

                        const name = getStickerById(id)?.name ?? attachment.description ?? 'FakeSticker'

                        removeAttachments.add(Number(i))
                        stickers.set(id, {
                            format_type: 4,
                            name,
                            id,
                            src: attachment.url,
                            width: attachment.width,
                            height: attachment.height,
                        })
                    }
                }

                // remove attachments
                message.attachments = mattachments.filter((_, i) => !removeAttachments.has(i))

                // add stickers
                if (stickers.size) {
                    message.stickers ??= []
                    for (const { format_type, name, id, src, width, height } of stickers.values())
                        message.stickers.push({
                            format_type,
                            id,
                            asset: id,
                            name: name + isFakerAlt,
                            url: src,
                            width,
                            height,
                            renderMode: 0,
                        })
                }

                return row
            },
            'realify.RowGenerator',
        ),

        patcher.before(
            // biome-ignore lint/suspicious/noExplicitAny: View typings arent really accurate
            View as any,
            'render',
            args => {
                const props = args?.[0]

                // View containing emoji name + subtitle
                const textMain = props?.children?.[0]?.props
                const textSub = props?.children?.[1]?.props

                const isEmoji = textMain?.children?.endsWith?.(':')
                if (
                    textMain?.children?.endsWith?.(isEmoji ? `${isFakerAlt}:` : isFakerAlt) &&
                    textMain?.color === 'header-primary' &&
                    textMain?.variant === (isEmoji ? 'text-md/bold' : 'heading-md/extrabold') &&
                    textSub?.children &&
                    textSub?.variant === 'text-sm/medium'
                ) {
                    textMain.children = isEmoji
                        ? `${textMain.children.slice(0, -(isFakerAlt.length + 1))}:`
                        : textMain.children.slice(0, -isFakerAlt.length)
                    textSub.children += ` This is a FreeNitro ${isEmoji ? 'emoji' : 'sticker'} and renders like a real ${isEmoji ? 'emoji' : 'sticker'} only to you. Appears as a link to non-plugin users.`

                    return args
                }
            },
            'realify.View',
        ),
        patcher.after(
            StickerDetailActionSheet,
            'type',
            ([props], ret) => {
                const sticker = ret?.props?.children?.props?.children?.props?.sticker
                if (sticker?.name && props?.renderableSticker?.name) {
                    sticker.name = props.renderableSticker.name
                    return ret
                }
            },
            'realify.StickerDetailActionSheet',
        ),

        // patcher.before(
        //     BottomSheet,
        //     'render',
        //     args => {
        //         const data = args[0]?.children?.props?.children?.props
        //         if (data?.emojiNode?.alt?.endsWith(isFakerAlt) && data?.emojiNode?.src && data?.emojiNode?.id) {
        //             data.emojiNode.alt = 'meowwww'
        //             console.log(data.children)
        //         }

        //         return args
        //     },
        //     'realify.BottomSheet',
        // ),
    )
}

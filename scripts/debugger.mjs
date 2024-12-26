#!/usr/bin/env node
import * as repl from 'node:repl'
import { WebSocketServer } from 'ws'
import chalk from 'chalk'

let isPrompting = false
const logAsDebugger = (...messages) =>
    console.info((isPrompting ? '\n' : '') + chalk.bold.blue('[Debugger]'), ...messages)

const clientColorify = (style, message) =>
    (isPrompting ? '\n' : '') +
    (style === 'error'
        ? chalk.bold.red('[Vengeance] ERR! ') + chalk.red(message)
        : style === 'warn'
          ? chalk.bold.yellow('[Vengeance] ') + chalk.yellow(message)
          : chalk.bold.green('[Vengeance] ') + message)

const logAsClient = message => console.info(clientColorify(null, message))
const logAsClientWarn = message => console.warn(clientColorify('warn', message))
const logAsClientError = message => console.error(clientColorify('error', message))

export function serve() {
    let websocketOpen = false
    let awaitingReply

    const wss = new WebSocketServer({
        port: 9090,
    })
    wss.on('connection', ws => {
        if (websocketOpen) return
        websocketOpen = true

        logAsDebugger('Starting debugger session')

        ws.on('message', data => {
            try {
                /** @type {{ level: "info" | "warn" | "error", message: string, nonce?: string }} */
                const json = JSON.parse(data.toString())

                if (awaitingReply?.cb && awaitingReply?.nonce && awaitingReply.nonce === json.nonce) {
                    awaitingReply.cb(
                        null,
                        json.level === 'error'
                            ? clientColorify('error', json.message)
                            : clientColorify(null, json.message),
                    )
                    awaitingReply = null
                    isPrompting = true
                } else {
                    if (json.level === 'error') logAsClientError(json.message)
                    else if (json.level === 'warn') logAsClientWarn(json.message)
                    else logAsClient(json.message)

                    if (isPrompting) rl.displayPrompt(true)
                }
            } catch {}
        })

        isPrompting = true
        const rl = repl.start({
            eval(input, _, __, cb) {
                if (!isPrompting) return
                if (!input.trim()) return cb()

                try {
                    isPrompting = false
                    awaitingReply = {
                        nonce: crypto.randomUUID(),
                        cb,
                    }
                    ws.send(
                        JSON.stringify({
                            code: input.trim(),
                            nonce: awaitingReply.nonce,
                        }),
                    )
                } catch (e) {
                    cb(e)
                }
            },
            writer(msg) {
                return msg
            },
        })

        rl.on('close', () => {
            isPrompting = false
            ws.close()
            logAsDebugger('Closing debugger, press Ctrl+C to exit')
        })

        ws.on('close', () => {
            logAsDebugger('Websocket was closed')
            rl.close()
            websocketOpen = false
        })
    })

    logAsDebugger('Debugger ready at :9090')

    return wss
}

serve()

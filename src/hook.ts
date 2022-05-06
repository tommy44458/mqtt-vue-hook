import mqtt from 'mqtt'
import common from './common'

export interface MqttHook {
    disconnect: () => void,
    reconnect: (url: string, options: mqtt.IClientOptions) => void,
    subscribe: (topicArray: string[], qos?: mqtt.QoS) => void,
    unSubscribe: (unTopic: string) => void,
    publish: (topic: string, message: string, qos?: mqtt.QoS) => void,
    registerEvent: (topic: string, callback: (topic: string, message: string) => void, vm?: string) => void,
    unRegisterEvent: (topic: string, vm?: any) => void,
    clearEvent: () => void,
    test: () => boolean,
}

export interface Listener {
    callback: (topic: string, message: string) => void
    vm: string
}

export type MqttOptions = mqtt.IClientOptions

let client: mqtt.MqttClient | null = null
const messageListeners = new Map()

const onConnectFail = () => {
    client?.on('error', error => {
        console.log('connect fail', error)
        client?.end()
    })
}

const onMessage = () => {
    client?.on('message', (topic: string, message: string) => {
        if (message) {
            messageListeners.forEach((listeners, key) => {
                if (common.eq(topic, key) && listeners && listeners.length) {
                    listeners.forEach((listener: Listener) => {
                        listener.callback(topic, message)
                    })
                }
            })
        }
    })
}

const onReconnect = () => {
    client?.on('reconnect', () => {
        console.log('try to reconnect:', client?.options)
    })
}

export const connect = async (url: string, _options: MqttOptions) => {
    client = mqtt.connect(url, _options)
    client.on('connect', () => {
        console.log(`success connect to host:${url}`)
    })
    onMessage()
    onReconnect()
    onConnectFail()
}

const disconnect = () => {
    client?.end()
    client = null
    console.log('mqtt disconnected')
}

const reconnect = (url: string, _options: MqttOptions) => {
    disconnect()
    connect(url, _options)
    console.log('mqtt reconnect')
}

const subscribe = (topicArray: string[], qos: mqtt.QoS = 1) => {
    client?.subscribe(topicArray, { qos })
}

const unSubscribe = (unTopic: string) => {
    client?.unsubscribe(unTopic, () => {
        console.log(`unsubscribe: ${unTopic}`)
    })
}

const publish = (topic: string, message: string, qos: mqtt.QoS = 0) => {
    if (!client?.connected) {
        console.error('mqtt client is disconnected')
    } else {
        client.publish(topic, message, { qos })
    }
}

const registerEvent = (topic: string, callback: (topic: string, message: string) => void, vm = 'none') => {
    messageListeners.has(topic) || messageListeners.set(topic, [])
    messageListeners.get(topic).push({ callback, vm })
}

const unRegisterEvent = (topic: string, vm = 'none') => {
    const listeners: Listener[] = messageListeners.get(topic)
    const indexArray: number[] = []

    if (listeners && listeners.length) {
        for (let i = listeners.length - 1; i >= 0; i -= 1) {
            const listener: Listener = listeners[i]
            if (listener.vm === vm) {
                indexArray.push(i)
            }
        }

        if (indexArray.length > 0) {
            indexArray.forEach(index => {
                listeners.splice(index, 1)
            })

            if (listeners.length > 0) {
                messageListeners.set(topic, listeners)
            } else {
                messageListeners.delete(topic)
            }
        }
    }
}

const clearEvent = () => {
    messageListeners.clear()
}

const test = () => common.eq('+/test/#', '1/test/erw/2342')

export const mqttHook = (): MqttHook => ({
    disconnect,
    reconnect,
    subscribe,
    unSubscribe,
    publish,
    registerEvent,
    unRegisterEvent,
    clearEvent,
    test,
})

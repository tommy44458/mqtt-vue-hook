import mqtt from 'mqtt'
import common from './common'

export interface MqttHook {
    disconnect: () => Promise<void>,
    reconnect: (url: string, options: mqtt.IClientOptions) => Promise<void>,
    subscribe: (topicArray: string[], qos?: mqtt.QoS) => Promise<void>,
    unSubscribe: (unTopic: string) => Promise<void>,
    publish: (topic: string, message: string, qos?: mqtt.QoS) => Promise<void>,
    registerEvent: (
        topic: string,
        callback: (topic: string, message: string) => void,
        vm?: string
    ) => Promise<void>,
    unRegisterEvent: (topic: string, vm?: any) => Promise<void>,
    clearEvent: () => Promise<void>,
    test: () => Promise<boolean>,
}

export interface Listener {
    callback: (topic: string, message: string) => void
    vm: string
}

interface PublishArgs {
    topic: string,
    message: string,
    qos: mqtt.QoS,
}

interface SubscribeArgs {
    topicArray: string[],
    qos: mqtt.QoS,
}

export type MqttOptions = mqtt.IClientOptions

let client: mqtt.MqttClient | null = null
const messageListeners = new Map()
const publishBuffer: PublishArgs[] = []
const subscribeBuffer: SubscribeArgs[] = []

const onConnectFail = async () => {
    client?.on('error', error => {
        console.log('connect fail', error)
        client?.end()
    })
}

const onMessage = async () => {
    client?.on('message', (topic: string, message: string) => {
        if (message) {
            messageListeners.forEach((listeners, key) => {
                if (common.eq(key, topic) && listeners && listeners.length) {
                    for (let i = 0; i < listeners.length; i += 1) {
                        try {
                            listeners[i].callback(topic, message)
                        } catch (error) {
                            console.error(error)
                        }
                    }
                }
            })
        }
    })
}

const onReconnect = async () => {
    client?.on('reconnect', () => {
        console.log('try to reconnect:', client?.options)
    })
}

const subscribe = async (topicArray: string[], qos: mqtt.QoS = 1) => {
    if (!client?.connected) {
        subscribeBuffer.push({
            topicArray: topicArray,
            qos: qos,
        })
    } else {
        client?.subscribe(topicArray, { qos })
    }
}

const publish = async (topic: string, message: string, qos: mqtt.QoS = 0) => {
    if (!client?.connected) {
        publishBuffer.push({
            topic: topic,
            message: message,
            qos: qos,
        })
    } else {
        client.publish(topic, message, { qos })
    }
}

export const connect = async (url: string, _options: MqttOptions) => {
    console.log('mqtt connect start')
    client = mqtt.connect(url, _options)
    client.on('connect', () => {
        console.log(`success connect to host:${url}`)
        subscribeBuffer.forEach(({ topicArray, qos }) => {
            subscribe(topicArray, qos)
        })
        subscribeBuffer.splice(0, subscribeBuffer.length)

        publishBuffer.forEach(({ topic, message, qos }) => {
            publish(topic, message, qos)
        })
        publishBuffer.splice(0, publishBuffer.length)
    })
    onMessage()
    onReconnect()
    onConnectFail()
}

const disconnect = async () => {
    client?.end()
    client = null
    console.log('mqtt disconnected')
}

const reconnect = async (url: string, _options: MqttOptions) => {
    disconnect()
    connect(url, _options)
    console.log('mqtt reconnect')
}

const unSubscribe = async (unTopic: string) => {
    client?.unsubscribe(unTopic, () => {
        console.log(`unsubscribe: ${unTopic}`)
    })
}

const registerEvent = async (topic: string, callback: (topic: string, message: string) => void, vm = 'none') => {
    messageListeners.has(topic) || messageListeners.set(topic, [])
    messageListeners.get(topic).push({ callback, vm })
}

const unRegisterEvent = async (topic: string, vm = 'none') => {
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

const clearEvent = async () => {
    messageListeners.clear()
}

const test = async () => {
    const commonTest = common.eq('+/test/#', '1/test/erw/2342')
    reconnect('wss://broker.emqx.io:8084', {
        clean: false,
        keepalive: 60,
        clientId: `mqtt_client_${Math.random().toString(16).substring(2, 10)}`,
        path: '/mqtt',
        connectTimeout: 4000,
    })


    subscribe(['mqtt-vue-hook/test', 'mqtt-vue-hook/test2'])
    registerEvent('mqtt-vue-hook/test', (topic: string, message: string) => {
        console.log(topic, message.toString())
    })

    unSubscribe('mqtt-vue-hook/test2')
    unRegisterEvent('mqtt-vue-hook/test')
    clearEvent()

    disconnect()

    return commonTest
}

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

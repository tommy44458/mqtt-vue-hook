import mqtt from 'mqtt'
import common from './common'
import { eventHook } from './event'

export interface MqttHook {
    connect: (url: string, _options: MqttOptions) => Promise<void>,
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

const event = eventHook()
let client: mqtt.MqttClient | null = null
const publishBuffer: PublishArgs[] = []
const subscribeBuffer: SubscribeArgs[] = []

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

const unSubscribe = async (unTopic: string) => {
    client?.unsubscribe(unTopic, () => {
        console.log(`unsubscribe: ${unTopic}`)
    })
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

const onConnectFail = async () => {
    client?.on('error', (error: string) => {
        console.log('connect fail', error)
        client?.end()
        event.runEvent('on-connect-fail', String(error))
    })
}

const onMessage = async () => {
    client?.on('message', (topic: string, message: string) => {
        if (message) event.runEvent(topic, message)
    })
}

const onConnect = async (url: string) => {
    client?.on('connect', () => {
        console.log(`success connect to host:${url}`)
        subscribeBuffer.forEach(({ topicArray, qos }) => subscribe(topicArray, qos))
        subscribeBuffer.length = 0

        publishBuffer.forEach(({ topic, message, qos }) => publish(topic, message, qos))
        publishBuffer.length = 0

        event.runEvent('on-connect', '')
    })
}

const onReconnect = async () => {
    client?.on('reconnect', () => {
        console.log('try to reconnect:', client?.options)
        event.runEvent('on-reconnect', '')
    })
}

const onEnd = async () => {
    client?.on('end', () => {
        console.log('disconnected:', client?.options)
        event.runEvent('on-disconnect', '')
    })
}

const disconnect = async () => {
    console.log('mqtt disconnecting')
    client?.end()
    client = null
}

export const connect = async (url: string, _options: MqttOptions) => {
    console.log('mqtt connecting')
    if (client) await disconnect()
    client = mqtt.connect(url, _options)
    onConnect(url)
    onMessage()
    onReconnect()
    onEnd()
    onConnectFail()
}

const reconnect = async (url: string, _options: MqttOptions) => {
    disconnect()
    connect(url, _options)
    console.log('mqtt reconnecting')
}

const unRegisterEvent = async (topic: string, vm = 'none') => event.unRegisterEvent(topic, vm)

const registerEvent = async (
    topic: string,
    callback: (topic: string, message: string) => void,
    vm = 'none',
) => event.registerEvent(topic, callback, vm)

const clearEvent = async () => event.clearEvent()

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
    connect,
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

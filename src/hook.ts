import mqtt from 'mqtt'
import common from './common'
import { eventHook } from './event'

export interface MqttHook {
    isConnected: () => boolean
    connect: (url: string, _options: MqttOptions) => Promise<void>,
    disconnect: () => Promise<void>,
    reconnect: (url: string, options: mqtt.IClientOptions) => Promise<void>,
    subscribe: (
        topicArray: string[],
        qos?: mqtt.QoS,
        opts?: SubscribeOptions,
        callback?: mqtt.ClientSubscribeCallback
    ) => Promise<void>,
    unSubscribe: (
        unTopic: string,
        opts?: Object,
        callback?: mqtt.PacketCallback
    ) => Promise<void>,
    publish: (
        topic: string,
        message: string,
        qos?: mqtt.QoS,
        opts?: PublishOptions,
        callback?: mqtt.PacketCallback
    ) => Promise<void>,
    registerEvent: (
        topic: string,
        callback: (topic: string, message: string) => void,
        vm?: string
    ) => Promise<void>,
    unRegisterEvent: (topic: string, vm?: any) => Promise<void>,
    clearEvent: () => Promise<void>,
    test: () => Promise<boolean>,
}

interface SubscribeOptions {
    qos: mqtt.QoS,
    nl: any,
    rap: any,
    rh: any,
    properties: object,
}

interface PublishOptions {
    qos: mqtt.QoS,
    retain: any,
    dup: any,
    properties: object,
}

interface PublishArgs {
    topic: string,
    message: string,
    qos: mqtt.QoS,
    opts: PublishOptions,
    callback?: mqtt.PacketCallback,
}

interface SubscribeArgs {
    topicArray: string[],
    qos: mqtt.QoS,
    opts: SubscribeOptions,
    callback?: mqtt.ClientSubscribeCallback,
}

export type MqttOptions = mqtt.IClientOptions

const event = eventHook()
let client: mqtt.MqttClient | null = null
const publishBuffer: PublishArgs[] = []
const subscribeBuffer: SubscribeArgs[] = []

const isConnected = () => {
    if (client?.connected) return true
    return false
}

const subscribe = async (
    topicArray: string[],
    qos: mqtt.QoS = 1,
    opts: SubscribeOptions = {
        qos: 1,
        nl: false,
        rap: false,
        rh: 0,
        properties: {},
    },
    callback?: mqtt.ClientSubscribeCallback,
) => {
    opts.qos = qos

    if (!client?.connected) {
        subscribeBuffer.push({
            topicArray: topicArray,
            qos: qos,
            opts: opts,
            callback: callback,
        })
    } else {
        client?.subscribe(
            topicArray,
            opts,
            callback,
        )
    }
}

const unSubscribe = async (unTopic: string, opts: Object = {}, callback?: mqtt.PacketCallback) => {
    if (callback) {
        client?.unsubscribe(unTopic, opts, callback)
    } else {
        client?.unsubscribe(unTopic, opts, () => {
            console.log(`unsubscribe: ${unTopic}`)
        })
    }
}

const publish = async (
    topic: string,
    message: string,
    qos: mqtt.QoS = 0,
    opts: PublishOptions = {
        qos: 0,
        retain: false,
        dup: false,
        properties: {},
    },
    callback?: mqtt.PacketCallback,
) => {
    opts.qos = qos

    if (!client?.connected) {
        publishBuffer.push({
            topic: topic,
            message: message,
            qos: qos,
            opts: opts,
            callback: callback,
        })
    } else {
        client.publish(
            topic,
            message,
            opts,
            callback,
        )
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
        subscribeBuffer.forEach(({ topicArray, qos, opts, callback }) => subscribe(topicArray, qos, opts, callback))
        subscribeBuffer.length = 0

        publishBuffer.forEach(({ topic, message, qos, opts, callback }) => publish(topic, message, qos, opts, callback))
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
    isConnected,
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

import mqtt from 'mqtt'
import common from './common'
import { useEventHook } from './event'

export interface MqttBaseHook {
    isConnected: (
        clientID: string,
    ) => boolean
    connect: (
        clientID: string,
        url: string,
        _options: MqttOptions,
    ) => Promise<void>,
    disconnect: (
        clientID: string,
    ) => Promise<void>,
    reconnect: (
        clientID: string,
        url: string,
        options: mqtt.IClientOptions,
    ) => Promise<void>,
    subscribe: (
        clientID: string,
        topicArray: string[],
        qos?: mqtt.QoS,
        opts?: SubscribeOptions,
        callback?: mqtt.ClientSubscribeCallback
    ) => Promise<void>,
    unSubscribe: (
        clientID: string,
        unTopic: string,
        opts?: Object,
        callback?: mqtt.PacketCallback
    ) => Promise<void>,
    publish: (
        clientID: string,
        topic: string,
        message: string,
        qos?: mqtt.QoS,
        opts?: PublishOptions,
        callback?: mqtt.PacketCallback
    ) => Promise<void>,
    showAllClient: () => Promise<string[]>,
}

export interface SubscribeOptions {
    qos: mqtt.QoS,
    nl: any,
    rap: any,
    rh: any,
    properties: object,
}

export interface PublishOptions {
    qos: mqtt.QoS,
    retain: any,
    dup: any,
    properties: object,
}

export interface PublishArgs {
    topic: string,
    message: string,
    qos: mqtt.QoS,
    opts: PublishOptions,
    callback?: mqtt.PacketCallback,
}

export interface SubscribeArgs {
    topicArray: string[],
    qos: mqtt.QoS,
    opts: SubscribeOptions,
    callback?: mqtt.ClientSubscribeCallback,
}

export type MqttOptions = mqtt.IClientOptions

const eventHook = useEventHook()

const clientObject: { [key: string]: mqtt.Client } = {}
const publishBufferObject: { [key: string]: PublishArgs[] } = {}
const subscribeBufferObject: { [key: string]: SubscribeArgs[] } = {}

const getPublishBuffer = (clientID: string) => {
    if (!publishBufferObject[clientID]) publishBufferObject[clientID] = []
    return publishBufferObject[clientID]
}

const getSubscribeBuffer = (clientID: string) => {
    if (!subscribeBufferObject[clientID]) subscribeBufferObject[clientID] = []
    return subscribeBufferObject[clientID]
}

const isConnected = (
    clientID: string,
) => {
    if (clientObject[clientID]?.connected) return true
    return false
}

const subscribe = async (
    clientID: string,
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

    if (clientObject[clientID] == null || !clientObject[clientID]?.connected) {
        const subscribeBuffer = getSubscribeBuffer(clientID)
        subscribeBuffer.push({
            topicArray: topicArray,
            qos: qos,
            opts: opts,
            callback: callback,
        })
    } else {
        clientObject[clientID]?.subscribe(
            topicArray,
            opts,
            callback,
        )
    }
}

const unSubscribe = async (
    clientID: string,
    unTopic: string,
    opts: Object = {},
    callback?: mqtt.PacketCallback,
) => {
    if (callback) {
        clientObject[clientID]?.unsubscribe(unTopic, opts, callback)
    } else {
        clientObject[clientID]?.unsubscribe(unTopic, opts, () => {
            common.debug().log(`unsubscribe: ${unTopic}`)
        })
    }
}

const publish = async (
    clientID: string,
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

    if (clientObject[clientID] == null || !clientObject[clientID]?.connected) {
        const publishBuffer = getPublishBuffer(clientID)
        publishBuffer.push({
            topic: topic,
            message: message,
            qos: qos,
            opts: opts,
            callback: callback,
        })
    } else {
        clientObject[clientID].publish(
            topic,
            message,
            opts,
            callback,
        )
    }
}

const onConnectFail = async (
    clientID: string,
) => {
    clientObject[clientID]?.on('error', (error: string) => {
        common.debug().log('connect fail:', error)
        clientObject[clientID]?.end()
        eventHook.runEvent(clientID, 'on-connect-fail', String(error))
    })
}

const onMessage = async (
    clientID: string,
) => {
    clientObject[clientID]?.on('message', (topic: string, message: string, packet?: mqtt.IPublishPacket) => {
        if (message) eventHook.runEvent(clientID, topic, message, packet)
    })
}

const onConnect = async (
    clientID: string,
    url: string,
) => {
    clientObject[clientID]?.on('connect', () => {
        common.debug().log('success connect to host:', url)
        const subscribeBuffer = getSubscribeBuffer(clientID)
        subscribeBuffer.forEach(({ topicArray, qos, opts, callback }) => subscribe(
            clientID,
            topicArray,
            qos,
            opts,
            callback,
        ))
        subscribeBuffer.length = 0

        const publishBuffer = getPublishBuffer(clientID)
        publishBuffer.forEach(({ topic, message, qos, opts, callback }) => publish(
            clientID,
            topic,
            message,
            qos,
            opts,
            callback,
        ))
        publishBuffer.length = 0

        eventHook.runEvent(clientID, 'on-connect', '')
    })
}

const onReconnect = async (
    clientID: string,
) => {
    clientObject[clientID]?.on('reconnect', () => {
        common.debug().log('try to reconnect:', clientObject[clientID]?.options?.hostname)
        eventHook.runEvent(clientID, 'on-reconnect', '')
    })
}

const onEnd = async (
    clientID: string,
) => {
    clientObject[clientID]?.on('end', () => {
        common.debug().log('disconnected')
        eventHook.runEvent(clientID, 'on-disconnect', '')
    })
}

const disconnect = async (
    clientID: string,
) => {
    common.debug().log('mqtt  disconnecting')
    const client: mqtt.Client | null = clientObject[clientID]
    client?.end()
    delete clientObject[clientID]
}

export const connect = async (
    clientID: string,
    url: string,
    _options: MqttOptions,
) => {
    common.debug().log('mqtt connecting')
    if (clientObject[clientID]) await disconnect(clientID)
    clientObject[clientID] = mqtt.connect(url, _options)
    onConnect(clientID, url)
    onMessage(clientID)
    onReconnect(clientID)
    onEnd(clientID)
    onConnectFail(clientID)
}

const reconnect = async (
    clientID: string,
    url: string,
    _options: MqttOptions,
) => {
    disconnect(clientID)
    connect(clientID, url, _options)
    common.debug().log('mqtt reconnecting')
}

const showAllClient = async () => {
    return Object.keys(clientObject)
}


const mqttBaseHook = (): MqttBaseHook => ({
    isConnected,
    connect,
    disconnect,
    reconnect,
    subscribe,
    unSubscribe,
    publish,
    showAllClient,
})

export const useMqttBaseHook = () => mqttBaseHook()

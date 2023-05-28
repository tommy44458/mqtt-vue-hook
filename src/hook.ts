import mqtt from 'mqtt'
import common from './common'
import { useMqttBaseHook, SubscribeOptions, PublishOptions } from './base-hook'
import { useEventHook } from './event'

const mqttBaseHook = useMqttBaseHook()
const eventHook = useEventHook()

export interface MqttHook {
    isConnected: (
        clientID?: string,
    ) => boolean
    connect: (
        url: string,
        _options: MqttOptions,
        clientID?: string,
    ) => Promise<void>,
    disconnect: (
        clientID?: string,
    ) => Promise<void>,
    reconnect: (
        url: string,
        options: mqtt.IClientOptions,
        clientID?: string,
    ) => Promise<void>,
    subscribe: (
        topicArray: string[],
        qos?: mqtt.QoS,
        opts?: SubscribeOptions,
        callback?: mqtt.ClientSubscribeCallback,
        clientID?: string,
    ) => Promise<void>,
    unSubscribe: (
        unTopic: string,
        opts?: Object,
        callback?: mqtt.PacketCallback,
        clientID?: string,
    ) => Promise<void>,
    publish: (
        topic: string,
        message: string,
        qos?: mqtt.QoS,
        opts?: PublishOptions,
        callback?: mqtt.PacketCallback,
        clientID?: string,
    ) => Promise<void>,
    showAllClient: () => Promise<string[]>,
    registerEvent: (
        topic: string,
        callback: (topic: string, message: string) => void,
        vm?: string,
        clientID?: string,
    ) => Promise<void>,
    unRegisterEvent: (
        topic: string,
        vm?: any,
        clientID?: string,
    ) => Promise<void>,
    clearEvent: (
        clientID?: string,
    ) => Promise<void>,
    test: () => Promise<boolean>,
}

export type MqttOptions = mqtt.IClientOptions

const isConnected = (clientID?: string) => {
    if (!clientID) clientID = 'default'
    return mqttBaseHook.isConnected(clientID)
}

const subscribe = async (
    topicArray: string[],
    qos?: mqtt.QoS,
    opts?: SubscribeOptions,
    callback?: mqtt.ClientSubscribeCallback,
    clientID?: string,
) => {
    if (!qos) qos = 1
    if (!opts) opts = {
        qos: qos,
        nl: false,
        rap: false,
        rh: 0,
        properties: {},
    }
    if (!callback) callback = () => { }
    if (!clientID) clientID = 'default'
    return mqttBaseHook.subscribe(clientID, topicArray, qos, opts, callback)
}

const unSubscribe = async (
    unTopic: string,
    opts?: Object,
    callback?: mqtt.PacketCallback,
    clientID?: string,
) => {
    if (!opts) opts = {}
    if (!callback) callback = () => { }
    if (!clientID) clientID = 'default'
    return mqttBaseHook.unSubscribe(clientID, unTopic, opts, callback)
}

const publish = async (
    topic: string,
    message: string,
    qos?: mqtt.QoS,
    opts?: PublishOptions,
    callback?: mqtt.PacketCallback,
    clientID?: string,
) => {
    if (!qos) qos = 0
    if (!opts) opts = {
        qos: qos,
        retain: false,
        dup: false,
        properties: {},
    }
    if (!callback) callback = () => { }
    if (!clientID) clientID = 'default'
    return mqttBaseHook.publish(clientID, topic, message, qos, opts, callback)
}

const disconnect = async (
    clientID?: string,
) => {
    if (!clientID) clientID = 'default'
    return mqttBaseHook.disconnect(clientID)
}

export const connect = async (
    url: string,
    _options: MqttOptions,
    clientID?: string,
) => {
    if (!clientID) clientID = 'default'
    return mqttBaseHook.connect(clientID, url, _options)
}

const reconnect = async (
    url: string,
    _options: MqttOptions,
    clientID?: string,
) => {
    if (!clientID) clientID = 'default'
    return mqttBaseHook.reconnect(clientID, url, _options)
}

const showAllClient = async () => {
    return mqttBaseHook.showAllClient()
}

const unRegisterEvent = async (
    topic: string,
    vm = 'none',
    clientID?: string,
) => {
    if (!clientID) clientID = 'default'
    eventHook.unRegisterEvent(clientID, topic, vm)
}

const registerEvent = async (
    topic: string,
    callback: (topic: string, message: string) => void,
    vm = 'none',
    clientID?: string,
) => {
    if (!clientID) clientID = 'default'
    eventHook.registerEvent(clientID, topic, callback, vm)
}

const clearEvent = async (
    clientID?: string,
) => {
    if (!clientID) clientID = 'default'
    eventHook.clearEvent(clientID)
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
        common.debug().log(topic, message.toString())
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
    showAllClient,
    registerEvent,
    unRegisterEvent,
    clearEvent,
    test,
})

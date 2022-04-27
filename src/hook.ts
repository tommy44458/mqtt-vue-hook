import mqtt from 'mqtt'

export interface MqttHook {
    disconnect: () => void,
    reconnect: (options: mqtt.IClientOptions) => void,
    subscribe: (topicArray: string[], qos?: mqtt.QoS) => void,
    unSubscribe: (unTopic: string) => void,
    publish: (topic: string, message: string, qos?: mqtt.QoS) => void,
    registerEvent: (topic: string, callback: (topic: string, message: string) => void, vm?: string) => void,
    unRegisterEvent: (topic: string, vm?: any) => void,
    clearEvent: () => void,
}

interface Listener {
    callback: (topic: string, message: string) => void
    vm: string
}

let client: mqtt.MqttClient | null = null

const messageListeners = new Map()

const eq = (str1: string, str2: string) => {
    let arr1 = str1.split('/')
    let arr2 = str2.split('/')
    if (!str1.includes('#') && !str2.includes('#') && arr1.length !== arr2.length) {
        return false
    }
    if (arr2.length < arr1.length) {
        arr2 = str1.split('/')
        arr1 = str2.split('/')
    }
    let ret = true
    arr1.forEach((val, i) => {
        if (val === '+' || val === '#'
            || (arr2[i] && arr2[i] === '+')
            || (arr2[i] && arr2[i] === '#')
            || (arr2[i] && arr2[i] === val)) {
            return
        }
        ret = false
    })
    return ret
}

const onConnectFail = () => {
    client?.on('error', error => {
        console.log('connect fail', error)
        client?.end()
    })
}

const onMessage = () => {
    client?.on('message', (topic: string, message: string) => {
        if (message) {
            console.log('messageListeners', messageListeners)
            messageListeners.forEach((listeners, key) => {
                if (eq(topic, key) && listeners && listeners.length) {
                    listeners.forEach((listener: Listener) => {
                        listener.callback(topic, message)
                    })
                }
            })
        }
    })
}

const onReconnect = () => {
    client?.on('reconnect', (error: string) => {
        console.log('try to reconnect:', error)
    })
}

export const connect = async (_options: mqtt.IClientOptions) => {
    client = mqtt.connect(`${_options.protocol}://${_options.host}:${_options.port}`, _options)
    client.on('connect', e => {
        console.log('option', _options)
        console.log('success connect to host:', e)
    })
    onMessage()
    onReconnect()
    onConnectFail()
}

const disconnect = () => {
    if (client) {
        client.end()
        client = null
        console.log('mqtt disconnected')
    }
}

const reconnect = (_options: mqtt.IClientOptions) => {
    disconnect()
    connect(_options)
}

const subscribe = (topicArray: string[], qos: mqtt.QoS = 1) => {
    client?.subscribe(topicArray, { qos })
}

const unSubscribe = (unTopic: string) => {
    client?.unsubscribe(unTopic, (error: string) => {
        console.log(`unsubscribe: ${unTopic}`, error)
    })
}

const publish = (topic: string, message: string, qos: mqtt.QoS = 0) => {
    if (!client?.connected) {
        console.log('client is disconnected')
    } else {
        client.publish(topic, message, { qos })
    }
}

const registerEvent = (topic: string, callback: (topic: string, message: string) => void, vm = 'none') => {
    if (typeof callback === 'function') {
        messageListeners.has(topic) || messageListeners.set(topic, [])
        messageListeners.get(topic).push({ callback, vm })
        console.log('registerEvent', callback, vm)
    }
}

const unRegisterEvent = (topic: string, vm = 'none') => {
    console.log('messageListeners', messageListeners)
    const listeners = messageListeners.get(topic)
    let index = -1

    if (listeners && listeners.length) {
        console.log('listeners.length', listeners.length)
        for (let i = 0; i < listeners.length; i += 1) {
            const listener: Listener = listeners[i]
            if (listener.vm === vm) {
                index = i
                console.log('remove event', listener)
                break
            }
        }

        if (index > -1) {
            console.log('index', index)
            listeners.splice(index, 1)
            messageListeners.set(topic, listeners)
        }
    }
}

const clearEvent = () => {
    messageListeners.clear()
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
})

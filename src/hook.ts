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
    client?.on('reconnect', () => {
        console.log('try to reconnect:', client?.options)
    })
}

export const connect = async (_options: mqtt.IClientOptions) => {
    client = mqtt.connect(`${_options.protocol}://${_options.host}:${_options.port}`, _options)
    client.on('connect', () => {
        console.log(`success connect to host:${_options.host}`)
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
    client?.unsubscribe(unTopic, () => {
        console.log(`unsubscribe: ${unTopic}`)
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
        // console.log('registerEvent', callback, vm)
    }
}

const unRegisterEvent = (topic: string, vm = 'none') => {
    const listeners: Listener[] = messageListeners.get(topic)
    let indexArray: number[] = []
    console.error('messageListeners', messageListeners)
    console.error('listeners', listeners)

    if (listeners && listeners.length) {
        console.error('listeners.length', listeners.length)
        for (let i = listeners.length - 1; i >= 0; i -= 1) {
            const listener: Listener = listeners[i]
            if (listener.vm === vm) {
                indexArray.push(i)
            }
        }

        console.error('indexArray', indexArray)

        if (indexArray.length > 0) {
            indexArray.forEach(index => {
                listeners.splice(index, 1)
            })

            console.error('listeners', listeners)

            if (listeners.length > 0) {
                messageListeners.set(topic, listeners)
            } else {
                messageListeners.delete(topic)
            }
        }
    }
    console.error('messageListeners', messageListeners)
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

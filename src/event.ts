import mqtt from 'mqtt'
import common from './common'

export interface EventHook {
    runEvent: (topic: string, message: string, packet?: mqtt.IPublishPacket) => void,
    unRegisterEvent: (topic: string, vm?: any) => Promise<void>,
    registerEvent: (
        topic: string,
        callback: (topic: string, message: string) => void,
        vm?: string
    ) => Promise<void>,
    clearEvent: () => Promise<void>,
}

export interface Listener {
    callback: (topic: string, message: string, packet?: mqtt.IPublishPacket) => void
    vm: string
}

const messageListenerMap = new Map()

const runEvent = (topic: string, message: string, packet?: mqtt.IPublishPacket) => {
    for (const [key, listenerList] of messageListenerMap) {
        if (common.eq(key, topic) && listenerList && listenerList.length) {
            listenerList.forEach((listener: Listener) => {
                try {
                    listener.callback(topic, message, packet)
                } catch (error) {
                    console.error({
                        topic,
                        vm: listener.vm,
                        error,
                    })
                }
            })
        }
    }
}

const unRegisterEvent = async (topic: string, vm = 'none') => {
    const listenerList: Listener[] = messageListenerMap.get(topic)

    if (listenerList && listenerList.length) {
        const indexArray: number[] = []
        for (let i = listenerList.length - 1; i >= 0; i -= 1) {
            if (listenerList[i].vm === vm) indexArray.push(i)
        }

        if (indexArray.length) {
            indexArray.forEach(index => listenerList.splice(index, 1))

            if (listenerList.length > 0) messageListenerMap.set(topic, listenerList)
            else messageListenerMap.delete(topic)
        }
    }
}

const registerEvent = async (
    topic: string,
    callback: (topic: string, message: string, packet?: mqtt.IPublishPacket) => void,
    vm = 'none') => {
    await unRegisterEvent(topic, vm)
    messageListenerMap.has(topic) || messageListenerMap.set(topic, [])
    messageListenerMap.get(topic).push({ callback, vm })
}

const clearEvent = async () => {
    messageListenerMap.clear()
}

export const eventHook = (): EventHook => ({
    runEvent,
    unRegisterEvent,
    registerEvent,
    clearEvent,
})
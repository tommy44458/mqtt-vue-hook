import mqtt from 'mqtt'
import common from './common'

export interface EventHook {
    runEvent: (
        clientID: string,
        topic: string,
        message: string,
        packet?: mqtt.IPublishPacket,
    ) => void,
    unRegisterEvent: (
        clientID: string,
        topic: string,
        vm?: any,
    ) => Promise<void>,
    registerEvent: (
        clientID: string,
        topic: string,
        callback: (topic: string, message: string) => void,
        vm?: string,
    ) => Promise<void>,
    clearEvent: (
        clientID: string,
    ) => Promise<void>,
}

export interface Listener {
    callback: (topic: string, message: string, packet?: mqtt.IPublishPacket) => void
    vm: string
}

const messageListenerMapObject = {} as { [key: string]: Map<string, Listener[]> }

const runEvent = (clientID: string, topic: string, message: string, packet?: mqtt.IPublishPacket) => {
    const listenerMap = messageListenerMapObject[clientID]
    if (listenerMap) {
        for (const [key, listenerList] of listenerMap) {
            if (common.eq(key, topic) && listenerList && listenerList.length) {
                listenerList.forEach((listener: Listener) => {
                    try {
                        listener.callback(topic, message, packet)
                    } catch (error) {
                        common.debug().error({
                            topic,
                            vm: listener.vm,
                            error,
                        })
                    }
                })
            }
        }
    }
}

const unRegisterEvent = async (clientID: string, topic: string, vm = 'none') => {
    const listenerMap = messageListenerMapObject[clientID]
    if (listenerMap) {
        const listenerList: Listener[] | undefined = listenerMap.get(topic)

        if (listenerList && listenerList.length) {
            const indexArray: number[] = []
            for (let i = listenerList.length - 1; i >= 0; i -= 1) {
                if (listenerList[i].vm === vm) indexArray.push(i)
            }

            if (indexArray.length) {
                indexArray.forEach(index => listenerList.splice(index, 1))

                if (listenerList.length > 0) listenerMap.set(topic, listenerList)
                else listenerMap.delete(topic)
            }
        }
    }
}

const registerEvent = async (
    clientID: string,
    topic: string,
    callback: (topic: string, message: string, packet?: mqtt.IPublishPacket) => void,
    vm = 'none',
) => {
    let listenerMap = messageListenerMapObject[clientID]
    if (!listenerMap) {
        messageListenerMapObject[clientID] = new Map() as Map<string, Listener[]>
        listenerMap = messageListenerMapObject[clientID]
    }

    await unRegisterEvent(clientID, topic, vm)
    listenerMap.has(topic) || listenerMap.set(topic, [])
    listenerMap.get(topic)?.push({ callback, vm })
}

const clearEvent = async (clientID: string) => {
    const listenerMap = messageListenerMapObject[clientID]
    if (listenerMap) listenerMap.clear()
}

export const useEventHook = (): EventHook => ({
    runEvent,
    unRegisterEvent,
    registerEvent,
    clearEvent,
})

import { App } from 'vue'
import mqtt from 'mqtt'
import { options, mqttHook, MqttHook } from './hook'

export default {
    install: (_app: App, options: mqtt.IClientOptions) => {
        options = options
    },
    useMQTT: () => mqttHook()
}
export type { MqttHook }

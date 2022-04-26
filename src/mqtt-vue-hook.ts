import { App } from 'vue'
import mqtt from 'mqtt'
import { connect, mqttHook, MqttHook } from './hook'

export default {
    install: (_app: App, options: mqtt.IClientOptions) => {
        _app.mixin({
            beforeCreate() {
                connect(options)
            }
        })
    },
    useMQTT: () => mqttHook()
}
export type { MqttHook }
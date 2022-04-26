import { App } from 'vue'
import mqtt from 'mqtt'
import { connect, mqttHook, MqttHook } from './hook'

export default {
    install: async (_app: App, options: mqtt.IClientOptions) => {
        await connect(options)
        // _app.mixin({
        //     async mounted() {
        //         await connect(options)
        //     },
        // })
        // _app.config.globalProperties.$useMQTT = () => mqttHook()
    },
}
export type { MqttHook }
export const useMQTT = () => mqttHook()

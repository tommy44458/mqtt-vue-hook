import { App } from 'vue'
import { connect, mqttHook, mqttOptions } from './hook'

export default {
    install: async (_app: App, options: mqttOptions) => {
        await connect(options)
    },
}
export const useMQTT = () => mqttHook()

import { App } from 'vue'
import { connect, mqttHook, mqttOptions } from './hook'

export default {
    install: async (_app: App, url: string, options: mqttOptions) => {
        await connect(url, options)
    },
}
export const useMQTT = () => mqttHook()

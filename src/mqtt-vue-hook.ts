import { connect, mqttHook, MqttOptions } from './hook'

export default {
    install: async (_app: any, url: string, options: MqttOptions) => {
        await connect(url, options)
    },
}
export const useMQTT = () => mqttHook()

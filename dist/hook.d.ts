import mqtt from 'mqtt';
export interface MqttHook {
    disconnect: () => void;
    reconnect: (url: string, options: mqtt.IClientOptions) => void;
    subscribe: (topicArray: string[], qos?: mqtt.QoS) => void;
    unSubscribe: (unTopic: string) => void;
    publish: (topic: string, message: string, qos?: mqtt.QoS) => void;
    registerEvent: (topic: string, callback: (topic: string, message: string) => void, vm?: string) => void;
    unRegisterEvent: (topic: string, vm?: any) => void;
    clearEvent: () => void;
    test: () => boolean;
}
export interface Listener {
    callback: (topic: string, message: string) => void;
    vm: string;
}
export declare type MqttOptions = mqtt.IClientOptions;
export declare const connect: (url: string, _options: MqttOptions) => Promise<void>;
export declare const mqttHook: () => MqttHook;

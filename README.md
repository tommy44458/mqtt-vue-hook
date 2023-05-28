# Mqtt-Vue-Hook

[![NPM version](https://img.shields.io/npm/v/mqtt-vue-hook.svg)](https://www.npmjs.com/package/mqtt-vue-hook)
[![NPM download count](https://img.shields.io/npm/dt/mqtt-vue-hook)](https://www.npmjs.com/package/mqtt-vue-hook)
[![languages](https://img.shields.io/github/languages/top/tommy44458/mqtt-vue-hook)](https://www.npmjs.com/package/mqtt-vue-hook)
[![license](https://img.shields.io/npm/l/mqtt-vue-hook)](https://www.npmjs.com/package/mqtt-vue-hook)
[![codacy](https://img.shields.io/codacy/grade/167baac7ff374d359dac9f885f566c0f)](https://www.npmjs.com/package/mqtt-vue-hook)

This hook implemented by Typescript can connect to the MQTT broker (support v5) and be used by VueJs3, Vite, ReactJs, etc.

Mqtt-vue-hook is a TypeScript library that allows developers to easily connect to an MQTT broker and manage callback functions for various topics. While the library is primarily designed for use with Vue.js, it can be used in any TypeScript project. With this library, developers can handle MQTT-related logic more efficiently and effectively, making it a valuable tool for IoT applications and other scenarios that use MQTT.

## Example

[A LIGHT vue3 starter support MQTT](https://github.com/tommy44458/light-vue3-starter)

## Install

```bash
npm install mqtt-vue-hook --save
```

```bash
yarn add mqtt-vue-hook -D
```

## Usage

### Vue or React or Typescript instance

```ts
// src/app.tsx
// protocol = 'wss', 'ws', 'mqtt', ...
// host = ip or domain
// port = 8083, 1883, ...
import { useMQTT } from 'mqtt-vue-hook'
const mqttHook = useMQTT()

mqttHook.connect(`${protocol}://${host}:${port}`, {
    clean: false,
    keepalive: 60,
    clientId: `mqtt_client_${Math.random().toString(16).substring(2, 10)}`,
    connectTimeout: 4000,
})
```

options: https://github.com/mqttjs/MQTT.js#client

### Subscribe

```vue
<script setup lang="ts">
import { useMQTT } from 'mqtt-vue-hook'

onMounted(() => {
    const mqttHook = useMQTT()
    // mqttHook.subscribe([...topic], qos, opts?, callback?, clientID?)
    // mqttHook.unSubscribe(topic, opts?, callback?, clientID?)
    // '+' == /.+/
    // '#' == /[A-Za-z0-9/]/
    mqttHook.subscribe(
        ['+/root/#'],
        1,
        {
            properties: {
                userProperties: {...}
            },
        },
        () => {
            console.log('subscribed!')
        }
    )
})
</script>
```

options: https://github.com/mqttjs/MQTT.js#subscribe

### Publish

```vue
<script setup lang="ts">
import { useMQTT } from 'mqtt-vue-hook'

onMounted(() => {
    const mqttHook = useMQTT()
    // mqttHook.publish(topic, message, qos?, opts?, callback?, clientID?)
    mqttHook.publish(
        ['test/root/1'],
        'my message',
        1,
        {},
        () => {
            console.log('published!')
        }
    )
})
</script>
```

options: https://github.com/mqttjs/MQTT.js#publish

### Register Event

```vue
<script setup lang="ts">
import { useMQTT } from 'mqtt-vue-hook'

const mqttHook = useMQTT()

onMounted(() => {
    // mqttHook.registerEvent(topic, callback function, vm = string, clientID?)
    // mqttHook.unRegisterEvent(topic, vm)
    mqttHook.registerEvent(
        '+/root/#',
        (topic: string, message: string) => {
            Notification({
                title: topic,
                message: message.toString(),
                type: 'info',
            })
        },
        'string_key',
    )
    mqttHook.registerEvent(
        'on-connect', // mqtt status: on-connect, on-reconnect, on-disconnect, on-connect-fail
        (topic: string, message: string) => {
            console.log('mqtt connected')
        },
        'string_key',
    )
})

onUnmounted(() => {
    // mqttHook.unRegisterEvent(topic, vm, clientID?))
    mqttHook.unRegisterEvent('+/root/#', 'string_key')
    mqttHook.unRegisterEvent('on-connect', 'string_key')
})
</script>
```

### Typescript

```ts
import { useMQTT } from 'mqtt-vue-hook'
const mqttHook = useMQTT()

mqttHook.registerEvent('+/root/1', (topic: string, message: string) => {
    console.log(topic, message.toString())
})
mqttHook.publish(['test/root/1'], 'my message', 1)

// console log "test/root/1 my message"
```

### Multi-Client

```ts
import { useMQTT } from 'mqtt-vue-hook'
const mqttHook = useMQTT()

if (!mqttHook.isConnected(
    'mqtt-client-2' // // clientID
)) {
    mqttHook.connect(
        `${mqttProtocol}://${mqttHost}:${mqttPort}`,
        {
            clean: false,
            keepalive: 60,
            clientId: `mqtt_client_2_${Math.random().toString(16).substring(2, 10)}`,
            path: '/mqtt',
            connectTimeout: 4000,
        },
        'mqtt-client-2', // clientID
    )

    mqttHook.subscribe(
        ['test/root/1'],
        1,
        null,
        null,
        'mqtt-client-2' // // clientID
    )

    mqttHook.registerEvent(
        'test/root/1',
        (_topic: string, message: string) => {
            // callback
        },
        'string_key',
        'mqtt-client-2', // clientID
    )
}

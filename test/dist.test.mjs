import { useMQTT } from '../dist/mqtt-vue-hook.es.js'
import { expect } from 'chai'

describe('aggregate', () => {
    it('common.eq test', () => {
        const mqttHook = useMQTT()
        const result = mqttHook.test()
        expect(result).to.be.equal(true)
    })
})


//@ts-ignore
import { Producer, Consumer, logLevel } from 'onchain-pulsar'
import { BasicEnv } from '../../env';
import { sleep } from 'bun';
import { downloadDraw, transform } from '../app';

const producer = new Producer({
    topic: "persistent://719/dev/instance-released",
    discoveryServers: [BasicEnv.pulsarURL],
    jwt: process.env.JWT_TOKEN,
    producerAccessMode: Producer.ACCESS_MODES.SHARED,
    logLevel: logLevel.INFO
})

const consumer = new Consumer({
    topic: "persistent://719/dev/instance-released",
    subscription: "my-subscription",
    discoveryServers: [BasicEnv.pulsarURL],
    jwt: process.env.JWT_TOKEN,
    subType: Consumer.SUB_TYPES.EXCLUSIVE,
    consumerName: 'sw server',
    receiveQueueSize: 1000,
    logLevel: logLevel.INFO,
})

/**
 * 发送pulsar消息
 */
export const sendPulsarMessage = async () => {
    await producer.create();
    await producer.sendBatch({
        messages: [
            {
                properties: { pulsar: "flex" },
                payload: `{"type":"downloadDraw","insId":"1866460881178718210"}`
            },
        ]
    });
}


/**
 * 接收pulsar消息
 */
export const receivePulsarMessage = async () => {
    await consumer.subscribe();

    consumer.onStateChange(({ previousState, newState }: any) => {
        console.log(`当前消费者状态发生变化 ${previousState} to ${newState}.`);
    }
    )

    await consumer.run({
        onMessage: async ({ ack, message, properties, redeliveryCount }: any) => {
            const publishedInstances = JSON.parse(message.toString("UTF-8"))
            const token = publishedInstances.token
            const routing = publishedInstances.routing
            const tenantId = publishedInstances.tenantId
            if (publishedInstances.type === 'downloadDraw') {
                await downloadDraw({
                    token, tenantId,
                    insId: publishedInstances.reqData.insId,
                    userId: ''
                })
            } else if (publishedInstances.data.type === 'transformDraw') {
                console.log(publishedInstances)
                await transform({
                    insId: publishedInstances.data.resData.changeInsId,
                    tenantId: publishedInstances.tenantId,
                    userId: publishedInstances.data.userId
                })
            }
            // await ack(); // Default is individual ack

        }, autoAck: false, // specify true in order to use automaticAck
    });
}
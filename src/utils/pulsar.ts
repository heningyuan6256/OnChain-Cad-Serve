
//@ts-ignore
import { Producer, Consumer, logLevel } from 'onchain-pulsar'
import { BasicEnv } from '../../env';
import { sleep } from 'bun';

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
                payload: 'Ayeo'
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
            console.log(publishedInstances, 'publishedInstances');
            await new Promise(async (resolve) => {
                // setTimeout(() => {
                //     console.log(1);
                // }, 100000)
                await sleep(10000)
                resolve({})
                await ack()
            })

            // TODO
            // publishedInstances.

            // await ack(); // Default is individual ack

        }, autoAck: false, // specify true in order to use automaticAck
    });
}
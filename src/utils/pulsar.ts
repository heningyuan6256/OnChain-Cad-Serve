
//@ts-ignore
import { Producer, Consumer, logLevel } from 'onchain-pulsar'
import { BasicEnv } from '../../env';

const producer = new Producer({
    topic: "persistent://public/default/my-topic",
    discoveryServers: [BasicEnv.pulsarURL],
    jwt: process.env.JWT_TOKEN,
    producerAccessMode: Producer.ACCESS_MODES.SHARED,
    logLevel: logLevel.INFO
})

const consumer = new Consumer({
    topic: "persistent://public/default/my-topic",
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
            {
                properties: { pulsar: "flex" },
                payload: 'Ayeo1'
            }
        ]
    });
}


/**
 * 接收pulsar消息
 */
export const receivePulsarMessage = async () => {
    await consumer.subscribe();

    consumer.onStateChange(({ previousState, newState }: any) => {
        console.log(`Consumer state has changed from ${previousState} to ${newState}.`);
    }
    )

    await consumer.run({
        onMessage: async ({ ack, message, properties, redeliveryCount }: any) => {
            await ack(); // Default is individual ack
            // await ack({type: Consumer.ACK_TYPES.CUMULATIVE});
            console.log({
                message,
                properties,
                redeliveryCount,
            })
        }, autoAck: false, // specify true in order to use automaticAck
    });
}
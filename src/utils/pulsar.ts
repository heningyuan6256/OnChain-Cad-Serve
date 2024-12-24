
//@ts-ignore
import { Producer, Consumer, logLevel } from 'onchain-pulsar'
import { BasicEnv } from '../../env';
import { sleep } from 'bun';
import { downloadDraw, transform, transformOstep, transformstep } from '../app';
import { readFile } from 'node:fs/promises';

const stringD = (await readFile(".env",{encoding:'utf-8'})).toString()
console.log(stringD,"stringD");

const list = stringD.split("\r\n")

const mapData: any = {}
list.forEach(item => {
    const [key, value] = item.split("=")
    mapData[key] = value
})
console.log(mapData,'mapData');


const producer = new Producer({
    topic: `persistent://${mapData.tenantId}/${mapData.enviroment}/instance-released`,
    discoveryServers: [mapData.pulsarURL],
    jwt: process.env.JWT_TOKEN,
    producerAccessMode: Producer.ACCESS_MODES.SHARED,
    logLevel: logLevel.INFO
})

const consumer = new Consumer({
    topic: `persistent://${mapData.tenantId}/${mapData.enviroment}/instance-released`,
    subscription: "my-subscription",
    discoveryServers: [mapData.pulsarURL],
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
            let publishedInstances;
            publishedInstances = JSON.parse(message.toString("UTF-8"))
            console.log(publishedInstances, 'publishedInstances')
            const token = publishedInstances.token
            const routing = publishedInstances.routing
            const tenantId = publishedInstances.tenantId
            if (publishedInstances.data.type === 'downloadDraw') {
                await downloadDraw({
                    tenantId: publishedInstances.tenantId,
                    insId: publishedInstances.data.reqData.insId,
                    userId: publishedInstances.data.reqData.userId,
                    address: mapData.baseUrl
                });
            } else if (publishedInstances.data.reqData.type === 'transformDraw') {
                await transform({
                    insId: publishedInstances.data.resData.changeInsId,
                    tenantId: publishedInstances.tenantId,
                    userId: publishedInstances.data.userId,
                    address: mapData.baseUrl
                })
            } else if (publishedInstances.data.reqData.type == 'transformOStep') {
                await transformOstep({
                    tenantId: tenantId,
                    insId: publishedInstances.reqData.insId,
                    userId: publishedInstances.data.userId,
                    address: mapData.baseUrl
                });
            } else if (publishedInstances.data.reqData.type == 'transformStep') {
                await transformstep({
                    tenantId: tenantId,
                    insId: publishedInstances.reqData.insId,
                    address: mapData.baseUrl,
                    userId: publishedInstances.data.userId,
                });
            }
            await ack(); // Defa
            // ult is individual ack

        }, autoAck: false, // specify true in order to use automaticAck
    });
}
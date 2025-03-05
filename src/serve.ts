import { downloadDraw, transform, transformOstep, transformstep } from "./app";
import { SingleQueue } from "./queue";
import "./mod";
//@ts-ignore
import { Consumer, logLevel } from "onchain-pulsar";
import { readFileSync } from "fs";
import { BasicEnv } from "../env";
import { receivePulsarMessage, sendPulsarMessage } from "./utils/pulsar";
import { sleep } from "bun";

const startApp = async() => {
    // sendPulsarMessage()
    await sleep(3000)
    receivePulsarMessage().catch(() => {
        startApp()
    })
    Bun.spawn(["./ListenWindowTimer.exe"]);
}


startApp()


/**
 * TODO
 * http://192.168.0.62:8017/front/product/1866744968481206273/product-data/instance/1869577821047754754/Attachments
 * 物料编号为P000490
 */
// downloadDraw({
//   tenantId: "719",
//   insId: "1869262204377784322",
//   userId: "1866744632978829313",
// });


// await transform({
//     insId: '1897083922048716802',
//     tenantId: '719',
//     userId: '1866744624179179522'
// })
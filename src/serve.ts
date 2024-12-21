import { downloadDraw, transform, transformOstep, transformstep } from "./app";
import { SingleQueue } from "./queue";
import "./mod";
//@ts-ignore
import { Consumer, logLevel } from "onchain-pulsar";
import { readFileSync } from "fs";
import { BasicEnv } from "../env";
import { receivePulsarMessage, sendPulsarMessage } from "./utils/pulsar";

// sendPulsarMessage()
// receivePulsarMessage().catch(console.error);

/**
 * TODO
 * http://192.168.0.62:8017/front/product/1866744968481206273/product-data/instance/1869577821047754754/Attachments
 * 物料编号为P000490
 */
downloadDraw({
  tenantId: "719",
  insId: "1869577821047754754",
  userId: "1866744632978829313",
});

import { downloadDraw, transform, transformOstep, transformstep } from "./app";
import { SingleQueue } from "./queue";
import './mod';
//@ts-ignore
import { Consumer, logLevel } from 'onchain-pulsar'
import { readFileSync } from 'fs'
import { BasicEnv } from "../env";
import { receivePulsarMessage, sendPulsarMessage } from "./utils/pulsar";

// sendPulsarMessage()
receivePulsarMessage().catch(console.error)

// downloadDraw({
//     token: '', tenantId: '719',
//     insId: "1866460881178718210",
//     userId: '1866278394168709121'
// })

// Bun.serve({
//   port: 3000,
//   async fetch(request, server) {
//     const token = request.headers.get("Authorization") ?? undefined;
//     const url = new URL(request.url);
//     if (url.pathname === "/api/transform" && request.method == "POST") {
//       if (globalThis.lock) {
//         return new Response("当前转换服务正在被占用！");
//       }
//       const data = (await request.json()) as TransformArgument;
//       try {
//         transformQueue.push(transform.bind(null, ({ ...data, token })));
//         return new Response("Home page!");
//       } catch (error) {
//         console.log(error)
//         return new Response("文件读取失败", { status: 500 });
//       }

//     }
//     if (url.pathname === "/api/downloadDraw") {
//       if (globalThis.lock) {
//         return new Response("当前转换服务正在被占用！");
//       }
//       const data = (await request.json()) as TransformArgument;
//       await downloadDraw({ ...data, token })
//     }
//     if(url.pathname == "/api/download") {
//       const zipFilePath = './transform.zip';
//       try {
//         const fileStream = readFileSync(zipFilePath, {});
//         // await rm(zipFilePath, { force: true })
//         return new Response(fileStream, {
//           headers: {
//             'Content-Type': 'application/zip',
//             'Content-Disposition': 'attachment; filename="export.zip"',
//           },
//         });
//       } catch (error) {
//         console.log(error, 'error')
//         return new Response("文件读取失败", { status: 500 });
//       }
//     }

//     if (url.pathname === "/api/transformOstep") {
//       if (globalThis.lock) {
//         return new Response("当前转换服务正在被占用！");
//       }
//       const data = (await request.json()) as TransformArgument;
//       try {
//         const fileStream = await transformOstep({ ...data, token })
//         return new Response(fileStream, {
//           headers: {
//             'Content-Type': 'application/zip',
//             'Content-Disposition': 'attachment; filename="export.zip"',
//           },
//         });
//       } catch (error) {
//         return new Response("文件读取失败", { status: 500 });
//       }
//     }
//     if (url.pathname === "/api/transformstep") {
//       if (globalThis.lock) {
//         return new Response("当前转换服务正在被占用！");
//       }
//       const data = (await request.json()) as TransformArgument;
//       try {
//         const fileStream = await transformstep({ ...data, token })
//         return new Response(fileStream, {
//           headers: {
//             'Content-Type': 'application/zip',
//             'Content-Disposition': 'attachment; filename="export.zip"',
//           },
//         });
//       } catch (error) {
//         return new Response("文件读取失败", { status: 500 });
//       }
//     }
//     return new Response("404!");
//   },
// });



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
  token:
    "Bearer eyJhbGciOiJIUzI1NiIsImtpZCI6InNpbTIifQ.eyJhdWQiOiJodHRwOi8vd3d3Lm9uY2hhaW5wbG0uY29tIiwiZXhwIjoxNzM0NTE0NzUzLCJpc3MiOiJodHRwczovL29uY2hhaW4tZ3cuaW8iLCJqdGkiOiIxMDQiLCJuYW1lIjoi5b6Q6IOcIiwib3JnY29kZSI6IjcxOSIsInN1YiI6IjE4NjY3NDQ2MzI5Nzg4MjkzMTMiLCJ1c2VyaWQiOiIxODY2NzQ0NjMyOTc4ODI5MzEzIiwidXNlcm5hbWUiOiI1NDI1MjQ4MzBAcXEuY29tIn0.RfD5nwYvbm5O9LhP0-e_yphO6VPpOA9LANSqk6y1Cck",
  tenantId: "719",
  insId: "1869577821047754754",
  userId: "1866744632978829313",
});

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
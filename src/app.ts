import Sdk from "./sdk";
import Downloader from "./downloader";
import Convertor from "./convertor";
import Uploader from "./uploader";
import { compressFolder } from "./utils/compress";
import { exists, rm } from "node:fs/promises";

export async function transform(params: TransformArgument) {
  try {
    globalThis.lock = true;
    console.log(params, "params");
    params.insId = params.resData.id;
    params.tenantId = params.resData.tenantId;
    params.userId = params.resData.createBy;
    const sdk = new Sdk(params);
    const data = await sdk.getAffectFiles(params.insId);
    const downloader = new Downloader(data, sdk.common);
    console.log("下载");
    await downloader.run();
    const filesystem = await downloader.filesystem;
    const convertor = new Convertor(filesystem);
    console.log("转换");
    await convertor.run();
    const uploader = new Uploader(filesystem, sdk.common);
    console.log("上传");
    await uploader.run();
    console.log("更新");
    await sdk.updateFile(filesystem);
    await downloader.remove();
    globalThis.lock = false;
  } catch (error) {
    globalThis.lock = false;
  }
}

export async function downloadDraw(params: TransformArgument) {
  try {
    globalThis.lock = true;
    const sdk = new Sdk(params);
    console.log(params, "params");
    if (await exists("./transform.zip")) {
      await rm("./transform.zip", { force: true });
    }
    const data = await sdk.getStructureTab(params.insId);
    const downloader = new Downloader(data, sdk.common);
    await downloader.runDownloadDraw();
    const filesystem = await downloader.filesystem;
    const convertor = new Convertor(filesystem);
    await convertor.updateName();
    await compressFolder("./transform");
    await downloader.remove();
    globalThis.lock = false;
  } catch (error) {
    globalThis.lock = false;
  }
}

export async function transformOstep(params: TransformArgument) {
  let fileData;
  try {
    globalThis.lock = true;
    const sdk = new Sdk(params);
    const data = await sdk.getStructureTab(params.insId);
    const downloader = new Downloader(data, sdk.common);
    await downloader.runTransformOstep();
    const filesystem = await downloader.filesystem;
    const convertor = new Convertor(filesystem);
    fileData = await convertor.transformOStep();
    await downloader.remove();
    globalThis.lock = false;
  } catch (error) {
    globalThis.lock = false;
  }
  return fileData;
}

export async function transformstep(params: TransformArgument) {
  let fileData;
  try {
    globalThis.lock = true;
    const sdk = new Sdk(params);
    const data = await sdk.getStructureTab(params.insId);
    const downloader = new Downloader(data, sdk.common);
    await downloader.runTransformOstep();
    const filesystem = await downloader.filesystem;
    const convertor = new Convertor(filesystem);
    fileData = await convertor.transformStep();
    await downloader.remove();
    globalThis.lock = false;
  } catch (error) {
    globalThis.lock = false;
  }
  return fileData;
}

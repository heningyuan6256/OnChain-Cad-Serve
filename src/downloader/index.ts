import { CommonUtils, FileManage } from "onchain-sdk";
import { Attachment, FileSelf } from "../sdk/types";
import { Filesystem } from "../filesystem";
import { readdir, rm } from "node:fs/promises";
import { join } from "path";
import { Action, Log } from "../log";

class BasicsDownloader {
  data: FileSelf[];
  common: CommonUtils;
  filesystem: Promise<Filesystem<FileSelf>[]>;
  instanceIdent: string;
  constructor(data: FileSelf[], common: CommonUtils, instanceIdent: string) {
    this.data = data;
    this.common = common;
    this.filesystem = Filesystem.generate(common, data);
    this.instanceIdent = instanceIdent;
  }

  private getLogParams(fsy: Filesystem<FileSelf | Attachment>, action?: Action) {
    return { action: action || Action.download, number: fsy.data.basicReadInstanceInfo.number }
  }

  async run() {
    const filesystem = await this.filesystem;
    for (const fsy of filesystem) {
      const res = await fsy.manage.download();
      await Bun.write(fsy.saveAddress, res);
      for (const attFsy of fsy.attachments || []) {
        const res = await attFsy.manage.download();
        await Bun.write(attFsy.saveAddress, res);
      }
    }
  }

  async runDownloadDraw() {
    const filesystem = await this.filesystem;
    for (const fsy of filesystem) {
      try {
        console.log('下载设计文件：', fsy.filename);
        //下载设计文件的文件
        const res = await fsy.manage.download();
        await Bun.write(fsy.saveAddress, res);
      } catch (error) {
        console.log(`下载设计文件【${fsy.filename}】失败，跳过`);
        await Log.takeover(Promise.reject(`下载设计文件【${fsy.filename}】失败，跳过`), this.getLogParams(fsy)).catch(() => {});
        continue;
      }
      for (const attFsy of fsy.attachments || []) {
        try {
          console.log('下载附件文件：', attFsy.filename);
          //下载附件页签的文件
          //@ts-ignore
          console.log(attFsy.transferStatus,"attFsy.transferStatus");
          
          //@ts-ignore
          if(!attFsy.transferStatus && attFsy.transferStatus != '0') {
            const res = await attFsy.manage.download();
            // if (attFsy.filename.endsWith(".pdf") || attFsy.filename.endsWith(".PDF")) {
            //   await Bun.write(attFsy.saveAddressWithDateAndVersion(fsy.data.basicReadInstanceInfo.insVersionUnbound, fsy.data.basicReadInstanceInfo.publishTime ? fsy.data.basicReadInstanceInfo.publishTime.split(" ")[0].replace(/-/g, "") : ''), res);
            // } else {
            await Bun.write(attFsy.saveAddress, res)
            // }
          }
        } catch (error) {
          console.log(`下载附件文件【${attFsy.filename}】失败，跳过`);
          await Log.takeover(Promise.reject(`下载附件文件【${attFsy.filename}】失败，跳过`), this.getLogParams(fsy)).catch(() => {});
          continue;
        }
      }
    }
  }

  async runTransformOstep() {
    const filesystem = await this.filesystem;
    for (const fsy of filesystem) {
      const res = await fsy.manage.download();
      await Bun.write(fsy.saveAddress, res);
    }
  }

  async remove() {
    try {
      const dirPath = "./transform"
      const files = await readdir("./transform")
      const deletionPromises = files.map(file => rm(join(dirPath, file), { recursive: true, force: true }))
      await Promise.all(deletionPromises)
    } catch (error) {
      console.log(error);
      await Log.takeover(Promise.reject(error),{ action: Action.deleteDir }).catch(() => {});
    }
    // await unlink(Filesystem.downloadAddress);
  }
}


export default class Downloader extends BasicsDownloader {
  
  run() {
    return Log.takeover(super.run(), { action: Action.download, number: this.instanceIdent, userId: this.common.userId })
  }

  runTransformOstep() {
    return Log.takeover(super.runTransformOstep(), { action: Action.download, number: this.instanceIdent, userId: this.common.userId })
  }
}

import { Filesystem } from "../filesystem";
import { Attachment, FileSelf } from "../sdk/types";
import { readFileSync, renameSync } from 'fs'
import { dirname, extname, join } from 'path';
import { rm } from "node:fs/promises";
export default class Convertor {
  filesystem: Filesystem<FileSelf>[];
  constructor(filesystem: Filesystem<FileSelf>[]) {
    this.filesystem = filesystem;
  }
  async run() {
    for (const fsy of this.filesystem) {
      const fsyPath = this.getFileAddress(fsy);
      const proc = Bun.spawn([
        "./OnChainSW_Extension.exe",
        "-updateattr",
        fsyPath,
        ...fsy.data.approvalNodeInfo,
        `版本=${fsy.data.basicReadInstanceInfo.insVersionUnbound === 'Draft' ? '草稿' : fsy.data.basicReadInstanceInfo.insVersionUnbound.split(" ")[0]}`
      ]);
      const editCode = await proc.exited;
      if (editCode == 0) {
        fsy.dimension = "modify";
      }
      await this.convertAttachments(fsy.attachments || []);
    }
  }

  async convertAttachments(attachments: Filesystem<Attachment>[]) {
    for (const att of attachments) {
      if (att.filename.endsWith(".slddrw") || att.filename.endsWith(".SLDDRW")) {
        const attPath = this.getFileAddress(att);
        const proc = Bun.spawn(["./OnChainSW_Extension.exe", "-pdf", attPath]);
        const editCode = await proc.exited;
        // const result = await new Response(proc.stdout).text();
        // console.log({ editCode, result, attPath }, "attachments");
        if (editCode == 0) {
          att.dimension = "modify";
        }
      } else if (att.filename.endsWith(".pdf") || att.filename.endsWith(".PDF")) {
        att.dimension = "modify";
      }
    }
  }


  async updateName() {
    const updateNameList = []
    for (const fsy of this.filesystem) {
      const updateName = `${fsy.filename.split(".")[0]}-${fsy.data.basicReadInstanceInfo.insVersionUnbound === 'Draft' ? "草稿" : fsy.data.basicReadInstanceInfo.insVersionUnbound.split(" ")[0]}${fsy.data.basicReadInstanceInfo.publishTime ? "-" + fsy.data.basicReadInstanceInfo.publishTime.split(" ")[0].replace(/-/g, "") : ''}`
      // console.log('updateName=', updateName);
      updateNameList.push(`${fsy.filename.split(".")[0]}=${updateName}`)
      //TODO 上一行在我这执行会报错，先暂时去掉报错的字符串
      // updateNameList.push(`${updateName}`)
    }
    const fsy = this.filesystem[0]
    const fsyPath = this.getFileAddress(fsy);
    console.log('fsyPath=', fsyPath);
    console.log('updateNameList=', updateNameList);
    const execute = [
      "./OnChainSW_Extension.exe",
      "-rename",
      fsyPath,
      ...[...new Set(updateNameList)]
    ]
    console.log(execute, 'execute');
    const proc = Bun.spawn(execute);
    await proc.exited;
    

    for (const fsy of this.filesystem) {
      await rm(fsy.saveAddress, { force: true })
      const updateName = `${fsy.filename.split(".")[0]}-${fsy.data.basicReadInstanceInfo.insVersionUnbound === 'Draft' ? "草稿" : fsy.data.basicReadInstanceInfo.insVersionUnbound.split(" ")[0]}${fsy.data.basicReadInstanceInfo.publishTime ? "-" + fsy.data.basicReadInstanceInfo.publishTime.split(" ")[0].replace(/-/g, "") : ''}`
      for (const attFsy of fsy.attachments || []) {
        if (attFsy.filename.endsWith(".pdf") || attFsy.filename.endsWith(".PDF")) {
          // 获取原文件的路径、名称和扩展名
          const oldPath = attFsy.saveAddress;
          const dir = dirname(oldPath); // 文件目录
          const extension = extname(oldPath); // 文件扩展名
          const newPath = join(dir, `${updateName}${extension}`);
          // 重命名文件
          await renameSync(oldPath, newPath);
        } else if (attFsy.filename.endsWith(".slddrw") || attFsy.filename.endsWith(".SLDDRW")) {
          await rm(attFsy.saveAddress, { force: true })
        }
      }
    }
  }

  async transformOStep() {
    const fsy = this.filesystem[0]
    const fsyPath = this.getFileAddress(fsy);
    const execute = [
      "./OnChainSW_Extension.exe",
      "-ostep",
      fsyPath,
    ]
    console.log(execute, 'execute');
    const proc = Bun.spawn(execute);
    await proc.exited;
    return fsyPath.substring(0, fsyPath.lastIndexOf(".")) + '.STEP'
  }

  async transformStep() {
    const fsy = this.filesystem[0]
    const fsyPath = this.getFileAddress(fsy);
    const execute = [
      "./OnChainSW_Extension.exe",
      "-step",
      fsyPath,
    ]
    const proc = Bun.spawn(execute);
    await proc.exited;
    return fsyPath.substring(0, fsyPath.lastIndexOf(".")) + '.STEP'
  }

  private getFileAddress(fsy: Filesystem<any>) {
    return `${process.cwd()}${fsy.localAddress.replace("./", "\\")}\\${fsy.filename
      }`.replace(/[\r\n]*/g, "");
  }
}


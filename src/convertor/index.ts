import { Filesystem } from "../filesystem";
import { Attachment, FileSelf } from "../sdk/types";
import { readFileSync, renameSync } from 'fs'
import { dirname, extname, join } from 'path';
import { rm } from "node:fs/promises";
import { Action, Log } from "../log";
class BasicsConvertor {
  filesystem: Filesystem<FileSelf>[];
  instanceIdent: string;
  constructor(filesystem: Filesystem<FileSelf>[], instanceIdent: string) {
    this.filesystem = filesystem;
    this.instanceIdent = instanceIdent;
  }
  async run() {
    for (const fsy of this.filesystem) {
      if(fsy.data.approvalNodeInfo && fsy.data.approvalNodeInfo.length) {
        const fsyPath = this.getFileAddress(fsy);
        const cmd = [
          "./OnChainSW_Extension.exe",
          "-updateattr",
          fsyPath,
          ...fsy.data.approvalNodeInfo,
          // `版本=${fsy.data.basicReadInstanceInfo.insVersionUnbound === 'Draft' ? '草稿' : fsy.data.basicReadInstanceInfo.insVersionUnbound.split(" ")[0]}`
        ]
        const proc = Bun.spawn(cmd);
        const editCode = await proc.exited;
        if (editCode == 0) {
          // fsy.dimension = "modify";
        } else {
          await Log.takeover(Promise.reject(JSON.stringify(cmd)), { action: Action.swExtensionUpdateAttr, number: fsy.data.number })
        }
      }
      // await this.convertAttachments(fsy.attachments || []);
    }
  }

  async convertAttachments(attachments: Filesystem<Attachment>[]) {
    for (const att of attachments) {
      if (att.filename.endsWith(".slddrw") || att.filename.endsWith(".SLDDRW")) {
        const attPath = this.getFileAddress(att);
        const cmd = ["./OnChainSW_Extension.exe", "-pdf", attPath];
        const proc = Bun.spawn(cmd);
        const editCode = await proc.exited;
        // const result = await new Response(proc.stdout).text();
        // console.log({ editCode, result, attPath }, "attachments");
        if (editCode == 0) {
          att.dimension = "modify";
        } else {
          await Log.takeover(Promise.reject(JSON.stringify(cmd)), { action: Action.swExtensionPdf, number: att.data.number })
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
    const editCode = await proc.exited;
    if (editCode == 0) {
      // fsy.dimension = "modify";
    } else {
      await Log.takeover(Promise.reject(JSON.stringify(execute)), { action: Action.swExtensionRename, number: fsy.data.number })
    }
    console.log("设计文件重命名完成")
    for (const fsy of this.filesystem) {
      await rm(fsy.saveAddress, { force: true })
      const updateName = `${fsy.filename.split(".")[0]}-${fsy.data.basicReadInstanceInfo.insVersionUnbound === 'Draft' ? "草稿" : fsy.data.basicReadInstanceInfo.insVersionUnbound.split(" ")[0]}${fsy.data.basicReadInstanceInfo.publishTime ? "-" + fsy.data.basicReadInstanceInfo.publishTime.split(" ")[0].replace(/-/g, "") : ''}`
      for (const attFsy of fsy.attachments || []) {
       if (attFsy.filename.endsWith(".slddrw") || attFsy.filename.endsWith(".SLDDRW")) {
          await rm(attFsy.saveAddress, { force: true }).catch(err => console.log(err, "附件重命名错误"))
        }
      }
    }
    console.log("附件重命名完成")
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
    const editCode = await proc.exited;
    if (editCode == 0) {
      // fsy.dimension = "modify";
    } else {
      await Log.takeover(Promise.reject(JSON.stringify(execute)), { action: Action.swExtensionOstep, number: fsy.data.number })
    }
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
    console.log(execute,'executeexecute');
    
    const proc = Bun.spawn(execute);
    const editCode = await proc.exited;
    if (editCode == 0) {
      // fsy.dimension = "modify";
    } else {
      await Log.takeover(Promise.reject(JSON.stringify(execute)), { action: Action.swExtensionStep, number: fsy.data.number })
    }
    return fsyPath.substring(0, fsyPath.lastIndexOf(".")) + '.STEP'
  }

  private getFileAddress(fsy: Filesystem<any>) {
    return `${process.cwd()}${fsy.localAddress.replace("./", "\\")}\\${fsy.filename
      }`.replace(/[\r\n]*/g, "");
  }
}

export default class Convertor extends BasicsConvertor {
  run() {
    return Log.takeover(super.run(), { action: Action.convert, number: this.instanceIdent })
  }

  convertAttachments(attachments: Filesystem<Attachment>[]) {
    return Log.takeover(super.convertAttachments(attachments), { action: Action.convert, number: this.instanceIdent })
  }

  updateName() {
    return Log.takeover(super.updateName(), { action: Action.convert, number: this.instanceIdent })
  }

  transformOStep() {
    return Log.takeover(super.transformOStep(), { action: Action.convert, number: this.instanceIdent })
  }

  transformStep() {
    return Log.takeover(super.transformStep(), { action: Action.convert, number: this.instanceIdent })
  }
}


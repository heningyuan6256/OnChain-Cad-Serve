import { CommonUtils, FileManage } from "onchain-sdk";
import { Attachment, FileSelf } from "../sdk/types";
import { isAttachment, isFileSelf } from "../sdk/utils";
import { mkdir, readFile } from "node:fs/promises";
import { FileUploadInfo } from "../uploader/type";
import { Action, Log } from "../log";

export class Filesystem<T extends FileSelf | Attachment> {
  static downloadAddress = "./transform";
  type = "application/octet-stream";
  dimension: "original" | "modify" | "new" = "original";
  data: T;
  filename: string;
  manage: FileManage;
  parent?: Filesystem<FileSelf>;
  localAddress: string;
  attachments?: Filesystem<Attachment>[];
  drawingRowId?: string;
  saveAddressCustom?: string;
  constructor(common: CommonUtils, data: T, parent?: Filesystem<FileSelf>) {
    this.data = data;
    this.parent = parent;
    if (parent) {
      this.localAddress = `${parent.localAddress}`;
    } else {
      this.localAddress = Filesystem.downloadAddress;
    }

    this.manage = new FileManage(common, {
      fileUrl: this.formatUrl(data.fileUrl!),
      localAddress: this.localAddress,
    });
    if (this.isFileSelf()) {
      // this.filename = this.data.basicReadInstanceInfo.insDesc;
      this.filename = (this.data as Attachment).fileName;
      this.attachments = this.data.attachments.map((att) => {
        return new Filesystem(common, att, this);
      });
    } else {
      this.filename = (this.data as Attachment).fileName;
    }
  }

  /** 读取文件 */
  async readFile(drawingId?: string) {
    console.log("进入了readFile");
    const data = {
      file: await Filesystem.toFile(this),
      filesystem: this as Filesystem<FileSelf>,
      attachments: [] as {
        file: FileUploadInfo;
        filesystem: Filesystem<Attachment>;
      }[],
    };
    if (drawingId) {
      //如果是上传图纸zip的操作，则不处理后续附件页签信息
      console.log('读取文件，这是图纸操作，不读取后续附件页签数据，drawingId：', drawingId);
      return data;
    }
    console.log('readFile:this.attachments.length==', this.attachments?.length);
    for (const att of this.attachments || []) {
      const attFile = await Filesystem.toFile(att);
      console.log('readFile:attFile==', this.attachments?.indexOf(att), attFile);
      data.attachments.push({
        file: attFile,
        filesystem: att,
      });
    }
    return data;
  }

  private toBlob(buffer: Uint8Array) {
    const blob = new Blob([buffer], { type: this.type });
    return blob as Blob;
  }

  get saveAddress() {
    return `${this.localAddress}/${this.filename}`;
  }

  saveAddressWithDateAndVersion(instanceVersion: string, publishTime: string) {
    const insVersion =
      instanceVersion === "Draft" ? "草稿" : instanceVersion.split(" ")[0];
    return `${this.localAddress}/${this.filename.split(".")[0]}-${insVersion}${publishTime ? `-${publishTime}` : ""
      }.${this.filename.split(".")[1]}`;
  }

  private formatUrl(url: string) {
    return url.replace("/plm", "");
  }

  /** 转为文件信息 */
  static async toFile(
    fsy: Filesystem<FileSelf | Attachment>
  ): Promise<FileUploadInfo> {
    console.log("toFile111", fsy.saveAddressCustom || fsy.saveAddress);
    const fileBuffer = await readFile(fsy.saveAddressCustom || fsy.saveAddress);
    console.log("toFile222");
    return {
      source: "file input",
      name: fsy.filename,
      type: fsy.type,
      data: fsy.toBlob(new Uint8Array(fileBuffer)),
      meta: {
        relativePath: "",
      },
    };
  }

  isAttachment(): this is Filesystem<Attachment> {
    return isAttachment(this.data);
  }

  isFileSelf(): this is Filesystem<FileSelf> {
    return isFileSelf(this.data);
  }

  static async generate(common: CommonUtils, data: FileSelf[]) {
    const files: Filesystem<FileSelf>[] = [];
    for (const item of data) {
      if (!item.fileUrl) {
        continue;
      }
      const file = new Filesystem(common, item);
      files.push(file);
      await Log.takeover(mkdir(file.localAddress, { recursive: true }), { action: Action.mkdir });
      if (file.attachments?.length) {
        for (const att of file.attachments) {
          await Log.takeover(mkdir(att.localAddress, { recursive: true }), { action: Action.mkdir });
        }
      }
    }
    return files;
  }
}

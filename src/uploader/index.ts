import { CommonUtils } from "onchain-sdk";
import { Attachment, FileSelf } from "../sdk/types";
import { Filesystem } from "../filesystem";
import { FileUploadInfo } from "./type";
import { Action, Log } from "../log";

export default class Uploader {
  filesystem: Filesystem<FileSelf>[];
  common: CommonUtils;
  instanceIdent: string
  constructor(filesystem: Filesystem<FileSelf>[], common: CommonUtils, instanceIdent: string) {
    this.filesystem = filesystem;
    this.common = common;
    this.instanceIdent = instanceIdent;
  }
  /**
   * 执行上传
   * @param drawingId 图纸ID，如果有值则代表处理仅上传图纸的操作。
   */
  async run(drawingId?: string) {
    for (const fsy of this.filesystem) {
      await this.upload(fsy, drawingId);
    }
  }

  private async upload(fsy: Filesystem<FileSelf>, drawingId?: string) {
    console.log('upload:1----');
    const { file, attachments, filesystem } = await fsy.readFile(drawingId);
    console.log('upload:file----', file, attachments.length);

    if (drawingId) {
      //上传图纸的操作，这里只用上传根的FS信息，因为前面把zip信息覆写到根的FS了
      console.log('进入了上传图纸操作，drawingId=', drawingId);
      //如果是图纸类型的上传，直接用根的FS上传
      const drawingUploadRes = await this.basicsUpload(filesystem, file);
      console.log('drawingUploadRes===', drawingUploadRes);
      return;
    }
    console.log('upload:attachments----', attachments);
    const uploadRes = await this.basicsUpload(filesystem, file);
    console.log('uploadRes1=', uploadRes);
    for (const att of attachments) {
      const uploadRes2 = await this.basicsUpload(att.filesystem, att.file);
      console.log('uploadRes2=', uploadRes2);
    }
  }

  private async basicsUpload(
    filesystem: Filesystem<FileSelf | Attachment>,
    file: FileUploadInfo
  ) {
    if (filesystem.dimension == "modify" || filesystem.dimension == "new") {
      const result = await Log.takeover(filesystem.manage.upload({ file, fileLimitSize: 1000 * 1024 * 1024 }), { action: Action.upload, number: this.instanceIdent });
      const success = result.successful[0];
      if (success) {
        const uploadURL = success.uploadURL.split("/plm")[1];
        const suffix = `?name=${success.name}&size=${success.size}&extension=${success.extension}`;
        filesystem.data.uploadURL = `/plm${uploadURL}${filesystem.isAttachment() ? "" : suffix
          }`;
      } else {
        filesystem.data.uploadURL = "";
      }
      return filesystem.data.uploadURL;
    }
  }
}

import { CommonUtils } from "onchain-sdk";
import { Attachment, FileSelf } from "../sdk/types";
import { Filesystem } from "../filesystem";
import { FileUploadInfo } from "./type";

export default class Uploader {
  filesystem: Filesystem<FileSelf>[];
  common: CommonUtils;

  constructor(filesystem: Filesystem<FileSelf>[], common: CommonUtils) {
    this.filesystem = filesystem;
    this.common = common;
  }
  async run() {
    for (const fsy of this.filesystem) {
      await this.upload(fsy);
    }
  }

  private async upload(fsy: Filesystem<FileSelf>) {
    const { file, attachments, filesystem } = await fsy.readFile();
    await this.basicsUpload(filesystem, file);
    for (const att of attachments) {
      await this.basicsUpload(att.filesystem, att.file);
    }
  }

  private async basicsUpload(
    filesystem: Filesystem<FileSelf | Attachment>,
    file: FileUploadInfo
  ) {
    if (filesystem.dimension == "modify" || filesystem.dimension == "new") {
      const result = await filesystem.manage.upload({ file, fileLimitSize: 1000 * 1024 * 1024 });
      const success = result.successful[0];
      if (success) {
        const uploadURL = success.uploadURL.split("/plm")[1];
        const suffix = `?name=${success.name}&size=${success.size}&extension=${success.extension}`;
        filesystem.data.uploadURL = `/plm${uploadURL}${
          filesystem.isAttachment() ? "" : suffix
        }`;
      } else {
        filesystem.data.uploadURL = "";
      }
      return filesystem.data.uploadURL;
    }
  }
}

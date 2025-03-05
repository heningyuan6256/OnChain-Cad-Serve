import { IBaseInstance, IRowInstance } from "onchain-sdk";

interface FileInfo {
  fileUrl: string;
  fileId: string;
  fileName: string;
  approvalNodeInfo: string[];
  uploadURL?: string;
}

export interface FileSelf extends IBaseInstance, FileInfo {
  attachments: Attachment[];
}

export interface Attachment extends IRowInstance, FileInfo {
  /** 是否需要设计工具转换 */
  isTransform: boolean;
  /** 是否可下载附件 */
  attachCanDownload?: "0" | string;
  transferStatus?: any
}
import { Filesystem } from "../filesystem";
import { Attachment, FileSelf } from "../sdk/types";

export interface FileUploadInfo {
  source: string;
  name: string;
  type: string;
  data: Blob;
  meta: {
      relativePath: string;
  };
}
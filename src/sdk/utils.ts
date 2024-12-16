import { Attachment, FileSelf } from "./types";

export function isAttachment(ins: any): ins is Attachment {
  return !ins.basicReadInstanceInfo;
}

export function isFileSelf(ins: any): ins is FileSelf {
  return !!ins.basicReadInstanceInfo;
}
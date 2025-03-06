import AdmZip from "adm-zip";
import { Action, Log } from "../log";

export async function basicsCompressFolder(outputFilePath: string) {
  const zip = new AdmZip();
  console.log(`压缩开始`);
  zip.addLocalFolder("./transform")
  zip.writeZip("./transform.zip");
  console.log(`压缩完成：${outputFilePath}`);
}

export async function compressFolder(outputFilePath: string, ident?: string) {
  return Log.takeover(basicsCompressFolder(outputFilePath), { action: Action.compress, number: ident });
}

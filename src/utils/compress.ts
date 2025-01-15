import AdmZip from "adm-zip";

export async function compressFolder(outputFilePath: string) {
  const zip = new AdmZip();
  zip.addLocalFolder("./transform")
  zip.writeZip("./transform.zip");
  console.log(`压缩完成：${outputFilePath}`);
}

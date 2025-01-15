import Sdk from "./sdk";
import Downloader from "./downloader";
import Convertor from "./convertor";
import Uploader from "./uploader";
import { compressFolder } from "./utils/compress";
import { exists, rm, readFile } from "node:fs/promises";
import { Attachment } from "./sdk/types";
import { AttachmentTransferStatus } from "onchain-sdk";
import moment from "moment";

export async function transform(params: TransformArgument) {
  try {
    globalThis.lock = true;
    console.log(params, "params");
    params.insId = params.insId;
    params.tenantId = params.tenantId;
    params.userId = params.userId;
    const sdk = new Sdk(params);
    await sdk.getAffectFiles(params);
    // const downloader = new Downloader(data, sdk.common);
    // console.log("下载");
    // await downloader.run();
    // const filesystem = await downloader.filesystem;
    // const convertor = new Convertor(filesystem);
    // console.log("转换");
    // await convertor.run();
    // const uploader = new Uploader(filesystem, sdk.common);
    // console.log("上传");
    // await uploader.run();
    // console.log("更新");
    // await sdk.updateFile(filesystem);
    // await downloader.remove();
    globalThis.lock = false;
  } catch (error) {
    globalThis.lock = false;
  }
}

export async function downloadDraw(params: TransformArgument) {
  /**图纸附件的FileId */
  const nowTime = moment().format("YYYYMMDDHHmmss");

  const drawingId = `drawingId-${nowTime}`;
  try {
    globalThis.lock = true;
    const sdk = new Sdk(params);
    if (await exists("./transform.zip")) {
      await rm("./transform.zip", { force: true });
    }
    // TODO 塞一条正在转换的记录
    /** 获取结构数据，把根实例下所有附件信息写到外层，并处理isTransform */
    const data = await sdk.getStructureTab(params.insId);
    console.log("data==", data.length);
    /** 根实例 */
    const rootInstance = data[0];
    // console.log('BasicAttrs===', JSON.stringify(rootInstance));
    /** 根实例的附件页签 */
    const rootInsAttachTab = await rootInstance.getTabByApicode({
      apicode: "Attachments",
    });
    // console.log("rootInsAttachTab===", rootInsAttachTab);
    if (rootInsAttachTab) {
      /** 根实例的附件页签数据 */
      // const rootAttachDatas = (await rootInsAttachTab.getTabData()) as Attachment[];
      // /** 根实例是否图纸转换过：根实例的附件如果包含文件ID为drawingId，就是代表转换过 */
      // const hasTransform = rootAttachDatas.some((rootAttachData) => {
      //   const fileid = rootAttachData.getAttrValue({
      //     tab: rootInsAttachTab,
      //     attrApicode: "FileId",
      //   });
      //   return fileid == drawingId;
      // })
      // if (hasTransform) {
      //   console.log('此实例已存在图纸数据，结束处理');
      //   return;
      // }
      await rootInsAttachTab.insertTabDataAttachments({
        attachmentRows: [
          {
            name: `${rootInstance.basicReadInstanceInfo.insDesc}-${rootInstance.basicReadInstanceInfo.insVersionUnbound.split(" ")[0]}.zip`,
            size: 0,
            extension: "zip",
            id: drawingId,
            uploadURL: "drawingUrl",
          },
        ],
        isCheckin: false,
        transferStatus: AttachmentTransferStatus.TransferProcessing,
        onSuccess(msg) {
          console.log("上传成功==", msg);
        },
      });

      const downloader = new Downloader(data, sdk.common);
      console.log("开始下载");
      await downloader.runDownloadDraw();
      // console.log(downloader,'downloader');
      
      console.log("下载结束");
      const filesystem = await downloader.filesystem;
      //TODO 文件转换处理
      const convertor = new Convertor(filesystem);
      console.log("转换");
      // 执行写属性
      await convertor.run();
      // 修改名称
      await convertor.updateName();
      await compressFolder("./transform");

      if (filesystem.length == 0) {
        console.log("待处理的转换FS为空");
        return;
      }
      /** 根实例的FS */
      const rootFilesystem = filesystem[0];
      console.log("rootFilesystem.manage.localAddress---", rootFilesystem.manage.localAddress);
      // const rootInstanceId = rootInstance.basicReadInstanceInfo.insId;

      //把转换文件zip放到根去做上传
      rootFilesystem.saveAddressCustom = "./transform.zip";
      rootFilesystem.filename = "transform.zip";
      rootFilesystem.dimension = "modify";
      const uploader = new Uploader([rootFilesystem], sdk.common);
      console.log("上传");
      await uploader.run(drawingId);

      console.log("上传zip完成，uploadURL=", rootFilesystem.data.uploadURL);

      const rootAttachDatas = (await rootInsAttachTab.getTabData()) as Attachment[];
      /** 此次流程生成图纸的行数据 */
      const drawRowData = rootAttachDatas.find((item) => {
        const fileid = item.getAttrValue({
          tab: rootInsAttachTab,
          attrApicode: "FileId",
        });
        return fileid == drawingId;
      });

      if (drawRowData == null) {
        //如果没找到此次流程生成图纸的行数据，则中断后续处理
        console.log("没找到此次流程生成图纸的行数据，中断后续处理");
        return;
      }

      console.log("drawRowId===", drawRowData.rowId);

      console.log("更新");
      /**
       * TODO
       * 在这里迷了。上传后再查页签数据的数量是最新的，是包含刚上传的zip的，
       * 但这里rootFilesystem处理上传图纸的附件页签数据，还是旧的，会比最新的少一条刚上传的zip。
       * 这里拿到了此次流程生成的rowId   drawRowData.rowId
       * 再后面的修改就不知道怎么处理了
       */
      await sdk.updateFileAttachment([rootFilesystem], drawRowData.rowId);
      await downloader.remove();
    }
  } catch (error) { }
}

export async function transformOstep(params: TransformArgument) {
  /**图纸附件的FileId */
  const nowTime = moment().format("YYYYMMDDHHmmss");
  const drawingId = `drawingId-${nowTime}`;
  let fileData;
  try {
    const sdk = new Sdk(params);
    if (await exists("./transform.zip")) {
      await rm("./transform.zip", { force: true });
    }
    const data = await sdk.getStructureTab(params.insId);
    /** 根实例 */
    const rootInstance = data[0];
    if(!rootInstance.basicReadInstanceInfo.insBom) {
      return
    }
    const rootInsAttachTab = await rootInstance.getTabByApicode({
      apicode: "Attachments",
    });
    if (rootInsAttachTab) {
      await rootInsAttachTab.insertTabDataAttachments({
        attachmentRows: [
          {
            // name: `图纸`,
            name: `${rootInstance.basicReadInstanceInfo.insDesc}-客户参考-${rootInstance.basicReadInstanceInfo.insVersionUnbound.split(" ")[0]}.STEP`,
            size: 0,
            extension: "STEP",
            id: drawingId,
            uploadURL: "drawingUrl",
          },
        ],
        isCheckin: false,
        transferStatus: AttachmentTransferStatus.TransferProcessing,
        onSuccess(msg) {
          console.log("上传成功==", msg);
        },
      });
      const downloader = new Downloader(data, sdk.common);
      await downloader.runTransformOstep();
      const filesystem = await downloader.filesystem;
      const convertor = new Convertor(filesystem);
      let filePath = await convertor.transformOStep();
      if (filesystem.length == 0) {
        console.log("待处理的转换FS为空");
        return;
      }
      /** 根实例的FS */
      const rootFilesystem = filesystem[0];
      //F把转换文件zip放到根去做上传
      rootFilesystem.saveAddressCustom = filePath;
      rootFilesystem.filename = `${rootInstance.basicReadInstanceInfo.insDesc}-客户参考-${rootInstance.basicReadInstanceInfo.insVersionUnbound.split(" ")[0]}.STEP`;
      rootFilesystem.dimension = "modify";
      const uploader = new Uploader([rootFilesystem], sdk.common);
      console.log("上传");
      await uploader.run(drawingId);
      const rootAttachDatas = (await rootInsAttachTab.getTabData()) as Attachment[];
      rootAttachDatas.map((item) =>
        item.getAttrValue({
          tab: rootInsAttachTab,
          attrApicode: "FileId",
        })
      );
      const drawRowData = rootAttachDatas.find((item) => {
        const fileid = item.getAttrValue({
          tab: rootInsAttachTab,
          attrApicode: "FileId",
        });
        return fileid == drawingId;
      });
      if (drawRowData == null) {
        //如果没找到此次流程生成图纸的行数据，则中断后续处理
        console.log("没找到此次流程生成图纸的行数据，中断后续处理");
        return;
      }
      await sdk.updateFileAttachment([rootFilesystem], drawRowData.rowId);
      await downloader.remove();
    }
  } catch (error) {
  }
}

export async function transformstep(params: TransformArgument) {
  /**图纸附件的FileId */
  const nowTime = moment().format("YYYYMMDDHHmmssSSS");
  const drawingId = `drawingId-${nowTime}`;
  try {
    const sdk = new Sdk(params);
    if (await exists("./transform.zip")) {
      await rm("./transform.zip", { force: true });
    }
    const data = await sdk.getStructureTab(params.insId);
    /** 根实例 */
    const rootInstance = data[0];
    if(rootInstance.basicReadInstanceInfo.insBom) {
      return
    }
    const rootInsAttachTab = await rootInstance.getTabByApicode({
      apicode: "Attachments",
    });
    if (rootInsAttachTab) {
      await rootInsAttachTab.insertTabDataAttachments({
        attachmentRows: [
          {
            // name: `图纸`,
            name: `${rootInstance.basicReadInstanceInfo.insDesc}-${rootInstance.basicReadInstanceInfo.insVersionUnbound.split(" ")[0]}.STEP`,
            size: 0,
            extension: "STEP",
            id: drawingId,
            uploadURL: "drawingUrl",
          },
        ],
        isCheckin: false,
        transferStatus: AttachmentTransferStatus.TransferProcessing,
        onSuccess(msg) {
          console.log("上传成功==", msg);
        },
      });
      const downloader = new Downloader(data, sdk.common);
      await downloader.runTransformOstep();
      const filesystem = await downloader.filesystem;
      const convertor = new Convertor(filesystem);
      let filePath = await convertor.transformStep();
      if (filesystem.length == 0) {
        console.log("待处理的转换FS为空");
        return;
      }
      /** 根实例的FS */
      const rootFilesystem = filesystem[0];
      //F把转换文件zip放到根去做上传
      rootFilesystem.saveAddressCustom = filePath;
      rootFilesystem.filename = `${rootFilesystem.data.basicReadInstanceInfo.insDesc}-${rootFilesystem.data.basicReadInstanceInfo.insVersionUnbound.split(" ")[0]}.STEP`;
      rootFilesystem.dimension = "modify";
      const uploader = new Uploader([rootFilesystem], sdk.common);
      console.log("上传");
      await uploader.run(drawingId);
      const rootAttachDatas = (await rootInsAttachTab.getTabData()) as Attachment[];
      rootAttachDatas.map((item) =>
        item.getAttrValue({
          tab: rootInsAttachTab,
          attrApicode: "FileId",
        })
      );
      const drawRowData = rootAttachDatas.find((item) => {
        const fileid = item.getAttrValue({
          tab: rootInsAttachTab,
          attrApicode: "FileId",
        });
        return fileid == drawingId;
      });
      if (drawRowData == null) {
        //如果没找到此次流程生成图纸的行数据，则中断后续处理
        console.log("没找到此次流程生成图纸的行数据，中断后续处理");
        return;
      }
      await sdk.updateFileAttachment([rootFilesystem], drawRowData.rowId);
      await downloader.remove();
    }
  } catch (error) {
  }
}

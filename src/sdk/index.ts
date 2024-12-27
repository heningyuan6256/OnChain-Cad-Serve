// CO000212 test环境
import {
  CommonUtils,
  BasicsAuthority,
  utility,
  IBaseInstance,
  IRowInstance,
  ModifyFile,
  IChangeInstance,
  PrintUtils,
  placeFile,
  UppyUploader,
  AttachmentTransferStatus,
} from "onchain-sdk";
import { BasicsAttribute } from "onchain-sdk/lib/src/utils/attribute";
import { Attachment, FileInfo, FileSelf } from "./types";
import { Filesystem } from "../filesystem";
import { mkdir, writeFile } from "node:fs/promises";
import { readFile } from "node:fs/promises";
import Uploader from "../uploader";

export default class Sdk {
  common: CommonUtils;
  fileSuffix = [".SLDPRT", ".SLDASM"];
  attachmentSuffix = [".slddrw", ".SLDDRW", ".pdf", ".PDF"];
  constructor(params: SdkBasicInfo) {
    this.common = new CommonUtils({
      baseUrl: `http://${params.address || process.env.baseUrl}:8017/api/plm`,
      fetch: (...params: [any, any]) => {
        return fetch(...params);
      },
      isServe: true,
      ...params,
    });
  }

  async getAffectFiles(params: any) {
    const change = await this.common.getInstanceById<IChangeInstance>(
      params.insId
    );
    await change.getWorkflow();
    // const review = change.basicReadInstanceInfo.workflowNodes.find(
    //   (node) => node.apicode == "Review"
    // )!;
    const { allData, usersData } = await change.getWorkflowApprovalRecord();

    // 获取审批通过的对象
    const approved = allData.filter(
      (item) => item.approve_instance_id && item.action == "1"
    );
    const allNodes: any = [];

    change.basicReadInstanceInfo.workflowNodes.forEach((item) => {
      //代表是审核节点
      if (item.type == "2") {
        const node = approved.find((v) => v.node_id == item.id);
        if (node) {
          const user = usersData.find(
            (user) => user.value == node.approve_instance_id
          )?.label;

          if (user) {
            allNodes.push(
              ...[
                `${item.name}=${user}`,
                `${item.name}日期=${node.update_time.split(" ")[0]}`,
              ]
            );
          }
        }
      }
    });

    // 获取所有的审核节点
    // const approveData = allData.filter(item => item.node_type == '2')

    // const approvals = allData.filter(
    //   (data) => data.node_id == review.id && data.approve_instance_id
    // );

    // const users = approvals
    //   .map((data) => {
    //     const user = usersData.find(
    //       (user) => user.value == data.approve_instance_id
    //     )!;
    //     return user.label;
    //   })
    //   .join(",");

    // const date = approvals
    //   .map((data) => {
    //     return {
    //       date: (data.update_time as string).split(" ")[0],
    //       valueOf: moment(data.update_time).valueOf(),
    //     };
    //   })
    //   .sort((a, b) => a.valueOf - b.valueOf);
    // const latestDate = date[date.length - 1].date;
    // const approvalNodeInfo = [`${review.name}=${users}`, `${review.name}时间=${latestDate}`];

    const affectPartsTab = await change.getTabByApicode({
      apicode: "AffectParts",
    });
    if (affectPartsTab) {
      const affectFiles = await affectPartsTab.getTabData();
      // 过滤文件
      const instanceList = await this.getInstances(
        // this.filterSuffix(affectFiles)
        affectFiles
      );
      for (const instance of instanceList) {
        const urlAttr: BasicsAttribute | undefined = utility.getAttrOf(
          instance.BasicAttrs,
          "FileUrl"
        );
        this.initializeFileInfo(instance, {
          fileId: instance.basicReadInstanceInfo.insId,
          fileName: instance.basicReadInstanceInfo.insDesc,
          fileUrl: this.getFileUrl(instance, urlAttr),
          approvalNodeInfo: allNodes,
        });
        const attachmentTab = await instance.getTabByApicode({
          apicode: "Attachments",
        });
        if (attachmentTab) {
          // await attachmentTab
          //   ?.insertTabDataAttachments(
          //     [
          //       {
          //         name: "物料-仅物料-20230325145328",
          //         size: 43578,
          //         extension: "pdf",
          //         id: "uppy-///////20230325145328/xlsx/pdf-sj9-pcp-1d-jm5-sj9-pcp-1d-1e-1e-application/pdf-43578-1687250768513",
          //         uploadURL:
          //           "/plm/files/35007cf0b781df3b1db8d188eabbda58+M2YxYmMzMmItOGYzMC00NmQ3LThhZGUtOGViNzU2NWY3ZmE3Ljg5MmFmNjBjLTk4ZGYtNDBjZi04YzQ3LTMxYTAxODc5NmQxMA",
          //       },
          //     ],
          //     true,
          //   ) 
          const roles: any = await this.common.getRolesByCurrentUser();
          let attachments = (await attachmentTab.getTabData()) as Attachment[];
          attachments.forEach((attachment) => {
            const attachmentName =
              attachment.getAttrValue({
                tab: attachmentTab,
                attrApicode: "FileName",
              }) || "";
            const attachCanDownload =
              attachment.getAttrValue({
                tab: attachmentTab,
                attrApicode: "CanDownload",
              }) || "";

            this.initializeFileInfo(attachment, {
              fileId: attachment.rowId,
              fileName: attachmentName,
              fileUrl: attachment.getAttrValue({
                tab: attachmentTab,
                attrApicode: "FileUrl",
              }),
              approvalNodeInfo: allNodes,
            });
            attachment.attachCanDownload = attachCanDownload;
            attachment.isTransform = this.attachmentSuffix.some((suffix) =>
              attachmentName.endsWith(suffix)
            );
          }); 
          instance.attachments = attachments.filter((item) => !item.attachCanDownload && item.attachCanDownload != "0" && item.isTransform);
          // instance.attachments = attachments.filter((item) => !item.attachCanDownload && item.attachCanDownload != "0");
          
          const {
            result: { records: Attrs },
          } = await attachmentTab.getAttributeByTab({
            itemCode: instance.basicReadInstanceInfo.itemCode,
            tabCode: 10002008,
          });
          const AttrsMap = utility.transformArrayToMap(Attrs, "apicode", "id");

          for (let attachmentData of instance.attachments) {
            console.log(`111111111111111111111111111111111111111`);
            let fileUrl = attachmentData[AttrsMap["FileUrl"]];
            let fileFormat = attachmentData[AttrsMap["FileFormat"]];
            let fileName = attachmentData[AttrsMap["FileName"]];
            let fileId = attachmentData[AttrsMap["FileId"]];
            PrintUtils.autoUploadPrintFileToAttachment({
              user: params.userId,
              fileFormat: fileFormat,
              itemCode: String(attachmentData.itemCode),
              fileUrl: fileUrl,
              fileName: fileName,
              insDesc: instance.basicReadInstanceInfo.insDesc,
              latestCurrentUserInfo: { current: roles },
              insId: attachmentData.insId,
              insRevision: instance.basicReadInstanceInfo.insVersionOrder,
              insVersion: instance.basicReadInstanceInfo.insVersion,
              fonts: await readFile("./public/TsangerYuYangT_W03_W03.ttf"),
              // fonts: '',
              // StorageController,
              transferformListByCodeList: async (n1: any, n2: any) => {
                const res = await this.common.transferformListByCodeList(
                  n1,
                  n2
                );
                return res;
              },
              getConfigAttr: async () => {
                console.log("format", fileFormat);
                console.log("itemCode", attachmentData.itemCode);
                console.log("instanceId", attachmentData.insId);
                console.log(
                  "versionNumber",
                  instance.basicReadInstanceInfo.insVersion
                );
                const resFormat = await attachmentTab.getFormat({
                  format: fileFormat,
                  printType: "1",
                  itemCode: attachmentData.itemCode,
                  instanceId: attachmentData.insId,
                  versionNumber:
                    instance.basicReadInstanceInfo.insVersion || "Draft",
                  tenantId: attachmentData.tenantId,
                });
                console.log("resFormat");
                console.log("tenantId", attachmentData.tenantId);
                console.log("userId", params.userId);
                console.log("instanceId", attachmentData.insId);
                console.log(
                  "version",
                  instance.basicReadInstanceInfo.insVersion
                );
                console.log(
                  "versionOrder",
                  instance.basicReadInstanceInfo.insVersionOrder
                );
                console.log("fileId", fileId);
                const res = await attachmentTab.getAllConfigAttr({
                  tenantId: attachmentData.tenantId,
                  userId: params.userId,
                  instanceId: attachmentData.insId,
                  version: instance.basicReadInstanceInfo.insVersion,
                  versionOrder: instance.basicReadInstanceInfo.insVersionOrder,
                  type: "",
                  printType: "1",
                  templateId: resFormat.result[0].id,
                  fileId: fileId,
                });
                return res;
              },
              getAutoTemplate: async () => {
                const res = await attachmentTab.getAutoTemplate({
                  instanceId: attachmentData.insId,
                  versionNumber: instance.basicReadInstanceInfo.insVersion,
                  format: fileFormat,
                });
                return res;
              },
              serveColumms: Attrs,
              placeFile,
              converBytes: utility.converBytes,
              transfer2D: async () => {
                let hostorigin = "http://192.168.0.62:8017";
                console.log(444)
                console.log(
                  fileUrl.includes("http")
                    ? `${hostorigin}/api/plm${
                        fileUrl.split("?")[0].split("/plm")[1]
                      }`
                    : `${hostorigin}/api${fileUrl.split("?")[0]}`
                );
                const res = await this.common
                  .getIFile()
                  .transfer2D({
                    previewUrl: fileUrl.includes("http")
                      ? `${hostorigin}/api/plm${
                          fileUrl.split("?")[0].split("/plm")[1]
                        }`
                      : `${hostorigin}/api${fileUrl.split("?")[0]}`,
                    fileSuffix: fileFormat,
                    fileName: attachmentData.insDesc || fileName,
                  })
                  .catch((e) => {
                    console.log(e);
                    console.log(2222222);
                  });
                console.log(res);
                console.log(11111111111111111);
                return res;
              },
              toPostFileRecord: async ({ file, response, type }: any) => {
                const res = await attachmentTab.toPostFileRecord({
                  file,
                  response,
                  type,
                });
                return res;
              },
              insertTabDataAttachments: async (data: any) => {
                console.log("111234", data); 
                const Uppys = new UppyUploader({
                  OSS_URL: `${this.common.baseUrl.replace(
                    "/api/plm",
                    ""
                  )}/api/plm/files`,
                });
                Uppys.addFile({
                  source: "Local",
                  name: data.name,
                  type: "application/pdf;charset=utf-8",
                  data: data.blob,
                  meta: {
                    relativePath: null,
                  },
                });
                Uppys.uppy.on("complete", (res) => {
                  console.log("res====");
                  console.log(res);
                  attachmentTab.insertTabDataAttachments({
                    attachmentRows: [
                      {
                        // name: `图纸`,
                        name: res.successful[0].name,
                        size: res.successful[0].size,
                        extension: res.successful[0].extension,
                        id: res.successful[0].id,
                        uploadURL: res.successful[0].uploadURL,
                      },
                    ],
                    isCheckin: false,
                    transferStatus: AttachmentTransferStatus.TransferSuccess,
                    onSuccess(msg) {
                      console.log("上传成功===", msg);
                    },
                  });
                });
              },
            });
          }
          console.log("---------------------------");
        } else {
          instance.attachments = [];
        }
        const designFilesTab = await instance.getTabByApicode({
          apicode: "DesignFiles",
        });
        if (designFilesTab) {
          let designFiles = (await designFilesTab.getTabData()) as Attachment[];
          designFiles.forEach((designFile) => {
            const attachmentName =
              designFile.getAttrValue({
                tab: designFilesTab,
                attrApicode: "FileName",
              }) || "";
            instance.fileName = attachmentName;
            // this.initializeFileInfo(designFile, {
            //   fileId: designFile.rowId,
            //   fileName: attachmentName,
            //   fileUrl: designFile.getAttrValue({ tab: designFilesTab, attrApicode: 'FileUrl' }),
            //   approvalNodeInfo: allNodes,
            // });
            // designFile.isTransform = this.attachmentSuffix.some((suffix) =>
            //   attachmentName.endsWith(suffix)
            // );
          });
          // instance.designFiles = designFiles.filter(item => item.isTransform);
          instance.fileUrl =
            designFiles[0]?.getAttrValue({
              tab: designFilesTab,
              attrApicode: "FileUrl",
            }) || "";
        } else {
          instance.fileUrl = "";
        }
      }
      return instanceList;
    } else {
      return [];
    }
  }

  /**
   * 获取结构数据，把根实例下所有附件信息写到外层，并处理isTransform
   */
  async getStructureTab(insId: string) {
    /** 根实例 */
    const rootInstance = (await this.common.getInstanceById(insId)) as FileSelf;
    /** 根实例的BOM页签 */
    const rootTabBom = await rootInstance.getTabByApicode({
      apicode: "BOM",
    });
    /** 根实例的设计文件页签 */
    const rootTabDesign = await rootInstance.getTabByApicode({
      apicode: "DesignFiles",
    });

    if (rootTabBom && rootTabDesign) {
      /** 根实例BOM页签根的实例数据 */
      const StructureData = await rootTabBom.getTabData();
      /** 根实例BOM页签平铺后的实例数据 */
      const rootTabBomFlattenDatas = utility.ArrayAttributeFlat(
        StructureData
      ) as IRowInstance[];
      /** 根+BOM平铺后所有的实例数据 */
      const instanceList = [
        rootInstance,
        ...(await this.getInstances(rootTabBomFlattenDatas)),
      ];

      /** 根实例设计文件的FileUrl的属性对象 */
      const rootDesignAttrFileUrl: BasicsAttribute | undefined =
        utility.getAttrOf(rootTabDesign.attrs, "FileUrl");
      /** 根实例设计文件的FileName的属性对象 */
      const rootDesignAttrFileName: BasicsAttribute | undefined =
        utility.getAttrOf(rootTabDesign.attrs, "FileName");

      for (const instance of instanceList) {
        /** 设计文件的文件名 */
        const instanceFileName =
          instance.basicReadInstanceInfo.attributes[rootDesignAttrFileName!.id];
        if (!instanceFileName || instanceFileName == "") {
          console.log("设计文件无数据,index=", instanceList.indexOf(instance));
          continue;
        }

        //把平铺后的设计文件信息写入实例最外层
        this.initializeFileInfo(instance, {
          fileId: instance.basicReadInstanceInfo.insId,
          fileName: instanceFileName,
          fileUrl: this.getFileUrl(instance, rootDesignAttrFileUrl),
        });

        /** 平铺后单个实例的附件页签 */
        const attachmentTab = await instance.getTabByApicode({
          apicode: "Attachments",
        });
        if (attachmentTab) {
          /** 平铺后单个实例的附件页签的数据 */
          let attachments = (await attachmentTab.getTabData()) as Attachment[];
          for (const attachment of attachments) {
            const attachmentFileName =
              attachment.getAttrValue({
                tab: attachmentTab,
                attrApicode: "FileName",
              }) || "";
            if (!attachmentFileName || attachmentFileName == "") {
              console.log(
                "附件页签无文件数据,index=",
                instanceList.indexOf(instance)
              );
              continue;
            }
            const attachmentFileUrl =
              attachment.getAttrValue({
                tab: attachmentTab,
                attrApicode: "FileUrl",
              }) || "";

              const attachmentCanDownload = attachment.getAttrValue({
                tab: attachmentTab,
                attrApicode: "CanDownload",
              }) || "";
            //把每个附件的文件信息写入外层
            this.initializeFileInfo(attachment, {
              fileId: attachment.rowId,
              fileName: attachmentFileName,
              fileUrl: attachmentFileUrl
            });
            attachment.transferStatus = attachmentCanDownload
            /** 处理是否为能转换的文件类型 */
            attachment.isTransform = this.attachmentSuffix.some((suffix) =>
              attachmentFileName.toUpperCase().endsWith(suffix)
            );
          }
          instance.attachments = attachments;
        } else {
          instance.attachments = [];
        }
      }
      return instanceList;
    } else {
      return [];
    }
  }

  filterSuffix(data: IRowInstance[]) {
    return data.filter((row) =>
      this.fileSuffix.some(
        (suffix) =>
          row.insDesc.endsWith(suffix) && !BasicsAuthority.isMosaic(row.insId)
      )
    );
  }

  getInstances(data: IRowInstance[]) {
    return Promise.all(
      data.map((row) => this.common.getInstanceById<FileSelf>(row.insId))
    );
  }

  private getFileUrl(
    instance: IBaseInstance | IRowInstance,
    attr?: BasicsAttribute
  ) {
    let fileUrl: string = "";
    if (attr) {
      if (this.isInstance(instance)) {
        fileUrl = instance.basicReadInstanceInfo.attributes[attr.id];
      } else {
        fileUrl = instance.attributes[attr.id];
      }
      if (BasicsAuthority.isMosaic(fileUrl)) {
        fileUrl = "";
      }
    }
    return fileUrl;
  }

  private isInstance(ins: any): ins is IBaseInstance {
    return !!ins.basicReadInstanceInfo;
  }

  private initializeFileInfo(
    instance: IBaseInstance | IRowInstance,
    info: Partial<FileInfo>
  ) {
    // console.log("设计文件/附件的文件数据=", info);
    Object.assign(instance, info);
  }

  async updateFile(filesystem: Filesystem<FileSelf>[], drawRowId?: string) {
    // for (const fsy of filesystem) {
    //   if (fsy.data.uploadURL) {
    //     await fsy.data.updateInstanceWithOutAuth({
    //       attrMap: { FileUrl: fsy.data.uploadURL, CanDownload: "true" },
    //     });
    //   }
    // }
    const modifyFile = new ModifyFile(filesystem[0].manage);
    console.log(
      "filesystem[0].attachments---------",
      filesystem[0].attachments?.length
    );
    /**
     * TODO
     * 就是这里之后不知道怎么处理
     * attachments是不包含刚生成的zip数据的。
     * 还是说，最外层不应该在根实例的FS去saveAddressCustom？而是要找到附件里刚生成的占位的图纸数据处理？？？
     */
    const files = this.uploadAttachment(filesystem, drawRowId);
    return;

    console.log("files---------", files);
    // return await modifyFile.modifyAttachments(files);
  }

  /**更新下载图纸指定的附件 */
  async updateFileAttachment(
    filesystem: Filesystem<FileSelf>[],
    drawRowId?: string
  ) {
    const modifyFile = new ModifyFile(filesystem[0].manage);
    console.log([
      {
        fileInsId: filesystem[0].data.basicReadInstanceInfo.insId,
        attachments: [
          {
            rowId: drawRowId || "",
            url: filesystem[0].data.uploadURL || "",
            mark: filesystem[0].data.uploadURL ? "1" : "2",
          },
        ],
      },
    ],'修改的數據')
    return await modifyFile.modifyAttachments([
      {
        fileInsId: filesystem[0].data.basicReadInstanceInfo.insId,
        attachments: [
          {
            rowId: drawRowId || "",
            url: filesystem[0].data.uploadURL || "",
            mark: filesystem[0].data.uploadURL ? "1" : "2",
          },
        ],
      },
    ]);
  }

  private uploadAttachment(
    filesystem: Filesystem<FileSelf>[],
    drawRowId?: string
  ) {
    const files = filesystem
      .filter((fsy) => fsy.attachments?.length)
      .map((fsy) => {
        console.log("附件length", fsy.attachments?.length);
        return {
          fileInsId: fsy.data.fileId,
          attachments: fsy.attachments!.map((att, attIndex) => {
            console.log("===============", attIndex, att.data.fileId);
            return {
              rowId: drawRowId,
              url: att.data.uploadURL! || att.data.fileUrl,
              mark: att.data.uploadURL ? "1" : "2",
            };
          }),
        };
      });
    return files;
  }

  // async test() {
  //   const instance = await this.common.getInstance("P10001")

  //   const BOMTab = await instance.getTabByApicode({apicode:'BOM'})
  //   if(BOMTab){
  //     const BOMTableData = await BOMTab.getTabData()
  //     for (let index = 0; index < BOMTableData.length; index++) {
  //       const element = BOMTableData[index];
  //       element.
  //     }
  //     BOMTab.add
  //   }
  //   // const intance = await this.common.getInstance("P100001")
  //   // const BOMTab = await intance.getTabByApicode({ apicode: 'BOM' })
  //   // if (BOMTab) {
  //   //   const BOMData = await BOMTab.getTabData()
  //   //   //  BOMData.forEach(item => {
  //   //   //   item.nu
  //   //   //   item.ins
  //   //   //   item.
  //   //   //  })
  //   // }
  // }
}

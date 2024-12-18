// CO000212 test环境
import {
  CommonUtils,
  BasicsAuthority,
  utility,
  IBaseInstance,
  IRowInstance,
  ModifyFile,
  IChangeInstance,
} from "onchain-sdk";
import { BasicsAttribute } from "onchain-sdk/lib/src/utils/attribute";
import { Attachment, FileInfo, FileSelf } from "./types";
import { Filesystem } from "../filesystem";

export default class Sdk {
  common: CommonUtils;
  fileSuffix = [".SLDPRT", ".SLDASM"];
  attachmentSuffix = [".slddrw", ".SLDDRW", ".pdf", ".PDF"];
  constructor(params: SdkBasicInfo) {
    this.common = new CommonUtils({
      baseUrl: "http://192.168.0.62:8017/api/plm",
      fetch: (...params: [any, any]) => {
        return fetch(...params);
      },
      isServe: true,
      ...params,
    });
  }

  async getAffectFiles(insId: string) {
    const change = await this.common.getInstanceById<IChangeInstance>(insId);
    await change.getWorkflow()
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
          let attachments = (await attachmentTab.getTabData()) as Attachment[];
          attachments.forEach((attachment) => {
            const attachmentName =
              attachment.getAttrValue({
                tab: attachmentTab,
                attrApicode: "FileName",
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
            attachment.isTransform = this.attachmentSuffix.some((suffix) =>
              attachmentName.endsWith(suffix)
            );
          });
          instance.attachments = attachments.filter((item) => item.isTransform);
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
   * 获取结构数据
   */
  async getStructureTab(insId: string) {
    const instanceP = (await this.common.getInstanceById(insId)) as FileSelf;
    const tab = await instanceP.getTabByApicode({
      apicode: "Structure",
    });

    if (tab) {
      const StructureData = await tab.getTabData();
      const tabFlattenDatas = utility.ArrayAttributeFlat(
        StructureData
      ) as IRowInstance[];
      const instanceList = [
        instanceP,
        ...(await this.getInstances(this.filterSuffix(tabFlattenDatas))),
      ];

      for (const instance of instanceList) {
        const urlAttr: BasicsAttribute | undefined = utility.getAttrOf(
          instance.BasicAttrs,
          "FileUrl"
        );
        this.initializeFileInfo(instance, {
          fileId: instance.basicReadInstanceInfo.insId,
          fileName: instance.basicReadInstanceInfo.insDesc,
          fileUrl: this.getFileUrl(instance, urlAttr),
        });
        const attachmentTab = await instance.getTabByApicode({
          apicode: "Attachments",
        });
        if (attachmentTab) {
          let attachments = (await attachmentTab.getTabData()) as Attachment[];
          attachments.forEach((attachment) => {
            const attachmentName =
              attachment.getAttrValue({
                tab: attachmentTab,
                attrApicode: "FileName",
              }) || "";
            this.initializeFileInfo(attachment, {
              fileId: attachment.rowId,
              fileName: attachmentName,
              fileUrl: attachment.getAttrValue({
                tab: attachmentTab,
                attrApicode: "FileUrl",
              }),
            });
            attachment.isTransform = this.attachmentSuffix.some((suffix) =>
              attachmentName.endsWith(suffix)
            );
          });
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
    Object.assign(instance, info);
  }

  async updateFile(filesystem: Filesystem<FileSelf>[]) {
    for (const fsy of filesystem) {
      if (fsy.data.uploadURL) {
        await fsy.data.updateInstanceWithOutAuth({
          attrMap: { FileUrl: fsy.data.uploadURL, CanDownload: "true" },
        });
      }
    }
    const modifyFile = new ModifyFile(filesystem[0].manage);
    const files = this.uploadAttachment(filesystem);
    return await modifyFile.modifyAttachments(files);
  }

  private uploadAttachment(filesystem: Filesystem<FileSelf>[]) {
    const files = filesystem
      .filter((fsy) => fsy.attachments?.length)
      .map((fsy) => {
        console.log("附件", fsy.attachments);
        return {
          fileInsId: fsy.data.fileId,
          attachments: fsy.attachments!.map((att) => {
            return {
              rowId: att.data.fileId,
              url: att.data.uploadURL! || att.data.fileUrl,
              mark: att.data.uploadURL ? "true" : "failed",
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

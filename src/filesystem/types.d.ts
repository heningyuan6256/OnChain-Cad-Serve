import {  FileManage } from 'onchain-sdk';
export interface Manage {
  insId: string
  manage: FileManage
  attachments: {
    fileId: string
    manage: FileManage
  }[]
}
interface SdkBasicInfo {
  userId: string;
  tenantId: string;
  token?: string;
  resData?:any
}

interface TransformArgument extends SdkBasicInfo {
  insId: string
}
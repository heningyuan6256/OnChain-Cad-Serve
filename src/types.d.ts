interface SdkBasicInfo {
  userId: string;
  tenantId: string;
  token?: string;
  resData?:any
  address?: string
}

interface TransformArgument extends SdkBasicInfo {
  insId: string
}
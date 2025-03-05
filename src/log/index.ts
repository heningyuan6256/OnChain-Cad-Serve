import { appendFile, readdir } from "node:fs/promises";

interface LogFileInfo {
  filename: string;
  address: string;
}

export class Log {
  static address = "./logs";
  static exists = {
    name: "",
    value: Promise.resolve<any>(""),
  };
  static previous = Promise.resolve<any>("");

  /** 根据日期生成日志文件名称 */
  private getLogFilename() {
    const date = new Date();
    const filename = `${date
      .toLocaleDateString("zh-CN")
      .replaceAll("/", "_")}.txt`;
    return {
      filename,
      date: date,
    };
  }

  /** 创建日志文件，因为文件名称根据日期变化，每次写入日志都需要检测文件是否存在 */
  private created({ filename, address }: LogFileInfo) {
    if (Log.exists.name !== filename) {
      const file = Bun.file(address);
      Log.exists = {
        name: filename,
        value: file.exists().then((exist) => {
          if (!exist) {
            return Bun.write(address, "\r\n");
          }
        }),
      };
    }
  }

  private async write({
    text,
    ...logFileInfo
  }: LogFileInfo & { text: string }) {
    this.created(logFileInfo);
    // 等待检测文件是否存在
    await Log.exists.value;
    // 等待上一次日志写入，保证顺序
    return (Log.previous = Log.previous.then(() => {
      // 写入日志
      return appendFile(logFileInfo.address, `${text}\r\n`);
    }));
  }

  error({
    action,
    message,
    number,
    position,
    tab,
    userId,
  }: {
    /** 行为 */
    action: Action;
    message: string | Error;
    /** 实例number (无法传入number时候可以使用id代替) */
    number?: string;
    userId?: string;
    tab?: string;
    /** 报错位置 */
    position?: string;
  }) {
    const { filename, date } = this.getLogFilename();
    const address = `${Log.address}/${filename}`;
    const texts = [
      `[${date.toLocaleTimeString()}]`,
      ` ${number ?? "***"}/${action}`,
      tab ? `<tab: ${tab}>` : '',
      userId ? `<user: ${userId}>` : '',
      `: ${typeof message == "string" ? message : message.message}`,
      ` (log:${position})`,
    ];
    return this.write({
      text: texts.join(""),
      address,
      filename,
    });
  }

  static async takeover<T>(
    promise: Promise<T>,
    params: Omit<Parameters<Log["error"]>[0], "message" | "position">
  ): Promise<T> {
    const stack = new Error().stack;
    const result = await promise.catch(async (error) => {
      const log = new Log();
      const position = (stack?.split("at") || []);
      await log.error({ ...params, message: error, position: position[3].trim() });
      return promise;
    });
    return result;
  }
}

export enum Action {
  request = "请求数据",
  getInstance = "获取实例数据",
  getTab = "获取页签",
  getTabList = "获取页签列表",
  getLoginUser = "获取登录用户",
  getTabAttr = "获取页签属性",
  uploadPrintAttach = "上传打印文件到附件",
  insertAttach = "添加附件"
}

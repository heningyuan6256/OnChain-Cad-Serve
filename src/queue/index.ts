export class SingleQueue {
  queue = Promise.resolve();
  /**
   * @description 追加一个任务到当前队列
   */
  push<T>(task: () => Promise<T>) {
    this.queue = this.queue.finally(async () => {
      return await task();
    });
    return this;
  }
}

/**
 * @description 异步睡眠
 */
export function sleep(time: number) {
  let a = 0;
  return new Promise((resolve) => {
    const int = setInterval(() => {
      console.log(++a);
    }, 1000);
    setTimeout(() => {
      resolve(true);
      clearInterval(int);
    }, time);
  });
}

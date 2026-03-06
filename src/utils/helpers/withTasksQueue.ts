import { GuildQueue } from "discord-player";

/**
 * Wraps an async operation with the queue's built-in tasksQueue (AsyncQueue)
 * to serialize track-adding + play operations across concurrent commands.
 *
 * @see https://discord-player.js.org/docs/common-actions/common_actions#playing-a-new-track
 */
export async function withTasksQueue<T>(
  queue: GuildQueue,
  fn: () => Promise<T>
): Promise<T> {
  const entry = queue.tasksQueue.acquire();
  await entry.getTask();
  try {
    return await fn();
  } finally {
    queue.tasksQueue.release();
  }
}

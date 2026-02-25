import RNFS from 'react-native-fs';
import type { SafetyEvent } from '../types';

const QUEUE_DIR = `${RNFS.DocumentDirectoryPath}/vision_events`;

interface QueuedEvent {
  event: SafetyEvent;
  jsonPath: string;
  snapshotPath?: string;
}

/**
 * 오프라인 이벤트 업로드 큐.
 * 네트워크 가용 시 로컬 저장된 이벤트를 백엔드로 업로드.
 */
export class UploadQueue {
  private uploading = false;

  async getPendingEvents(): Promise<QueuedEvent[]> {
    const exists = await RNFS.exists(QUEUE_DIR);
    if (!exists) return [];

    const files = await RNFS.readDir(QUEUE_DIR);
    const jsonFiles = files.filter(f => f.name.endsWith('.json') && f.isFile());

    const queued: QueuedEvent[] = [];
    for (const file of jsonFiles) {
      const content = await RNFS.readFile(file.path, 'utf8');
      const event = JSON.parse(content) as SafetyEvent;
      const baseName = file.name.replace('.json', '');
      const snapPath = `${QUEUE_DIR}/snapshots/${baseName}.jpg`;
      const snapExists = await RNFS.exists(snapPath);

      queued.push({
        event,
        jsonPath: file.path,
        snapshotPath: snapExists ? snapPath : undefined,
      });
    }

    return queued;
  }

  async uploadAndClean(
    uploadFn: (event: SafetyEvent, snapshotPath?: string) => Promise<boolean>,
  ): Promise<number> {
    if (this.uploading) return 0;
    this.uploading = true;

    let uploaded = 0;
    try {
      const pending = await this.getPendingEvents();

      for (const item of pending) {
        const success = await uploadFn(item.event, item.snapshotPath);
        if (success) {
          await RNFS.unlink(item.jsonPath).catch(() => {});
          if (item.snapshotPath) {
            await RNFS.unlink(item.snapshotPath).catch(() => {});
          }
          uploaded++;
        }
      }
    } finally {
      this.uploading = false;
    }

    return uploaded;
  }
}

import RNFS from 'react-native-fs';
import type { SafetyEvent } from '../types';

const EVENTS_DIR = `${RNFS.DocumentDirectoryPath}/vision_events`;
const SNAPSHOTS_DIR = `${EVENTS_DIR}/snapshots`;

export class EventEmitter {
  private initialized = false;

  private async ensureDirs(): Promise<void> {
    if (this.initialized) return;
    await RNFS.mkdir(EVENTS_DIR);
    await RNFS.mkdir(SNAPSHOTS_DIR);
    this.initialized = true;
  }

  async emit(events: SafetyEvent[], snapshotBase64?: string): Promise<void> {
    await this.ensureDirs();

    for (const e of events) {
      const ts = Math.round(e.ts * 1000);
      const targetStr = e.targetId !== null ? String(e.targetId) : 'na';
      const base = `${ts}_${e.label}_${targetStr}`;

      // JSON 로그
      const jsonPath = `${EVENTS_DIR}/${base}.json`;
      await RNFS.writeFile(
        jsonPath,
        JSON.stringify(
          {
            label: e.label,
            severity: e.severity,
            target_id: e.targetId,
            ts: e.ts,
            info: e.info,
          },
          null,
          2,
        ),
        'utf8',
      );

      // 스냅샷 (base64 JPEG)
      if (snapshotBase64) {
        const snapPath = `${SNAPSHOTS_DIR}/${base}.jpg`;
        await RNFS.writeFile(snapPath, snapshotBase64, 'base64');
      }
    }
  }
}

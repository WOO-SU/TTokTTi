// src/api/stream.ts
import { Alert } from 'react-native';

export type StreamMessageType = 'DANGER' | 'ANSWER';

export interface StreamResponse {
  type: StreamMessageType;
  message: string;
  details?: string;
  timestamp?: string;
}

// 1. Define the configuration interface
export interface SessionConfig {
  worksession_id: string;
  video_path: string;
}

class SafetyStream {
  private ws: WebSocket | null = null;
  private url: string;
  private config: SessionConfig;
  private onMessageCallback: (data: StreamResponse) => void;
  private reconnectAttempts: number = 0;
  private maxReconnectAttempts: number = 5;

  // Throttle timer
  private lastFrameTime: number = 0;
  private readonly FRAME_INTERVAL_MS = 1000; // 4 FPS

  constructor(clientId: string, onMessage: (data: StreamResponse) => void) {
    // Port 8888 is where your gateway.py FastAPI server is running
    this.url = `wss://laptop-gpu.tail413c80.ts.net/ws/stream/${clientId}`;
    this.config = config;
    this.onMessageCallback = onMessage;
  }

  public connect() {
    this.ws = new WebSocket(this.url);

    this.ws.onopen = () => {
      console.log('✅ Connected to Safety Gateway');
      this.reconnectAttempts = 0;

      this.ws?.send(JSON.stringify({
        type: 'CONFIG',
        worksession_id: this.config.worksession_id,
        video_path: this.config.video_path
      }));
    };

    this.ws.onmessage = (e) => {
      try {
        const data: StreamResponse = JSON.parse(e.data);
        this.onMessageCallback(data);
      } catch (err) {
        console.error('❌ Failed to parse stream message:', err);
      }
    };

    this.ws.onclose = (e) => {
      console.log('🔌 Connection closed:', e.reason);
      this.handleReconnect();
    };

    this.ws.onerror = (e) => {
      console.error('⚠️ WebSocket Error:', e);
    };
  }

  private handleReconnect() {
    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      this.reconnectAttempts++;
      console.log(`🔄 Attempting reconnect (${this.reconnectAttempts}/${this.maxReconnectAttempts})...`);
      setTimeout(() => this.connect(), 3000);
    } else {
      Alert.alert('연결 오류', '서버와의 연결이 끊겼습니다. 네트워크를 확인해주세요.');
    }
  }

  /**
   * Sends video frame in desired rate.
   */
  public sendFrame(base64Image: string) {
    const now = Date.now();
    // Drop frames if they are coming in too fast
    if (now - this.lastFrameTime < this.FRAME_INTERVAL_MS) {
        return;
    }
    
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.lastFrameTime = now;
      this.ws.send(JSON.stringify({
        type: 'FRAME',
        image: base64Image,
        timestamp: now
      }));
    }
  }

  /**
   * Sends an STT question to the high-priority 'questions' queue
   */
  public sendQuestion(text: string, base64Image: string) {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({
        type: 'QUESTION',
        image: base64Image,
        text: text,
        timestamp: Date.now()
      }));
    }
  }

  public disconnect() {
    this.ws?.close();
    this.ws = null;
  }
}

export default SafetyStream;

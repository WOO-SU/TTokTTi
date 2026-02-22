// src/api/stream.ts
import { Alert } from 'react-native';

export type StreamMessageType = 'DANGER' | 'ANSWER';

export interface StreamResponse {
  type: StreamMessageType;
  message: string;
  details?: string;
}

class SafetyStream {
  private ws: WebSocket | null = null;
  private url: string;
  private onMessageCallback: (data: StreamResponse) => void;
  private reconnectAttempts: number = 0;
  private maxReconnectAttempts: number = 5;

  constructor(clientId: string, onMessage: (data: StreamResponse) => void) {
    // Port 8001 is where your gateway.py FastAPI server is running
    this.url = `wss://laptop-gpu.tail413c80.ts.net/ws/stream/${clientId}`;
    this.onMessageCallback = onMessage;
  }

  public connect() {
    this.ws = new WebSocket(this.url);

    this.ws.onopen = () => {
      console.log('✅ Connected to Safety Gateway');
      this.reconnectAttempts = 0;
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
   * Sends a 4fps video frame to the 'video_frames' queue
   */
  public sendFrame(base64Image: string) {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({
        type: 'FRAME',
        image: base64Image
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
        text: text,
        image: base64Image
      }));
    }
  }

  public disconnect() {
    this.ws?.close();
    this.ws = null;
  }
}

export default SafetyStream;
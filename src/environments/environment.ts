export interface CameraFeed {
  id: string;
  name: string;
  hlsPath: string;
}

export const environment = {
  production: false,
  apiUrl: 'http://localhost:3000',
  mediaServerUrl: 'http://localhost:8888',
  cameras: [
    { id: 'camera-entrada', name: 'Câmera Entrada', hlsPath: 'camera-entrada/index.m3u8' },
    { id: 'camera-saida', name: 'Câmera Saída', hlsPath: 'camera-saida/index.m3u8' },
  ] satisfies CameraFeed[],
};

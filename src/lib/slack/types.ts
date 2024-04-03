export interface PayloadProfile {
  status_emoji: string;
  status_text: string;
}

export interface ResponsePictureUpload {
  ok: boolean;
  id: string;
  url: string;
}

export interface PayloadSetPhoto {
  id: string;
  crop_w: number;
  crop_x: number;
  crop_y: number;
}

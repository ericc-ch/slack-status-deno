import { ofetch } from "npm:ofetch";

export const stringToBase64 = (str: string) => {
  const binaryString = new TextEncoder().encode(str);
  return btoa(String.fromCodePoint(...binaryString));
};

export const createCookie = (cookie: Record<string, string>) =>
  Object.entries(cookie)
    .map(([k, v]) => `${k}=${v}`)
    .join("; ");

export const downloadImage = (url: string) => {
  return ofetch<Blob>(url);
};

export const minutesToMs = (minutes: number) => minutes * 60 * 1000;
export const secondsToMs = (seconds: number) => seconds * 1000;

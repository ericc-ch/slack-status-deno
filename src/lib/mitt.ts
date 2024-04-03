import mitt from "https://deno.land/x/mitt@v3.0.2/mod.ts";
import { ResponseAPIToken } from "~/lib/spotify/types.ts";

export type Events = {
  "logged-in": ResponseAPIToken;
  "refreshed-token": ResponseAPIToken;
};

export const emitter = mitt<Events>();

import { load } from "jsr:@std/dotenv";
import { Hono } from "npm:hono";
import { FetchError, ofetch } from "npm:ofetch";
import open from "npm:open";
import { emitter } from "~/lib/mitt.ts";
import {
  ResponseAPIToken,
  ResponseCurrentlyPlaying,
} from "~/lib/spotify/types.ts";
import { stringToBase64 } from "~/lib/utils.ts";

await load({
  export: true,
  allowEmptyValues: true,
});

const PORT = 5000;
const BASE_URL_SPOTIFY_AUTH = "https://accounts.spotify.com";
const BASE_URL_SPOTIFY_API = "https://api.spotify.com/v1";
const REDIRECT_URI = `http://localhost:${PORT}`;

const ENV_CLIENT_ID = Deno.env.get("SPOTIFY_CLIENT_ID");
const ENV_CLIENT_SECRET = Deno.env.get("SPOTIFY_CLIENT_SECRET");

if (!ENV_CLIENT_ID || !ENV_CLIENT_SECRET)
  throw new Error("Missing Spotify credentials.");

export class SpotifyAPI {
  private hono = new Hono();
  server = Deno.serve({ port: PORT }, this.hono.fetch);

  static auth = ofetch.create({
    baseURL: BASE_URL_SPOTIFY_AUTH,
    headers: {
      Authorization:
        "Basic " + stringToBase64(`${ENV_CLIENT_ID}:${ENV_CLIENT_SECRET}`),
      "Content-Type": "application/x-www-form-urlencoded",
    },
  });

  token = "";
  api = ofetch.create({
    baseURL: BASE_URL_SPOTIFY_API,
    onRequest: ({ options }) => {
      options.headers = {
        Authorization: `Bearer ${this.token}`,
        ...options.headers,
      };
    },
  });

  constructor() {
    this.hono.get("/", async (c) => {
      const authCode = c.req.query("code");
      if (!authCode) return c.text("Where code???");

      try {
        const response = await this.getAccessToken(authCode);
        this.token = response.access_token;

        emitter.emit("logged-in", response);
        return c.text("Logged in! You can close this window.");
      } catch (error) {
        console.log(ENV_CLIENT_ID);
        console.log(ENV_CLIENT_SECRET);
        if (error instanceof FetchError)
          return c.text(JSON.stringify(error.response));
      }
    });
  }

  openSpotifyOAuth() {
    const urlParams = new URLSearchParams({
      response_type: "code",
      scope: "user-read-currently-playing",
      client_id: ENV_CLIENT_ID!,
      redirect_uri: REDIRECT_URI,
    });

    const url = `${BASE_URL_SPOTIFY_AUTH}/authorize?${urlParams}`;

    return open(url);
  }

  getAccessToken(code: string) {
    const body = new URLSearchParams({
      grant_type: "authorization_code",
      redirect_uri: REDIRECT_URI,
      code,
    });

    return SpotifyAPI.auth<ResponseAPIToken>("/api/token", {
      method: "POST",
      body: body.toString(),
    });
  }

  refreshToken(refreshToken: string) {
    const body = new URLSearchParams({
      grant_type: "refresh_token",
      refresh_token: refreshToken,
    });

    return SpotifyAPI.auth<ResponseAPIToken>("/api/token", {
      method: "POST",
      body: body.toString(),
    });
  }

  getCurrentlyPlaying = () => {
    return this.api<ResponseCurrentlyPlaying>("/me/player/currently-playing", {
      query: { market: "ID" },
    });
  };
}

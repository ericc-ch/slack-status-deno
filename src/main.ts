import { load } from "jsr:@std/dotenv";
import { emitter } from "~/lib/mitt.ts";
import { SlackAPI } from "~/lib/slack/mod.ts";
import { SpotifyAPI } from "~/lib/spotify/mod.ts";
import { downloadImage, minutesToMs, secondsToMs } from "~/lib/utils.ts";

await load({
  export: true,
  allowEmptyValues: true,
});

const slack = new SlackAPI();
const spotify = new SpotifyAPI();

slack.init();
spotify.openSpotifyOAuth();

let prevTrack:
  | Awaited<ReturnType<typeof spotify.getCurrentlyPlaying>>
  | undefined;

const updateSong = async () => {
  const response = await spotify.getCurrentlyPlaying();

  if (!response?.item?.name) {
    console.log("Play something dude!");
    return slack.updateProfile({
      status_emoji: ":musical_note:",
      status_text: "Nothing playing...",
    });
  }

  const songName = response.item.name;
  const artistNames = response.item.artists
    .map((artist) => artist.name)
    .join(", ");

  const nowPlayingString = `${songName} - ${artistNames}`;

  const SCALE = 10;

  const progress = Math.floor(
    (response.progress_ms / response.item.duration_ms) * SCALE
  );

  const progressString = Array(SCALE).fill("-").fill("=", 0, progress).join("");

  const status = `${nowPlayingString} [${progressString}]`;

  await slack.updateProfile({
    status_emoji: ":musical_note:",
    status_text: status,
  });
  console.log(status);

  if (prevTrack?.item.id !== response.item.id) {
    const blob = await downloadImage(
      response.item.album.images[0]?.url ?? "https://placehold.co/640"
    );
    const { id } = await slack.uploadPicture(blob);
    await slack.updateProfilePicture({ id, crop_w: 0, crop_x: 0, crop_y: 0 });

    console.log("Updated profile picture");

    prevTrack = response;
  }
};

emitter.on("logged-in", async ({ refresh_token }) => {
  setInterval(async () => {
    const response = await spotify.refreshToken(refresh_token);
    emitter.emit("refreshed-token", response);
  }, minutesToMs(30));

  await updateSong();

  setInterval(() => {
    updateSong();
  }, secondsToMs(10));

  await spotify.server.shutdown();
});

emitter.on("refreshed-token", ({ access_token }) => {
  spotify.token = access_token;
});

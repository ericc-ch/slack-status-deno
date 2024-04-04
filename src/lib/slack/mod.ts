import { load } from "jsr:@std/dotenv";
import { ofetch } from "npm:ofetch";
import { PayloadSetPhoto } from "~/lib/slack/types.ts";
import { ResponsePictureUpload } from "~/lib/slack/types.ts";
import { PayloadProfile } from "~/lib/slack/types.ts";
import { createCookie } from "~/lib/utils.ts";

await load({
  export: true,
  allowEmptyValues: true,
});

const KEY_CONFIG = "localConfig_v2";
const ENV_BASE_URL = Deno.env.get("SLACK_BASE_URL");
const ENV_TOKEN = Deno.env.get("SLACK_TOKEN");
const ENV_D_COOKIE = Deno.env.get("SLACK_D_COOKIE");

type NullableString = string | null | undefined;

export class SlackAPI {
  static readonly KEY_CONFIG = "localConfig_v2";
  baseUrl: NullableString = ENV_BASE_URL;
  teamToken: NullableString = ENV_TOKEN;
  headers: Headers = new Headers();

  /**
   * Generate a one-liner based on a property from the first team object stored in local storage.
   *
   * @param property - the property to retrieve from the team object
   * @return the value of the specified property from the first team object
   */
  static oneLiner(property: string): string {
    return `Object.values(JSON.parse(globalThis.localStorage.getItem("${KEY_CONFIG}")).teams)[0].${property}`;
  }

  /**
   * Validates the credentials by checking the presence of team token, base URL, and cookie in the headers.
   */
  validateCredentials() {
    if (!this.teamToken) throw new Error("No token found");
    if (!this.baseUrl) throw new Error("No base url found");
    if (!this.headers.has("cookie")) throw new Error("No cookie found");
  }

  /**
   * Initializes the function by setting the base URL, team token, and dCookie, as well as creating the headers.
   *
   * @return The initialized instance of the class.
   */
  init(): this {
    if (!this.baseUrl || !this.teamToken) {
      console.log("Copy this line into your browser console: \n");
      console.log(SlackAPI.oneLiner("token"));
      console.log(SlackAPI.oneLiner("url"));
      console.log("\n");
    }

    while (!this.baseUrl) this.baseUrl = prompt("Please enter the base url:");

    while (!this.teamToken)
      this.teamToken = prompt("Please enter the printed token:");

    let dCookie: NullableString = ENV_D_COOKIE;
    while (!dCookie) dCookie = prompt("Please enter your d cookie:");

    this.headers.set("cookie", createCookie({ d: dCookie }));

    return this;
  }

  /**
   * Updates the profile with the given PayloadProfile.
   *
   * @param profile - data to update the profile with
   * @return the response from the API
   */
  updateProfile(profile: PayloadProfile): Promise<unknown> {
    this.validateCredentials();

    const url = new URL(`/api/users.profile.set`, this.baseUrl!);

    const rawPayload = {
      token: this.teamToken,
      profile: JSON.stringify(profile),
    };

    const formData = new FormData();

    for (const [k, v] of Object.entries(rawPayload)) {
      formData.append(k, v!);
    }

    return ofetch(url.toString(), {
      method: "POST",
      headers: this.headers,
      body: formData,
    });
  }

  /**
   * Uploads a picture file to the server.
   *
   * @param file - the picture file to upload
   * @return response of the picture upload response
   */
  uploadPicture<T extends Blob>(file: T): Promise<ResponsePictureUpload> {
    this.validateCredentials();

    const url = new URL(`/api/users.preparePhoto`, this.baseUrl!);

    const rawPayload = {
      token: this.teamToken,
      image: file,
    };

    const formData = new FormData();

    for (const [k, v] of Object.entries(rawPayload)) {
      formData.append(k, v!);
    }

    return ofetch<ResponsePictureUpload>(url.toString(), {
      method: "POST",
      headers: this.headers,
      body: formData,
    });
  }

  /**
   * Update the user's profile picture.
   *
   * @param payload - the payload containing the new photo
   * @return the picture upload response
   */
  updateProfilePicture(
    payload: PayloadSetPhoto
  ): Promise<ResponsePictureUpload> {
    this.validateCredentials();

    const url = new URL(`/api/users.setPhoto`, this.baseUrl!);

    const rawPayload = {
      token: this.teamToken,
      ...payload,
    };

    const formData = new FormData();

    for (const [k, v] of Object.entries(rawPayload)) {
      formData.append(k, v!.toString());
    }

    return ofetch<ResponsePictureUpload>(url.toString(), {
      method: "POST",
      headers: this.headers,
      body: formData,
    });
  }
}

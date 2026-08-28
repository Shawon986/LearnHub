import { SignJWT } from "jose";

// WebRTC provider abstraction for live classrooms.
// The classroom UI is written against this interface; video/audio
// connectivity is provider-specific.
//
//  - DevLiveProvider: no media transport (avatar tiles + presence only),
//    used when no video provider is configured.
//  - LiveKitLiveProvider: real WebRTC SFU. Tokens are minted here with
//    jose (HS256, API key + secret) — no SDK dependency. Requires
//    LIVEKIT_API_KEY / LIVEKIT_API_SECRET / LIVEKIT_URL.
//
// Configure via VIDEO_PROVIDER-like env: LIVE_PROVIDER=livekit|dev

export interface LiveRoom {
  roomName: string;
  /** Token the client uses to connect to the SFU. */
  token: string;
  /** SFU websocket URL (wss://…). */
  url: string;
}

export interface LiveVideoProvider {
  readonly key: string;
  /** Create/join the room for a class; returns client credentials. */
  joinRoom(input: {
    classId: string;
    userId: string;
    userName: string;
    role: "HOST" | "STUDENT";
  }): Promise<LiveRoom>;
}

export class DevLiveProvider implements LiveVideoProvider {
  readonly key = "dev";

  async joinRoom(input: { classId: string }): Promise<LiveRoom> {
    return { roomName: `class-${input.classId}`, token: "", url: "" };
  }
}

export class LiveKitLiveProvider implements LiveVideoProvider {
  readonly key = "livekit";

  private get config() {
    return {
      apiKey: process.env.LIVEKIT_API_KEY,
      apiSecret: process.env.LIVEKIT_API_SECRET,
      url: process.env.LIVEKIT_URL,
    };
  }

  private assertConfigured() {
    if (!this.config.apiKey || !this.config.apiSecret || !this.config.url) {
      throw new Error(
        "LiveKit is not configured. Set LIVEKIT_API_KEY, LIVEKIT_API_SECRET and LIVEKIT_URL (docs/live-classes.md).",
      );
    }
  }

  async joinRoom(input: {
    classId: string;
    userId: string;
    userName: string;
    role: "HOST" | "STUDENT";
  }): Promise<LiveRoom> {
    this.assertConfigured();
    const apiKey = this.config.apiKey!;
    const apiSecret = this.config.apiSecret!;
    const url = this.config.url!;
    const roomName = `class-${input.classId}`;

    // LiveKit access token (HS256): grant video permissions in the room.
    const token = await new SignJWT({
      name: input.userName,
      video: {
        room: roomName,
        roomJoin: true,
        canPublish: input.role === "HOST",
        canSubscribe: true,
        canPublishData: true,
      },
    })
      .setProtectedHeader({ alg: "HS256", typ: "JWT" })
      .setIssuer(apiKey)
      .setSubject(input.userId)
      .setIssuedAt()
      .setExpirationTime("2h")
      .sign(new TextEncoder().encode(apiSecret));

    return { roomName, token, url: url.replace(/^https/, "wss") };
  }
}

export function getLiveVideoProvider(): LiveVideoProvider {
  const configured = process.env.LIVE_PROVIDER ?? "dev";
  if (configured === "livekit") return new LiveKitLiveProvider();
  return new DevLiveProvider();
}

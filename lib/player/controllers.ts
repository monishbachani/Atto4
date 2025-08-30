// lib/player/controllers.ts

export type ControllerType = "none" | "youtube" | "vimeo" | "custom";

/** Minimal player state we care about */
export interface PlayerState {
  playing?: boolean;
  muted?: boolean;
  currentTime?: number;
  duration?: number;
}

export interface IframeController {
  /** Called when iframe loads. Use to init handshake if needed. */
  init(iframe: HTMLIFrameElement): void;
  /** UI actions -> iframe */
  play(): void;
  pause(): void;
  mute(): void;
  unmute(): void;
  seek(seconds: number): void; // absolute seconds
  /** Listen to provider events (e.g. play/pause/timeupdate). */
  attach(onState: (patch: PlayerState) => void): void;
  detach(): void;
}

/** Utility: safe post to child with optional target origin */
function post(iframe: HTMLIFrameElement | null, data: any, targetOrigin = "*") {
  iframe?.contentWindow?.postMessage(data, targetOrigin);
}

/** No control provider (fallback) */
export class NoopController implements IframeController {
  init() {}
  play() {}
  pause() {}
  mute() {}
  unmute() {}
  seek() {}
  attach() {}
  detach() {}
}

/** YouTube adapter (iframe API via postMessage; requires enablejsapi=1) */
export class YouTubeController implements IframeController {
  private iframe: HTMLIFrameElement | null = null;
  private handler = (e: MessageEvent) => {
    // YouTube posts stringified JSON (often)
    try {
      const data = typeof e.data === "string" ? JSON.parse(e.data) : e.data;
      if (data?.event === "onStateChange") {
        // 1=play, 2=pause per YT API
        if (data?.info === 1) this.onState?.({ playing: true });
        if (data?.info === 2) this.onState?.({ playing: false });
      }
    } catch {}
  };
  private onState?: (p: PlayerState) => void;

  init(iframe: HTMLIFrameElement) {
    this.iframe = iframe;
    // Request that YT starts sending events
    post(this.iframe, JSON.stringify({ event: "listening", id: 1 }), "*");
  }
  play()  { post(this.iframe, JSON.stringify({ event: "command", func: "playVideo",  args: [] }), "*"); }
  pause() { post(this.iframe, JSON.stringify({ event: "command", func: "pauseVideo", args: [] }), "*"); }
  mute()  { post(this.iframe, JSON.stringify({ event: "command", func: "mute",       args: [] }), "*"); }
  unmute(){ post(this.iframe, JSON.stringify({ event: "command", func: "unMute",     args: [] }), "*"); }
  seek(s: number) { post(this.iframe, JSON.stringify({ event: "command", func: "seekTo", args: [s, true] }), "*"); }

  attach(onState: (p: PlayerState) => void) { this.onState = onState; window.addEventListener("message", this.handler); }
  detach() { window.removeEventListener("message", this.handler); this.onState = undefined; }
}

/** Vimeo adapter (supports postMessage with simple objects) */
export class VimeoController implements IframeController {
  private iframe: HTMLIFrameElement | null = null;
  private onState?: (p: PlayerState) => void;
  private handler = (e: MessageEvent) => {
    const { event, data } = e.data || {};
    if (event === "play")  this.onState?.({ playing: true });
    if (event === "pause") this.onState?.({ playing: false });
    if (event === "volumechange") this.onState?.({ muted: data === 0 });
    if (event === "timeupdate") this.onState?.({ currentTime: data?.seconds, duration: data?.duration });
  };
  init(iframe: HTMLIFrameElement) { this.iframe = iframe; }
  play()  { post(this.iframe, { method: "play" }); }
  pause() { post(this.iframe, { method: "pause" }); }
  mute()  { post(this.iframe, { method: "setVolume", value: 0 }); }
  unmute(){ post(this.iframe, { method: "setVolume", value: 1 }); }
  seek(s: number) { post(this.iframe, { method: "setCurrentTime", value: s }); }
  attach(onState: (p: PlayerState) => void) { this.onState = onState; window.addEventListener("message", this.handler); }
  detach() { window.removeEventListener("message", this.handler); this.onState = undefined; }
}

/** Skeleton for a custom provider (fill per docs) */
export class CustomController implements IframeController {
  private iframe: HTMLIFrameElement | null = null;
  private onState?: (p: PlayerState) => void;
  private handler = (e: MessageEvent) => {
    // TODO: replace with your provider's event schema
    const msg = e.data;
    if (msg?.type === "play") this.onState?.({ playing: true });
    if (msg?.type === "pause") this.onState?.({ playing: false });
    if (msg?.type === "time") this.onState?.({ currentTime: msg.position, duration: msg.duration });
  };
  init(iframe: HTMLIFrameElement) { this.iframe = iframe; /* maybe send handshake */ }
  play()  { post(this.iframe, { type: "play" }); }
  pause() { post(this.iframe, { type: "pause" }); }
  mute()  { post(this.iframe, { type: "mute" }); }
  unmute(){ post(this.iframe, { type: "unmute" }); }
  seek(s: number) { post(this.iframe, { type: "seek", seconds: s }); }
  attach(onState: (p: PlayerState) => void) { this.onState = onState; window.addEventListener("message", this.handler); }
  detach() { window.removeEventListener("message", this.handler); this.onState = undefined; }
}

/** Factory */
export function makeController(kind: ControllerType): IframeController {
  switch (kind) {
    case "youtube": return new YouTubeController();
    case "vimeo":   return new VimeoController();
    case "custom":  return new CustomController();
    default:        return new NoopController();
  }
}

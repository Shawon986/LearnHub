"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { WebRtcSignal } from "@/lib/live/bus";
import { sendWebrtcSignal } from "@/lib/actions/live";

export interface SignalEvent {
  from: string;
  fromName: string;
  to: string;
  payload: WebRtcSignal;
}

interface Peer {
  pc: RTCPeerConnection;
  userId: string;
  makingOffer: boolean;
  polite: boolean;
}

/**
 * WebRTC mesh for the dev classroom: real camera/audio/screen-share
 * between participants, signaled over the classroom SSE bus.
 * (Production switches to the LiveKit provider instead.)
 */
export function useWebrtc({
  classId,
  myId,
  active,
  camOn,
  micOn,
  signals,
}: {
  classId: string;
  myId: string;
  active: boolean;
  camOn: boolean;
  micOn: boolean;
  signals: SignalEvent[];
}) {
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [screenStream, setScreenStream] = useState<MediaStream | null>(null);
  const [remoteStreams, setRemoteStreams] = useState<Map<string, MediaStream>>(new Map());
  const [mediaError, setMediaError] = useState<string | null>(null);

  const peersRef = useRef<Map<string, Peer>>(new Map());
  const localRef = useRef<MediaStream | null>(null);
  const screenRef = useRef<MediaStream | null>(null);
  const processedSignals = useRef(0);

  const send = useCallback(
    (targetUserId: string, payload: WebRtcSignal) => {
      sendWebrtcSignal(classId, targetUserId, payload).catch(() => {});
    },
    [classId],
  );

  /* ---- Local media ---- */
  useEffect(() => {
    if (!active) return;
    let cancelled = false;
    navigator.mediaDevices
      ?.getUserMedia({ video: true, audio: true })
      .then((stream) => {
        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        localRef.current = stream;
        setLocalStream(stream);
        setMediaError(null);
      })
      .catch(() => {
        setMediaError("Camera/microphone unavailable — you can still chat and watch others.");
      });
    return () => {
      cancelled = true;
    };
  }, [active]);

  // Apply camera/mic toggles to the real tracks.
  useEffect(() => {
    const stream = localRef.current;
    if (!stream) return;
    for (const track of stream.getVideoTracks()) track.enabled = camOn;
    for (const track of stream.getAudioTracks()) track.enabled = micOn;
  }, [camOn, micOn]);

  /* ---- Peer management ---- */
  const getPeer = useCallback(
    (userId: string, polite: boolean): Peer => {
      const existing = peersRef.current.get(userId);
      if (existing) return existing;

      const pc = new RTCPeerConnection({
        iceServers: [{ urls: "stun:stun.l.google.com:19302" }],
      });

      // Send local tracks (camera + screen when sharing).
      const addTracks = () => {
        const local = localRef.current;
        if (local) {
          for (const track of local.getTracks()) pc.addTrack(track, local);
        }
        const screen = screenRef.current;
        if (screen) {
          for (const track of screen.getVideoTracks()) pc.addTrack(track, screen);
        }
      };
      addTracks();

      pc.onicecandidate = (e) => {
        if (e.candidate) {
          send(userId, { kind: "ice", candidate: e.candidate.toJSON() });
        }
      };
      pc.onnegotiationneeded = () => {
        void (async () => {
          try {
            peer.makingOffer = true;
            await pc.setLocalDescription();
            send(userId, { kind: "offer", sdp: pc.localDescription?.sdp ?? "" });
          } catch {
            /* retried on next negotiation */
          } finally {
            peer.makingOffer = false;
          }
        })();
      };
      pc.ontrack = (e) => {
        setRemoteStreams((prev) => {
          const next = new Map(prev);
          const existingStream = next.get(userId);
          if (existingStream) {
            existingStream.addTrack(e.track);
            return next;
          }
          const stream = new MediaStream([e.track]);
          next.set(userId, stream);
          return next;
        });
      };

      const peer: Peer = { pc, userId, makingOffer: false, polite };
      peersRef.current.set(userId, peer);
      return peer;
    },
    [send],
  );

  function closePeer(userId: string) {
    const peer = peersRef.current.get(userId);
    if (peer) {
      peer.pc.close();
      peersRef.current.delete(userId);
    }
    setRemoteStreams((prev) => {
      const next = new Map(prev);
      next.delete(userId);
      return next;
    });
  }

  /* ---- Signal processing (perfect-negotiation pattern) ---- */
  useEffect(() => {
    const fresh = signals.slice(processedSignals.current);
    processedSignals.current = signals.length;

    for (const signal of fresh) {
      if (signal.to !== myId) continue;
      void (async () => {
        try {
          const peer = getPeer(signal.from, signal.from < myId); // deterministic politeness
          if (signal.payload.kind === "ice" && signal.payload.candidate) {
            try {
              await peer.pc.addIceCandidate(signal.payload.candidate as RTCIceCandidateInit);
            } catch {
              /* queue full — ignore for now */
            }
            return;
          }
          if (signal.payload.kind === "hangup") {
            closePeer(signal.from);
            return;
          }
          const payload = signal.payload as { kind: "offer" | "answer"; sdp: string };
          const description = new RTCSessionDescription({
            type: payload.kind,
            sdp: payload.sdp,
          } as RTCSessionDescriptionInit);
          const offerCollision =
            signal.payload.kind === "offer" &&
            (peer.makingOffer || peer.pc.signalingState !== "stable");
          const ignoreOffer = !peer.polite && offerCollision;
          if (ignoreOffer) return;
          await peer.pc.setRemoteDescription(description);
          if (signal.payload.kind === "offer") {
            await peer.pc.setLocalDescription();
            send(signal.from, { kind: "answer", sdp: peer.pc.localDescription?.sdp ?? "" });
          }
        } catch {
          /* next signal resolves */
        }
      })();
    }
  }, [signals, myId, getPeer, send]);

  /* ---- Screen share ---- */
  async function toggleScreenShare() {
    if (screenRef.current) {
      screenRef.current.getTracks().forEach((t) => t.stop());
      screenRef.current = null;
      setScreenStream(null);
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getDisplayMedia({ video: true });
      screenRef.current = stream;
      setScreenStream(stream);
      stream.getVideoTracks()[0]?.addEventListener("ended", () => {
        screenRef.current = null;
        setScreenStream(null);
      });
      // Add the screen track to every existing peer.
      for (const peer of peersRef.current.values()) {
        for (const track of stream.getVideoTracks()) peer.pc.addTrack(track, stream);
      }
    } catch {
      /* user cancelled */
    }
  }

  // Cleanup on unmount.
  useEffect(() => {
    return () => {
      for (const peer of peersRef.current.values()) peer.pc.close();
      peersRef.current.clear();
      localRef.current?.getTracks().forEach((t) => t.stop());
      screenRef.current?.getTracks().forEach((t) => t.stop());
    };
  }, []);

  return {
    localStream: screenStream ?? localStream,
    screenSharing: Boolean(screenStream),
    remoteStreams,
    mediaError,
    toggleScreenShare,
  };
}

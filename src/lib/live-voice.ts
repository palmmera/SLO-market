/** 16-bit mono WAV that every phone and computer browser can play. */
export function encodeWav(samples: Float32Array, sampleRate: number) {
  const buffer = new ArrayBuffer(44 + samples.length * 2);
  const view = new DataView(buffer);
  const write = (offset: number, text: string) => {
    for (let i = 0; i < text.length; i++) view.setUint8(offset + i, text.charCodeAt(i));
  };
  write(0, "RIFF");
  view.setUint32(4, 36 + samples.length * 2, true);
  write(8, "WAVE");
  write(12, "fmt ");
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, 1, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * 2, true);
  view.setUint16(32, 2, true);
  view.setUint16(34, 16, true);
  write(36, "data");
  view.setUint32(40, samples.length * 2, true);
  let offset = 44;
  for (let i = 0; i < samples.length; i++) {
    const sample = Math.max(-1, Math.min(1, samples[i]));
    view.setInt16(offset, sample < 0 ? sample * 0x8000 : sample * 0x7fff, true);
    offset += 2;
  }
  return new Blob([buffer], { type: "audio/wav" });
}

export function downsample(input: Float32Array, inRate: number, outRate: number) {
  if (outRate >= inRate) return input;
  const ratio = inRate / outRate;
  const length = Math.max(1, Math.floor(input.length / ratio));
  const out = new Float32Array(length);
  for (let i = 0; i < length; i++) out[i] = input[Math.floor(i * ratio)];
  return out;
}

/** Send short microphone clips to the sale. Call the returned function to stop. */
export function startVoiceUpload(ctx: AudioContext, stream: MediaStream, url: string) {
  const track = stream.getAudioTracks()[0];
  if (!track) return () => undefined;
  void ctx.resume();
  const source = ctx.createMediaStreamSource(new MediaStream([track]));
  const processor = ctx.createScriptProcessor(4096, 1, 1);
  const mute = ctx.createGain();
  mute.gain.value = 0;
  let stopped = false;
  let sending = false;
  const pieces: Float32Array[] = [];
  let samples = 0;
  const sendEvery = Math.floor(ctx.sampleRate * 0.4);

  processor.onaudioprocess = (event) => {
    if (stopped) return;
    const data = event.inputBuffer.getChannelData(0);
    if (samples >= sendEvery) {
      if (!sending) {
        const merged = new Float32Array(samples);
        let offset = 0;
        for (const piece of pieces) {
          merged.set(piece, offset);
          offset += piece.length;
        }
        const wav = encodeWav(downsample(merged, ctx.sampleRate, 16000), 16000);
        sending = true;
        void fetch(url, { method: "POST", headers: { "Content-Type": "audio/wav" }, body: wav }).finally(() => {
          sending = false;
        });
      }
      pieces.length = 0;
      samples = 0;
    }
    pieces.push(new Float32Array(data));
    samples += data.length;
  };

  source.connect(processor);
  processor.connect(mute);
  mute.connect(ctx.destination);

  return () => {
    stopped = true;
    processor.onaudioprocess = null;
    processor.disconnect();
    source.disconnect();
    mute.disconnect();
  };
}

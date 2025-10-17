/**
 * Direct microphone access - exactly as MDN docs show
 */
export async function requestMicrophoneAccess(constraints: MediaStreamConstraints['audio'] = true) {

  const stream = await navigator.mediaDevices.getUserMedia({
    audio: constraints
  });

  return {
    success: true,
    stream
  };
}

/**
 * Stop a microphone stream
 */
export function stopMicrophoneStream(stream: MediaStream): void {
  stream.getTracks().forEach(track => track.stop());
}



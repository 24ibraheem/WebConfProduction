/**
 * Audio Recording Utility
 * Records audio in 1-minute chunks and provides base64 encoded audio
 */

class AudioRecorder {
  constructor(stream, onChunkReady) {
    this.stream = stream;
    this.onChunkReady = onChunkReady;
    this.mediaRecorder = null;
    this.recordedChunks = [];
    this.isRecording = false;
    this.startTime = null;
    this.chunkDuration = 10000; // 10 seconds for faster feedback

    this.initializeRecorder();
  }

  initializeRecorder() {
    try {
      const options = { mimeType: 'audio/webm' };
      
      // Check if browser supports webm
      if (!MediaRecorder.isTypeSupported(options.mimeType)) {
        options.mimeType = 'audio/mp4';
      }
      if (!MediaRecorder.isTypeSupported(options.mimeType)) {
        options.mimeType = ''; // Use default
      }

      this.mediaRecorder = new MediaRecorder(this.stream, options);

      this.mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          this.recordedChunks.push(event.data);
        }
      };

      this.mediaRecorder.onstop = () => {
        this.handleChunkComplete();
      };

      console.log('✅ [AudioRecorder] Initialized with MIME type:', this.mediaRecorder.mimeType);
    } catch (error) {
      console.error('❌ [AudioRecorder] Failed to initialize:', error);
    }
  }

  start() {
    if (this.isRecording) return;

    try {
      this.recordedChunks = [];
      this.mediaRecorder.start();
      this.isRecording = true;
      this.startTime = Date.now();

      console.log('🎙️ [AudioRecorder] Started recording chunk');

      // Schedule stop after 1 minute
      setTimeout(() => {
        if (this.isRecording) {
          this.stop();
        }
      }, this.chunkDuration);
    } catch (error) {
      console.error('❌ [AudioRecorder] Failed to start:', error);
    }
  }

  stop() {
    if (!this.isRecording) return;

    try {
      this.mediaRecorder.stop();
      this.isRecording = false;
      console.log('⏹️ [AudioRecorder] Stopped recording chunk');
    } catch (error) {
      console.error('❌ [AudioRecorder] Failed to stop:', error);
    }
  }

  handleChunkComplete() {
    if (this.recordedChunks.length === 0) {
      console.warn('⚠️ [AudioRecorder] No audio data recorded');
      return;
    }

    // Convert blob to base64
    const audioBlob = new Blob(this.recordedChunks, { type: this.mediaRecorder.mimeType });
    
    const reader = new FileReader();
    reader.onload = () => {
      const base64Audio = reader.result.split(',')[1]; // Remove data:audio/webm;base64, prefix
      const duration = Math.round((Date.now() - this.startTime) / 1000);

      console.log(`✅ [AudioRecorder] Chunk ready (${duration}s, ${base64Audio.length} bytes)`);

      // Call the callback with audio data
      if (this.onChunkReady) {
        this.onChunkReady({
          audioBase64: base64Audio,
          duration,
          mimeType: this.mediaRecorder.mimeType,
          timestamp: new Date()
        });
      }

      // Automatically start next recording cycle
      this.recordedChunks = [];
      setTimeout(() => {
        if (this.mediaRecorder.state !== 'recording') {
          this.start();
        }
      }, 1000); // 1 second delay before next chunk
    };

    reader.readAsDataURL(audioBlob);
  }

  destroy() {
    try {
      if (this.mediaRecorder && this.mediaRecorder.state === 'recording') {
        this.mediaRecorder.stop();
      }
      if (this.stream) {
        this.stream.getTracks().forEach(track => track.stop());
      }
      this.isRecording = false;
      console.log('🗑️ [AudioRecorder] Destroyed');
    } catch (error) {
      console.error('❌ [AudioRecorder] Failed to destroy:', error);
    }
  }
}

export default AudioRecorder;

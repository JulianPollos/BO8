// handTracking.js - Hand tracking functionality
class HandTracker {
  constructor() {
    this.canvas = document.getElementById('handCanvas');
    this.video = document.getElementById('camera');
    this.loading = document.getElementById('loading');
    this.ctx = this.canvas.getContext('2d');
    
    this.hands = null;
    this.cameraUtil = null;
    this.currentFontSize = 1.5;
    this.targetFontSize = 1.5;
    this.lastTime = 0;
    this.smoothingFactor = 0.1;
    
    this.onHandDetectedCallback = null;
    this.onFontSizeChangeCallback = null;
  }

  // Set callback for when hands are detected (for inactivity timer)
  setOnHandDetectedCallback(callback) {
    this.onHandDetectedCallback = callback;
  }

  // Set callback for font size changes (for word animation)
  setOnFontSizeChangeCallback(callback) {
    this.onFontSizeChangeCallback = callback;
  }

  hideLoading() {
    this.loading.style.opacity = '0';
    this.loading.style.transform = 'translate(-50%, -50%) scale(0.8)';
    setTimeout(() => {
      this.loading.style.display = 'none';
    }, 300);
  }

  resizeCanvas() {
    this.canvas.width = this.video.videoWidth;
    this.canvas.height = this.video.videoHeight;
  }

  onHandResults(results) {
    const now = performance.now();
    if (now - this.lastTime < 50) return;
    this.lastTime = now;
    
    if (results.multiHandLandmarks?.length) {
      const lm = results.multiHandLandmarks[0];
      const d = Math.hypot(lm[4].x - lm[8].x, lm[4].y - lm[8].y);
      const ns = Math.min(1, Math.max(0, (d - 0.02) / 0.13));
      this.targetFontSize = 1.5 + ns * 2;
      
      // Notify that hands are detected (for inactivity timer)
      if (this.onHandDetectedCallback) {
        this.onHandDetectedCallback();
      }
    } else {
      this.targetFontSize = 1.5;
    }
    
    this.currentFontSize += (this.targetFontSize - this.currentFontSize) * this.smoothingFactor;
    
    if (Math.abs(this.targetFontSize - this.currentFontSize) > 0.01) {
      // Notify about font size change
      if (this.onFontSizeChangeCallback) {
        this.onFontSizeChangeCallback(this.currentFontSize);
      }
    }
  }

  async startCamera() {
    try {
      this.loading.textContent = 'Initializing camera…';
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: 1280, height: 720 }
      });
      this.video.srcObject = stream;

      this.loading.textContent = 'Loading hand tracking…';
      this.hands = new Hands({ 
        locateFile: f => `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${f}` 
      });
      
      this.hands.setOptions({
        maxNumHands: 1,
        modelComplexity: 1,
        minDetectionConfidence: 0.7,
        minTrackingConfidence: 0.7
      });
      
      this.hands.onResults((results) => this.onHandResults(results));

      await Promise.all([
        new Promise(resolve => { 
          this.video.onloadedmetadata = () => { 
            this.resizeCanvas(); 
            resolve(); 
          }; 
        }),
        this.hands.initialize()
      ]);

      this.hideLoading();

      this.cameraUtil = new Camera(this.video, {
        onFrame: async () => await this.hands.send({ image: this.video }),
        width: 1280,
        height: 720
      });
      
      this.cameraUtil.start();
    } catch (error) {
      console.error('Error starting camera:', error);
    }
  }

  // Get current font size
  getCurrentFontSize() {
    return this.currentFontSize;
  }

  // Stop hand tracking
  stop() {
    if (this.cameraUtil) {
      this.cameraUtil.stop();
    }
    if (this.video.srcObject) {
      this.video.srcObject.getTracks().forEach(track => track.stop());
    }
  }
}
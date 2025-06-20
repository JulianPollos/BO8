// handTracking.js - Enhanced hand tracking with gesture recognition and confirmation indicator
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
    
    // Gesture recognition properties
    this.gestureHistory = [];
    this.gestureHoldTime = 0;
    this.gestureThreshold = 20; // Reduced from 30 for faster response
    this.lastGesture = null;
    this.gestureDetected = false;
    this.cooldownTime = 40; // Reduced from 60 for faster response
    this.cooldownCounter = 0;
    this.maxCooldownTime = 40; // Store original cooldown time for progress calculation
    
    // Answer selection indicators
    this.currentGesture = null;
    this.gestureConfidence = 0;
    
    // Confirmation indicator properties
    this.confirmationActive = false;
    this.confirmationProgress = 0;
    this.confirmationStartTime = 0;
    
    this.onHandDetectedCallback = null;
    this.onFontSizeChangeCallback = null;
    this.onGestureDetectedCallback = null;
  }

  // Set callback for when hands are detected (for inactivity timer)
  setOnHandDetectedCallback(callback) {
    this.onHandDetectedCallback = callback;
  }

  // Set callback for font size changes (for word animation)
  setOnFontSizeChangeCallback(callback) {
    this.onFontSizeChangeCallback = callback;
  }

  // Set callback for gesture detection (for quiz answers)
  setOnGestureDetectedCallback(callback) {
    this.onGestureDetectedCallback = callback;
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

  // Calculate which fingers are up based on landmark positions
  getFingersUp(landmarks) {
    const fingers = [0, 0, 0, 0, 0]; // thumb, index, middle, ring, pinky
    
    // Finger tip and joint landmark indices
    const fingerTips = [4, 8, 12, 16, 20];
    const fingerPips = [3, 6, 10, 14, 18]; // PIP joints for better finger detection
    
    // Thumb (special case - check x-axis relative to previous joint)
    const thumbTip = landmarks[fingerTips[0]];
    const thumbPip = landmarks[fingerPips[0]];
    
    // For mirrored video, thumb is up if tip is significantly away from pip
    if (Math.abs(thumbTip.x - thumbPip.x) > 0.03) {
      fingers[0] = 1;
    }
    
    // Other fingers (check y-axis - tip should be significantly above pip joint)
    for (let i = 1; i < 5; i++) {
      const tip = landmarks[fingerTips[i]];
      const pip = landmarks[fingerPips[i]];
      
      // Finger is up if tip is significantly above pip joint
      if (tip.y < pip.y - 0.03) { // Increased threshold for better detection
        fingers[i] = 1;
      }
    }
    
    return fingers;
  }

  // Detect hand gestures based on finger positions
  detectGesture(landmarks) {
    const fingers = this.getFingersUp(landmarks);
    const fingerCount = fingers.reduce((sum, finger) => sum + finger, 0);
    
    console.log('Fingers up:', fingers, 'Count:', fingerCount); // Debug logging
    
    // Gesture mappings (more strict to avoid false positives):
    // 1 finger (only index) = Answer 1 (gesture 0)
    // 2 fingers (index + middle, no others) = Answer 2 (gesture 1)  
    // 3 fingers (index + middle + ring, no others) = Answer 3 (gesture 2)
    // 4+ fingers (index + middle + ring + pinky) = Answer 4 (gesture 3)
    
    let gesture = null;
    let confidence = 0;
    
    // More strict gesture detection
    if (fingerCount === 1) {
      if (fingers[1] === 1 && fingers[0] === 0 && fingers[2] === 0 && fingers[3] === 0 && fingers[4] === 0) {
        // Only index finger up
        gesture = 0;
        confidence = this.calculateGestureConfidence(landmarks, 'one', fingers);
      }
    } else if (fingerCount === 2) {
      if (fingers[1] === 1 && fingers[2] === 1 && fingers[0] === 0 && fingers[3] === 0 && fingers[4] === 0) {
        // Only index and middle finger up
        gesture = 1;
        confidence = this.calculateGestureConfidence(landmarks, 'two', fingers);
      }
    } else if (fingerCount === 3) {
      if (fingers[1] === 1 && fingers[2] === 1 && fingers[3] === 1 && fingers[0] === 0 && fingers[4] === 0) {
        // Only index, middle, and ring finger up
        gesture = 2;
        confidence = this.calculateGestureConfidence(landmarks, 'three', fingers);
      }
    } else if (fingerCount >= 4) {
      if (fingers[1] === 1 && fingers[2] === 1 && fingers[3] === 1 && fingers[4] === 1) {
        // Four or more fingers up (including thumb doesn't matter)
        gesture = 3;
        confidence = this.calculateGestureConfidence(landmarks, 'four', fingers);
      }
    }
    
    console.log('Detected gesture:', gesture, 'Confidence:', confidence); // Debug logging
    
    return { gesture, confidence };
  }

  // Calculate confidence score for gesture stability
  calculateGestureConfidence(landmarks, gestureType, fingers) {
    let confidence = 0.5; // Base confidence
    const fingerCount = fingers.reduce((sum, finger) => sum + finger, 0);
    
    // Check finger positions more precisely
    const fingerTips = [4, 8, 12, 16, 20];
    const fingerPips = [3, 6, 10, 14, 18];
    
    // Calculate how clearly fingers are extended/retracted
    let clarity = 0;
    for (let i = 1; i < 5; i++) {
      const tip = landmarks[fingerTips[i]];
      const pip = landmarks[fingerPips[i]];
      const distance = Math.abs(tip.y - pip.y);
      
      if (fingers[i] === 1) {
        // Finger should be up - reward greater distance
        clarity += Math.min(distance * 15, 1);
      } else {
        // Finger should be down - reward smaller distance
        clarity += Math.min((0.04 - distance) * 15, 1);
      }
    }
    
    clarity = Math.max(0, clarity / 4); // Average clarity, ensure non-negative
    confidence += clarity * 0.4;
    
    // Boost confidence for clean gestures
    switch (gestureType) {
      case 'one':
        if (fingers[1] === 1 && fingerCount === 1) confidence += 0.3;
        break;
      case 'two':
        if (fingers[1] === 1 && fingers[2] === 1 && fingerCount === 2) confidence += 0.3;
        break;
      case 'three':
        if (fingers[1] === 1 && fingers[2] === 1 && fingers[3] === 1 && fingerCount === 3) confidence += 0.3;
        break;
      case 'four':
        if (fingers[1] === 1 && fingers[2] === 1 && fingers[3] === 1 && fingers[4] === 1 && fingerCount >= 4) confidence += 0.3;
        break;
    }
    
    return Math.min(confidence, 1.0);
  }

  // Process gesture detection with stability checking
  processGesture(gestureResult) {
    if (this.cooldownCounter > 0) {
      this.cooldownCounter--;
      return;
    }
    
    if (gestureResult.gesture !== null && gestureResult.confidence > 0.6) { // Lowered threshold
      if (this.currentGesture === gestureResult.gesture) {
        this.gestureHoldTime++;
        this.gestureConfidence = Math.max(this.gestureConfidence, gestureResult.confidence);
        
        // Start confirmation animation
        if (!this.confirmationActive) {
          this.confirmationActive = true;
          this.confirmationStartTime = Date.now();
        }
        
        // Update confirmation progress
        this.confirmationProgress = Math.min(this.gestureHoldTime / this.gestureThreshold, 1);
        
        // Gesture held long enough and not recently detected
        if (this.gestureHoldTime >= this.gestureThreshold && !this.gestureDetected) {
          this.gestureDetected = true;
          this.cooldownCounter = this.cooldownTime;
          this.maxCooldownTime = this.cooldownTime; // Reset max cooldown for progress calculation
          this.confirmationActive = false;
          this.confirmationProgress = 0;
          
          console.log('Gesture confirmed:', this.currentGesture, 'Confidence:', this.gestureConfidence);
          console.log('This should trigger answer:', this.currentGesture + 1); // Debug logging
          
          // Trigger gesture callback
          if (this.onGestureDetectedCallback) {
            this.onGestureDetectedCallback(this.currentGesture, this.gestureConfidence);
          }
          
          // Visual feedback
          this.showGestureConfirmation(this.currentGesture);
        }
      } else {
        // New gesture detected
        this.currentGesture = gestureResult.gesture;
        this.gestureHoldTime = 1;
        this.gestureConfidence = gestureResult.confidence;
        this.gestureDetected = false;
        this.confirmationActive = true;
        this.confirmationStartTime = Date.now();
        this.confirmationProgress = 0;
      }
    } else {
      // No clear gesture
      this.currentGesture = null;
      this.gestureHoldTime = 0;
      this.gestureConfidence = 0;
      this.gestureDetected = false;
      this.confirmationActive = false;
      this.confirmationProgress = 0;
    }
  }

  // Show visual confirmation of gesture detection
  showGestureConfirmation(gestureIndex) {
    // Create a visual indicator on the canvas
    this.ctx.save();
    this.ctx.fillStyle = 'rgba(0, 255, 0, 0.8)';
    this.ctx.font = 'bold 48px Arial';
    this.ctx.textAlign = 'center';
    this.ctx.fillText(`Answer ${gestureIndex + 1}!`, this.canvas.width / 2, 100);
    this.ctx.restore();
    
    // Clear the text after a short delay
    setTimeout(() => {
      // Only clear if we're not drawing other things
      if (!this.currentGesture) {
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
      }
    }, 1000);
  }

  // Draw confirmation indicator - repositioned to be centered and lower
  drawConfirmationIndicator() {
    if (!this.confirmationActive || this.confirmationProgress <= 0) {
      return;
    }
    
    // Position the indicator in the center horizontally and lower vertically (above quiz section)
    const centerX = this.canvas.width / 2;
    const centerY = this.canvas.height - 180; // Much lower, above quiz section
    const radius = 35; // Slightly smaller
    
    // Calculate progress angle
    const angle = this.confirmationProgress * 2 * Math.PI;
    
    this.ctx.save();
    
    // Draw background circle with more transparency
    this.ctx.beginPath();
    this.ctx.arc(centerX, centerY, radius, 0, 2 * Math.PI);
    this.ctx.fillStyle = 'rgba(0, 0, 0, 0.4)'; // More transparent
    this.ctx.fill();
    this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)'; // More transparent
    this.ctx.lineWidth = 2;
    this.ctx.stroke();
    
    // Draw confirmation progress arc (green) with more transparency
    this.ctx.beginPath();
    this.ctx.arc(centerX, centerY, radius - 4, -Math.PI / 2, -Math.PI / 2 + angle);
    this.ctx.strokeStyle = 'rgba(0, 255, 0, 0.7)'; // More transparent green
    this.ctx.lineWidth = 6;
    this.ctx.lineCap = 'round';
    this.ctx.stroke();
    
    // Draw gesture number in center with transparency
    this.ctx.fillStyle = 'rgba(255, 255, 255, 0.9)'; // Slightly transparent
    this.ctx.font = 'bold 24px Arial';
    this.ctx.textAlign = 'center';
    this.ctx.textBaseline = 'middle';
    this.ctx.fillText((this.currentGesture + 1).toString(), centerX, centerY);
    
    // Draw "CONFIRMING" text below with transparency
    this.ctx.fillStyle = 'rgba(255, 255, 255, 0.7)'; // More transparent
    this.ctx.font = 'bold 12px Arial';
    this.ctx.fillText('CONFIRMING', centerX, centerY + 50);
    
    // Add subtle pulsing effect
    const pulseScale = 1 + Math.sin(Date.now() * 0.008) * 0.05; // Gentler pulsing
    this.ctx.save();
    this.ctx.translate(centerX, centerY);
    this.ctx.scale(pulseScale, pulseScale);
    this.ctx.translate(-centerX, -centerY);
    
    // Draw inner glow effect with more transparency
    this.ctx.beginPath();
    this.ctx.arc(centerX, centerY, radius - 12, 0, 2 * Math.PI);
    this.ctx.fillStyle = `rgba(0, 255, 0, ${0.1 * this.confirmationProgress})`; // More subtle glow
    this.ctx.fill();
    
    this.ctx.restore();
    this.ctx.restore();
  }

  // Draw cooldown indicator - also repositioned and made more transparent
  drawCooldownIndicator() {
    if (this.cooldownCounter <= 0) return;
    
    // Position the cooldown indicator in the same location as confirmation
    const centerX = this.canvas.width / 2;
    const centerY = this.canvas.height - 180; // Same position as confirmation
    const radius = 30; // Slightly smaller
    
    // Calculate progress (1 = full circle, 0 = empty)
    const progress = this.cooldownCounter / this.maxCooldownTime;
    const countdownSeconds = Math.ceil(this.cooldownCounter / 20);
    
    this.ctx.save();
    
    // Draw background circle with more transparency
    this.ctx.beginPath();
    this.ctx.arc(centerX, centerY, radius, 0, 2 * Math.PI);
    this.ctx.fillStyle = 'rgba(0, 0, 0, 0.4)'; // More transparent
    this.ctx.fill();
    this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)'; // More transparent
    this.ctx.lineWidth = 2;
    this.ctx.stroke();
    
    // Draw countdown number with transparency
    this.ctx.fillStyle = 'rgba(255, 255, 255, 0.9)'; // Slightly transparent
    this.ctx.font = 'bold 20px Arial';
    this.ctx.textAlign = 'center';
    this.ctx.textBaseline = 'middle';
    this.ctx.fillText(countdownSeconds.toString(), centerX, centerY);
    
    // Draw "WAIT" text below with transparency
    this.ctx.fillStyle = 'rgba(255, 255, 255, 0.6)'; // More transparent
    this.ctx.font = '10px Arial';
    this.ctx.fillText('WAIT', centerX, centerY + 45);
    
    this.ctx.restore();
  }

  onHandResults(results) {
    const now = performance.now();
    if (now - this.lastTime < 50) return;
    this.lastTime = now;
    
    // Clear canvas for fresh drawing
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    
    if (results.multiHandLandmarks?.length) {
      const lm = results.multiHandLandmarks[0];
      
      // Original font size control
      const d = Math.hypot(lm[4].x - lm[8].x, lm[4].y - lm[8].y);
      const ns = Math.min(1, Math.max(0, (d - 0.02) / 0.13));
      this.targetFontSize = 1.5 + ns * 2;
      
      // Gesture detection
      const gestureResult = this.detectGesture(lm);
      this.processGesture(gestureResult);
      
      // Notify that hands are detected (for inactivity timer)
      if (this.onHandDetectedCallback) {
        this.onHandDetectedCallback();
      }
    } else {
      this.targetFontSize = 1.5;
      this.currentGesture = null;
      this.gestureHoldTime = 0;
      this.gestureDetected = false;
      this.confirmationActive = false;
      this.confirmationProgress = 0;
    }
    
    // Draw confirmation indicator (repositioned and more transparent)
    this.drawConfirmationIndicator();
    
    // Draw cooldown indicator (repositioned and more transparent)
    this.drawCooldownIndicator();
    
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
      
      // Initialize MediaPipe Hands with better error handling
      this.hands = new Hands({ 
        locateFile: (file) => {
          return `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`;
        }
      });
      
      this.hands.setOptions({
        maxNumHands: 1,
        modelComplexity: 0, // Reduced complexity for better compatibility
        minDetectionConfidence: 0.7,
        minTrackingConfidence: 0.5
      });
      
      this.hands.onResults((results) => this.onHandResults(results));

      // Wait for video to be ready
      await new Promise((resolve, reject) => {
        this.video.onloadedmetadata = () => {
          this.resizeCanvas();
          resolve();
        };
        this.video.onerror = reject;
        // Timeout fallback
        setTimeout(() => {
          if (this.video.readyState >= 2) {
            this.resizeCanvas();
            resolve();
          }
        }, 2000);
      });

      // Initialize MediaPipe with retry logic
      let initAttempts = 0;
      const maxAttempts = 3;
      
      while (initAttempts < maxAttempts) {
        try {
          this.loading.textContent = `Loading hand tracking... (${initAttempts + 1}/${maxAttempts})`;
          await this.hands.initialize();
          break; // Success, exit retry loop
        } catch (initError) {
          initAttempts++;
          console.warn(`MediaPipe init attempt ${initAttempts} failed:`, initError);
          if (initAttempts >= maxAttempts) {
            throw new Error('Failed to initialize MediaPipe after multiple attempts');
          }
          // Wait before retry
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      }

      this.hideLoading();

      // Start camera processing
      this.cameraUtil = new Camera(this.video, {
        onFrame: async () => {
          try {
            await this.hands.send({ image: this.video });
          } catch (frameError) {
            console.warn('Frame processing error:', frameError);
            // Continue without crashing
          }
        },
        width: 1280,
        height: 720
      });
      
      this.cameraUtil.start();
      
    } catch (error) {
      console.error('Error starting camera:', error);
      
      // Show error message to user
      this.loading.textContent = 'Hand tracking failed to load. Gestures disabled.';
      this.loading.style.color = '#ff6b6b';
      
      // Continue with camera only (no hand tracking)
      try {
        if (!this.video.srcObject) {
          const stream = await navigator.mediaDevices.getUserMedia({
            video: { width: 1280, height: 720 }
          });
          this.video.srcObject = stream;
        }
        
        // Hide loading after delay
        setTimeout(() => {
          this.hideLoading();
        }, 3000);
        
      } catch (cameraError) {
        console.error('Camera also failed:', cameraError);
        this.loading.textContent = 'Camera access failed.';
      }
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
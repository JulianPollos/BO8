// main.js - Main application logic and coordination
document.addEventListener('DOMContentLoaded', () => {
  // DOM elements
  const introContainer = document.getElementById('introContainer');
  const introVideo = document.getElementById('introVideo');
  const skipButton = document.getElementById('skipButton');
  const mainApp = document.getElementById('mainApp');
  const clickToStartOverlay = document.getElementById('clickToStartOverlay');
  const clickPrompt = document.getElementById('clickPrompt');
  const floatingElements = document.getElementById('floatingElements');
  
  // Application state
  let introCompleted = false;
  let inactivityTimer = null;
  let lastPersonDetected = Date.now();
  const INACTIVITY_TIMEOUT = 3 * 60 * 1000; // 3 minutes in milliseconds

  // Initialize modules
  const handTracker = new HandTracker();
  const wordAnimator = new WordAnimator();
  const quizManager = new QuizManager(wordAnimator);

  // Set up callbacks between modules
  handTracker.setOnHandDetectedCallback(() => {
    resetInactivityTimer();
  });

  handTracker.setOnFontSizeChangeCallback((fontSize) => {
    wordAnimator.updateFontSize(fontSize);
  });

  // Connect gesture detection to quiz answers
  handTracker.setOnGestureDetectedCallback((gestureIndex, confidence) => {
    console.log('Gesture detected:', gestureIndex, 'with confidence:', confidence);
    
    // Find the answer button that corresponds to this gesture
    const answerButtons = document.querySelectorAll('.quiz-section .answer');
    
    if (answerButtons[gestureIndex]) {
      // Simulate a click on the corresponding answer button
      answerButtons[gestureIndex].click();
      
      // Reset inactivity timer since user interacted
      resetInactivityTimer();
      
      // Visual feedback that gesture was recognized
      console.log(`Gesture ${gestureIndex + 1} triggered answer ${gestureIndex + 1}`);
    }
  });

  quizManager.setOnUserInteractionCallback(() => {
    resetInactivityTimer();
  });

  quizManager.setOnQuizCompleteCallback(() => {
    showIntroAgain();
  });

  // Function to create floating elements
  function createFloatingElements() {
    const words = ['Quiz', 'Spel', 'Vraag', 'Antwoord', 'Denken', 'Weten', '?', '!', '💡', '🎯', '🎪', '⭐'];
    floatingElements.innerHTML = '';
    
    for (let i = 0; i < 15; i++) {
      const element = document.createElement('div');
      element.className = 'floating-element';
      element.textContent = words[Math.floor(Math.random() * words.length)];
      element.style.left = Math.random() * 100 + '%';
      element.style.top = Math.random() * 100 + '%';
      element.style.animationDelay = Math.random() * 8 + 's';
      element.style.animationDuration = (6 + Math.random() * 4) + 's';
      floatingElements.appendChild(element);
    }
  }

  // Function to show click to start overlay
  function showClickToStart() {
    createFloatingElements();
    clickToStartOverlay.classList.remove('hide');
  }

  // Function to start the main quiz app
  function startMainApp() {
    // Hide click to start overlay and intro
    clickToStartOverlay.classList.add('hide');
    introContainer.classList.add('fade-out');
    
    // Show main app after overlay fades
    setTimeout(() => {
      introContainer.style.display = 'none';
      mainApp.classList.add('show');
      initializeQuizApp();
    }, 500);
  }

  // Function to show intro video again
  function showIntroAgain() {
    // Reset states
    introCompleted = false;
    
    // Clean up quiz and animations
    wordAnimator.destroy();
    handTracker.stop();
    
    // Reset video to beginning
    introVideo.currentTime = 0;
    
    // Hide main app and show overlay again
    mainApp.classList.remove('show');
    clickToStartOverlay.classList.remove('hide');
    
    // Show intro container
    introContainer.style.display = 'flex';
    introContainer.classList.remove('fade-out');
    
    // Play video
    introVideo.play().catch(console.error);
    
    // Reset inactivity timer
    resetInactivityTimer();
    
    // Clear any existing timeouts
    if (inactivityTimer) {
      clearTimeout(inactivityTimer);
      inactivityTimer = null;
    }
  }

  // Function to reset inactivity timer
  function resetInactivityTimer() {
    if (inactivityTimer) {
      clearTimeout(inactivityTimer);
    }
    
    lastPersonDetected = Date.now();
    
    // Only set timer if quiz is active (not during intro)
    if (introCompleted) {
      inactivityTimer = setTimeout(() => {
        console.log('No activity detected for 3 minutes, showing intro again');
        showIntroAgain();
      }, INACTIVITY_TIMEOUT);
    }
  }

  // Initialize the quiz application
  function initializeQuizApp() {
    introCompleted = true;
    
    // Start the quiz
    quizManager.start();
    
    // Start hand tracking
    handTracker.startCamera().catch(console.error);
    
    // Start inactivity timer
    resetInactivityTimer();
  }

  // Event listeners
  skipButton.addEventListener('click', startMainApp);
  clickPrompt.addEventListener('click', startMainApp);

  // Initialize click overlay immediately
  showClickToStart();

  // Fallback if video fails to load
  introVideo.addEventListener('error', () => {
    console.warn('Intro video failed to load, showing click to start');
    showClickToStart();
  });

  // Optional: Auto-start after video ends (currently commented out in original)
  // introVideo.addEventListener('ended', startMainApp);
});
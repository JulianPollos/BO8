// wordAnimation.js - Word animation functionality
class WordAnimator {
  constructor() {
    this.wordsEl = document.querySelector('.words');
    this.video = document.getElementById('camera');
    this.animationIntervals = new Map(); // Track animation intervals for cleanup
  }

  moveWord(span) {
    const vb = this.video.getBoundingClientRect();
    const wr = span.getBoundingClientRect();
    const maxX = Math.max(0, vb.width - wr.width);
    const maxY = Math.max(0, vb.height - wr.height);
    const x = Math.random() * maxX;
    const y = Math.random() * maxY;
    span.style.transform = `translate(${x}px,${y}px)`;
  }

  animateWord(span) {
    // Clear any existing animation for this span
    if (this.animationIntervals.has(span)) {
      clearTimeout(this.animationIntervals.get(span));
    }

    const duration = 5000 + Math.random() * 10000;
    span.style.transition = `transform ${duration}ms ease-in-out`;
    this.moveWord(span);
    
    const timeoutId = setTimeout(() => this.animateWord(span), duration);
    this.animationIntervals.set(span, timeoutId);
  }

  renderWords(wordList) {
    // Clear existing animations
    this.clearAnimations();
    
    this.wordsEl.innerHTML = '';
    
    wordList.forEach((text, index) => {
      const span = document.createElement('span');
      span.textContent = text;
      span.style.opacity = Math.random() < 0.4 ? '0.6' : '1';
      span.style.animationDelay = `${index * 0.1}s`;
      
      // Start at random position within the video bounds
      const vb = this.video.getBoundingClientRect();
      const randomX = Math.random() * Math.max(0, vb.width - 200); // Leave some margin
      const randomY = Math.random() * Math.max(0, vb.height - 50);  // Leave some margin
      span.style.transform = `translate(${randomX}px, ${randomY}px)`;
      
      this.wordsEl.appendChild(span);
      
      // Delay the animation start slightly for better effect
      setTimeout(() => this.animateWord(span), index * 200);
    });
  }

  updateFontSize(fontSize) {
    this.wordsEl.querySelectorAll('span').forEach(word => {
      word.style.fontSize = `${fontSize}rem`;
    });
  }

  clearAnimations() {
    // Clear all animation timeouts
    this.animationIntervals.forEach((timeoutId) => {
      clearTimeout(timeoutId);
    });
    this.animationIntervals.clear();
  }

  // Clean up when switching screens
  destroy() {
    this.clearAnimations();
    this.wordsEl.innerHTML = '';
  }
}
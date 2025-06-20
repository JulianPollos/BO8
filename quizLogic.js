// quizLogic.js - Quiz logic and management with smooth animations
class QuizManager {
  constructor(wordAnimator) {
    this.wordAnimator = wordAnimator;
    this.quizData = [
      { 
        question: 'Wat is 4 + 2?', 
        answers: ['3','4','6','8'], 
        correct: 2,
        words: ['Goed!','Zes is juist!','Volgende..?','Klopt!','Perfect!','Jawel!','Even door!'] 
      },
      { 
        question: 'Wat is de hoofdstad van Nederland?', 
        answers: ['Rotterdam','Utrecht','Amsterdam','Den Haag'], 
        correct: 2,
        words: ['Klop!','Amsterdam','Verder','Precies!','Goed zo!','Jij kan het!','Super!'] 
      },
      { 
        question: 'Welke kleur krijg je door rood en blauw te mengen?', 
        answers: ['Paars','Groen','Oranje','Geel'], 
        correct: 0,
        words: ['Top!','Paars','Klaar!','Yes!','Helemaal goed!','Geweldig!','Excellent!'] 
      }
    ];

    this.currentIndex = 0;
    this.isTransitioning = false; // Prevent multiple clicks during transition
    this.questionEl = document.querySelector('.quiz-section .question');
    this.answersEl = document.querySelector('.quiz-section .answers');
    this.progressBar = document.getElementById('progressBar');
    this.quizSection = document.querySelector('.quiz-section');
    
    this.onUserInteractionCallback = null;
    this.onQuizCompleteCallback = null;

    // Finger emoji's voor elke button
    this.fingerEmojis = ['☝️', '✌️', '🤟', '🖐️'];
  }

  // Set callback for user interactions (for inactivity timer)
  setOnUserInteractionCallback(callback) {
    this.onUserInteractionCallback = callback;
  }

  // Set callback for quiz completion
  setOnQuizCompleteCallback(callback) {
    this.onQuizCompleteCallback = callback;
  }

  updateProgress() {
    const progress = (this.currentIndex / this.quizData.length) * 100;
    this.progressBar.style.width = `${progress}%`;
  }

  async loadQuestion() {
    const q = this.quizData[this.currentIndex];
    
    // Smooth question transition
    await this.animateQuestionChange(q.question);
    
    // Clear and rebuild answers with stagger animation
    this.answersEl.innerHTML = '';
    
    // Create answers with staggered animation
    q.answers.forEach((ans, i) => {
      const btn = document.createElement('button');
      
      // Add finger emoji + answer text
      btn.innerHTML = `<span class="finger-emoji">${this.fingerEmojis[i]}</span><span class="answer-text">${ans}</span>`;
      
      btn.className = 'answer';
      btn.dataset.color = ['green','red','blue','yellow'][i];
      btn.style.opacity = '0';
      btn.style.transform = 'scale(0.8) translateY(20px)';
      btn.addEventListener('click', () => this.checkAnswer(i, btn));
      this.answersEl.appendChild(btn);
      
      // Staggered animation for each button
      requestAnimationFrame(() => {
        setTimeout(() => {
          btn.style.transition = 'all 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275)';
          btn.style.opacity = '1';
          btn.style.transform = 'scale(1) translateY(0)';
        }, i * 100); // 100ms delay between each button
      });
    });
    
    this.wordAnimator.renderWords(q.words);
    this.updateProgress();
    this.isTransitioning = false;
  }

  async animateQuestionChange(newQuestion) {
    return new Promise((resolve) => {
      // Fade out current question
      this.questionEl.style.transition = 'all 0.3s ease-out';
      this.questionEl.style.opacity = '0';
      this.questionEl.style.transform = 'translateY(-20px)';
      
      setTimeout(() => {
        // Change text and fade in
        this.questionEl.textContent = newQuestion;
        this.questionEl.style.opacity = '1';
        this.questionEl.style.transform = 'translateY(0)';
        
        setTimeout(resolve, 300); // Wait for fade in to complete
      }, 300);
    });
  }

  async checkAnswer(selectedIndex, btnElement) {
    // Prevent multiple clicks during transition
    if (this.isTransitioning) return;
    this.isTransitioning = true;

    const q = this.quizData[this.currentIndex];
    
    // Notify about user interaction
    if (this.onUserInteractionCallback) {
      this.onUserInteractionCallback();
    }
    
    // Temporarily disable all buttons with visual feedback
    const allButtons = this.answersEl.querySelectorAll('.answer');
    allButtons.forEach(btn => {
      if (btn !== btnElement) {
        btn.style.transition = 'all 0.3s ease';
        btn.style.opacity = '0.5';
        btn.style.pointerEvents = 'none';
      }
    });
    
    if (selectedIndex === q.correct) {
      // Correct answer animation
      await this.animateCorrectAnswer(btnElement);
      
      setTimeout(async () => {
        this.currentIndex++;
        if (this.currentIndex < this.quizData.length) {
          await this.loadQuestion();
        } else {
          this.completeQuiz();
        }
      }, 600); // Reduced from 1000ms
    } else {
      // Incorrect answer animation
      await this.animateIncorrectAnswer(btnElement, allButtons);
    }
  }

  async animateCorrectAnswer(btnElement) {
    return new Promise((resolve) => {
      btnElement.style.transition = 'all 0.4s cubic-bezier(0.68, -0.55, 0.265, 1.55)';
      btnElement.classList.add('correct');
      
      // Add success particle effect
      this.createSuccessParticles(btnElement);
      
      setTimeout(resolve, 400);
    });
  }

  async animateIncorrectAnswer(btnElement, allButtons) {
    return new Promise((resolve) => {
      btnElement.style.transition = 'all 0.3s ease-in-out';
      btnElement.classList.add('incorrect');
      this.wordAnimator.renderWords(['❌ Helaas…','Probeer opnieuw','Bijna goed!']);
      
      setTimeout(() => {
        // Restore button states smoothly
        btnElement.classList.remove('incorrect');
        btnElement.style.transition = 'all 0.3s ease';
        
        allButtons.forEach(btn => {
          btn.style.transition = 'all 0.3s ease';
          btn.style.opacity = '1';
          btn.style.pointerEvents = 'auto';
        });
        
        this.isTransitioning = false;
        resolve();
      }, 400); // Reduced from 600ms
    });
  }

  createSuccessParticles(btnElement) {
    const rect = btnElement.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;

    for (let i = 0; i < 8; i++) {
      const particle = document.createElement('div');
      particle.style.position = 'fixed';
      particle.style.left = centerX + 'px';
      particle.style.top = centerY + 'px';
      particle.style.width = '8px';
      particle.style.height = '8px';
      particle.style.background = '#fff';
      particle.style.borderRadius = '50%';
      particle.style.pointerEvents = 'none';
      particle.style.zIndex = '1000';
      particle.style.transition = 'all 0.6s cubic-bezier(0.25, 0.46, 0.45, 0.94)';
      
      document.body.appendChild(particle);
      
      requestAnimationFrame(() => {
        const angle = (i / 8) * Math.PI * 2;
        const distance = 50 + Math.random() * 30;
        const x = Math.cos(angle) * distance;
        const y = Math.sin(angle) * distance;
        
        particle.style.transform = `translate(${x}px, ${y}px)`;
        particle.style.opacity = '0';
        particle.style.transform += ' scale(0.5)';
      });
      
      setTimeout(() => {
        document.body.removeChild(particle);
      }, 600);
    }
  }

  completeQuiz() {
    // Quiz completed with enhanced animation
    this.questionEl.style.transition = 'all 0.5s ease-out';
    this.questionEl.textContent = '🎉 Quiz voltooid! 🎉';
    this.quizSection.classList.add('quiz-complete');
    
    // Clear answers with fade out effect
    const allButtons = this.answersEl.querySelectorAll('.answer');
    allButtons.forEach((btn, i) => {
      setTimeout(() => {
        btn.style.transition = 'all 0.3s ease-out';
        btn.style.opacity = '0';
        btn.style.transform = 'scale(0.8) translateY(20px)';
      }, i * 50);
    });
    
    // Create restart button after clearing animation
    setTimeout(() => {
      this.answersEl.innerHTML = '';
      const restartBtn = document.createElement('button');
      restartBtn.innerHTML = '<span class="finger-emoji">🔄</span><span class="answer-text">Opnieuw Starten</span>';
      restartBtn.className = 'answer restart-button';
      restartBtn.dataset.color = 'green';
      restartBtn.style.gridColumn = '1 / -1';
      restartBtn.style.fontSize = '1.4rem';
      restartBtn.style.opacity = '0';
      restartBtn.style.transform = 'scale(0.8)';
      restartBtn.addEventListener('click', () => {
        if (this.onUserInteractionCallback) {
          this.onUserInteractionCallback();
        }
        if (this.onQuizCompleteCallback) {
          this.onQuizCompleteCallback();
        }
      });
      this.answersEl.appendChild(restartBtn);
      
      // Animate restart button in
      requestAnimationFrame(() => {
        restartBtn.style.transition = 'all 0.5s cubic-bezier(0.175, 0.885, 0.32, 1.275)';
        restartBtn.style.opacity = '1';
        restartBtn.style.transform = 'scale(1)';
      });
    }, 300);
    
    this.updateProgress();
    this.wordAnimator.renderWords(['🎊 Einde 🎊','Bedankt!','Geweldig gedaan!','Top prestatie!']);
    
    // Auto-restart after 10 seconds if no interaction
    setTimeout(() => {
      if (this.currentIndex >= this.quizData.length) {
        if (this.onQuizCompleteCallback) {
          this.onQuizCompleteCallback();
        }
      }
    }, 10000);
  }

  // Reset quiz to beginning
  reset() {
    this.currentIndex = 0;
    this.isTransitioning = false;
    this.quizSection.classList.remove('quiz-complete');
    this.loadQuestion();
  }

  // Initialize the quiz
  start() {
    this.reset();
  }

  // Check if quiz is completed
  isCompleted() {
    return this.currentIndex >= this.quizData.length;
  }
}
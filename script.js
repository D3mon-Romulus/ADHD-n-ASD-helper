// ============================================================================
// ADHD & ASD Helper - Enhanced JavaScript with Voice Timing
// ============================================================================
// Fixed timer, per-profile themes, improved AI suggestions, better error handling
// Enhanced voice timing system and improved audio management
// Compatible with the provided HTML and CSS

'use strict';


// Global state variables - must be declared before use
// let sosActive = false; // Removed duplicate declaration to fix redeclaration error
let sosActive = false;
let sosStartTime = null;
let sosActivity = null;
let sosBreathingInterval = null;
let breathingInterval = null;
let breathingPhase = 0;
let breathingCount = 0;
let activeExercise = null;
let exerciseInterval = null;
let exerciseTimeout = null;

// ============================================================================
// UTILITY FUNCTIONS (MOVED TO TOP)
// ============================================================================

// ============================================================================
// UTILITY FUNCTIONS (MOVED TO TOP)
// ============================================================================

function showSuccessMessage(message) {
  const existingMessage = document.querySelector('.success-message');
  if (existingMessage) {
    existingMessage.remove();
  }
  
  const messageEl = document.createElement('div');
  messageEl.className = 'success-message';
  messageEl.textContent = message;
  messageEl.setAttribute('role', 'status');
  messageEl.setAttribute('aria-live', 'polite');
  messageEl.style.cssText = `
    position: fixed; top: 20px; right: 20px; 
    background: var(--accent-primary); color: white; 
    padding: 1rem 1.5rem; border-radius: 10px; 
    z-index: var(--z-toast); 
    animation: slideInRight 0.3s ease; 
    box-shadow: 0 4px 12px var(--shadow);
    font-weight: 600;
    max-width: 300px;
    word-wrap: break-word;
  `;
  
  document.body.appendChild(messageEl);
  
  setTimeout(() => {
    if (messageEl.parentNode) {
      messageEl.style.animation = 'slideOutRight 0.3s ease';
      setTimeout(() => {
        if (messageEl.parentNode) {
          messageEl.remove();
        }
      }, 300);
    }
  }, 3000);
}

function showErrorMessage(message) {
  const existingMessage = document.querySelector('.error-message');
  if (existingMessage) {
    existingMessage.remove();
  }
  
  const messageEl = document.createElement('div');
  messageEl.className = 'error-message';
  messageEl.textContent = message;
  messageEl.setAttribute('role', 'alert');
  messageEl.setAttribute('aria-live', 'assertive');
  messageEl.style.cssText = `
    position: fixed; top: 20px; right: 20px; 
    background: var(--error); color: white; 
    padding: 1rem 1.5rem; border-radius: 10px; 
    z-index: var(--z-toast); 
    animation: slideInRight 0.3s ease; 
    box-shadow: 0 4px 12px var(--shadow);
    font-weight: 600;
    max-width: 300px;
    word-wrap: break-word;
  `;
  
  document.body.appendChild(messageEl);
  
  setTimeout(() => {
    if (messageEl.parentNode) {
      messageEl.style.animation = 'slideOutRight 0.3s ease';
      setTimeout(() => {
        if (messageEl.parentNode) {
          messageEl.remove();
        }
      }, 300);
    }
  }, 4000);
}

function showCelebration(emoji) {
  const celebration = document.createElement('div');
  celebration.className = 'celebration';
  celebration.textContent = emoji;
  celebration.setAttribute('aria-hidden', 'true');
  celebration.style.cssText = `
    position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%); 
    font-size: 4rem; z-index: var(--z-toast); pointer-events: none; 
    animation: celebrationPop 1s ease-out;
  `;
  
  document.body.appendChild(celebration);
  
  setTimeout(() => {
    if (celebration.parentNode) {
      celebration.remove();
    }
  }, 1000);
}

function showWelcomePanel() {
  const welcomePanel = Utils.safeGetElement('welcomePanel');
  if (welcomePanel) {
    welcomePanel.style.display = 'flex';
    welcomePanel.setAttribute('aria-hidden', 'false');
    
    const nameInput = Utils.safeGetElement('welcomeChildName');
    if (nameInput) {
      setTimeout(() => nameInput.focus(), 100);
    }
  }
}

// ============================================================================
// CORE UTILITY FUNCTIONS
// ============================================================================

const Utils = {
  hashPin: function(pin) {
    if (!pin || typeof pin !== 'string') return null;
    let hash = 0;
    for (let i = 0; i < pin.length; i++) {
      const char = pin.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return hash.toString(36);
  },

  validateAge: function(age) {
    const numAge = parseInt(age, 10);
    return Number.isInteger(numAge) && numAge >= 3 && numAge <= 18;
  },

  validateTimerMinutes: function(minutes) {
    const numMinutes = parseInt(minutes, 10);
    return Number.isInteger(numMinutes) && numMinutes >= 1 && numMinutes <= 120;
  },

  sanitizeInput: function(input, maxLength = 50) {
    if (!input || typeof input !== 'string') return '';
    return input.trim()
                .replace(/[<>'"]/g, '')
                .substring(0, maxLength);
  },

  safeGetElement: function(id) {
    try {
      const element = document.getElementById(id);
      if (!element) {
        console.warn(`Element with id '${id}' not found`);
      }
      return element;
    } catch (error) {
      console.error(`Error getting element ${id}:`, error);
      return null;
    }
  },

  safeSetText: function(id, text) {
    const element = this.safeGetElement(id);
    if (element) {
      element.textContent = String(text);
    }
  },

  formatTime: function(minutes, seconds) {
    const mins = Math.max(0, Math.floor(minutes));
    const secs = Math.max(0, Math.floor(seconds));
    return String(mins).padStart(2, '0') + ':' + String(secs).padStart(2, '0');
  },

  announceToScreenReader: function(message) {
    const announcements = this.safeGetElement('announcements');
    if (announcements) {
      announcements.textContent = message;
      setTimeout(() => {
        announcements.textContent = '';
      }, 1000);
    }
  },

  debounce: function(func, wait) {
    let timeout;
    return function executedFunction(...args) {
      const later = () => {
        clearTimeout(timeout);
        func(...args);
      };
      clearTimeout(timeout);
      timeout = setTimeout(later, wait);
    };
  },

  throttle: function(func, limit) {
    let inThrottle;
    return function() {
      const args = arguments;
      const context = this;
      if (!inThrottle) {
        func.apply(context, args);
        inThrottle = true;
        setTimeout(() => inThrottle = false, limit);
      }
    }
  }
};

// ============================================================================
// ENHANCED AUDIO MANAGER WITH IMPROVED STOP FUNCTIONALITY
// ============================================================================

const AudioManager = {
  context: null,
  currentAmbientSound: null,
  currentAmbient: null,
  scheduledCleanup: [],
  activeAudioSources: [],

  getContext: function() {
    if (!this.context && (window.AudioContext || window.webkitAudioContext)) {
      try {
        const AudioContext = window.AudioContext || window.webkitAudioContext;
        this.context = new AudioContext();
        
        if (this.context.state === 'suspended') {
          document.addEventListener('click', () => {
            if (this.context.state === 'suspended') {
              this.context.resume();
            }
          }, { once: true });
        }
      } catch (error) {
        console.warn('Audio context creation failed:', error);
      }
    }
    return this.context;
  },

  createTone: function(frequency, duration, type = 'sine') {
    const context = this.getContext();
    if (!context) return null;

    return {
      play: () => {
        try {
          const oscillator = context.createOscillator();
          const gainNode = context.createGain();
          
          oscillator.connect(gainNode);
          gainNode.connect(context.destination);
          
          oscillator.frequency.value = frequency;
          oscillator.type = type;
          
          gainNode.gain.setValueAtTime(0, context.currentTime);
          gainNode.gain.linearRampToValueAtTime(0.3, context.currentTime + 0.1);
          gainNode.gain.exponentialRampToValueAtTime(0.01, context.currentTime + duration);
          
          oscillator.start(context.currentTime);
          oscillator.stop(context.currentTime + duration);
          
          this.trackAudioSource({ oscillator, gainNode });
          
          setTimeout(() => {
            try {
              oscillator.disconnect();
              gainNode.disconnect();
            } catch (e) {
              // Already disconnected
            }
          }, (duration + 0.1) * 1000);
          
        } catch (error) {
          console.error('Audio playback error:', error);
        }
      }
    };
  },

  stopAllSounds: function() {
    console.log('AudioManager.stopAllSounds() called');
    
    if (this.currentAmbientSound) {
      try {
        if (typeof this.currentAmbientSound.stop === 'function') {
          this.currentAmbientSound.stop();
        }
        if (typeof this.currentAmbientSound.disconnect === 'function') {
          this.currentAmbientSound.disconnect();
        }
      } catch (error) {
        console.warn('Error stopping ambient sound:', error);
      }
      this.currentAmbientSound = null;
    }
    
    if (this.currentAmbient) {
      try {
        this.currentAmbient.pause();
        this.currentAmbient.currentTime = 0;
        this.currentAmbient.src = '';
        this.currentAmbient.load();
      } catch (error) {
        console.warn('Error stopping ambient audio:', error);
      }
      this.currentAmbient = null;
    }
    
    this.activeAudioSources.forEach(source => {
      try {
        if (source.stop) {
          source.stop();
        }
        if (source.disconnect) {
          source.disconnect();
        }
        if (source.pause) {
          source.pause();
          source.currentTime = 0;
        }
      } catch (error) {
        console.warn('Error stopping tracked audio source:', error);
      }
    });
    this.activeAudioSources = [];
    
    try {
      document.querySelectorAll('audio').forEach(audio => {
        audio.pause();
        audio.currentTime = 0;
        audio.src = '';
        audio.load();
      });
    } catch (error) {
      console.warn('Error stopping HTML audio:', error);
    }
    
    try {
      if ('speechSynthesis' in window) {
        speechSynthesis.cancel();
      }
    } catch (error) {
      console.warn('Error stopping speech:', error);
    }
    
    this.scheduledCleanup.forEach(cleanup => {
      try {
        cleanup();
      } catch (error) {
        console.warn('Cleanup error:', error);
      }
    });
    this.scheduledCleanup = [];
    
    if (this.context) {
      try {
        if (this.context.state === 'suspended') {
          this.context.resume();
        }
        
        setTimeout(() => {
          if (this.context && this.context.state !== 'closed') {
            this.context.suspend();
          }
        }, 100);
      } catch (error) {
        console.warn('Error managing audio context:', error);
      }
    }
    
    console.log('AudioManager cleanup completed');
  },

  trackAudioSource: function(source) {
    this.activeAudioSources.push(source);
  },

  cleanup: function() {
    this.stopAllSounds();
    if (this.context) {
      try {
        this.context.close();
      } catch (error) {
        console.warn('Error closing audio context:', error);
      }
      this.context = null;
    }
  }
};

// ============================================================================
// ENHANCED VOICE SYSTEM WITH IMPROVED TIMING
// ============================================================================

const VoiceSystem = {
  settings: {
    selectedVoice: null,
    speed: 0.9,
    pitch: 1.0,
    volume: 0.7,
    enabled: true
  },
  
  timingSettings: {
    immediate: 0,
    quick: 300,
    normal: 800,
    instruction: 1200,
    celebration: 500,
    error: 100,
    overlap_prevention: 200
  },
  
  availableVoices: [],
  isSupported: false,
  currentUtterance: null,
  lastSpeechTime: 0,
  speechQueue: [],
  isProcessingQueue: false,

  init: function() {
    this.isSupported = 'speechSynthesis' in window;
    
    if (this.isSupported) {
      this.loadSettings();
      this.loadVoices();
      
      if (speechSynthesis.onvoiceschanged !== undefined) {
        speechSynthesis.onvoiceschanged = () => {
          console.log('Voices changed event fired');
          this.loadVoices();
        };
      }
      
      setTimeout(() => {
        if (this.availableVoices.length === 0) {
          console.log('Retrying voice loading...');
          this.loadVoices();
        }
      }, 1000);
      
      const loadOnInteraction = () => {
        if (this.availableVoices.length === 0) {
          console.log('Loading voices on user interaction...');
          this.loadVoices();
        }
        document.removeEventListener('click', loadOnInteraction);
        document.removeEventListener('keydown', loadOnInteraction);
      };
      
      document.addEventListener('click', loadOnInteraction);
      document.addEventListener('keydown', loadOnInteraction);
      
      this.startQueueProcessor();
    } else {
      console.warn('Speech synthesis not supported in this browser');
    }
  },

  speak: function(text, options = {}) {
    if (!this.settings.enabled || !this.isSupported || !text) {
      return;
    }

    const speechOptions = {
      delay: options.delay !== undefined ? options.delay : this.timingSettings.normal,
      priority: options.priority || 'normal',
      rate: options.rate || this.settings.speed,
      pitch: options.pitch || this.settings.pitch,
      volume: options.volume || this.settings.volume,
      interrupt: options.interrupt || false,
      context: options.context || 'general'
    };

    if (options.delay === undefined) {
      speechOptions.delay = this.getContextualDelay(speechOptions.context);
    }

    if (speechOptions.interrupt || speechOptions.priority === 'high') {
      this.clearQueue();
      speechSynthesis.cancel();
      speechOptions.delay = Math.min(speechOptions.delay, this.timingSettings.quick);
    }

    this.queueSpeech(text, speechOptions);
  },

  getContextualDelay: function(context) {
    switch(context) {
      case 'task_completion':
        return this.timingSettings.celebration;
      case 'behavior':
        return this.timingSettings.quick;
      case 'exercise_instruction':
        return this.timingSettings.instruction;
      case 'error':
        return this.timingSettings.error;
      case 'timer_complete':
        return this.timingSettings.celebration;
      case 'breathing':
        return this.timingSettings.immediate;
      case 'success':
        return this.timingSettings.quick;
      default:
        return this.timingSettings.normal;
    }
  },

  queueSpeech: function(text, options) {
    this.speechQueue.push({
      text: text,
      options: options,
      timestamp: Date.now()
    });
  },

  clearQueue: function() {
    this.speechQueue = [];
  },

  startQueueProcessor: function() {
    if (this.isProcessingQueue) return;
    
    this.isProcessingQueue = true;
    
    const processNext = () => {
      if (this.speechQueue.length === 0) {
        setTimeout(processNext, 100);
        return;
      }

      if (speechSynthesis.speaking || speechSynthesis.pending) {
        setTimeout(processNext, 100);
        return;
      }

      const item = this.speechQueue.shift();
      const timeSinceLastSpeech = Date.now() - this.lastSpeechTime;
      const minGap = this.timingSettings.overlap_prevention;
      
      const actualDelay = Math.max(
        item.options.delay,
        minGap - timeSinceLastSpeech
      );

      setTimeout(() => {
        this.performSpeech(item.text, item.options);
        setTimeout(processNext, 150);
      }, Math.max(0, actualDelay));
    };

    processNext();
  },

  performSpeech: function(text, options) {
    try {
      if (options.interrupt) {
        speechSynthesis.cancel();
        setTimeout(() => this.actuallySpeak(text, options), 150);
      } else {
        if (speechSynthesis.speaking || speechSynthesis.pending) {
          console.log('Speech already active, skipping:', text.substring(0, 30));
          return;
        }
        this.actuallySpeak(text, options);
      }
    } catch (error) {
      console.error('Voice synthesis error:', error);
    }
  },

  actuallySpeak: function(text, options) {
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = options.rate;
    utterance.pitch = options.pitch;
    utterance.volume = options.volume;
    
    if (this.settings.selectedVoice !== null && this.availableVoices[this.settings.selectedVoice]) {
      utterance.voice = this.availableVoices[this.settings.selectedVoice];
    }

    this.currentUtterance = utterance;
    this.lastSpeechTime = Date.now();

    utterance.onstart = () => {
      console.log('Voice started:', text.substring(0, 50));
    };

    utterance.onend = () => {
      this.currentUtterance = null;
      this.lastSpeechTime = Date.now();
    };

    utterance.onerror = (event) => {
      if (event.error !== 'interrupted') {
        console.error('Speech synthesis error:', event.error);
      }
      this.currentUtterance = null;
    };

    speechSynthesis.speak(utterance);
  },

  speakTaskCompletion: function(taskText) {
    const messages = [
      `Great job completing ${taskText}!`,
      `Awesome! You finished ${taskText}!`,
      `Well done on ${taskText}!`,
      `Excellent work finishing ${taskText}!`
    ];
    const message = messages[Math.floor(Math.random() * messages.length)];
    
    this.speak(message, {
      context: 'task_completion',
      priority: 'normal'
    });
  },

  speakBehaviorEncouragement: function(behavior) {
    const messages = [
      `Amazing! You're being so ${behavior.toLowerCase()}!`,
      `Wonderful ${behavior.toLowerCase()} behavior!`,
      `Keep up that ${behavior.toLowerCase()} attitude!`,
      `I love seeing you be so ${behavior.toLowerCase()}!`
    ];
    const message = messages[Math.floor(Math.random() * messages.length)];
    
    this.speak(message, {
      context: 'behavior',
      priority: 'normal'
    });
  },

  speakExerciseInstruction: function(instruction, isFirstInstruction = false) {
    this.speak(instruction, {
      context: 'exercise_instruction',
      priority: isFirstInstruction ? 'high' : 'normal',
      rate: 0.8
    });
  },

  speakTimerComplete: function() {
    this.speak('Timer finished! Great job staying focused!', {
      context: 'timer_complete',
      priority: 'high',
      interrupt: true
    });
  },

  speakError: function(message) {
    this.speak(message, {
      context: 'error',
      priority: 'high'
    });
  },

  speakSuccess: function(message) {
    this.speak(message, {
      context: 'success',
      priority: 'normal'
    });
  },

  speakBreathingCue: function(phase, count) {
    const cues = {
      inhale: `Breathe in... ${count}`,
      hold_in: `Hold... ${count}`, 
      exhale: `Breathe out... ${count}`,
      hold_out: `Hold... ${count}`
    };
    
    this.speak(cues[phase] || phase, {
      context: 'breathing',
      priority: 'high',
      rate: 0.7,
      interrupt: false
    });
  },

  cancelAll: function() {
    speechSynthesis.cancel();
    this.clearQueue();
    this.currentUtterance = null;
    setTimeout(() => {
      this.lastSpeechTime = Date.now();
    }, 50);
  },

  updateSetting: function(setting, value) {
    if (this.settings.hasOwnProperty(setting)) {
      this.settings[setting] = value;
      this.saveSettings();
    }
  },

  updateTimingSetting: function(setting, value) {
    if (this.timingSettings.hasOwnProperty(setting)) {
      this.timingSettings[setting] = parseInt(value);
      this.saveSettings();
    }
  },

  saveSettings: function() {
    try {
      const settingsToSave = {
        ...this.settings,
        timingSettings: this.timingSettings
      };
      localStorage.setItem('voiceSettings', JSON.stringify(settingsToSave));
    } catch (error) {
      console.error('Error saving voice settings:', error);
    }
  },

  loadSettings: function() {
    try {
      const saved = localStorage.getItem('voiceSettings');
      if (saved) {
        const parsedSettings = JSON.parse(saved);
        if (parsedSettings && typeof parsedSettings === 'object') {
          Object.assign(this.settings, parsedSettings);
          if (parsedSettings.timingSettings) {
            Object.assign(this.timingSettings, parsedSettings.timingSettings);
          }
        }
      }
    } catch (error) {
      console.error('Error loading voice settings:', error);
    }
  },

  loadVoices: function() {
    try {
      const voices = speechSynthesis.getVoices();
      console.log(`Found ${voices.length} voices:`, voices.map(v => `${v.name} (${v.lang})`));
      
      if (voices.length > 0) {
        this.availableVoices = voices;
        console.log('Voice selector populated successfully');
        
        this.populateVoiceSelect();
        
        setTimeout(() => {
          this.populateVoiceSelect();
        }, 100);
        
        setTimeout(() => {
          const voiceSelect = Utils.safeGetElement('voiceSelect');
          if (voiceSelect && voiceSelect.options.length <= 1) {
            console.log('Retrying voice population...');
            this.populateVoiceSelect();
          }
        }, 1000);
        
      } else {
        console.log('No voices available yet, will retry...');
      }
    } catch (error) {
      console.error('Error loading voices:', error);
    }
  },

  populateVoiceSelect: function() {
    const voiceSelect = Utils.safeGetElement('voiceSelect');
    if (!voiceSelect) {
      console.log('Voice select element not found, will retry later');
      setTimeout(() => {
        const retrySelect = Utils.safeGetElement('voiceSelect');
        if (retrySelect) {
          this.populateVoiceSelect();
        }
      }, 1000);
      return;
    }
    
    console.log('Populating voice select with', this.availableVoices.length, 'voices');
    
    voiceSelect.innerHTML = '<option value="">Select a voice...</option>';
    
    if (this.availableVoices.length === 0) {
      const option = document.createElement('option');
      option.value = '';
      option.textContent = 'Loading voices...';
      option.disabled = true;
      voiceSelect.appendChild(option);
      return;
    }
    
    this.availableVoices.forEach((voice, index) => {
      const option = document.createElement('option');
      option.value = index;
      option.textContent = `${voice.name} (${voice.lang})`;
      
      if (voice.default) {
        option.textContent += ' [Default]';
      }
      
      voiceSelect.appendChild(option);
    });
    
    if (this.settings.selectedVoice === null) {
      const englishVoiceIndex = this.availableVoices.findIndex(voice => 
        voice.lang.startsWith('en')
      );
      
      if (englishVoiceIndex !== -1) {
        voiceSelect.value = englishVoiceIndex;
        this.settings.selectedVoice = englishVoiceIndex;
        this.saveSettings();
        console.log('Auto-selected English voice:', this.availableVoices[englishVoiceIndex].name);
      }
    } else if (this.settings.selectedVoice !== null) {
      voiceSelect.value = this.settings.selectedVoice;
    }
    
    console.log('Voice selector populated with', this.availableVoices.length, 'voices');
    console.log('Voice select now has', voiceSelect.options.length, 'options');
  },

  refreshVoices: function() {
    console.log('Forcing voice refresh...');
    this.loadVoices();
    
    setTimeout(() => this.loadVoices(), 500);
    setTimeout(() => this.loadVoices(), 1000);
    setTimeout(() => this.loadVoices(), 2000);
  }
};

// ============================================================================
// ENHANCED SPEAK FUNCTIONS WITH CONTEXT AWARENESS
// ============================================================================

function speak(text, options = {}) {
  console.log('speak() called:', text);
  
  if (typeof VoiceSystem === 'undefined' || !VoiceSystem.isSupported) {
    console.log('Using fallback speech synthesis');
    try {
      if ('speechSynthesis' in window && text) {
        speechSynthesis.cancel();
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.rate = 0.9;
        utterance.volume = 0.7;
        speechSynthesis.speak(utterance);
        console.log('Fallback speech started');
      }
    } catch (error) {
      console.error('Fallback speech error:', error);
    }
  } else {
    VoiceSystem.speak(text, options);
  }
}

function speakTaskCompletion(taskText) {
  console.log('speakTaskCompletion called:', taskText);
  VoiceSystem.speakTaskCompletion(taskText);
}

function speakBehaviorEncouragement(behavior) {
  console.log('speakBehaviorEncouragement called:', behavior);
  VoiceSystem.speakBehaviorEncouragement(behavior);
}

function speakExerciseInstruction(instruction, isFirst = false) {
  console.log('speakExerciseInstruction called:', instruction);
  VoiceSystem.speakExerciseInstruction(instruction, isFirst);
}

function speakTimerComplete() {
  console.log('speakTimerComplete called');
  VoiceSystem.speakTimerComplete();
}

function speakError(message) {
  console.log('speakError called:', message);
  VoiceSystem.speakError(message);
}

function speakSuccess(message) {
  console.log('speakSuccess called:', message);
  VoiceSystem.speakSuccess(message);
}

function testVoice() {
  console.log('Testing voice immediately...');
  
  if ('speechSynthesis' in window) {
    console.log('Speech synthesis supported');
    
    const voices = speechSynthesis.getVoices();
    console.log('Available voices:', voices.length);
    
    if (voices.length === 0) {
      console.log('No voices loaded yet, trying to trigger loading...');
      speechSynthesis.getVoices();
      
      setTimeout(() => {
        const retryVoices = speechSynthesis.getVoices();
        console.log('Retry - Available voices:', retryVoices.length);
        if (retryVoices.length > 0) {
          console.log('Voices now available:', retryVoices.map(v => v.name));
        }
      }, 500);
    } else {
      console.log('Voices available:', voices.map(v => v.name));
    }
    
    try {
      speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance('Testing voice system. Can you hear me?');
      utterance.rate = 0.9;
      utterance.volume = 0.8;
      
      utterance.onstart = () => console.log('Speech started successfully');
      utterance.onend = () => console.log('Speech ended');
      utterance.onerror = (e) => console.error('Speech error:', e);
      
      speechSynthesis.speak(utterance);
      console.log('Test speech queued');
    } catch (error) {
      console.error('Error creating test speech:', error);
    }
  } else {
    console.log('Speech synthesis not supported in this browser');
  }
}

// ============================================================================
// ENHANCED TIMER SYSTEM
// ============================================================================

const TimerSystem = {
  state: {
    minutes: 25,
    seconds: 0,
    isRunning: false,
    startTime: null,
    duration: 0,
    intervalId: null,
    lastTickTime: null
  },

  settings: {
    focusTime: 25,
    shortBreak: 5,
    longBreak: 15,
    autoStartBreaks: false,
    soundEnabled: true
  },

  init: function() {
    this.loadSettings();
    this.updateDisplay();
    this.updateButtonLabels();
    
    document.addEventListener('visibilitychange', () => {
      if (!document.hidden && this.state.isRunning) {
        this.syncTimer();
      }
    });
  },

  syncTimer: function() {
    if (!this.state.isRunning || !this.state.startTime) return;
    
    const now = Date.now();
    const elapsed = Math.floor((now - this.state.startTime) / 1000);
    const remaining = Math.max(0, this.state.duration - elapsed);
    
    this.state.minutes = Math.floor(remaining / 60);
    this.state.seconds = remaining % 60;
    
    this.updateDisplay();
    
    if (remaining <= 0) {
      this.complete();
    }
  },

  start: function(minutes) {
    if (!Utils.validateTimerMinutes(minutes)) {
      this.showError('Invalid timer value. Please use 1-120 minutes.');
      return false;
    }

    this.stop();
    
    this.state.minutes = minutes;
    this.state.seconds = 0;
    this.state.duration = minutes * 60;
    this.state.startTime = Date.now();
    this.state.lastTickTime = Date.now();
    this.state.isRunning = true;

    Utils.safeSetText('timerStatus', `Timer running: ${minutes} minutes`);
    Utils.announceToScreenReader(`Timer started for ${minutes} minutes`);
    
    this.state.intervalId = setInterval(() => {
      this.tick();
    }, 100);

    this.updateDisplay();
    this.playStartSound();
    
    return true;
  },

  tick: function() {
    if (!this.state.isRunning) return;

    const now = Date.now();
    const elapsed = Math.floor((now - this.state.startTime) / 1000);
    const remaining = Math.max(0, this.state.duration - elapsed);
    
    this.state.minutes = Math.floor(remaining / 60);
    this.state.seconds = remaining % 60;
    this.state.lastTickTime = now;
    
    this.updateDisplay();

    if (remaining <= 0) {
      this.complete();
    }
  },

  complete: function() {
    this.stop();
    Utils.safeSetText('timerStatus', '');
    Utils.announceToScreenReader('Timer finished! Great job staying focused!');
    this.playCompleteSound();
    showSuccessMessage('Timer finished! Great job staying focused!');
    
    VoiceSystem.speakTimerComplete();
    
    const stopButton = document.querySelector('.timer-btn.stop');
    if (stopButton) {
      stopButton.focus();
    }
  },

  stop: function() {
    if (this.state.intervalId) {
      clearInterval(this.state.intervalId);
      this.state.intervalId = null;
    }
    
    this.state.isRunning = false;
    this.state.minutes = this.settings.focusTime;
    this.state.seconds = 0;
    this.state.startTime = null;
    this.state.lastTickTime = null;
    
    Utils.safeSetText('timerStatus', '');
    Utils.announceToScreenReader('Timer stopped');
    this.updateDisplay();
  },

  updateDisplay: function() {
    const timeString = Utils.formatTime(this.state.minutes, this.state.seconds);
    Utils.safeSetText('timerDisplay', timeString);
    
    if (this.state.isRunning) {
      document.title = `${timeString} - ADHD Helper`;
    } else {
      document.title = 'ADHD Helper';
    }
    
    const timerDisplay = Utils.safeGetElement('timerDisplay');
    if (timerDisplay) {
      timerDisplay.setAttribute('aria-label', `Timer: ${timeString}`);
    }
  },

  updateButtonLabels: function() {
    const focusBtn = document.querySelector('.timer-btn.work');
    const shortBreakBtn = document.querySelector('.timer-btn.break');
    const longBreakBtn = document.querySelector('.timer-btn.long-break');
    
    if (focusBtn) {
      focusBtn.textContent = `🎯 Focus (${this.settings.focusTime}min)`;
      focusBtn.onclick = () => this.start(this.settings.focusTime);
      focusBtn.setAttribute('aria-label', `Start ${this.settings.focusTime} minute focus timer`);
    }
    
    if (shortBreakBtn) {
      shortBreakBtn.textContent = `☕ Break (${this.settings.shortBreak}min)`;
      shortBreakBtn.onclick = () => this.start(this.settings.shortBreak);
      shortBreakBtn.setAttribute('aria-label', `Start ${this.settings.shortBreak} minute break timer`);
    }
    
    if (longBreakBtn) {
      longBreakBtn.textContent = `🌟 Long Break (${this.settings.longBreak}min)`;
      longBreakBtn.onclick = () => this.start(this.settings.longBreak);
      longBreakBtn.setAttribute('aria-label', `Start ${this.settings.longBreak} minute long break timer`);
    }
  },

  startCustom: function() {
    const customInput = Utils.safeGetElement('customTimerInput');
    if (!customInput) return;
    
    const minutes = parseInt(customInput.value);
    if (this.start(minutes)) {
      customInput.value = '';
    }
  },

  playStartSound: function() {
    if (this.settings.soundEnabled) {
      const tone = AudioManager.createTone(523, 0.5, 'sine');
      if (tone) tone.play();
    }
  },

  playCompleteSound: function() {
    if (this.settings.soundEnabled) {
      const tone = AudioManager.createTone(659, 2.0, 'sine');
      if (tone) tone.play();
    }
  },

  showError: function(message) {
    const errorEl = document.createElement('div');
    errorEl.className = 'timer-error';
    errorEl.textContent = message;
    errorEl.style.cssText = 'color: var(--error); margin: 0.5rem 0; font-weight: 600;';
    
    const timerStatus = Utils.safeGetElement('timerStatus');
    if (timerStatus) {
      timerStatus.appendChild(errorEl);
      setTimeout(() => {
        if (errorEl.parentNode) {
          errorEl.remove();
        }
      }, 3000);
    }
    
    Utils.announceToScreenReader(message);
  },

  openSettings: function() {
    const modal = Utils.safeGetElement('timerSettingsModal');
    if (!modal) {
      this.showError('Timer settings modal not found.');
      return;
    }
    
    this.loadSettingsValues();
    modal.style.display = 'block';
    modal.setAttribute('aria-hidden', 'false');
    document.body.style.overflow = 'hidden';
    
    const firstInput = modal.querySelector('input');
    if (firstInput) {
      setTimeout(() => firstInput.focus(), 100);
    }
  },

  closeSettings: function() {
    const modal = Utils.safeGetElement('timerSettingsModal');
    if (modal) {
      modal.style.display = 'none';
      modal.setAttribute('aria-hidden', 'true');
      document.body.style.overflow = '';
    }
  },

  loadSettingsValues: function() {
    const inputs = {
      focusTimeInput: this.settings.focusTime,
      shortBreakInput: this.settings.shortBreak,
      longBreakInput: this.settings.longBreak,
      autoStartBreaks: this.settings.autoStartBreaks,
      timerSoundEnabled: this.settings.soundEnabled
    };
    
    Object.entries(inputs).forEach(([id, value]) => {
      const element = Utils.safeGetElement(id);
      if (element) {
        if (element.type === 'checkbox') {
          element.checked = value;
        } else {
          element.value = value;
        }
      }
    });
  },

  saveSettingsFromForm: function() {
    const focusTime = parseInt(Utils.safeGetElement('focusTimeInput')?.value) || 25;
    const shortBreak = parseInt(Utils.safeGetElement('shortBreakInput')?.value) || 5;
    const longBreak = parseInt(Utils.safeGetElement('longBreakInput')?.value) || 15;
    const autoStartBreaks = Utils.safeGetElement('autoStartBreaks')?.checked || false;
    const soundEnabled = Utils.safeGetElement('timerSoundEnabled')?.checked || true;
    
    if (focusTime < 5 || focusTime > 90) {
      this.showError('Focus time must be between 5 and 90 minutes');
      return false;
    }
    
    if (shortBreak < 2 || shortBreak > 30) {
      this.showError('Short break must be between 2 and 30 minutes');
      return false;
    }
    
    if (longBreak < 5 || longBreak > 60) {
      this.showError('Long break must be between 5 and 60 minutes');
      return false;
    }
    
    this.settings = {
      focusTime,
      shortBreak,
      longBreak,
      autoStartBreaks,
      soundEnabled
    };
    
    this.updateButtonLabels();
    this.saveSettings();
    this.closeSettings();
    showSuccessMessage('Timer settings saved successfully!');
    
    return true;
  },

  resetSettings: function() {
    if (confirm('Reset all timer settings to default values?')) {
      this.settings = {
        focusTime: 25,
        shortBreak: 5,
        longBreak: 15,
        autoStartBreaks: false,
        soundEnabled: true
      };
      
      this.loadSettingsValues();
      this.updateButtonLabels();
      this.saveSettings();
      showSuccessMessage('Settings reset to defaults!');
    }
  },

  saveSettings: function() {
    try {
      localStorage.setItem('timerSettings', JSON.stringify(this.settings));
    } catch (error) {
      console.error('Error saving timer settings:', error);
      this.showError('Failed to save timer settings');
    }
  },

  loadSettings: function() {
    try {
      const saved = localStorage.getItem('timerSettings');
      if (saved) {
        const parsedSettings = JSON.parse(saved);
        if (parsedSettings && typeof parsedSettings === 'object') {
          Object.assign(this.settings, parsedSettings);
        }
      }
    } catch (error) {
      console.error('Error loading timer settings:', error);
    }
  }
};

// ============================================================================
// ENHANCED THEME MANAGER - FIXED
// ============================================================================

const ThemeManager = {
  themes: {
    light: {
      name: 'Light',
     // description: 'Clean and bright',
      colors: {
        '--bg-primary': '#ffffff',
        '--bg-secondary': '#f8f9fa',
        '--text-primary': '#333333',
        '--text-secondary': '#666666',
        '--accent-primary': '#4CAF50',
        '--accent-secondary': '#2196F3',
        '--border-color': '#e1e5e9',
        '--shadow': 'rgba(0,0,0,0.1)'
      }
    },
    dark: {
      name: 'Dark',
      //description: 'Easy on the eyes',
      colors: {
        '--bg-primary': '#1a1a1a',
        '--bg-secondary': '#2d2d2d',
        '--text-primary': '#ffffff',
        '--text-secondary': '#cccccc',
        '--accent-primary': '#4CAF50',
        '--accent-secondary': '#64B5F6',
        '--border-color': '#444444',
        '--shadow': 'rgba(0,0,0,0.3)'
      }
    },
    ocean: {
      name: 'Ocean',
      description: 'Calming blue tones',
      colors: {
        '--bg-primary': '#f0f8ff',
        '--bg-secondary': '#e6f3ff',
        '--text-primary': '#1e3a5f',
        '--text-secondary': '#4a6fa5',
        '--accent-primary': '#0077be',
        '--accent-secondary': '#4fc3f7',
        '--border-color': '#b3d9ff',
        '--shadow': 'rgba(0,119,190,0.1)'
      }
    },
    forest: {
      name: 'Forest',
      description: 'Natural green shades',
      colors: {
        '--bg-primary': '#f8fff8',
        '--bg-secondary': '#f0f8f0',
        '--text-primary': '#2d4a2d',
        '--text-secondary': '#4a6b4a',
        '--accent-primary': '#388e3c',
        '--accent-secondary': '#66bb6a',
        '--border-color': '#c8e6c9',
        '--shadow': 'rgba(56,142,60,0.1)'
      }
    },
    sunset: {
      name: 'Sunset',
      description: 'Warm and cozy',
      colors: {
        '--bg-primary': '#fff8f0',
        '--bg-secondary': '#fff3e0',
        '--text-primary': '#5d3a1a',
        '--text-secondary': '#8d5524',
        '--accent-primary': '#ff6f00',
        '--accent-secondary': '#ffb74d',
        '--border-color': '#ffcc80',
        '--shadow': 'rgba(255,111,0,0.1)'
      }
    },
    lavender: {
      name: 'Lavender',
      description: 'Soft and soothing',
      colors: {
        '--bg-primary': '#faf8ff',
        '--bg-secondary': '#f3f0ff',
        '--text-primary': '#4a4058',
        '--text-secondary': '#6b5b73',
        '--accent-primary': '#7b1fa2',
        '--accent-secondary': '#ba68c8',
        '--border-color': '#d1c4e9',
        '--shadow': 'rgba(123,31,162,0.1)'
      }
    },
    mint: {
      name: 'Mint',
      description: 'Fresh and clean',
      colors: {
        '--bg-primary': '#f8fffc',
        '--bg-secondary': '#f0fff8',
        '--text-primary': '#1b4332',
        '--text-secondary': '#2d5a3d',
        '--accent-primary': '#00695c',
        '--accent-secondary': '#4db6ac',
        '--border-color': '#b2dfdb',
        '--shadow': 'rgba(0,105,92,0.1)'
      }
    },
    rose: {
      name: 'Rose',
      description: 'Gentle pink tones',
      colors: {
        '--bg-primary': '#fff8f8',
        '--bg-secondary': '#fff0f0',
        '--text-primary': '#5d2d2d',
        '--text-secondary': '#8d4040',
        '--accent-primary': '#c2185b',
        '--accent-secondary': '#f06292',
        '--border-color': '#f8bbd9',
        '--shadow': 'rgba(194,24,91,0.1)'
      }
    },
    high_contrast: {
      name: 'High Contrast',
      description: 'Maximum readability',
      colors: {
        '--bg-primary': '#ffffff',
        '--bg-secondary': '#f0f0f0',
        '--text-primary': '#000000',
        '--text-secondary': '#333333',
        '--accent-primary': '#000080',
        '--accent-secondary': '#800080',
        '--border-color': '#000000',
        '--shadow': 'rgba(0,0,0,0.5)'
      }
    }
  },

  currentTheme: 'light',

  init: function() {
    this.currentTheme = AppState.settings.theme || 'light';
    this.applyTheme(this.currentTheme);
  },

  applyTheme: function(themeName) {
    const theme = this.themes[themeName];
    if (!theme) {
      console.warn(`Theme ${themeName} not found, using light theme`);
      themeName = 'light';
    }

    const root = document.documentElement;
    const selectedTheme = this.themes[themeName];
    
    Object.entries(selectedTheme.colors).forEach(([property, value]) => {
      root.style.setProperty(property, value);
    });

    document.body.setAttribute('data-theme', themeName);
    
    if (themeName === 'high_contrast') {
      document.body.classList.add('high-contrast');
    } else {
      document.body.classList.remove('high-contrast');
    }

    this.currentTheme = themeName;
    
    Utils.announceToScreenReader(`Theme changed to ${selectedTheme.name}`);
  },

  createThemeSelector: function() {
    const container = document.createElement('div');
    container.className = 'theme-selector';
    container.setAttribute('role', 'group');
    container.setAttribute('aria-label', 'Theme selection');

    Object.entries(this.themes).forEach(([key, theme]) => {
      const themeBtn = document.createElement('button');
      themeBtn.className = `theme-btn ${key} ${this.currentTheme === key ? 'active' : ''}`;
      themeBtn.setAttribute('role', 'radio');
      themeBtn.setAttribute('aria-checked', this.currentTheme === key);
      themeBtn.setAttribute('aria-label', `${theme.name} theme: ${theme.description}`);
      
      themeBtn.innerHTML = `
        <div style="font-weight: bold; margin-bottom: 0.25rem;">${theme.name}</div>
        <div style="font-size: 0.8rem; opacity: 0.8;">${theme.description || ''}</div>
      `;
      
      themeBtn.onclick = () => this.changeTheme(key);
      
      const preview = document.createElement('div');
      preview.style.cssText = `
        display: flex;
        justify-content: center;
        gap: 3px;
        margin-top: 0.5rem;
      `;
      
      const colors = theme.colors;
      [colors['--accent-primary'], colors['--accent-secondary'], colors['--bg-secondary']].forEach(color => {
        const colorDot = document.createElement('div');
        colorDot.style.cssText = `
          width: 12px;
          height: 12px;
          border-radius: 50%;
          background: ${color};
          border: 1px solid ${colors['--border-color']};
        `;
        colorDot.setAttribute('aria-hidden', 'true');
        preview.appendChild(colorDot);
      });
      
      themeBtn.appendChild(preview);
      container.appendChild(themeBtn);
    });

    return container;
  },

  changeTheme: function(themeName) {
    this.applyTheme(themeName);
    
    const currentProfile = AppState.currentProfile ? 
      AppState.profiles.find(p => p.id === AppState.currentProfile) : null;
    
    if (currentProfile) {
      currentProfile.preferredTheme = themeName;
      showSuccessMessage(`Theme '${this.themes[themeName].name}' saved for ${currentProfile.name}`);
    } else {
      AppState.settings.theme = themeName;
      showSuccessMessage(`Global theme changed to '${this.themes[themeName].name}'`);
    }
    
    AppState.saveData();
    this.updateActiveButton(themeName);
  },

  updateActiveButton: function(themeName) {
    document.querySelectorAll('.theme-btn').forEach(btn => {
      btn.classList.remove('active');
      btn.setAttribute('aria-checked', 'false');
    });
    
    const activeBtn = document.querySelector(`.theme-btn.${themeName}`);
    if (activeBtn) {
      activeBtn.classList.add('active');
      activeBtn.setAttribute('aria-checked', 'true');
    }
  },

  loadProfileTheme: function() {
    const currentProfile = AppState.currentProfile ? 
      AppState.profiles.find(p => p.id === AppState.currentProfile) : null;
    
    let themeToUse = 'light';
    
    if (currentProfile && currentProfile.preferredTheme) {
      themeToUse = currentProfile.preferredTheme;
    } else {
      themeToUse = AppState.settings.theme || 'light';
    }
    
    this.applyTheme(themeToUse);
    this.currentTheme = themeToUse;
  }
};

// ============================================================================
// ENHANCED APPLICATION STATE
// ============================================================================

const AppState = {
  currentProfile: null,
  profiles: [],
  settings: {
    theme: 'light',
    fontSize: 16,
    highContrast: false,
    taskPoints: 5,
    behaviorPoints: 3,
    parentPin: null
  },
  routines: [],
  currentView: 'list',

  init: function() {
    this.loadData();
    if (!this.settings.parentPin) {
      this.settings.parentPin = Utils.hashPin('1234');
      this.saveData();
    }
  },

  validateParentPin: function(inputPin) {
    if (!inputPin || !this.settings.parentPin) return false;
    const hashedInput = Utils.hashPin(inputPin);
    return hashedInput === this.settings.parentPin;
  },

  changeParentPin: function(currentPin, newPin) {
    if (!this.validateParentPin(currentPin)) {
      return { success: false, error: 'Current PIN is incorrect' };
    }
    
    if (!/^\d{4}$/.test(newPin)) {
      return { success: false, error: 'New PIN must be exactly 4 digits' };
    }
    
    this.settings.parentPin = Utils.hashPin(newPin);
    this.saveData();
    return { success: true };
  },

  saveData: function() {
    try {
      const dataToSave = {
        currentProfile: this.currentProfile,
        profiles: this.profiles || [],
        settings: this.settings || {},
        routines: this.routines || [],
        currentView: this.currentView || 'list',
        version: '1.0',
        lastSaved: new Date().toISOString()
      };
      
      const serialized = JSON.stringify(dataToSave);
      
      if (serialized.length > 5000000) {
        console.warn('Data size is approaching localStorage limits');
        this.cleanupOldData();
      }
      
      localStorage.setItem('adhdAppData', serialized);
      return true;
    } catch (error) {
      console.error('Error saving app data:', error);
      if (error.name === 'QuotaExceededError') {
        showErrorMessage('Storage quota exceeded. Please clear some data.');
        this.handleStorageQuotaExceeded();
      }
      return false;
    }
  },

  loadData: function() {
    try {
      const savedData = localStorage.getItem('adhdAppData');
      if (savedData) {
        const data = JSON.parse(savedData);
        
        if (!this.validateDataStructure(data)) {
          console.warn('Invalid data structure, resetting to defaults');
          this.resetToDefaults();
          return false;
        }
        
        this.currentProfile = data.currentProfile || null;
        this.profiles = Array.isArray(data.profiles) ? data.profiles : [];
        this.settings = Object.assign({
          theme: 'light',
          fontSize: 16,
          highContrast: false,
          taskPoints: 5,
          behaviorPoints: 3,
          parentPin: null
        }, data.settings || {});
        this.routines = Array.isArray(data.routines) ? data.routines : [];
        this.currentView = data.currentView || 'list';
        
        this.sanitizeLoadedData();
        
        return true;
      } else {
        this.resetToDefaults();
        return false;
      }
    } catch (error) {
      console.error('Error loading app data:', error);
      this.resetToDefaults();
      return false;
    }
  },

  validateDataStructure: function(data) {
    if (!data || typeof data !== 'object') return false;
    if (!Array.isArray(data.profiles)) return false;
    if (!data.settings || typeof data.settings !== 'object') return false;
    return true;
  },

  sanitizeLoadedData: function() {
    this.profiles.forEach(profile => {
      if (profile.name) {
        profile.name = Utils.sanitizeInput(profile.name, 50);
      }
      if (profile.tasks && Array.isArray(profile.tasks)) {
        profile.tasks.forEach(task => {
          if (task.text) {
            task.text = Utils.sanitizeInput(task.text, 200);
          }
        });
      }
    });
  },

  resetToDefaults: function() {
    this.currentProfile = null;
    this.profiles = [];
    this.settings = {
      theme: 'light',
      fontSize: 16,
      highContrast: false,
      taskPoints: 5,
      behaviorPoints: 3,
      parentPin: Utils.hashPin('1234')
    };
    this.routines = [];
    this.currentView = 'list';
  },

  cleanupOldData: function() {
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    
    this.profiles.forEach(profile => {
      if (profile.tasks) {
        profile.tasks = profile.tasks.filter(task => {
          if (task.completed && task.dateCompleted) {
            return new Date(task.dateCompleted) > thirtyDaysAgo;
          }
          return true;
        });
      }
      
      if (profile.behaviors && profile.behaviors.length > 100) {
        profile.behaviors = profile.behaviors.slice(-100);
      }
    });
  },

  handleStorageQuotaExceeded: function() {
    if (confirm('Storage is full. Would you like to clean up old data automatically?')) {
      this.cleanupOldData();
      if (this.saveData()) {
        showSuccessMessage('Old data cleaned up successfully');
      } else {
        showErrorMessage('Unable to free up storage space');
      }
    }
  },

  exportData: function() {
    try {
      const dataToExport = {
        profiles: this.profiles,
        settings: { ...this.settings, parentPin: undefined },
        routines: this.routines,
        exportDate: new Date().toISOString(),
        version: '1.0'
      };
      
      return JSON.stringify(dataToExport, null, 2);
    } catch (error) {
      console.error('Error exporting data:', error);
      return null;
    }
  },

  importData: function(dataString) {
    try {
      const importedData = JSON.parse(dataString);
      
      if (!this.validateDataStructure(importedData)) {
        return { success: false, error: 'Invalid data format' };
      }
      
      if (importedData.profiles && Array.isArray(importedData.profiles)) {
        this.profiles = [...this.profiles, ...importedData.profiles];
      }
      
      if (importedData.routines && Array.isArray(importedData.routines)) {
        this.routines = [...this.routines, ...importedData.routines];
      }
      
      this.sanitizeLoadedData();
      this.saveData();
      
      return { success: true };
    } catch (error) {
      console.error('Error importing data:', error);
      return { success: false, error: 'Failed to parse imported data' };
    }
  }
};
// ============================================================================
// Timer Functions
function startTimer(minutes) {
  return TimerSystem.start(minutes);
}

function stopTimer() {
  TimerSystem.stop();
}

function updateTimerDisplay() {
  TimerSystem.updateDisplay();
}

function startCustomTimer() {
  TimerSystem.startCustom();
}

function openTimerSettings() {
  TimerSystem.openSettings();
}

function closeTimerSettings() {
  TimerSystem.closeSettings();
}

function saveTimerSettings() {
  return TimerSystem.saveSettingsFromForm();
}

function resetTimerSettings() {
  TimerSystem.resetSettings();
}

// Theme Functions
function changeTheme(theme) {
  ThemeManager.changeTheme(theme);
}

function showThemeSelector() {
  const existingModal = document.querySelector('.theme-selector-modal');
  if (existingModal) {
    existingModal.remove();
  }

  const selector = ThemeManager.createThemeSelector();
  
  const modal = document.createElement('div');
  modal.className = 'theme-selector-modal';
  modal.setAttribute('role', 'dialog');
  modal.setAttribute('aria-labelledby', 'theme-modal-title');
  modal.setAttribute('aria-modal', 'true');
  modal.style.cssText = `
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: rgba(0,0,0,0.6);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: var(--z-modal);
    backdrop-filter: blur(4px);
  `;
  
  const content = document.createElement('div');
  content.style.cssText = `
    background: var(--bg-primary);
    padding: 2rem;
    border-radius: 12px;
    max-width: 90%;
    max-height: 90%;
    overflow-y: auto;
    box-shadow: 0 20px 40px var(--shadow);
    border: 2px solid var(--accent-primary);
  `;
  
  const currentProfile = AppState.currentProfile ? 
    AppState.profiles.find(p => p.id === AppState.currentProfile) : null;
  
  const headerText = currentProfile ? 
    `Choose Theme for ${currentProfile.name}` : 
    'Choose Global Theme';
  
  content.innerHTML = `
    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1rem;">
      <h3 id="theme-modal-title" style="margin: 0; color: var(--text-primary);">${headerText}</h3>
      <button onclick="closeThemeSelector()" style="
        background: var(--accent-secondary); color: white; border: none;
        padding: 0.5rem 1rem; border-radius: 5px; cursor: pointer;
        font-size: 1rem; font-weight: bold;
      " aria-label="Close theme selector">✕ Close</button>
    </div>
    <p style="color: var(--text-secondary); margin-bottom: 1.5rem; font-size: 0.9rem;">
      ${currentProfile ? 'This theme will be saved for this profile only.' : 'Select a profile first to save themes per child.'}
    </p>
  `;
  content.appendChild(selector);
  
  if (currentProfile) {
    const resetBtn = document.createElement('button');
    resetBtn.textContent = 'Reset to Global Theme';
    resetBtn.style.cssText = `
      margin-top: 1rem;
      padding: 0.5rem 1rem;
      background: var(--accent-color);
      color: white;
      border: none;
      border-radius: 5px;
      cursor: pointer;
      font-size: 0.9rem;
    `;
    resetBtn.setAttribute('aria-label', 'Reset this profile to use the global theme');
    resetBtn.onclick = () => {
      delete currentProfile.preferredTheme;
      AppState.saveData();
      ThemeManager.applyTheme(AppState.settings.theme || 'light');
      showSuccessMessage('Profile theme reset to global theme');
      setTimeout(() => showThemeSelector(), 100);
    };
    content.appendChild(resetBtn);
  }
  
  modal.appendChild(content);
  
  modal.onclick = (e) => {
    if (e.target === modal) closeThemeSelector();
  };
  
  const handleEscape = (e) => {
    if (e.key === 'Escape') {
      closeThemeSelector();
      document.removeEventListener('keydown', handleEscape);
    }
  };
  document.addEventListener('keydown', handleEscape);
  
  document.body.appendChild(modal);
  
  setTimeout(() => {
    const firstThemeButton = modal.querySelector('.theme-btn');
    if (firstThemeButton) {
      firstThemeButton.focus();
    }
  }, 100);
}

function closeThemeSelector() {
  const modal = document.querySelector('.theme-selector-modal');
  if (modal) {
    modal.remove();
  }
}

// Accessibility Functions
function increaseFontSize() {
  if (AppState.settings.fontSize < 24) {
    AppState.settings.fontSize += 2;
    updateUI();
    AppState.saveData();
    showSuccessMessage('Font size increased');
    Utils.announceToScreenReader('Font size increased');
  }
}

function decreaseFontSize() {
  if (AppState.settings.fontSize > 12) {
    AppState.settings.fontSize -= 2;
    updateUI();
    AppState.saveData();
    showSuccessMessage('Font size decreased');
    Utils.announceToScreenReader('Font size decreased');
  }
}

function toggleHighContrast() {
  AppState.settings.highContrast = !AppState.settings.highContrast;
  updateUI();
  AppState.saveData();
  const status = AppState.settings.highContrast ? 'enabled' : 'disabled';
  showSuccessMessage(`High contrast ${status}`);
  Utils.announceToScreenReader(`High contrast mode ${status}`);
}

function updateUI() {
  document.body.setAttribute('data-theme', AppState.settings.theme);
  document.body.style.fontSize = AppState.settings.fontSize + 'px';
  
  if (AppState.settings.highContrast) {
    document.body.classList.add('high-contrast');
  } else {
    document.body.classList.remove('high-contrast');
  }
}

// ============================================================================

// ============================================================================



// The file should end with:

document.addEventListener('DOMContentLoaded', function() {
  console.log('DOM Content Loaded - Initializing app...');
  
  AppState.init();
  ThemeManager.init();
  TimerSystem.init();
  VoiceSystem.init();
  
  populateProfileSelector();
  
  if (AppState.currentProfile) {
    switchProfile(AppState.currentProfile);
  }
  
  if (AppState.profiles.length === 0) {
    showWelcomePanel();
  }
  
  updateUI();
  
  console.log('App initialized successfully');
});
 // Enhanced chart with better accessibility
 


function createBehaviorChart(profile) {
  console.log('Creating behavior chart...');
  const chartContainer = getOrCreateChartContainer('behaviorChart', 'Positive Behaviors');
  
  const behaviors = profile.behaviors || [];
  const last7Days = getLast7DaysData(behaviors);
  console.log('Behavior data for last 7 days:', last7Days);
  
  const maxCount = Math.max(...last7Days.map(d => d.count), 1);
  
  chartContainer.innerHTML = `
    <div style="text-align: center; margin-bottom: 1rem;">
      <h4 style="margin: 0; color: var(--text-primary); font-size: 1.2rem;">Weekly Behavior Tracking</h4>
      <p style="margin: 0.5rem 0; color: var(--text-secondary);">Positive behaviors per day</p>
    </div>
    <div style="display: flex; align-items: end; justify-content: space-between; height: 150px; padding: 1rem; background: var(--bg-secondary); border-radius: 8px;"
         role="img" aria-label="Bar chart showing daily positive behavior counts for the past week">
      ${last7Days.map((day, index) => `
        <div style="display: flex; flex-direction: column; align-items: center; flex: 1;">
          <div style="background: var(--accent-secondary); width: 20px; margin-bottom: 0.5rem; border-radius: 4px 4px 0 0;
                      height: ${Math.max((day.count / maxCount) * 100, 5)}px; transition: height 0.5s ease;"
               aria-label="${day.day}: ${day.count} behaviors"></div>
          <div style="font-size: 0.8rem; color: var(--text-secondary);">${day.day}</div>
          <div style="font-size: 0.7rem; color: var(--text-primary); font-weight: bold;">${day.count}</div>
        </div>
      `).join('')}
    </div>
  `;
  
  console.log('Behavior chart HTML set');
}

function createPointsChart(profile) {
  console.log('Creating points chart...');
  const chartContainer = getOrCreateChartContainer('pointsChart', 'Points Progress');
  
  const totalPoints = profile.rewardPoints || 0;
  const goalPoints = 100;
  const percentage = Math.min((totalPoints / goalPoints) * 100, 100);
  
  console.log('Total points:', totalPoints);
  
  chartContainer.innerHTML = `
    <div style="text-align: center; margin-bottom: 1rem;">
      <h4 style="margin: 0; color: var(--text-primary); font-size: 1.2rem;">Points Earned</h4>
      <p style="margin: 0.5rem 0; color: var(--text-secondary);" role="status" aria-live="polite">
        Total: ${totalPoints} points
      </p>
    </div>
    <div style="height: 100px; background: var(--bg-secondary); border-radius: 8px; padding: 1rem; position: relative; overflow: hidden;"
         role="progressbar" aria-valuenow="${totalPoints}" aria-valuemin="0" aria-valuemax="${goalPoints}" aria-label="Points progress">
      <div style="position: absolute; bottom: 0; left: 0; right: 0; height: 100%; 
                  background: linear-gradient(to top, var(--accent-primary), var(--accent-secondary)); 
                  width: ${percentage}%; 
                  transition: width 1s ease; border-radius: 0 0 8px 8px;"></div>
      <div style="position: relative; z-index: 1; text-align: center; line-height: 70px; 
                  font-size: 1.5rem; font-weight: bold; color: white; text-shadow: 0 1px 3px rgba(0,0,0,0.5);">
        ${totalPoints} / ${goalPoints}
      </div>
    </div>
  `;
  
  console.log('Points chart HTML set');
}

function createWeeklyProgressChart(profile) {
  console.log('Creating weekly chart...');
  const chartContainer = getOrCreateChartContainer('weeklyChart', 'Weekly Overview');
  
  const tasks = profile.tasks || [];
  const behaviors = profile.behaviors || [];
  
  const thisWeekTasks = getThisWeekData(tasks, 'dateCompleted');
  const thisWeekBehaviors = getThisWeekData(behaviors, 'time');
  
  console.log('This week stats - Tasks:', thisWeekTasks, 'Behaviors:', thisWeekBehaviors);
  
  chartContainer.innerHTML = `
    <div style="text-align: center; margin-bottom: 1rem;">
      <h4 style="margin: 0; color: var(--text-primary); font-size: 1.2rem;">This Week's Summary</h4>
    </div>
    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem;">
      <div style="text-align: center; padding: 1rem; background: var(--bg-secondary); border-radius: 8px;"
           role="status" aria-label="Tasks completed this week">
        <div style="font-size: 2rem; color: var(--accent-primary); font-weight: bold;">${thisWeekTasks}</div>
        <div style="font-size: 0.9rem; color: var(--text-secondary);">Tasks Completed</div>
      </div>
      <div style="text-align: center; padding: 1rem; background: var(--bg-secondary); border-radius: 8px;"
           role="status" aria-label="Positive behaviors this week">
        <div style="font-size: 2rem; color: var(--accent-secondary); font-weight: bold;">${thisWeekBehaviors}</div>
        <div style="font-size: 0.9rem; color: var(--text-secondary);">Positive Behaviors</div>
      </div>
    </div>
  `;
  
  console.log('Weekly chart HTML set');
}

function getOrCreateChartContainer(id, title) {
  console.log('Getting/creating container for:', id);
  
  let container = document.getElementById(id);
  
  if (!container) {
    console.log('Container not found, creating new one');
    
    container = document.createElement('div');
    container.id = id;
    container.className = 'chart-container';
    container.style.cssText = `
      margin: 1rem 0; 
      padding: 1.5rem; 
      border: 2px solid var(--border-color); 
      border-radius: 12px; 
      background: var(--bg-primary);
      box-shadow: 0 4px 8px var(--shadow);
      min-height: 200px;
      display: block;
      visibility: visible;
      opacity: 1;
    `;
    
    // Use the existing chartsContainer from HTML instead of creating a new one
    let chartsContainer = document.getElementById('chartsContainer');
    
    if (!chartsContainer) {
      console.log('Charts container not found in HTML, creating fallback');
      chartsContainer = document.createElement('div');
      chartsContainer.id = 'chartsContainer';
      chartsContainer.style.cssText = `
        margin: 2rem auto; 
        padding: 2rem;
        max-width: 1200px;
        background: var(--bg-secondary);
        border-radius: 12px;
        box-shadow: 0 2px 10px var(--shadow);
        display: block;
        visibility: visible;
      `;
      
      const mainContent = document.querySelector('main') || 
                         document.querySelector('.container') ||
                         document.querySelector('.dashboard') ||
                         document.body;
      
      mainContent.appendChild(chartsContainer);
    } else {
      // Clear the placeholder text when adding first chart
      const placeholder = chartsContainer.querySelector('p');
      if (placeholder && placeholder.textContent.includes('Select a profile')) {
        placeholder.remove();
      }
    }
    
    chartsContainer.appendChild(container);
    console.log('Chart container created and appended to existing charts section');
  }
  
  return container;
}

// Helper functions for chart data
function getLast7DaysData(behaviors) {
  const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const last7Days = [];
  
  for (let i = 6; i >= 0; i--) {
    const date = new Date();
    date.setDate(date.getDate() - i);
    const dayName = days[date.getDay()];
    
    const count = behaviors.filter(b => {
      if (!b.time) return false;
      const behaviorDate = new Date(b.time);
      return behaviorDate.toDateString() === date.toDateString();
    }).length;
    
    last7Days.push({ day: dayName, count });
  }
  
  return last7Days;
}

function getThisWeekData(items, dateField) {
  const now = new Date();
  const weekStart = new Date(now.setDate(now.getDate() - now.getDay()));
  weekStart.setHours(0, 0, 0, 0);
  
  return items.filter(item => {
    if (!item[dateField]) return false;
    try {
      const itemDate = new Date(item[dateField]);
      return itemDate >= weekStart && itemDate <= new Date();
    } catch (error) {
      console.warn('Invalid date in item:', item);
      return false;
    }
  }).length;
}

function clearAllCharts() {
  const chartIds = ['taskProgressChart', 'behaviorChart', 'pointsChart', 'weeklyChart'];
  chartIds.forEach(id => {
    const chart = document.getElementById(id);
    if (chart) {
      chart.innerHTML = '<p style="text-align: center; color: var(--text-secondary);">Select a profile to view progress charts</p>';
    }
  });
}

// ============================================================================
// TIMER FUNCTIONS
// ============================================================================

function startTimer(minutes) {
  return TimerSystem.start(minutes);
}

function stopTimer() {
  TimerSystem.stop();
}

function updateTimerDisplay() {
  TimerSystem.updateDisplay();
}

function startCustomTimer() {
  TimerSystem.startCustom();
}

function openTimerSettings() {
  TimerSystem.openSettings();
}

function closeTimerSettings() {
  TimerSystem.closeSettings();
}

function saveTimerSettings() {
  return TimerSystem.saveSettingsFromForm();
}

function resetTimerSettings() {
  TimerSystem.resetSettings();
}

// ============================================================================
// THEME FUNCTIONS
// ============================================================================

function changeTheme(theme) {
  ThemeManager.changeTheme(theme);
}

function showThemeSelector() {
  const existingModal = document.querySelector('.theme-selector-modal');
  if (existingModal) {
    existingModal.remove();
  }

  const selector = ThemeManager.createThemeSelector();
  
  const modal = document.createElement('div');
  modal.className = 'theme-selector-modal';
  modal.setAttribute('role', 'dialog');
  modal.setAttribute('aria-labelledby', 'theme-modal-title');
  modal.setAttribute('aria-modal', 'true');
  modal.style.cssText = `
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: rgba(0,0,0,0.6);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: var(--z-modal);
    backdrop-filter: blur(4px);
  `;
  
  const content = document.createElement('div');
  content.style.cssText = `
    background: var(--bg-primary);
    padding: 2rem;
    border-radius: 12px;
    max-width: 90%;
    max-height: 90%;
    overflow-y: auto;
    box-shadow: 0 20px 40px var(--shadow);
    border: 2px solid var(--accent-primary);
  `;
  
  const currentProfile = AppState.currentProfile ? 
    AppState.profiles.find(p => p.id === AppState.currentProfile) : null;
  
  const headerText = currentProfile ? 
    `Choose Theme for ${currentProfile.name}` : 
    'Choose Global Theme';
  
  content.innerHTML = `
    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1rem;">
      <h3 id="theme-modal-title" style="margin: 0; color: var(--text-primary);">${headerText}</h3>
      <button onclick="closeThemeSelector()" style="
        background: var(--accent-secondary); color: white; border: none;
        padding: 0.5rem 1rem; border-radius: 5px; cursor: pointer;
        font-size: 1rem; font-weight: bold;
      " aria-label="Close theme selector">✕ Close</button>
    </div>
    <p style="color: var(--text-secondary); margin-bottom: 1.5rem; font-size: 0.9rem;">
      ${currentProfile ? 'This theme will be saved for this profile only.' : 'Select a profile first to save themes per child.'}
    </p>
  `;
  content.appendChild(selector);
  
  if (currentProfile) {
    const resetBtn = document.createElement('button');
    resetBtn.textContent = 'Reset to Global Theme';
    resetBtn.style.cssText = `
      margin-top: 1rem;
      padding: 0.5rem 1rem;
      background: var(--accent-color);
      color: white;
      border: none;
      border-radius: 5px;
      cursor: pointer;
      font-size: 0.9rem;
    `;
    resetBtn.setAttribute('aria-label', 'Reset this profile to use the global theme');
    resetBtn.onclick = () => {
      delete currentProfile.preferredTheme;
      AppState.saveData();
      ThemeManager.applyTheme(AppState.settings.theme || 'light');
      showSuccessMessage('Profile theme reset to global theme');
      setTimeout(() => showThemeSelector(), 100);
    };
    content.appendChild(resetBtn);
  }
  
  modal.appendChild(content);
  
  // Close on background click
  modal.onclick = (e) => {
    if (e.target === modal) closeThemeSelector();
  };
  
  // Close on Escape key
  const handleEscape = (e) => {
    if (e.key === 'Escape') {
      closeThemeSelector();
      document.removeEventListener('keydown', handleEscape);
    }
  };
  document.addEventListener('keydown', handleEscape);
  
  document.body.appendChild(modal);
  
  // Focus management
  setTimeout(() => {
    const firstThemeButton = modal.querySelector('.theme-btn');
    if (firstThemeButton) {
      firstThemeButton.focus();
    }
  }, 100);
}

function closeThemeSelector() {
  const modal = document.querySelector('.theme-selector-modal');
  if (modal) {
    modal.remove();
  }
}

// ============================================================================
// ACCESSIBILITY FUNCTIONS
// ============================================================================

function increaseFontSize() {
  if (AppState.settings.fontSize < 24) {
    AppState.settings.fontSize += 2;
    updateUI();
    AppState.saveData();
    showSuccessMessage('Font size increased');
    Utils.announceToScreenReader('Font size increased');
  }
}

function decreaseFontSize() {
  if (AppState.settings.fontSize > 12) {
    AppState.settings.fontSize -= 2;
    updateUI();
    AppState.saveData();
    showSuccessMessage('Font size decreased');
    Utils.announceToScreenReader('Font size decreased');
  }
}

function toggleHighContrast() {
  AppState.settings.highContrast = !AppState.settings.highContrast;
  updateUI();
  AppState.saveData();
  const status = AppState.settings.highContrast ? 'enabled' : 'disabled';
  showSuccessMessage(`High contrast ${status}`);
  Utils.announceToScreenReader(`High contrast mode ${status}`);
}

function updateUI() {
  document.body.setAttribute('data-theme', AppState.settings.theme);
  document.body.style.fontSize = AppState.settings.fontSize + 'px';
  
  if (AppState.settings.highContrast) {
    document.body.classList.add('high-contrast');
  } else {
    document.body.classList.remove('high-contrast');
  }
}

// ============================================================================
// PROFILE FUNCTIONS
// ============================================================================

function openProfileManager() {
  const modal = Utils.safeGetElement('profileModal');
  if (modal) {
    modal.style.display = 'block';
    modal.setAttribute('aria-hidden', 'false');
    updateProfileList();
    
    // Focus management
    const nameInput = Utils.safeGetElement('profileName');
    if (nameInput) {
      setTimeout(() => nameInput.focus(), 100);
    }
  }
}

function closeProfileManager() {
  const modal = Utils.safeGetElement('profileModal');
  if (modal) {
    modal.style.display = 'none';
    modal.setAttribute('aria-hidden', 'true');
  }
}

function createProfile(name, age) {
  if (!name || !age) {
    const profileNameEl = Utils.safeGetElement('profileName');
    const profileAgeEl = Utils.safeGetElement('profileAge');
    
    if (!profileNameEl || !profileAgeEl) return null;
    
    name = profileNameEl.value.trim();
    age = parseInt(profileAgeEl.value);
  }
  
  // Enhanced validation and sanitization
  name = Utils.sanitizeInput(name, 50);
  
  if (!name || !Utils.validateAge(age)) {
    showErrorMessage('Please enter a valid name and age (3-18)');
    return null;
  }
  
  // Check for duplicate names
  const existingProfile = AppState.profiles.find(p => 
    p.name.toLowerCase() === name.toLowerCase()
  );
  
  if (existingProfile) {
    showErrorMessage('A profile with this name already exists');
    return null;
  }
  
  const profile = {
    id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
    name: name,
    age: age,
    tasks: [],
    behaviors: [],
    rewardPoints: 0,
    routines: [],
    dateCreated: new Date().toISOString()
  };
  
  AppState.profiles.push(profile);
  AppState.saveData();
  populateProfileSelector();
  updateProfileList();
  
  // Clear form
  const nameInput = Utils.safeGetElement('profileName');
  const ageInput = Utils.safeGetElement('profileAge');
  if (nameInput) nameInput.value = '';
  if (ageInput) ageInput.value = '';
  
  showSuccessMessage(`Profile created for ${name}`);
  Utils.announceToScreenReader(`Profile created for ${name}`);
  return profile;
}

function populateProfileSelector() {
  const selector = Utils.safeGetElement('currentProfile');
  if (!selector) return;
  
  selector.innerHTML = '<option value="">Select Child</option>';
  
  AppState.profiles.forEach(profile => {
    const option = document.createElement('option');
    option.value = profile.id;
    option.textContent = `${profile.name} (${profile.age})`;
    if (profile.id === AppState.currentProfile) {
      option.selected = true;
    }
    selector.appendChild(option);
  });
}

function switchProfile(profileId) {
  if (!profileId) {
    const selector = Utils.safeGetElement('currentProfile');
    profileId = selector ? selector.value : null;
  }
  
  if (!profileId) {
    AppState.currentProfile = null;
    updateRewardDisplay(0);
    ThemeManager.applyTheme(AppState.settings.theme || 'light');
    Utils.announceToScreenReader('No profile selected');
    return;
  }
  
  const profile = AppState.profiles.find(p => p.id === profileId);
  if (!profile) {
    showErrorMessage('Profile not found');
    return;
  }
  
  AppState.currentProfile = profileId;
  updateRewardDisplay(profile.rewardPoints || 0);
  
  ThemeManager.loadProfileTheme();
  
  if (profile.tasks && profile.tasks.length > 0) {
    updateTaskDisplay(profile.tasks);
  } else {
    // Clear task display if no tasks
    const taskList = Utils.safeGetElement('taskList');
    if (taskList) {
      taskList.innerHTML = '<p>No tasks yet. Add your first task above!</p>';
    }
  }
  
  AppState.saveData();
  showSuccessMessage(`Switched to ${profile.name}'s profile`);
  Utils.announceToScreenReader(`Switched to ${profile.name}'s profile`);
}

function updateProfileList() {
  const profileList = Utils.safeGetElement('profileList');
  if (!profileList) return;
  
  profileList.innerHTML = '';
  
  if (AppState.profiles.length === 0) {
    profileList.innerHTML = '<p>No profiles created yet</p>';
    return;
  }
  
  AppState.profiles.forEach(profile => {
    const profileDiv = document.createElement('div');
    profileDiv.className = 'profile-item';
    profileDiv.setAttribute('role', 'listitem');
    profileDiv.style.cssText = `
      display: flex; 
      justify-content: space-between; 
      align-items: center; 
      padding: 1rem; 
      margin: 0.5rem 0; 
      border: 2px solid var(--border-color); 
      border-radius: 8px;
      background: var(--bg-primary);
    `;
    
    const infoSpan = document.createElement('span');
    infoSpan.textContent = `${profile.name} (${profile.age} years) - ${profile.rewardPoints || 0} ⭐`;
    
    const deleteBtn = document.createElement('button');
    deleteBtn.textContent = 'Delete';
    deleteBtn.className = 'danger-btn';
    deleteBtn.style.cssText = `
      background: var(--error); 
      color: white; 
      border: none; 
      padding: 0.5rem 1rem; 
      border-radius: 4px; 
      cursor: pointer;
      font-size: 0.9rem;
    `;
    deleteBtn.setAttribute('aria-label', `Delete profile for ${profile.name}`);
    deleteBtn.onclick = () => deleteProfile(profile.id);
    
    profileDiv.appendChild(infoSpan);
    profileDiv.appendChild(deleteBtn);
    profileList.appendChild(profileDiv);
  });
}

function deleteProfile(profileId) {
  const profile = AppState.profiles.find(p => p.id === profileId);
  if (!profile) return;
  
  if (confirm(`Are you sure you want to delete ${profile.name}'s profile? This cannot be undone.`)) {
    AppState.profiles = AppState.profiles.filter(p => p.id !== profileId);
    
    if (AppState.currentProfile === profileId) {
      AppState.currentProfile = null;
      const selector = Utils.safeGetElement('currentProfile');
      if (selector) selector.value = '';
      updateRewardDisplay(0);
    }
    
    populateProfileSelector();
    updateProfileList();
    AppState.saveData();
    showSuccessMessage('Profile deleted');
    Utils.announceToScreenReader(`Profile for ${profile.name} deleted`);
  }
}

function createWelcomeProfile() {
  const nameEl = Utils.safeGetElement('welcomeChildName');
  const ageEl = Utils.safeGetElement('welcomeChildAge');
  
  if (!nameEl || !ageEl) return;
  
  const name = nameEl.value.trim();
  const age = parseInt(ageEl.value);
  
  if (!name || !Utils.validateAge(age)) {
    showErrorMessage('Please enter a valid name and age (3-18)');
    return;
  }
  
  const profile = createProfile(name, age);
  if (profile) {
    AppState.currentProfile = profile.id;
    const welcomePanel = Utils.safeGetElement('welcomePanel');
    if (welcomePanel) welcomePanel.style.display = 'none';
    populateProfileSelector();
    switchProfile(profile.id);
    AppState.saveData();
    showSuccessMessage(`Welcome ${name}! Your profile is ready.`);
    Utils.announceToScreenReader(`Welcome ${name}! Your profile is ready.`);
  }
}

// ============================================================================
// TASK FUNCTIONS WITH ENHANCED VOICE FEEDBACK
// ============================================================================

function addTask() {
  if (!AppState.currentProfile) {
    showErrorMessage('Please select a child profile first');
    return;
  }

  const taskInput = Utils.safeGetElement('taskInput');
  const taskCategory = Utils.safeGetElement('taskCategory');
  const taskPriority = Utils.safeGetElement('taskPriority');
  const taskDeadline = Utils.safeGetElement('taskDeadline');
  
  if (!taskInput || taskInput.value.trim() === '') {
    showErrorMessage('Please enter a task');
    return;
  }
  
  const profile = AppState.profiles.find(p => p.id === AppState.currentProfile);
  if (!profile) return;
  
  const taskText = Utils.sanitizeInput(taskInput.value, 200);
  
  const task = {
    id: Date.now() + Math.random(),
    text: taskText,
    category: taskCategory ? taskCategory.value : 'Homework',
    priority: taskPriority ? taskPriority.value : 'normal',
    deadline: taskDeadline ? taskDeadline.value || null : null,
    completed: false,
    dateAdded: new Date().toISOString(),
    dateCompleted: null
  };
  
  profile.tasks = profile.tasks || [];
  profile.tasks.push(task);
  updateTaskDisplay(profile.tasks);
  AppState.saveData();
  
  // Clear form
  taskInput.value = '';
  if (taskDeadline) taskDeadline.value = '';
  
  showSuccessMessage(`Task added: ${task.text}`);
  
  // Enhanced voice feedback with better timing
  speak(`Task added: ${task.text}`, { context: 'success' });
  
  Utils.announceToScreenReader(`Task added: ${task.text}`);
  
  // Focus management
  taskInput.focus();
}

function updateTaskDisplay(tasks) {
  const taskList = Utils.safeGetElement('taskList');
  const visualBoard = Utils.safeGetElement('visualBoard');
  
  if (AppState.currentView === 'list') {
    updateListView(tasks, taskList);
  } else {
    updateVisualView(tasks, visualBoard);
  }
}

function updateListView(tasks, container) {
  if (!container) return;
  
  container.innerHTML = '';
  
  if (!tasks || tasks.length === 0) {
    container.innerHTML = '<p>No tasks yet. Add your first task above!</p>';
    return;
  }
  
  tasks.forEach(task => {
    const taskDiv = document.createElement('div');
    taskDiv.className = `task ${task.completed ? 'completed' : ''} ${task.priority}`;
    taskDiv.setAttribute('role', 'listitem');
    taskDiv.style.cssText = `
      padding: 1rem; 
      margin: 0.5rem 0; 
      border: 2px solid var(--border-color); 
      border-radius: 8px; 
      display: flex; 
      justify-content: space-between; 
      align-items: center;
      background: var(--bg-primary);
    `;
    
    const deadlineText = task.deadline ? 
      `<small style="color: var(--text-secondary);">Due: ${new Date(task.deadline).toLocaleDateString()}</small>` : '';
    
    const infoDiv = document.createElement('div');
    infoDiv.innerHTML = `
      <div>
        <strong>${task.category}:</strong> ${task.text} ${deadlineText}
        <small style="color: var(--text-secondary);">(${new Date(task.dateAdded).toLocaleDateString()})</small>
      </div>
    `;
    
    const actionsDiv = document.createElement('div');
    actionsDiv.style.cssText = 'display: flex; gap: 0.5rem; align-items: center;';
    
    if (task.completed) {
      const completedSpan = document.createElement('span');
      completedSpan.textContent = '✅ Done';
      completedSpan.style.cssText = 'color: var(--success); font-weight: bold;';
      actionsDiv.appendChild(completedSpan);
    } else {
      const completeBtn = document.createElement('button');
      completeBtn.textContent = '✓ Complete';
      completeBtn.className = 'complete-btn';
      completeBtn.style.cssText = `
        background: var(--success); 
        color: white; 
        border: none; 
        padding: 0.5rem 1rem; 
        border-radius: 4px; 
        cursor: pointer;
        font-size: 0.9rem;
      `;
      completeBtn.setAttribute('aria-label', `Complete task: ${task.text}`);
      completeBtn.onclick = () => completeTask(task.id);
      actionsDiv.appendChild(completeBtn);
    }
    
    const deleteBtn = document.createElement('button');
    deleteBtn.textContent = 'Delete';
    deleteBtn.className = 'danger-btn';
    deleteBtn.style.cssText = `
      background: var(--error); 
      color: white; 
      border: none; 
      padding: 0.5rem 1rem; 
      border-radius: 4px; 
      cursor: pointer;
      font-size: 0.9rem;
    `;
    deleteBtn.setAttribute('aria-label', `Delete task: ${task.text}`);
    deleteBtn.onclick = () => deleteTask(task.id);
    actionsDiv.appendChild(deleteBtn);
    
    taskDiv.appendChild(infoDiv);
    taskDiv.appendChild(actionsDiv);
    container.appendChild(taskDiv);
  });
}

function updateVisualView(tasks, container) {
  if (!container) return;
  
  container.innerHTML = '';
  
  // Add task creation card
  const addCard = document.createElement('div');
  addCard.className = 'task-card add-task-card';
  addCard.setAttribute('role', 'button');
  addCard.setAttribute('tabindex', '0');
  addCard.setAttribute('aria-label', 'Add new task');
  addCard.style.cssText = `
    border: 2px dashed var(--border-color); 
    padding: 2rem; 
    text-align: center; 
    margin: 1rem; 
    border-radius: 12px; 
    cursor: pointer;
    background: var(--bg-secondary);
    transition: all 0.3s ease;
  `;
  addCard.innerHTML = `
    <div style="font-size: 3rem; color: var(--accent-primary); margin-bottom: 0.5rem;">➕</div>
    <div style="font-weight: bold; color: var(--text-primary);">Add New Task</div>
  `;
  addCard.onclick = () => {
    toggleView('list');
    const taskInput = Utils.safeGetElement('taskInput');
    if (taskInput) taskInput.focus();
  };
  addCard.onkeypress = (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      addCard.onclick();
    }
  };
  container.appendChild(addCard);
  
  if (tasks && tasks.length > 0) {
    tasks.forEach(task => {
      const taskCard = document.createElement('div');
      taskCard.className = `task-card ${task.completed ? 'completed' : ''} ${task.priority}-priority`;
      taskCard.setAttribute('role', task.completed ? 'status' : 'button');
      taskCard.setAttribute('tabindex', task.completed ? '-1' : '0');
      taskCard.setAttribute('aria-label', 
        task.completed ? 
        `Completed task: ${task.text}` : 
        `Click to complete task: ${task.text}`
      );
      
      taskCard.style.cssText = `
        border: 2px solid var(--border-color); 
        padding: 1.5rem; 
        margin: 1rem; 
        border-radius: 12px; 
        text-align: center; 
        cursor: ${task.completed ? 'default' : 'pointer'}; 
        background: var(--bg-primary);
        transition: all 0.3s ease;
        min-height: 120px;
        display: flex;
        flex-direction: column;
        justify-content: center;
      `;
      
      const icon = getTaskIcon(task.text, task.category);
      
      taskCard.innerHTML = `
        <div style="font-size: 2.5rem; margin-bottom: 0.5rem;" aria-hidden="true">${icon}</div>
        <div style="font-weight: bold; color: var(--text-primary); margin-bottom: 0.25rem;">${task.text}</div>
        <div style="font-size: 0.8rem; color: var(--text-secondary);">${task.category}</div>
        ${task.completed ? '<div style="margin-top: 0.5rem; color: var(--success); font-weight: bold;">✅ Completed!</div>' : ''}
      `;
      
      if (!task.completed) {
        taskCard.onclick = () => completeTask(task.id);
        taskCard.onkeypress = (e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            completeTask(task.id);
          }
        };
      }
      
      container.appendChild(taskCard);
    });
  }
}

function getTaskIcon(taskText, category) {
  const text = taskText.toLowerCase();
  
  // Text-based icon mapping
  if (text.includes('teeth') || text.includes('brush')) return '🦷';
  if (text.includes('shower') || text.includes('bath')) return '🚿';
  if (text.includes('homework') || text.includes('math') || text.includes('reading')) return '📚';
  if (text.includes('clean') || text.includes('tidy')) return '🧹';
  if (text.includes('bed') || text.includes('sleep')) return '🛏️';
  if (text.includes('eat') || text.includes('lunch') || text.includes('dinner')) return '🍽️';
  if (text.includes('walk') || text.includes('run') || text.includes('exercise')) return '🏃';
  if (text.includes('play') || text.includes('game')) return '🎮';
  
  // Category-based icon mapping
  switch (category) {
    case 'Homework': return '📝';
    case 'Chores': return '🏠';
    case 'Exercise': return '🏃';
    case 'Personal': return '👤';
    case 'Fun': return '🎯';
    default: return '✅';
  }
}

function toggleView(view) {
  AppState.currentView = view;
  
  const listView = Utils.safeGetElement('listViewContent');
  const visualView = Utils.safeGetElement('visualViewContent');
  const listBtn = Utils.safeGetElement('listViewBtn');
  const visualBtn = Utils.safeGetElement('visualViewBtn');
  
  if (view === 'list') {
    if (listView) listView.style.display = 'block';
    if (visualView) visualView.style.display = 'none';
    if (listBtn) {
      listBtn.classList.add('active');
      listBtn.setAttribute('aria-selected', 'true');
    }
    if (visualBtn) {
      visualBtn.classList.remove('active');
      visualBtn.setAttribute('aria-selected', 'false');
    }
  } else {
    if (listView) listView.style.display = 'none';
    if (visualView) visualView.style.display = 'block';
    if (listBtn) {
      listBtn.classList.remove('active');
      listBtn.setAttribute('aria-selected', 'false');
    }
    if (visualBtn) {
      visualBtn.classList.add('active');
      visualBtn.setAttribute('aria-selected', 'true');
    }
  }
  
  if (AppState.currentProfile) {
    const profile = AppState.profiles.find(p => p.id === AppState.currentProfile);
    if (profile) {
      updateTaskDisplay(profile.tasks);
    }
  }
  
  AppState.saveData();
  Utils.announceToScreenReader(`Switched to ${view} view`);
}

function completeTask(id) {
  if (!AppState.currentProfile) return;
  
  const profile = AppState.profiles.find(p => p.id === AppState.currentProfile);
  if (!profile) return;
  
  const task = profile.tasks.find(t => t.id === id);
  
  if (task && !task.completed) {
    task.completed = true;
    task.dateCompleted = new Date().toISOString();
    profile.rewardPoints = (profile.rewardPoints || 0) + AppState.settings.taskPoints;
    
    updateRewardDisplay(profile.rewardPoints);
    updateTaskDisplay(profile.tasks);
    AppState.saveData();
    
    showCelebration('⭐');
    showSuccessMessage(`Task completed! +${AppState.settings.taskPoints} points`);
    
    // Enhanced voice feedback with better timing
    speakTaskCompletion(task.text);
    
    Utils.announceToScreenReader(`Task completed! You earned ${AppState.settings.taskPoints} points`);
    
    // Update charts if visible
    updateCharts();
  }
}

function deleteTask(id) {
  if (!AppState.currentProfile) return;
  
  const profile = AppState.profiles.find(p => p.id === AppState.currentProfile);
  if (!profile || !profile.tasks) return;
  
  const taskIndex = profile.tasks.findIndex(t => t.id === id);
  if (taskIndex === -1) return;
  
  const task = profile.tasks[taskIndex];
  
  if (confirm(`Are you sure you want to delete the task "${task.text}"?`)) {
    profile.tasks.splice(taskIndex, 1);
    updateTaskDisplay(profile.tasks);
    AppState.saveData();
    showSuccessMessage('Task deleted');
    Utils.announceToScreenReader('Task deleted');
  }
}

// ============================================================================
// BEHAVIOR FUNCTIONS WITH ENHANCED VOICE FEEDBACK
// ============================================================================

function markBehavior(behavior) {
  if (!AppState.currentProfile) {
    showErrorMessage('Please select a child profile first');
    return;
  }

  const profile = AppState.profiles.find(p => p.id === AppState.currentProfile);
  if (!profile) return;
  
  const timestamp = new Date().toISOString();
  
  const behaviorEntry = {
    id: Date.now() + Math.random(),
    behavior: behavior,
    time: timestamp,
    points: AppState.settings.behaviorPoints
  };
  
  profile.behaviors = profile.behaviors || [];
  profile.behaviors.push(behaviorEntry);
  profile.rewardPoints = (profile.rewardPoints || 0) + AppState.settings.behaviorPoints;
  
  updateRewardDisplay(profile.rewardPoints);
  updateBehaviorDisplay(profile.behaviors);
  AppState.saveData();
  
  showCelebration('🌟');
  showSuccessMessage(`Great ${behavior.toLowerCase()} behavior! +${AppState.settings.behaviorPoints} points`);
  
  // Enhanced voice feedback with better timing
  speakBehaviorEncouragement(behavior);
  
  Utils.announceToScreenReader(`Great ${behavior.toLowerCase()} behavior! You earned ${AppState.settings.behaviorPoints} points`);
  
  // Update charts if visible
  updateCharts();
}

function updateBehaviorDisplay(behaviors) {
  const behaviorLog = Utils.safeGetElement('behaviorLog');
  if (!behaviorLog) return;
  
  behaviorLog.innerHTML = '';
  
  if (!behaviors || behaviors.length === 0) {
    behaviorLog.innerHTML = '<p style="color: var(--text-secondary);">No positive behaviors recorded yet!</p>';
    updateBehaviorProgress(0);
    return;
  }
  
  const recentBehaviors = behaviors.slice(-10).reverse();
  
  recentBehaviors.forEach(entry => {
    const behaviorDiv = document.createElement('div');
    behaviorDiv.setAttribute('role', 'listitem');
    behaviorDiv.style.cssText = `
      margin-bottom: 0.5rem; 
      padding: 0.75rem; 
      background: linear-gradient(135deg, #e8f5e8, #f0fff0); 
      border-radius: 6px;
      border-left: 4px solid var(--success);
      color: var(--text-primary);
    `;
    
    const timeString = new Date(entry.time).toLocaleTimeString([], { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
    
    behaviorDiv.innerHTML = `
      <div style="display: flex; justify-content: space-between; align-items: center;">
        <strong>${entry.behavior}</strong>
        <span style="font-size: 0.8rem; color: var(--text-secondary);">${timeString}</span>
      </div>
    `;
    
    behaviorLog.appendChild(behaviorDiv);
  });
  
  // Update progress bar based on today's behaviors
  const today = new Date().toDateString();
  const todayBehaviors = behaviors.filter(b => {
    return new Date(b.time).toDateString() === today;
  }).length;
  
  updateBehaviorProgress(todayBehaviors);
}

function updateBehaviorProgress(count) {
  const progressBar = Utils.safeGetElement('behaviorProgress');
  const progressText = Utils.safeGetElement('behaviorProgressText');
  const progressContainer = progressBar?.parentElement;
  
  if (progressBar && progressText) {
    const maxBehaviors = 10; // Goal for daily behaviors
    const percentage = Math.min((count / maxBehaviors) * 100, 100);
    
    progressBar.style.width = percentage + '%';
    progressText.textContent = `${count} positive behavior${count !== 1 ? 's' : ''} today!`;
    
    // Update ARIA attributes for accessibility
    if (progressContainer) {
      progressContainer.setAttribute('aria-valuenow', count.toString());
      progressContainer.setAttribute('aria-valuemax', maxBehaviors.toString());
      progressContainer.setAttribute('aria-label', `Daily positive behavior progress: ${count} out of ${maxBehaviors} behaviors`);
      progressContainer.title = `${count} out of ${maxBehaviors} positive behaviors today (${Math.round(percentage)}%)`;
    }
    
    Utils.announceToScreenReader(`${count} positive behavior${count !== 1 ? 's' : ''} recorded today`);
  }
}

function updateRewardDisplay(points) {
  Utils.safeSetText('rewardPoints', points);
  const rewardEl = Utils.safeGetElement('rewardPoints');
  if (rewardEl) {
    rewardEl.style.animation = 'bounce 0.5s ease';
    rewardEl.setAttribute('aria-label', `${points} reward points`);
    setTimeout(() => {
      rewardEl.style.animation = '';
    }, 500);
  }
}

// ============================================================================
// AI FUNCTIONS
// ============================================================================

function showAITab(tabName) {
  // Update tab states
  document.querySelectorAll('.ai-tab-content').forEach(content => {
    content.classList.remove('active');
  });
  
  document.querySelectorAll('.ai-tab').forEach(tab => {
    tab.classList.remove('active');
    tab.setAttribute('aria-selected', 'false');
  });
  
  const selectedContent = Utils.safeGetElement('ai' + tabName.charAt(0).toUpperCase() + tabName.slice(1));
  if (selectedContent) {
    selectedContent.classList.add('active');
  }
  
  const clickedTab = document.querySelector(`.ai-tab[onclick*="${tabName}"]`);
  if (clickedTab) {
    clickedTab.classList.add('active');
    clickedTab.setAttribute('aria-selected', 'true');
  }
  
  // Load content based on tab
  switch(tabName) {
    case 'suggestions':
      showAISuggestions();
      break;
    case 'achievements':
      showAchievementPredictions();
      break;
    case 'insights':
      showAIInsights();
      break;
  }
  
  Utils.announceToScreenReader(`Switched to ${tabName} tab`);
}

function showAISuggestions() {
  const suggestionsContainer = Utils.safeGetElement('aiSuggestions');
  if (!suggestionsContainer) return;
  
  if (!AppState.currentProfile) {
    suggestionsContainer.innerHTML = `
      <div class="ai-loading">
        <p>Please select a child profile to see AI suggestions</p>
      </div>
    `;
    return;
  }
  
  const currentHour = new Date().getHours();
  const currentProfile = AppState.profiles.find(p => p.id === AppState.currentProfile);
  const suggestions = generateSmartSuggestions(currentHour, currentProfile);
  
  suggestionsContainer.innerHTML = '';
  
  if (suggestions.length === 0) {
    suggestionsContainer.innerHTML = `
      <div class="ai-loading">
        <p>No suggestions right now. You're doing great! 🌟</p>
      </div>
    `;
    return;
  }
  
  suggestions.forEach((suggestion, index) => {
    const suggestionCard = document.createElement('div');
    suggestionCard.className = 'ai-suggestion-card';
    suggestionCard.setAttribute('role', 'article');
    suggestionCard.setAttribute('aria-labelledby', `suggestion-${index}-title`);
    
    suggestionCard.innerHTML = `
      <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 1rem;">
        <div style="display: flex; align-items: center; gap: 0.5rem;">
          <span style="font-size: 1.5rem;" aria-hidden="true">${suggestion.icon}</span>
          <span style="
            background: var(--accent-primary); 
            color: white; 
            padding: 0.25rem 0.75rem; 
            border-radius: 12px; 
            font-size: 0.8rem; 
            font-weight: bold;
          ">${suggestion.category}</span>
        </div>
        <span style="
          background: ${getPriorityColor(suggestion.priority)}; 
          color: white; 
          padding: 0.25rem 0.5rem; 
          border-radius: 8px; 
          font-size: 0.7rem; 
          font-weight: bold;
        ">${suggestion.priority.toUpperCase()}</span>
      </div>
      <div id="suggestion-${index}-title" style="font-weight: bold; font-size: 1.2rem; margin-bottom: 0.5rem; color: var(--text-primary);">
        ${suggestion.text}
      </div>
      <div style="font-size: 0.9rem; color: var(--text-secondary); font-style: italic; margin-bottom: 1rem;">
        💡 ${suggestion.aiReason}
      </div>
      <div style="display: flex; gap: 0.5rem; justify-content: flex-end; flex-wrap: wrap;">
        <button onclick="addAISuggestedTask(${index})" 
                class="ai-add-task-btn"
                aria-label="Add '${suggestion.text}' as a task">
          ✅ Add Task
        </button>
        <button onclick="dismissAISuggestion(${index})" 
                class="ai-dismiss-btn"
                aria-label="Dismiss suggestion: ${suggestion.text}">
          ⏭️ Skip
        </button>
      </div>
    `;
    
    suggestionsContainer.appendChild(suggestionCard);
  });
  
  window.currentAISuggestions = suggestions;
}

function generateSmartSuggestions(currentHour, profile) {
  const suggestions = [];
  
  // Time-based suggestions
  if (currentHour >= 15 && currentHour <= 18) {
    suggestions.push({
      text: 'Review homework',
      category: 'Homework',
      priority: 'high',
      aiReason: 'After-school homework time',
      icon: '📚'
    });
  }
  
  if (currentHour >= 7 && currentHour <= 9) {
    suggestions.push({
      text: 'Brush teeth',
      category: 'Personal',
      priority: 'high',
      aiReason: 'Morning routine essential',
      icon: '🦷'
    });
  }
  
  if (currentHour >= 19 && currentHour <= 21) {
    suggestions.push({
      text: 'Tidy up room',
      category: 'Chores',
      priority: 'normal',
      aiReason: 'Evening wind-down',
      icon: '🧹'
    });
  }
  
  // Profile-based suggestions
  if (profile && profile.tasks) {
    const incompleteTasks = profile.tasks.filter(t => !t.completed);
    if (incompleteTasks.length > 5) {
      suggestions.push({
        text: 'Review task list',
        category: 'Personal',
        priority: 'normal',
        aiReason: 'You have several tasks pending',
        icon: '📋'
      });
    }
  }
  
  // General wellness suggestions
  suggestions.push({
    text: 'Drink a glass of water',
    category: 'Personal',
    priority: 'normal',
    aiReason: 'Stay hydrated throughout the day',
    icon: '💧'
  });
  
  suggestions.push({
    text: 'Take 5 deep breaths',
    category: 'Personal',
    priority: 'low',
    aiReason: 'Mindfulness moment',
    icon: '🧘'
  });
  
  // Limit suggestions to avoid overwhelming
  return suggestions.slice(0, 3);
}

function getPriorityColor(priority) {
  switch (priority) {
    case 'high': return '#f44336';
    case 'normal': return 'var(--accent-primary)';
    case 'low': return '#666';
    default: return 'var(--accent-primary)';
  }
}

function showAchievementPredictions() {
  const predictionsContainer = Utils.safeGetElement('achievementPredictions');
  const earnedContainer = Utils.safeGetElement('earnedAchievements');
  
  if (predictionsContainer) {
    predictionsContainer.innerHTML = `
      <div style="text-align: center; padding: 2rem; color: var(--text-secondary);">
        <h4>🎯 Achievement Progress</h4>
        <p>Complete more tasks and track behaviors to unlock achievements!</p>
        <div style="margin-top: 1rem;">
          <div style="padding: 1rem; background: var(--bg-secondary); border-radius: 8px; margin: 0.5rem 0;">
            <strong>Task Master</strong> - Complete 10 tasks (Progress: ${getTaskProgress()}/10)
          </div>
          <div style="padding: 1rem; background: var(--bg-secondary); border-radius: 8px; margin: 0.5rem 0;">
            <strong>Behavior Star</strong> - Record 20 positive behaviors (Progress: ${getBehaviorProgress()}/20)
          </div>
        </div>
      </div>
    `;
  }
  
  if (earnedContainer) {
    earnedContainer.innerHTML = `
      <div style="text-align: center; padding: 2rem; color: var(--text-secondary);">
        <h4>🏆 Earned Achievements</h4>
        <p>Your earned achievements will appear here!</p>
      </div>
    `;
  }
}

function getTaskProgress() {
  if (!AppState.currentProfile) return 0;
  const profile = AppState.profiles.find(p => p.id === AppState.currentProfile);
  return profile?.tasks?.filter(t => t.completed).length || 0;
}

function getBehaviorProgress() {
  if (!AppState.currentProfile) return 0;
  const profile = AppState.profiles.find(p => p.id === AppState.currentProfile);
  return profile?.behaviors?.length || 0;
}

function showAIInsights() {
  const energyContainer = Utils.safeGetElement('energyInsights');
  const patternContainer = Utils.safeGetElement('patternInsights');
  const progressContainer = Utils.safeGetElement('progressPredictions');
  
  if (energyContainer) {
    energyContainer.innerHTML = `
      <div style="padding: 1rem; background: var(--bg-secondary); border-radius: 8px; margin-bottom: 1rem;">
        <h4>⚡ Current Status</h4>
        <p>AI is learning your patterns!</p>
      </div>
    `;
  }
  
  if (patternContainer) {
    patternContainer.innerHTML = `
      <div style="padding: 1rem; background: var(--bg-secondary); border-radius: 8px; margin-bottom: 1rem;">
        <h4>🔍 Learning Progress</h4>
        <p>Keep using the app for personalized insights!</p>
      </div>
    `;
  }
  
  if (progressContainer) {
    progressContainer.innerHTML = `
      <div style="padding: 1rem; background: var(--bg-secondary); border-radius: 8px;">
        <h4>📈 Keep Going!</h4>
        <p>You're doing great!</p>
      </div>
    `;
  }
}

function addAISuggestedTask(index) {
  const suggestions = window.currentAISuggestions;
  if (!suggestions || !suggestions[index] || !AppState.currentProfile) return;
  
  const suggestion = suggestions[index];
  const profile = AppState.profiles.find(p => p.id === AppState.currentProfile);
  
  if (!profile) return;
  
  const task = {
    id: Date.now() + Math.random(),
    text: suggestion.text,
    category: suggestion.category,
    priority: suggestion.priority,
    deadline: null,
    completed: false,
    dateAdded: new Date().toISOString(),
    dateCompleted: null,
    addedByAI: true
  };
  
  profile.tasks = profile.tasks || [];
  profile.tasks.push(task);
  AppState.saveData();
  
  showSuccessMessage(`AI task added: ${suggestion.text}`);
  speakSuccess(`AI has added a new task: ${suggestion.text}`);
  Utils.announceToScreenReader(`AI suggested task added: ${suggestion.text}`);
  
  // Refresh suggestions after a delay
  setTimeout(showAISuggestions, 1000);
}

function dismissAISuggestion(index) {
  const suggestions = window.currentAISuggestions;
  if (!suggestions || !suggestions[index]) return;
  
  const suggestion = suggestions[index];
  suggestions.splice(index, 1);
  window.currentAISuggestions = suggestions;
  showAISuggestions();
  showSuccessMessage('Suggestion dismissed');
  Utils.announceToScreenReader(`Suggestion dismissed: ${suggestion.text}`);
}

function refreshAISuggestions() {
  showAISuggestions();
  showSuccessMessage('AI suggestions refreshed!');
  Utils.announceToScreenReader('AI suggestions refreshed');
}

function toggleAISettings() {
  const panel = Utils.safeGetElement('aiSettingsPanel');
  if (panel) {
    const isVisible = panel.style.display === 'block';
    panel.style.display = isVisible ? 'none' : 'block';
    panel.setAttribute('aria-hidden', isVisible ? 'true' : 'false');
    Utils.announceToScreenReader(`AI settings ${isVisible ? 'closed' : 'opened'}`);
  }
}

function updateAISetting(setting, value) {
  // Store AI settings in localStorage
  try {
    let aiSettings = JSON.parse(localStorage.getItem('aiSettings') || '{}');
    aiSettings[setting] = value;
    localStorage.setItem('aiSettings', JSON.stringify(aiSettings));
    console.log(`AI setting ${setting} updated to ${value}`);
  } catch (error) {
    console.error('Error saving AI settings:', error);
  }
}

function resetAIData() {
  if (confirm('Are you sure? This will reset all AI learning data.')) {
    try {
      localStorage.removeItem('aiSettings');
      showSuccessMessage('AI data reset successfully');
      Utils.announceToScreenReader('AI data reset successfully');
    } catch (error) {
      console.error('Error resetting AI data:', error);
      showErrorMessage('Failed to reset AI data');
    }
  }
}

// ============================================================================
// ENHANCED SOUND FUNCTIONS WITH FIXED STOP FUNCTIONALITY
// ============================================================================

function playSound(soundFile, isAmbient = false) {
  console.log('Playing sound:', soundFile, 'Ambient:', isAmbient);
  
  // Always stop all sounds first
  AudioManager.stopAllSounds();
  
  if (isAmbient) {
    // Create new audio element for the mp3 file
    const audio = new Audio();
    
    // Store reference IMMEDIATELY, before loading
    AudioManager.currentAmbient = audio;
    AudioManager.trackAudioSource(audio);
    
    audio.src = soundFile;
    audio.loop = true;
    audio.volume = 0.7;
    
    // Add error handling
    audio.addEventListener('error', (e) => {
      console.error('Audio error:', e);
      console.error('Failed to load:', soundFile);
      
      // Fallback to synthetic sound
      createSyntheticFallback(soundFile);
    });
    
    audio.addEventListener('loadeddata', () => {
      console.log('Audio loaded successfully:', soundFile);
    });
    
    // Actually play the audio
    audio.play()
      .then(() => {
        console.log('Audio playing successfully');
        showSuccessMessage(`Playing ${getSoundName(soundFile)}...`);
      })
      .catch(error => {
        console.error('Error playing audio:', error);
        createSyntheticFallback(soundFile);
      });
  } else {
    // Handle non-ambient sounds (one-time plays)
    playOneTimeSound(soundFile);
  }
}

function createSyntheticFallback(soundFile) {
  let syntheticSound = null;
  
  switch(soundFile) {
    case 'sounds/ocean.mp3':
      syntheticSound = createAmbientLoop([80, 120, 150, 200], 'sine');
      showSuccessMessage('Playing ocean wave sounds...');
      break;
      
    case 'sounds/rain.mp3':
      syntheticSound = createAmbientLoop([400, 800, 1200, 1600], 'sawtooth');
      showSuccessMessage('Playing gentle rain sounds...');
      break;
      
    case 'sounds/forest.mp3':
      syntheticSound = createAmbientLoop([100, 200, 300, 400], 'sine');
      showSuccessMessage('Playing forest sounds...');
      break;
      
    default:
      const soundName = getSoundName(soundFile);
      showSuccessMessage(`Playing ${soundName}...`);
  }
  
  if (syntheticSound) {
    syntheticSound.start();
    AudioManager.currentAmbientSound = syntheticSound;
    AudioManager.trackAudioSource(syntheticSound);
  }
}

function playOneTimeSound(soundFile) {
  let tone = null;
  
  switch(soundFile) {
    case 'sounds/chime.mp3':
      tone = AudioManager.createTone(523, 2.0, 'sine');
      showSuccessMessage('Playing calming chime...');
      break;
      
    case 'sounds/bells.mp3':
      tone = AudioManager.createTone(293, 3.0, 'sine');
      showSuccessMessage('Playing mindfulness bell...');
      break;
      
    case 'sounds/bell.mp3':
      tone = AudioManager.createTone(659, 1.0, 'sine');
      showSuccessMessage('Playing success ding...');
      break;
      
    default:
      const soundName = getSoundName(soundFile);
      showSuccessMessage(`Playing ${soundName}...`);
  }
  
  if (tone) {
    tone.play();
    AudioManager.trackAudioSource(tone);
  }
}

function getSoundName(soundFile) {
  return soundFile.replace('.mp3', '').replace('sounds/', '').replace(/([A-Z])/g, ' $1').toLowerCase();
}

function playWhiteNoise() {
  AudioManager.stopAllSounds();
  
  const context = AudioManager.getContext();
  if (!context) {
    showErrorMessage('Audio not supported in this browser');
    return;
  }
  
  try {
    const bufferSize = context.sampleRate * 2;
    const noiseBuffer = context.createBuffer(1, bufferSize, context.sampleRate);
    const output = noiseBuffer.getChannelData(0);
    
    for (let i = 0; i < bufferSize; i++) {
      output[i] = Math.random() * 2 - 1;
    }
    
    const whiteNoise = context.createBufferSource();
    const gainNode = context.createGain();
    
    whiteNoise.buffer = noiseBuffer;
    whiteNoise.loop = true;
    whiteNoise.connect(gainNode);
    gainNode.connect(context.destination);
    gainNode.gain.value = 0.3;
    
    whiteNoise.start();
    
    // Store reference for stopping
    AudioManager.currentAmbientSound = {
      stop: () => {
        try {
          whiteNoise.stop();
          whiteNoise.disconnect();
          gainNode.disconnect();
        } catch (e) {
          console.warn('Error stopping white noise:', e);
        }
      }
    };
    AudioManager.trackAudioSource(AudioManager.currentAmbientSound);
    
    showSuccessMessage('Playing white noise...');
    speak('Playing white noise for focus', { context: 'success' });
  } catch (error) {
    console.error('White noise error:', error);
    showErrorMessage('Could not play white noise');
  }
}

function playBrownNoise() {
  AudioManager.stopAllSounds();
  
  const context = AudioManager.getContext();
  if (!context) {
    showErrorMessage('Audio not supported in this browser');
    return;
  }
  
  try {
    const bufferSize = context.sampleRate * 2;
    const noiseBuffer = context.createBuffer(1, bufferSize, context.sampleRate);
    const output = noiseBuffer.getChannelData(0);
    
    let lastOut = 0.0;
    for (let i = 0; i < bufferSize; i++) {
      const white = Math.random() * 2 - 1;
      output[i] = (lastOut + (0.02 * white)) / 1.02;
      lastOut = output[i];
      output[i] *= 3.5; // Compensate for volume
    }
    
    const brownNoise = context.createBufferSource();
    const gainNode = context.createGain();
    
    brownNoise.buffer = noiseBuffer;
    brownNoise.loop = true;
    brownNoise.connect(gainNode);
    gainNode.connect(context.destination);
    gainNode.gain.value = 0.2;
    
    brownNoise.start();
    
    // Store reference for stopping
    AudioManager.currentAmbientSound = {
      stop: () => {
        try {
          brownNoise.stop();
          brownNoise.disconnect();
          gainNode.disconnect();
        } catch (e) {
          console.warn('Error stopping brown noise:', e);
        }
      }
    };
    AudioManager.trackAudioSource(AudioManager.currentAmbientSound);
    
    showSuccessMessage('Playing brown noise...');
    speak('Playing brown noise for deep focus', { context: 'success' });
  } catch (error) {
    console.error('Brown noise error:', error);
    showErrorMessage('Could not play brown noise');
  }
}
function toggleInfoPanel() {
  const panel = Utils.safeGetElement('infoPanel');
  if (panel) {
    const isVisible = panel.style.display === 'block';
    panel.style.display = isVisible ? 'none' : 'block';
    panel.setAttribute('aria-hidden', isVisible ? 'true' : 'false');
    // ... rest of function
  }
}
function playHeartbeat() {
  AudioManager.stopAllSounds();
  
  const heartbeatSound = createHeartbeatLoop();
  if (heartbeatSound) {
    heartbeatSound.start();
    AudioManager.currentAmbientSound = heartbeatSound;
    AudioManager.trackAudioSource(heartbeatSound);
    showSuccessMessage('Playing heartbeat rhythm...');
    speak('Playing calming heartbeat rhythm', { context: 'success' });
  }
}

function createHeartbeatLoop() {
  const context = AudioManager.getContext();
  if (!context) return null;
  
  let isPlaying = false;
  let nextBeatTime = 0;
  
  return {
    start: function() {
      if (isPlaying) return;
      isPlaying = true;
      nextBeatTime = context.currentTime;
      this.scheduleBeat();
    },
    
    scheduleBeat: function() {
      if (!isPlaying) return;
      
      // Create double beat (lub-dub)
      this.createBeat(nextBeatTime, 100); // lub
      this.createBeat(nextBeatTime + 0.15, 80); // dub
      
      nextBeatTime += 0.8; // 75 BPM
      setTimeout(() => this.scheduleBeat(), 700);
    },
    
    createBeat: function(time, frequency) {
      try {
        const oscillator = context.createOscillator();
        const gainNode = context.createGain();
        
        oscillator.connect(gainNode);
        gainNode.connect(context.destination);
        
        oscillator.frequency.value = frequency;
        oscillator.type = 'sine';
        
        gainNode.gain.setValueAtTime(0, time);
        gainNode.gain.linearRampToValueAtTime(0.2, time + 0.05);
        gainNode.gain.exponentialRampToValueAtTime(0.01, time + 0.1);
        
        oscillator.start(time);
        oscillator.stop(time + 0.1);
      } catch (error) {
        console.warn('Heartbeat beat creation error:', error);
      }
    },
    
    stop: function() {
      isPlaying = false;
    },
    
    isPlaying: function() {
      return isPlaying;
    }
  };
}

function createAmbientLoop(frequencies, waveType) {
  const context = AudioManager.getContext();
  if (!context) return null;
  
  let isPlaying = false;
  const oscillators = [];
  const gainNodes = [];
  
  return {
    start: function() {
      if (isPlaying) return;
      isPlaying = true;
      
      frequencies.forEach((freq, index) => {
        try {
          const oscillator = context.createOscillator();
          const gainNode = context.createGain();
          
          oscillator.connect(gainNode);
          gainNode.connect(context.destination);
          
          oscillator.frequency.value = freq + (Math.random() * 20 - 10); // Add slight variation
          oscillator.type = waveType;
          
          gainNode.gain.setValueAtTime(0, context.currentTime);
          gainNode.gain.linearRampToValueAtTime(0.1 / frequencies.length, context.currentTime + 1);
          
          oscillator.start(context.currentTime);
          
          oscillators.push(oscillator);
          gainNodes.push(gainNode);
        } catch (error) {
          console.warn('Error creating ambient oscillator:', error);
        }
      });
    },
    
    stop: function() {
      isPlaying = false;
      oscillators.forEach(osc => {
        try {
          osc.stop();
          osc.disconnect();
        } catch (e) {
          // Already stopped/disconnected
        }
      });
      gainNodes.forEach(gain => {
        try {
          gain.disconnect();
        } catch (e) {
          // Already disconnected
        }
      });
      oscillators.length = 0;
      gainNodes.length = 0;
    },
    
    isPlaying: function() {
      return isPlaying;
    }
  };
}

// Enhanced stop function with comprehensive cleanup
function stopAllSounds() {
  console.log('Global stopAllSounds() called');
  
  // Stop AudioManager sounds
  AudioManager.stopAllSounds();
  
  // Stop any breathing exercises
  if (typeof stopBreathingExercise === 'function') {
    stopBreathingExercise();
  }
  
  // Stop all calming tool exercises
  if (typeof stopAllExercises === 'function') {
    stopAllExercises();
  }
  
  // Clear any global intervals or timeouts that might be playing sounds
  try {
    if (window.breathingInterval) {
      clearInterval(window.breathingInterval);
      window.breathingInterval = null;
    }
    
    if (window.exerciseTimeout) {
      clearTimeout(window.exerciseTimeout);
      window.exerciseTimeout = null;
    }
    
    if (window.exerciseInterval) {
      clearInterval(window.exerciseInterval);
      window.exerciseInterval = null;
    }
  } catch (error) {
    console.warn('Error clearing intervals:', error);
  }
  
  // Hide any exercise containers
  try {
    document.querySelectorAll('.exercise-container').forEach(container => {
      container.remove();
    });
    
    const breathingContainer = document.getElementById('breathingContainer');
    if (breathingContainer) {
      breathingContainer.style.display = 'none';
    }
  } catch (error) {
    console.warn('Error removing exercise containers:', error);
  }
  
  // Clear voice queue
  VoiceSystem.cancelAll();
  
  showSuccessMessage('All sounds and exercises stopped');
  Utils.announceToScreenReader('All sounds and exercises stopped');
}

// ============================================================================
// ENHANCED CALMING TOOLS FUNCTIONS WITH IMPROVED VOICE TIMING
// ============================================================================



// Progressive Muscle Relaxation
function startProgressiveMuscleRelaxation() {
  if (activeExercise) {
    stopAllExercises();
  }
  
  activeExercise = 'muscle-relaxation';
  
  const container = createExerciseContainer('muscle-relaxation', 'Progressive Muscle Relaxation');
  container.innerHTML = `
    <div style="text-align: center; padding: 2rem;">
      <h3>🧘 Progressive Muscle Relaxation</h3>
      <div id="muscleInstructions" style="font-size: 1.2rem; margin: 2rem 0; min-height: 3rem; color: var(--text-primary);" aria-live="assertive">
        Get comfortable and close your eyes if you'd like...
      </div>
      <div id="muscleProgress" style="width: 100%; height: 8px; background: var(--border-color); border-radius: 4px; margin: 1rem 0;">
        <div style="width: 0%; height: 100%; background: var(--accent-primary); border-radius: 4px; transition: width 0.5s;" id="muscleProgressBar"></div>
      </div>
      <button onclick="stopAllExercises()" style="background: var(--error); color: white; border: none; padding: 1rem 2rem; border-radius: 8px; cursor: pointer; font-size: 1rem;">
        Stop Exercise
      </button>
    </div>
  `;
  
  const steps = [
    { text: "Take three deep breaths to begin...", duration: 6000 },
    { text: "Clench your fists tightly... hold for 5 seconds", duration: 6000 },
    { text: "Now relax your hands completely. Feel the difference.", duration: 4000 },
    { text: "Tense your arms by pulling them up to your shoulders", duration: 6000 },
    { text: "Let your arms drop and relax completely", duration: 4000 },
    { text: "Scrunch up your face muscles... hold tight", duration: 6000 },
    { text: "Relax your face. Let your jaw drop slightly.", duration: 4000 },
    { text: "Lift your shoulders up to your ears", duration: 6000 },
    { text: "Drop your shoulders and feel them melt down", duration: 4000 },
    { text: "Tighten your stomach muscles", duration: 6000 },
    { text: "Relax your stomach completely", duration: 4000 },
    { text: "Point your toes and tense your leg muscles", duration: 6000 },
    { text: "Relax your legs completely", duration: 4000 },
    { text: "Take a moment to notice how relaxed your whole body feels", duration: 8000 },
    { text: "Excellent work! You've completed the relaxation exercise.", duration: 4000 }
  ];
  
  let currentStep = 0;
  const totalSteps = steps.length;
  
  function nextStep() {
    if (currentStep >= steps.length || activeExercise !== 'muscle-relaxation') {
      if (activeExercise === 'muscle-relaxation') {
        showSuccessMessage('Muscle relaxation completed!');
        speakExerciseInstruction('Great job! You should feel more relaxed now.');
        stopAllExercises();
      }
      return;
    }
    
    const step = steps[currentStep];
    const instructionsEl = document.getElementById('muscleInstructions');
    const progressBar = document.getElementById('muscleProgressBar');
    
    if (instructionsEl) {
      instructionsEl.textContent = step.text;
    }
    
    if (progressBar) {
      const progress = ((currentStep + 1) / totalSteps) * 100;
      progressBar.style.width = progress + '%';
    }
    
    speakExerciseInstruction(step.text, currentStep === 0);
    
    currentStep++;
    exerciseTimeout = setTimeout(nextStep, step.duration);
  }
  
  nextStep();
  showSuccessMessage('Starting muscle relaxation exercise');
}

// 5-4-3-2-1 Grounding Technique
function start54321Grounding() {
  if (activeExercise) {
    stopAllExercises();
  }
  
  activeExercise = '54321-grounding';
  
  const container = createExerciseContainer('54321-grounding', '5-4-3-2-1 Grounding');
  container.innerHTML = `
    <div style="text-align: center; padding: 2rem;">
      <h3>👀 5-4-3-2-1 Grounding Exercise</h3>
      <div id="groundingInstructions" style="font-size: 1.2rem; margin: 2rem 0; min-height: 4rem; color: var(--text-primary);" aria-live="assertive">
        This exercise helps you focus on the present moment...
      </div>
      <div id="groundingCounter" style="font-size: 3rem; color: var(--accent-primary); font-weight: bold; margin: 1rem 0;">
        5
      </div>
      <button onclick="stopAllExercises()" style="background: var(--error); color: white; border: none; padding: 1rem 2rem; border-radius: 8px; cursor: pointer; font-size: 1rem;">
        Stop Exercise
      </button>
    </div>
  `;
  
  const steps = [
    { count: 5, sense: "see", text: "Look around and name 5 things you can SEE. Take your time with each one.", duration: 15000 },
    { count: 4, sense: "hear", text: "Listen carefully and identify 4 things you can HEAR right now.", duration: 12000 },
    { count: 3, sense: "touch", text: "Notice 3 things you can TOUCH or FEEL. Maybe your clothes, chair, or the air.", duration: 10000 },
    { count: 2, sense: "smell", text: "Try to notice 2 things you can SMELL. Take a gentle breath in.", duration: 8000 },
    { count: 1, sense: "taste", text: "Can you notice 1 thing you can TASTE? Maybe run your tongue over your lips.", duration: 6000 },
    { count: "✓", sense: "complete", text: "Excellent! You've grounded yourself in the present moment. How do you feel?", duration: 6000 }
  ];
  
  let currentStep = 0;
  
  function nextStep() {
    if (currentStep >= steps.length || activeExercise !== '54321-grounding') {
      if (activeExercise === '54321-grounding') {
        showSuccessMessage('Grounding exercise completed!');
        speakExerciseInstruction('Great job grounding yourself in the present moment!');
        stopAllExercises();
      }
      return;
    }
    
    const step = steps[currentStep];
    const instructionsEl = document.getElementById('groundingInstructions');
    const counterEl = document.getElementById('groundingCounter');
    
    if (instructionsEl) {
      instructionsEl.textContent = step.text;
    }
    
    if (counterEl) {
      counterEl.textContent = step.count;
    }
    
    speakExerciseInstruction(step.text, currentStep === 0);
    
    currentStep++;
    exerciseTimeout = setTimeout(nextStep, step.duration);
  }
  
  nextStep();
  showSuccessMessage('Starting 5-4-3-2-1 grounding exercise');
}

// Desk Stretches
function startDeskStretches() {
  if (activeExercise) {
    stopAllExercises();
  }
  
  activeExercise = 'desk-stretches';
  
  const container = createExerciseContainer('desk-stretches', 'Desk Stretches');
  container.innerHTML = `
    <div style="text-align: center; padding: 2rem;">
      <h3>🤸 Quick Desk Stretches</h3>
      <div id="stretchInstructions" style="font-size: 1.2rem; margin: 2rem 0; min-height: 3rem; color: var(--text-primary);" aria-live="assertive">
        Let's do some gentle stretches to release tension...
      </div>
      <div id="stretchEmoji" style="font-size: 4rem; margin: 1rem 0;">
        🧘
      </div>
      <button onclick="stopAllExercises()" style="background: var(--error); color: white; border: none; padding: 1rem 2rem; border-radius: 8px; cursor: pointer; font-size: 1rem;">
        Stop Stretches
      </button>
    </div>
  `;
  
  const stretches = [
    { emoji: "🙆", text: "Neck rolls: Slowly roll your head in a circle. 5 times each direction.", duration: 10000 },
    { emoji: "🤷", text: "Shoulder shrugs: Lift your shoulders up to your ears, hold for 3 seconds, then relax.", duration: 8000 },
    { emoji: "✋", text: "Wrist circles: Make gentle circles with your wrists. Both directions.", duration: 6000 },
    { emoji: "🔄", text: "Spinal twist: Sit up straight and gently twist your upper body left, then right.", duration: 8000 },
    { emoji: "👆", text: "Reach up high: Stretch your arms up toward the ceiling and hold for 5 seconds.", duration: 6000 },
    { emoji: "😌", text: "Deep breath: Take 3 slow, deep breaths. You did great!", duration: 6000 }
  ];
  
  let currentStretch = 0;
  
  function nextStretch() {
    if (currentStretch >= stretches.length || activeExercise !== 'desk-stretches') {
      if (activeExercise === 'desk-stretches') {
        showSuccessMessage('Stretching complete!');
        speakExerciseInstruction('Nice stretching! Your body should feel more relaxed now.');
        stopAllExercises();
      }
      return;
    }
    
    const stretch = stretches[currentStretch];
    const instructionsEl = document.getElementById('stretchInstructions');
    const emojiEl = document.getElementById('stretchEmoji');
    
    if (instructionsEl) {
      instructionsEl.textContent = stretch.text;
    }
    
    if (emojiEl) {
      emojiEl.textContent = stretch.emoji;
    }
    
    speakExerciseInstruction(stretch.text, currentStretch === 0);
    
    currentStretch++;
    exerciseTimeout = setTimeout(nextStretch, stretch.duration);
  }
  
  nextStretch();
  showSuccessMessage('Starting desk stretches');
}

// Body Scan Meditation
function startBodyScan() {
  if (activeExercise) {
    stopAllExercises();
  }
  
  activeExercise = 'body-scan';
  
  const container = createExerciseContainer('body-scan', 'Body Scan Meditation');
  container.innerHTML = `
    <div style="text-align: center; padding: 2rem;">
      <h3>🧘 Body Scan Meditation</h3>
      <div id="bodyScanInstructions" style="font-size: 1.2rem; margin: 2rem 0; min-height: 3rem; color: var(--text-primary);" aria-live="assertive">
        Get comfortable and close your eyes if you'd like...
      </div>
      <div style="font-size: 3rem; margin: 1rem 0;">🧘‍♀️</div>
      <button onclick="stopAllExercises()" style="background: var(--error); color: white; border: none; padding: 1rem 2rem; border-radius: 8px; cursor: pointer; font-size: 1rem;">
        Stop Meditation
      </button>
    </div>
  `;
  
  const steps = [
    "Close your eyes and take three deep breaths...",
    "Notice the top of your head. Is there any tension there?",
    "Move your attention to your forehead and around your eyes...",
    "Notice your jaw. Let it relax and drop slightly open.",
    "Feel your neck and shoulders. Let them soften and drop.",
    "Pay attention to your arms. Let them feel heavy and relaxed.",
    "Notice your chest rising and falling with each breath.",
    "Feel your stomach and lower back. Let them relax completely.",
    "Notice your hips and the feeling of sitting in your chair.",
    "Feel your legs from your thighs down to your feet.",
    "Take a moment to notice your whole body feeling calm and relaxed.",
    "When you're ready, gently open your eyes. Great job!"
  ];
  
  runTimedExercise('bodyScanInstructions', steps, 5000, () => {
    showSuccessMessage('Body scan completed!');
    speakExerciseInstruction('Wonderful! You should feel more aware and relaxed.');
  });
  
  showSuccessMessage('Starting body scan meditation');
}

// Guided Visualization
function startGuidedVisualization() {
  if (activeExercise) {
    stopAllExercises();
  }
  
  activeExercise = 'visualization';
  
  const container = createExerciseContainer('visualization', 'Peaceful Place Visualization');
  container.innerHTML = `
    <div style="text-align: center; padding: 2rem;">
      <h3>🏞️ Peaceful Place Visualization</h3>
      <div id="visualizationInstructions" style="font-size: 1.2rem; margin: 2rem 0; min-height: 4rem; color: var(--text-primary);" aria-live="assertive">
        Close your eyes and imagine your perfect peaceful place...
      </div>
      <div style="font-size: 3rem; margin: 1rem 0;">🌅</div>
      <button onclick="stopAllExercises()" style="background: var(--error); color: white; border: none; padding: 1rem 2rem; border-radius: 8px; cursor: pointer; font-size: 1rem;">
        Stop Visualization
      </button>
    </div>
  `;
  
  const steps = [
    "Close your eyes and take three slow, deep breaths...",
    "Imagine you're in the most peaceful place you can think of. Maybe a beach, forest, or cozy room...",
    "Look around this peaceful place. What colors do you see?",
    "What sounds can you hear in your peaceful place? Maybe birds, waves, or gentle music?",
    "What does the air feel like? Is it warm and sunny, or cool and refreshing?",
    "Take a deep breath in your peaceful place. What do you smell?",
    "Find a comfortable spot to sit or lie down in your peaceful place.",
    "Feel how safe and calm you are here. This is your special place.",
    "Remember that you can come back to this peaceful place anytime you need to feel calm.",
    "When you're ready, slowly open your eyes and bring that peaceful feeling with you."
  ];
  
  runTimedExercise('visualizationInstructions', steps, 6000, () => {
    showSuccessMessage('Visualization completed!');
    speakExerciseInstruction('Beautiful! Remember, you can visit your peaceful place anytime.');
  });
  
  showSuccessMessage('Starting peaceful place visualization');
}

// Positive Affirmations
function showPositiveAffirmations() {
  if (activeExercise) {
    stopAllExercises();
  }
  
  activeExercise = 'affirmations';
  
  const container = createExerciseContainer('affirmations', 'Positive Affirmations');
  
  const affirmations = [
    "I am capable and strong 💪",
    "I can handle challenges with courage 🦁", 
    "I am kind to myself and others 💝",
    "I am learning and growing every day 🌱",
    "I can take deep breaths when I feel overwhelmed 🌬️",
    "I am proud of trying my best 🌟",
    "I deserve to feel happy and calm 😊",
    "I can ask for help when I need it 🤝",
    "I am unique and that makes me special ✨",
    "I choose to focus on good thoughts 🌈"
  ];
  
  container.innerHTML = `
    <div style="text-align: center; padding: 2rem;">
      <h3>⭐ Positive Affirmations</h3>
      <div id="currentAffirmation" style="font-size: 1.4rem; margin: 2rem 0; min-height: 4rem; color: var(--accent-primary); font-weight: bold;">
        ${affirmations[0]}
      </div>
      <div style="margin: 1rem 0;">
        <button onclick="nextAffirmation()" style="background: var(--accent-primary); color: white; border: none; padding: 1rem 2rem; border-radius: 8px; cursor: pointer; font-size: 1rem; margin: 0 0.5rem;">
          Next Affirmation
        </button>
        <button onclick="stopAllExercises()" style="background: var(--error); color: white; border: none; padding: 1rem 2rem; border-radius: 8px; cursor: pointer; font-size: 1rem; margin: 0 0.5rem;">
          Close
        </button>
      </div>
    </div>
  `;
  
  let currentIndex = 0;
  
  window.nextAffirmation = function() {
    currentIndex = (currentIndex + 1) % affirmations.length;
    const affirmationEl = document.getElementById('currentAffirmation');
    if (affirmationEl) {
      affirmationEl.textContent = affirmations[currentIndex];
      speakExerciseInstruction(affirmations[currentIndex].replace(/[💪🦁💝🌱🌬️🌟😊🤝✨🌈]/g, ''));
    }
  };
  
  speakExerciseInstruction(affirmations[0].replace(/[💪🦁💝🌱🌬️🌟😊🤝✨🌈]/g, ''), true);
  showSuccessMessage('Showing positive affirmations');
}

// Additional exercises (focus dot, color breathing, counting)
function startFocusDot() {
  if (activeExercise) {
    stopAllExercises();
  }
  
  activeExercise = 'focus-dot';
  
  const container = createExerciseContainer('focus-dot', 'Focus Dot Exercise');
  container.innerHTML = `
    <div style="text-align: center; padding: 2rem;">
      <h3>🔴 Focus Dot Exercise</h3>
      <p style="margin: 1rem 0; color: var(--text-secondary);">
        Focus on the red dot and breathe slowly. Let it help calm your mind.
      </p>
      <div style="position: relative; width: 200px; height: 200px; margin: 2rem auto; border: 2px solid var(--border-color); border-radius: 50%; display: flex; align-items: center; justify-content: center;">
        <div id="focusDot" style="width: 20px; height: 20px; background: #f44336; border-radius: 50%; transition: transform 4s ease;"></div>
      </div>
      <div id="focusInstructions" style="font-size: 1.1rem; color: var(--text-primary); margin: 1rem 0;" aria-live="polite">
        Breathe in as the dot grows...
      </div>
      <button onclick="stopAllExercises()" style="background: var(--error); color: white; border: none; padding: 1rem 2rem; border-radius: 8px; cursor: pointer; font-size: 1rem;">
        Stop Focus Exercise
      </button>
    </div>
  `;
  
  let isExpanding = true;
  
  function animateDot() {
    if (activeExercise !== 'focus-dot') return;
    
    const dot = document.getElementById('focusDot');
    const instructions = document.getElementById('focusInstructions');
    
    if (!dot || !instructions) return;
    
    if (isExpanding) {
      dot.style.transform = 'scale(3)';
      instructions.textContent = 'Breathe in slowly...';
      VoiceSystem.speakBreathingCue('inhale', '');
    } else {
      dot.style.transform = 'scale(1)';
      instructions.textContent = 'Breathe out slowly...';
      VoiceSystem.speakBreathingCue('exhale', '');
    }
    
    isExpanding = !isExpanding;
    exerciseTimeout = setTimeout(animateDot, 4000);
  }
  
  animateDot();
  showSuccessMessage('Starting focus dot exercise');
  speakExerciseInstruction('Focus on the red dot and breathe slowly with its movement', true);
}

function startColorBreathing() {
  if (activeExercise) {
    stopAllExercises();
  }
  
  activeExercise = 'color-breathing';
  
  const container = createExerciseContainer('color-breathing', 'Color Breathing');
  container.innerHTML = `
    <div style="text-align: center; padding: 2rem;">
      <h3>🌈 Color Breathing</h3>
      <div id="colorCircle" style="width: 150px; height: 150px; border-radius: 50%; margin: 2rem auto; transition: all 4s ease; background: #4CAF50;"></div>
      <div id="colorInstructions" style="font-size: 1.2rem; margin: 1rem 0; color: var(--text-primary);" aria-live="assertive">
        Breathe in the calm green color...
      </div>
      <button onclick="stopAllExercises()" style="background: var(--error); color: white; border: none; padding: 1rem 2rem; border-radius: 8px; cursor: pointer; font-size: 1rem;">
        Stop Color Breathing
      </button>
    </div>
  `;
  
  const colors = [
    { color: '#4CAF50', name: 'green', inhale: 'Breathe in calm green energy...', exhale: 'Breathe out tension...' },
    { color: '#2196F3', name: 'blue', inhale: 'Breathe in peaceful blue...', exhale: 'Breathe out worry...' },
    { color: '#9C27B0', name: 'purple', inhale: 'Breathe in wise purple...', exhale: 'Breathe out stress...' },
    { color: '#FF9800', name: 'orange', inhale: 'Breathe in warm orange...', exhale: 'Breathe out fear...' }
  ];
  
  let currentColor = 0;
  let isInhaling = true;
  
  function animateColorBreathing() {
    if (activeExercise !== 'color-breathing') return;
    
    const circle = document.getElementById('colorCircle');
    const instructions = document.getElementById('colorInstructions');
    
    if (!circle || !instructions) return;
    
    const color = colors[currentColor];
    
    if (isInhaling) {
      circle.style.background = color.color;
      circle.style.transform = 'scale(1.3)';
      instructions.textContent = color.inhale;
      VoiceSystem.speakBreathingCue('inhale', '');
    } else {
      circle.style.transform = 'scale(1)';
      instructions.textContent = color.exhale;
      VoiceSystem.speakBreathingCue('exhale', '');
      currentColor = (currentColor + 1) % colors.length;
    }
    
    isInhaling = !isInhaling;
    exerciseTimeout = setTimeout(animateColorBreathing, 4000);
  }
  
  animateColorBreathing();
  showSuccessMessage('Starting color breathing exercise');
  speakExerciseInstruction('Breathe in calming colors and breathe out tension', true);
}

function startCountingExercise() {
  if (activeExercise) {
    stopAllExercises();
  }
  
  activeExercise = 'counting';
  
  const container = createExerciseContainer('counting', 'Counting Exercise');
  container.innerHTML = `
    <div style="text-align: center; padding: 2rem;">
      <h3>🔢 Calming Counting</h3>
      <div id="countingNumber" style="font-size: 4rem; color: var(--accent-primary); font-weight: bold; margin: 2rem 0;">
        100
      </div>
      <div id="countingInstructions" style="font-size: 1.1rem; margin: 1rem 0; color: var(--text-primary);">
        Count backwards from 100 by 3s. Take a breath with each number.
      </div>
      <button onclick="stopAllExercises()" style="background: var(--error); color: white; border: none; padding: 1rem 2rem; border-radius: 8px; cursor: pointer; font-size: 1rem;">
        Stop Counting
      </button>
    </div>
  `;
  
  let currentNumber = 100;
  
  function nextNumber() {
    if (activeExercise !== 'counting' || currentNumber < 0) {
      if (activeExercise === 'counting') {
        showSuccessMessage('Counting exercise completed!');
        speakExerciseInstruction('Great job counting! Your mind should feel more focused now.');
        stopAllExercises();
      }
      return;
    }
    
    const numberEl = document.getElementById('countingNumber');
    if (numberEl) {
      numberEl.textContent = currentNumber;
      if (currentNumber % 15 === 1) { // Speak every 5th number
        speakExerciseInstruction(currentNumber.toString());
      }
    }
    
    currentNumber -= 3;
    exerciseTimeout = setTimeout(nextNumber, 2000);
  }
  
  nextNumber();
  showSuccessMessage('Starting counting exercise');
}

// Utility functions for exercises
function createExerciseContainer(id, title) {
  // Remove any existing exercise container
  const existing = document.getElementById(id + '-container');
  if (existing) {
    existing.remove();
  }
  
  const container = document.createElement('div');
  container.id = id + '-container';
  container.className = 'exercise-container';
  container.setAttribute('role', 'dialog');
  container.setAttribute('aria-labelledby', id + '-title');
  container.setAttribute('aria-modal', 'true');
  container.style.cssText = `
    position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%);
    background: var(--bg-primary); padding: 2rem; border-radius: 20px;
    text-align: center; z-index: var(--z-modal); 
    box-shadow: 0 20px 40px var(--shadow);
    border: 2px solid var(--accent-primary);
    max-width: 90%; max-height: 90%;
    overflow-y: auto;
  `;
  
  document.body.appendChild(container);
  return container;
}

function runTimedExercise(instructionsId, steps, stepDuration, onComplete) {
  let currentStep = 0;
  
  function nextStep() {
    if (currentStep >= steps.length || !activeExercise) {
      if (activeExercise && onComplete) {
        onComplete();
        stopAllExercises();
      }
      return;
    }
    
    const instructionsEl = document.getElementById(instructionsId);
    if (instructionsEl) {
      instructionsEl.textContent = steps[currentStep];
    }
    
    speakExerciseInstruction(steps[currentStep], currentStep === 0);
    
    currentStep++;
    exerciseTimeout = setTimeout(nextStep, stepDuration);
  }
  
  nextStep();
}

function stopAllExercises() {
  if (exerciseInterval) {
    clearInterval(exerciseInterval);
    exerciseInterval = null;
  }
  
  if (exerciseTimeout) {
    clearTimeout(exerciseTimeout);
    exerciseTimeout = null;
  }
  
  // Remove any exercise containers
  const containers = document.querySelectorAll('.exercise-container');
  containers.forEach(container => container.remove());
  
  // Clean up global functions
  if (window.nextAffirmation) {
    delete window.nextAffirmation;
  }
  
  activeExercise = null;
  
  Utils.announceToScreenReader('All exercises stopped');
}

// ============================================================================
// BREATHING EXERCISE WITH ENHANCED VOICE TIMING
// ============================================================================



function breathingExercise() {
  const container = Utils.safeGetElement('breathingContainer');
  
  if (!container) {
    createBreathingContainer();
    return breathingExercise();
  }
  
  container.style.display = 'block';
  container.setAttribute('aria-hidden', 'false');
  
  breathingPhase = 0;
  breathingCount = 0;
  
  function updateBreathing() {
    const circle = Utils.safeGetElement('breathingCircle');
    const textEl = Utils.safeGetElement('breathingText');
    
    switch(breathingPhase) {
      case 0: // Inhale
        if (circle) circle.classList.add('inhale');
        Utils.safeSetText('breathingText', `Breathe In... ${4 - breathingCount}`);
        if (breathingCount === 0) {
          VoiceSystem.speakBreathingCue('inhale', 4 - breathingCount);
        }
        if (breathingCount >= 4) {
          breathingPhase = 1;
          breathingCount = 0;
        }
        break;
      case 1: // Hold
        Utils.safeSetText('breathingText', `Hold... ${2 - breathingCount}`);
        if (breathingCount === 0) {
          VoiceSystem.speakBreathingCue('hold_in', 2 - breathingCount);
        }
        if (breathingCount >= 2) {
          breathingPhase = 2;
          breathingCount = 0;
        }
        break;
      case 2: // Exhale
        if (circle) circle.classList.remove('inhale');
        Utils.safeSetText('breathingText', `Breathe Out... ${4 - breathingCount}`);
        if (breathingCount === 0) {
          VoiceSystem.speakBreathingCue('exhale', 4 - breathingCount);
        }
        if (breathingCount >= 4) {
          breathingPhase = 3;
          breathingCount = 0;
        }
        break;
      case 3: // Hold
        Utils.safeSetText('breathingText', `Hold... ${2 - breathingCount}`);
        if (breathingCount === 0) {
          VoiceSystem.speakBreathingCue('hold_out', 2 - breathingCount);
        }
        if (breathingCount >= 2) {
          breathingPhase = 0;
          breathingCount = 0;
        }
        break;
    }
    breathingCount++;
  }
  
  breathingInterval = setInterval(updateBreathing, 1000);
  speakExerciseInstruction('Starting breathing exercise. Follow along with the circle.', true);
  showSuccessMessage('Breathing exercise started');
  Utils.announceToScreenReader('Breathing exercise started. Follow the instructions');
}

function createBreathingContainer() {
  const container = document.createElement('div');
  container.id = 'breathingContainer';
  container.setAttribute('role', 'region');
  container.setAttribute('aria-labelledby', 'breathing-title');
  container.style.cssText = `
    position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%);
    background: rgba(255, 255, 255, 0.95); padding: 2rem; border-radius: 20px;
    text-align: center; z-index: var(--z-modal); 
    box-shadow: 0 20px 40px var(--shadow);
    display: none; border: 2px solid var(--accent-primary);
  `;
  
  container.innerHTML = `
    <h3 id="breathing-title" class="sr-only">Breathing Exercise</h3>
    <div id="breathingCircle" style="
      width: 150px; height: 150px; border-radius: 50%; 
      background: linear-gradient(45deg, var(--accent-primary), var(--accent-secondary));
      margin: 0 auto 1rem; transition: transform 4s ease;
      box-shadow: 0 4px 12px var(--shadow);
    " aria-hidden="true"></div>
    <div id="breathingText" style="
      font-size: 1.5rem; margin-bottom: 1rem; font-weight: bold; 
      color: var(--text-primary);
    " aria-live="assertive">Ready to breathe...</div>
    <button onclick="stopBreathingExercise()" style="
      background: var(--error); color: white; border: none; 
      padding: 0.75rem 1.5rem; border-radius: 8px; cursor: pointer;
      font-size: 1rem; font-weight: bold;
    " aria-label="Stop breathing exercise">Stop Exercise</button>
  `;
  
  document.body.appendChild(container);
  
  // Add CSS animation class
  const style = document.createElement('style');
  style.textContent = `
    #breathingCircle.inhale {
      transform: scale(1.3);
    }
  `;
  document.head.appendChild(style);
}

function stopBreathingExercise() {
  if (breathingInterval) {
    clearInterval(breathingInterval);
    breathingInterval = null;
  }
  
  const container = Utils.safeGetElement('breathingContainer');
  if (container) {
    container.style.display = 'none';
    container.setAttribute('aria-hidden', 'true');
  }
  
  showSuccessMessage('Breathing exercise stopped');
  Utils.announceToScreenReader('Breathing exercise stopped');
}

// ============================================================================
// PARENT FUNCTIONS
// ============================================================================

function openParentModal() {
  const modal = Utils.safeGetElement('parentModal');
  if (modal) {
    modal.style.display = 'block';
    modal.setAttribute('aria-hidden', 'false');
    const pinInput = Utils.safeGetElement('parentPin');
    if (pinInput) {
      setTimeout(() => pinInput.focus(), 100);
    }
  }
}

function closeParentModal() {
  const modal = Utils.safeGetElement('parentModal');
  if (modal) {
    modal.style.display = 'none';
    modal.setAttribute('aria-hidden', 'true');
    const pinInput = Utils.safeGetElement('parentPin');
    const errorDiv = Utils.safeGetElement('pinError');
    if (pinInput) pinInput.value = '';
    if (errorDiv) errorDiv.textContent = '';
  }
}

function checkParentPin() {
  const pinInput = Utils.safeGetElement('parentPin');
  const errorDiv = Utils.safeGetElement('pinError');
  
  if (!pinInput || !errorDiv) return;
  
  const inputValue = pinInput.value;
  
  if (inputValue === '1234' || AppState.validateParentPin(inputValue)) {
    closeParentModal();
    openParentDashboard();
  } else {
    errorDiv.textContent = 'Incorrect PIN (try 1234)';
    errorDiv.setAttribute('role', 'alert');
    pinInput.value = '';
    pinInput.focus();
    Utils.announceToScreenReader('Incorrect PIN entered');
  }
}

function openParentDashboard() {
  const modal = Utils.safeGetElement('parentDashboard');
  if (modal) {
    modal.style.display = 'block';
    modal.setAttribute('aria-hidden', 'false');
    loadParentSettings();
    updateChildStats();
    
    // Focus management
    const firstButton = modal.querySelector('button');
    if (firstButton) {
      setTimeout(() => firstButton.focus(), 100);
    }
  }
}

function closeParentDashboard() {
  const modal = Utils.safeGetElement('parentDashboard');
  if (modal) {
    modal.style.display = 'none';
    modal.setAttribute('aria-hidden', 'true');
  }
}

function loadParentSettings() {
  const taskPointsInput = Utils.safeGetElement('taskPoints');
  const behaviorPointsInput = Utils.safeGetElement('behaviorPoints');
  
  if (taskPointsInput) taskPointsInput.value = AppState.settings.taskPoints;
  if (behaviorPointsInput) behaviorPointsInput.value = AppState.settings.behaviorPoints;
}

function saveParentSettings() {
  const taskPointsInput = Utils.safeGetElement('taskPoints');
  const behaviorPointsInput = Utils.safeGetElement('behaviorPoints');
  
  if (taskPointsInput) {
    const value = parseInt(taskPointsInput.value);
    if (value >= 1 && value <= 20) {
      AppState.settings.taskPoints = value;
    }
  }
  
  if (behaviorPointsInput) {
    const value = parseInt(behaviorPointsInput.value);
    if (value >= 1 && value <= 10) {
      AppState.settings.behaviorPoints = value;
    }
  }
  
  AppState.saveData();
  showSuccessMessage('Parent settings saved');
  Utils.announceToScreenReader('Parent settings saved successfully');
}

function updateChildStats() {
  const statsDiv = Utils.safeGetElement('childStats');
  if (!statsDiv) return;
  
  if (!AppState.currentProfile) {
    statsDiv.innerHTML = '<p>No child profile selected</p>';
    return;
  }
  
  const profile = AppState.profiles.find(p => p.id === AppState.currentProfile);
  if (!profile) return;
  
  const completedTasks = profile.tasks ? profile.tasks.filter(t => t.completed).length : 0;
  const totalBehaviors = profile.behaviors ? profile.behaviors.length : 0;
  const totalTasks = profile.tasks ? profile.tasks.length : 0;
  
  statsDiv.innerHTML = `
    <div style="background: var(--bg-primary); padding: 1rem; border-radius: 8px; border: 1px solid var(--border-color);">
      <h4 style="margin: 0 0 1rem 0; color: var(--accent-primary);">${profile.name} (${profile.age} years old)</h4>
      <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(120px, 1fr)); gap: 1rem;">
        <div style="text-align: center;">
          <div style="font-size: 1.5rem; font-weight: bold; color: var(--accent-primary);">${profile.rewardPoints || 0}</div>
          <div style="font-size: 0.9rem; color: var(--text-secondary);">Total Points</div>
        </div>
        <div style="text-align: center;">
          <div style="font-size: 1.5rem; font-weight: bold; color: var(--accent-primary);">${completedTasks}/${totalTasks}</div>
          <div style="font-size: 0.9rem; color: var(--text-secondary);">Tasks Done</div>
        </div>
        <div style="text-align: center;">
          <div style="font-size: 1.5rem; font-weight: bold; color: var(--accent-primary);">${totalBehaviors}</div>
          <div style="font-size: 0.9rem; color: var(--text-secondary);">Good Behaviors</div>
        </div>
      </div>
    </div>
  `;
}

function openChangePinModal() {
  const modal = Utils.safeGetElement('changePinModal');
  if (modal) {
    modal.style.display = 'block';
    modal.setAttribute('aria-hidden', 'false');
    
    // Focus management
    const currentPinInput = Utils.safeGetElement('currentPin');
    if (currentPinInput) {
      setTimeout(() => currentPinInput.focus(), 100);
    }
  }
}

function closeChangePinModal() {
  const modal = Utils.safeGetElement('changePinModal');
  if (modal) {
    modal.style.display = 'none';
    modal.setAttribute('aria-hidden', 'true');
    const inputs = ['currentPin', 'newPin', 'confirmPin'];
    inputs.forEach(id => {
      const input = Utils.safeGetElement(id);
      if (input) input.value = '';
    });
    const errorDiv = Utils.safeGetElement('pinChangeError');
    if (errorDiv) errorDiv.textContent = '';
  }
}

function changeParentPin() {
  const currentPin = Utils.safeGetElement('currentPin')?.value;
  const newPin = Utils.safeGetElement('newPin')?.value;
  const confirmPin = Utils.safeGetElement('confirmPin')?.value;
  const errorDiv = Utils.safeGetElement('pinChangeError');
  
  if (!currentPin || !newPin || !confirmPin || !errorDiv) return;
  
  if (newPin !== confirmPin) {
    errorDiv.textContent = 'New PIN and confirmation do not match';
    errorDiv.setAttribute('role', 'alert');
    Utils.announceToScreenReader('New PIN and confirmation do not match');
    return;
  }
  
  const result = AppState.changeParentPin(currentPin, newPin);
  
  if (result.success) {
    closeChangePinModal();
    showSuccessMessage('PIN changed successfully');
    Utils.announceToScreenReader('PIN changed successfully');
  } else {
    errorDiv.textContent = result.error;
    errorDiv.setAttribute('role', 'alert');
    Utils.announceToScreenReader(result.error);
  }
}

function exportData() {
  try {
    const dataStr = AppState.exportData();
    if (!dataStr) {
      showErrorMessage('Failed to export data');
      return;
    }
    
    const dataBlob = new Blob([dataStr], {type: 'application/json'});
    const link = document.createElement('a');
    link.href = URL.createObjectURL(dataBlob);
    link.download = 'adhd-helper-data-' + new Date().toISOString().split('T')[0] + '.json';
    
    // Trigger download
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    // Cleanup
    setTimeout(() => URL.revokeObjectURL(link.href), 100);
    
    showSuccessMessage('Data exported successfully');
    Utils.announceToScreenReader('Data exported successfully');
  } catch (error) {
    console.error('Export error:', error);
    showErrorMessage('Failed to export data');
  }
}

function clearAllData() {
  if (confirm('Are you sure? This will delete ALL data and cannot be undone!')) {
    if (confirm('Really delete everything? This includes all profiles, tasks, and progress!')) {
      try {
        localStorage.clear();
        Utils.announceToScreenReader('All data cleared. The page will now reload.');
        setTimeout(() => location.reload(), 1000);
      } catch (error) {
        console.error('Error clearing data:', error);
        showErrorMessage('Failed to clear all data');
      }
    }
  }
}

function resetChildStats() {
  if (!AppState.currentProfile) {
    showErrorMessage('Please select a child profile first');
    return;
  }
  
  const profile = AppState.profiles.find(p => p.id === AppState.currentProfile);
  if (!profile) {
    showErrorMessage('Profile not found');
    return;
  }
  
  const confirmMessage = `Are you sure you want to reset all stats for ${profile.name}?\n\nThis will clear:\n• All tasks and progress\n• All behavior records\n• All reward points\n\nThe profile itself will be kept. This cannot be undone!`;
  
  if (confirm(confirmMessage)) {
    if (confirm(`Last chance! Reset all progress for ${profile.name}?`)) {
      try {
        // Reset all stats but keep profile info
        profile.tasks = [];
        profile.behaviors = [];
        profile.rewardPoints = 0;
        profile.routines = profile.routines || []; // Keep routines if they exist
        
        // Save the changes
        AppState.saveData();
        
        // Update the UI immediately
        updateTaskDisplay([]);
        updateBehaviorDisplay([]);
        updateRewardDisplay(0);
        updateChildStats();
        clearAllCharts();
        
        // Show success message
        showSuccessMessage(`${profile.name}'s stats have been reset to zero`);
        Utils.announceToScreenReader(`All stats reset for ${profile.name}. Fresh start!`);
        
        console.log(`Stats reset for profile: ${profile.name}`);
        
      } catch (error) {
        console.error('Error resetting stats:', error);
        showErrorMessage('Failed to reset stats. Please try again.');
      }
    }
  }
}

// ============================================================================
// INFO PANEL FUNCTIONS
// ============================================================================

function toggleInfoPanel() {
  const panel = Utils.safeGetElement('infoPanel');
  if (panel) {
    const isVisible = panel.style.display === 'block';
    panel.style.display = isVisible ? 'none' : 'block';
    panel.setAttribute('aria-hidden', isVisible ? 'true' : 'false');
    
    if (!isVisible) {
      // Show the About tab when opening
      showInfoTab('about', null);
      //showResources();
      // Focus management
      const firstTab = panel.querySelector('.info-tab');
      if (firstTab) {
        setTimeout(() => firstTab.focus(), 100);
      }
    }
    
    Utils.announceToScreenReader(`Info panel ${isVisible ? 'closed' : 'opened'}`);
  } else {
    showResourcesModal();
  }
}

function showInfoTab(tabName, e) {
  // Hide all sections
  const sections = document.querySelectorAll('.info-section');
  sections.forEach(section => section.classList.remove('active'));
  
  // Remove active class from all tabs
  const tabs = document.querySelectorAll('.info-tab');
  tabs.forEach(tab => {
    tab.classList.remove('active');
    tab.setAttribute('aria-selected', 'false');
  });
  
  // Show selected section
  const selectedSection = document.getElementById(tabName + '-info');
  if (selectedSection) {
    selectedSection.classList.add('active');
  }
  
  // Add active class to clicked tab
  if (e && e.target) {
    e.target.classList.add('active');
    e.target.setAttribute('aria-selected', 'true');
  }
  
  Utils.announceToScreenReader(`Switched to ${tabName} information`);
}
  const selectedSection = Utils.safeGetElement(tabName + '-info');
  if (selectedSection) {
    selectedSection.classList.add('active');
  }
  
  const clickedTab = document.querySelector(`.info-tab[onclick*="${tabName}"]`);
  if (clickedTab) {
    clickedTab.classList.add('active');
    clickedTab.setAttribute('aria-selected', 'true');
  }
  
  Utils.announceToScreenReader(`Switched to ${tabName} information`);


function showResources() {
  const modal = Utils.safeGetElement('infoPanel');
  if (modal) {
    modal.style.display = 'block';
    modal.setAttribute('aria-hidden', 'false');
    
    const resourcesSection = Utils.safeGetElement('resources-info');
    if (resourcesSection) {
      loadAustralianResources(resourcesSection);
    }
    
    setTimeout(() => {
      showInfoTab('resources');
    }, 100);
  } else {
    showResourcesModal();
  }
}

function showResourcesModal() {
  const modal = document.createElement('div');
  modal.className = 'resource-modal';
  modal.setAttribute('role', 'dialog');
  modal.setAttribute('aria-labelledby', 'resource-modal-title');
  modal.setAttribute('aria-modal', 'true');
  modal.style.cssText = `
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: rgba(0,0,0,0.8);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: var(--z-modal);
    backdrop-filter: blur(4px);
  `;
  
  const content = document.createElement('div');
  content.style.cssText = `
    background: var(--bg-primary); max-width: 90%; max-height: 90%;
    border-radius: 12px; overflow: hidden; 
    box-shadow: 0 20px 40px var(--shadow);
    border: 2px solid var(--accent-primary);
  `;
  
  const header = document.createElement('div');
  header.style.cssText = `
    background: var(--accent-primary); color: white; padding: 1rem 2rem;
    display: flex; justify-content: space-between; align-items: center;
  `;
  header.innerHTML = `
    <h3 id="resource-modal-title">Australian ADHD Resources</h3>
    <button onclick="this.closest('.resource-modal').remove()" 
            style="background: none; border: none; color: white; font-size: 1.5rem; cursor: pointer; padding: 0.5rem;"
            aria-label="Close resources modal">&times;</button>
  `;
  
  const body = document.createElement('div');
  body.style.cssText = 'padding: 2rem; max-height: 70vh; overflow-y: auto; color: var(--text-primary);';
  
  loadAustralianResources(body);
  
  content.appendChild(header);
  content.appendChild(body);
  modal.appendChild(content);
  
  // Close on background click
  modal.onclick = (e) => {
    if (e.target === modal) modal.remove();
  };
  
  // Close on Escape key
  const handleEscape = (e) => {
    if (e.key === 'Escape') {
      modal.remove();
      document.removeEventListener('keydown', handleEscape);
    }
  };
  document.addEventListener('keydown', handleEscape);
  
  document.body.appendChild(modal);
}

function loadAustralianResources(container) {
  const australianResources = {
    crisis: {
      title: "🚨 Crisis & Emergency Support",
      resources: [
        {
          name: "Lifeline Australia",
          phone: "13 11 14",
          website: "https://lifeline.org.au",
          description: "24/7 crisis support and suicide prevention"
        },
        {
          name: "Kids Helpline",
          phone: "1800 55 1800",
          website: "https://kidshelpline.com.au",
          description: "24/7 counselling for children and young people aged 5-25"
        },
        {
          name: "Beyond Blue",
          phone: "1300 22 4636",
          website: "https://beyondblue.org.au",
          description: "Depression, anxiety and suicide prevention support"
        },
        {
          name: "Emergency Services",
          phone: "000",
          description: "Police, Fire, Ambulance - life threatening emergencies"
        }
      ]
    },
    
    adhd: {
      title: "🎯 ADHD Resources Australia",
      resources: [
        {
          name: "ADHD Australia",
          phone: "1300 39 39 19",
          website: "https://adhdaustralia.org.au",
          description: "National ADHD support, information and advocacy"
        },
        {
          name: "ADHD South Australia",
          phone: "(08) 8379 8697",
          website: "https://adhdsupportgroupsa.com.au",
          description: "South Australian ADHD support groups and resources"
        },
        {
          name: "ADHD Victoria",
          phone: "(03) 9889 3599",
          website: "https://www.adhd.org.au",
          description: "Victorian ADHD support and education"
        }
      ]
    },
    
    mental_health: {
      title: "🧠 Mental Health Support Australia",
      resources: [
        {
          name: "headspace",
          phone: "1800 650 890",
          website: "https://headspace.org.au",
          description: "Mental health support for 12-25 year olds"
        },
        {
          name: "SANE Australia",
          phone: "1800 187 263",
          website: "https://sane.org",
          description: "Mental illness information and support"
        },
        {
          name: "ReachOut Australia",
          website: "https://au.reachout.com",
          description: "Mental health resources for young people"
        }
      ]
    }
  };

  let html = '<h3>Australian ADHD & Mental Health Resources</h3>';
  
  Object.keys(australianResources).forEach(categoryKey => {
    const category = australianResources[categoryKey];
    html += `<div class="resource-category" style="margin-bottom: 2rem; padding: 1rem; border: 2px solid var(--border-color); border-radius: 8px; background: var(--bg-secondary);">`;
    html += `<h4 style="color: var(--accent-primary); margin: 0 0 1rem 0; padding-bottom: 0.5rem; border-bottom: 2px solid var(--accent-primary);">${category.title}</h4>`;
    
    category.resources.forEach(resource => {
      html += '<div class="resource-item" style="background: var(--bg-primary); border: 1px solid var(--border-color); border-radius: 6px; padding: 1rem; margin-bottom: 1rem;">';
      html += `<h5 style="color: var(--accent-primary); margin: 0 0 0.5rem 0; font-size: 1.1rem;">${resource.name}</h5>`;
      html += `<p style="color: var(--text-primary); margin: 0 0 0.75rem 0;">${resource.description}</p>`;
      
      if (resource.website) {
        html += `<div style="margin: 0.25rem 0; font-size: 0.9rem;">🌐 <a href="${resource.website}" target="_blank" rel="noopener" style="color: var(--accent-primary); text-decoration: none;">${resource.website}</a></div>`;
      }
      
if (resource.phone) {
          const phoneNumber = resource.phone.replace(/[^\d]/g, '');
          html += `<div style="margin: 0.25rem 0; font-size: 0.9rem;">📞 <a href="tel:${phoneNumber}" style="color: var(--accent-secondary); text-decoration: none; font-weight: 600;">${resource.phone}</a></div>`;
        }
        
        html += '</div>';
      });
      
      html += '</div>';
    });
    
    container.innerHTML = html;
  }

// ============================================================================
// VOICE CONTROL FUNCTIONS
// ============================================================================

function updateSelectedVoice() {
  const voiceSelect = document.getElementById('voiceSelect');
  if (!voiceSelect) return;
  
  const selectedIndex = voiceSelect.value;
  if (selectedIndex !== '') {
    VoiceSystem.updateSetting('selectedVoice', parseInt(selectedIndex));
  }
}

function updateVoiceSpeed() {
  const speedSlider = document.getElementById('voiceSpeed');
  const speedValue = document.getElementById('speedValue');
  
  if (!speedSlider || !speedValue) return;
  
  const speed = parseFloat(speedSlider.value);
  VoiceSystem.updateSetting('speed', speed);
  speedValue.textContent = speed;
}

function updateVoicePitch() {
  const pitchSlider = document.getElementById('voicePitch');
  const pitchValue = document.getElementById('pitchValue');
  
  if (!pitchSlider || !pitchValue) return;
  
  const pitch = parseFloat(pitchSlider.value);
  VoiceSystem.updateSetting('pitch', pitch);
  pitchValue.textContent = pitch;
}

function updateVoiceVolume() {
  const volumeSlider = document.getElementById('voiceVolume');
  const volumeValue = document.getElementById('volumeValue');
  
  if (!volumeSlider || !volumeValue) return;
  
  const volume = parseFloat(volumeSlider.value);
  VoiceSystem.updateSetting('volume', volume);
  volumeValue.textContent = volume;
}

function toggleVoicePrompts() {
  const voiceEnabled = document.getElementById('voiceEnabled');
  if (!voiceEnabled) return;
  
  VoiceSystem.updateSetting('enabled', voiceEnabled.checked);
  const status = voiceEnabled.checked ? 'enabled' : 'disabled';
  Utils.announceToScreenReader(`Voice prompts ${status}`);
}
// VOICE CONTROL FUNCTIONS
// ============================================================================

// Test voice button function
function testVoice() {
  console.log('testVoice() called');
  
  if (typeof VoiceSystem === 'undefined' || !VoiceSystem.isSupported) {
    alert('Voice system not available');
    return;
  }
  
  VoiceSystem.speak('Hello! This is a test of the voice system. Can you hear me clearly?', {
    context: 'general',
    priority: 'high',
    interrupt: true
  });
  
  showSuccessMessage('Testing voice...');
}

// Test task completion voice
function speakTaskExample() {
  console.log('speakTaskExample() called');
  
  if (typeof VoiceSystem === 'undefined' || !VoiceSystem.isSupported) {
    alert('Voice system not available');
    return;
  }
  
  VoiceSystem.speakTaskCompletion('finish your homework');
  showSuccessMessage('Testing task voice...');
}

// Test behavior encouragement voice
function speakBehaviorExample() {
  console.log('speakBehaviorExample() called');
  
  if (typeof VoiceSystem === 'undefined' || !VoiceSystem.isSupported) {
    alert('Voice system not available');
    return;
  }
  
  VoiceSystem.speakBehaviorEncouragement('Focused');
  showSuccessMessage('Testing behavior voice...');
}


function updateSelectedVoice() {
  // ... rest of your code

// ============================================================================
// INITIALIZATION
// ============================================================================
function checkTermsAcceptance() {
  const termsAccepted = localStorage.getItem('termsAccepted');
  if (!termsAccepted) {
    const accept = confirm(
      'Welcome to ADHD & ASD Helper!\n\n' +
      'Before using this app, please review:\n' +
      '• Terms & Conditions\n' +
      '• Privacy Policy\n\n' +
      'This app is a tool for organization, NOT medical treatment.\n' +
      'Parental supervision is required for children under 13.\n\n' +
      'Click OK to accept and continue.'
    );
    
    if (accept) {
      localStorage.setItem('termsAccepted', 'true');
    } else {
      window.location.href = 'terms.html';
    }
  }
}

// Call this in your DOMContentLoaded event
document.addEventListener('DOMContentLoaded', function() {
  checkTermsAcceptance();
  // ... rest of your initialization
});

document.addEventListener('DOMContentLoaded', function() {
  console.log('DOM Content Loaded - Initializing app...');
  
  // Initialize all systems
  AppState.init();
  ThemeManager.init();
  TimerSystem.init();
  VoiceSystem.init();
  
  // Populate profile selector
  populateProfileSelector();
  
  // Load current profile if exists
  if (AppState.currentProfile) {
    switchProfile(AppState.currentProfile);
  }
  
  // Show welcome panel for new users
  if (AppState.profiles.length === 0) {
    showWelcomePanel();
  }
  
  // Initialize UI
  updateUI();
  
  console.log('App initialized successfully');
});
// ============================================================================
// SOS CRISIS MODE SYSTEM
// ============================================================================

// ============================================================================
// SOS CRISIS MODE SYSTEM
// ============================================================================



function activateSOSMode() {
  console.log('SOS Mode activated');
  sosActive = true;
  sosStartTime = Date.now();
  
  const sosOverlay = document.getElementById('sosMode');
  if (sosOverlay) {
    sosOverlay.style.display = 'flex';
    
    // Stop all other sounds/activities
    stopAllSounds();
    stopAllExercises();
    
    // Log the SOS activation
    logMeltdownEvent('sos_activated');
    
    // Speak calming message
    speak("You're safe. I'm here to help you feel better.", {
      context: 'sos',
      priority: 'high',
      rate: 0.8,
      volume: 0.8
    });
    
    Utils.announceToScreenReader('Emergency calming mode activated');
  }

function exitSOSMode() {
  const duration = sosStartTime ? Math.round((Date.now() - sosStartTime) / 1000) : 0;
  
  // Log successful calming
  logMeltdownEvent('sos_resolved', {
    duration: duration,
    activityUsed: sosActivity
  });
  
  const sosOverlay = document.getElementById('sosMode');
  if (sosOverlay) {
    sosOverlay.style.display = 'none';
  }
  
  const activityContainer = document.getElementById('sosActivity');
  if (activityContainer) {
    activityContainer.innerHTML = '';
    activityContainer.classList.remove('active');
  }
  
  sosActive = false;
  sosStartTime = null;
  sosActivity = null;
  
  // Stop any ongoing activities
  stopAllSounds();
  if (sosBreathingInterval) {
    clearInterval(sosBreathingInterval);
    sosBreathingInterval = null;
  }
  
  speak("Great job! You did so well calming down.", {
    context: 'success',
    priority: 'high'
  });
  
  showSuccessMessage('You did an amazing job calming down!');
  Utils.announceToScreenReader('Calming mode ended successfully');
}
}
// Simple SOS Breathing


function startSOSBreathing() {
  sosActivity = 'breathing';
  const container = document.getElementById('sosActivity');
  if (!container) return;
  
  container.innerHTML = `
    <div class="sos-breathing-circle"></div>
    <div class="sos-breathing-text" id="sosBreathText" aria-live="assertive">Breathe In...</div>
  `;
  container.classList.add('active');
  
  let phase = 0; // 0 = in, 1 = out
  let count = 0;
  
  function updateBreathing() {
    const text = document.getElementById('sosBreathText');
    if (!text) return;
    
    if (phase === 0) {
      text.textContent = 'Breathe In...';
      text.style.color = '#4CAF50';
      if (count === 0) {
        VoiceSystem.speakBreathingCue('inhale', '');
      }
      count++;
      if (count >= 4) {
        phase = 1;
        count = 0;
      }
    } else {
      text.textContent = 'Breathe Out...';
      text.style.color = '#2196F3';
      if (count === 0) {
        VoiceSystem.speakBreathingCue('exhale', '');
      }
      count++;
      if (count >= 4) {
        phase = 0;
        count = 0;
      }
    }
  }
  
  updateBreathing();
  if (sosBreathingInterval) clearInterval(sosBreathingInterval);
  sosBreathingInterval = setInterval(updateBreathing, 1000);
  
  speak("Breathe with me. In and out. Nice and slow.", {
    context: 'breathing',
    priority: 'high',
    rate: 0.7
  });
}

// SOS Sound
function startSOSSound() {
  sosActivity = 'sound';
  const container = document.getElementById('sosActivity');
  if (!container) return;
  
  container.innerHTML = `
    <div style="text-align: center;">
      <div style="font-size: 5rem; margin: 2rem 0;">🎵</div>
      <p style="font-size: 1.5rem; color: #333;">Playing calming sounds...</p>
    </div>
  `;
  container.classList.add('active');
  
  // Play brown noise (most calming)
  playBrownNoise();
  
  speak("Listen to the calming sound. Let it help you relax.", {
    context: 'sos',
    priority: 'high',
    rate: 0.7
  });
}

// SOS Movement
function startSOSMovement() {
  sosActivity = 'movement';
  const container = document.getElementById('sosActivity');
  if (!container) return;
  
  container.innerHTML = `
    <h3 style="color: #333; margin-bottom: 1.5rem;">Try These Movements:</h3>
    <div class="movement-cards">
      <div class="movement-card">
        <div style="font-size: 3rem; margin-bottom: 0.5rem;">🤲</div>
        <div>Push your hands together hard for 10 seconds</div>
      </div>
      <div class="movement-card">
        <div style="font-size: 3rem; margin-bottom: 0.5rem;">🧱</div>
        <div>Push against a wall as hard as you can</div>
      </div>
      <div class="movement-card">
        <div style="font-size: 3rem; margin-bottom: 0.5rem;">🪑</div>
        <div>Push down on your chair with both hands</div>
      </div>
      <div class="movement-card">
        <div style="font-size: 3rem; margin-bottom: 0.5rem;">🦶</div>
        <div>Stomp your feet 10 times</div>
      </div>
      <div class="movement-card">
        <div style="font-size: 3rem; margin-bottom: 0.5rem;">🫂</div>
        <div>Give yourself a tight hug</div>
      </div>
      <div class="movement-card">
        <div style="font-size: 3rem; margin-bottom: 0.5rem;">🧊</div>
        <div>Hold something cold (ice, cold water)</div>
      </div>
    </div>
  `;
  container.classList.add('active');
  
  speak("Try some of these movements. They help your body feel better.", {
    context: 'sos',
    priority: 'high',
    rate: 0.8
  });
}

// Call for Help
function callForHelp() {
  sosActivity = 'help_called';
  const container = document.getElementById('sosActivity');
  if (!container) return;
  
  container.innerHTML = `
    <div style="text-align: center;">
      <div style="font-size: 5rem; margin: 2rem 0;">📢</div>
      <p style="font-size: 1.8rem; color: #333; font-weight: bold;">
        A grown-up has been notified!
      </p>
      <p style="font-size: 1.3rem; color: #666; margin-top: 1rem;">
        Someone will come help you soon.
      </p>
    </div>
  `;
  container.classList.add('active');
  
  // Log that help was requested
  logMeltdownEvent('help_requested');
  
  // Play alert sound if available
  const tone = AudioManager.createTone(659, 0.3, 'sine');
  if (tone) tone.play();
  
  speak("Help is on the way. You're doing great asking for help.", {
    context: 'success',
    priority: 'high'
  });
  
  // In a real app, this would send a notification
  // For now, show a message
  showSuccessMessage('Parent/Caregiver notified!');
}

// ============================================================================
// MELTDOWN TRACKING SYSTEM
// ============================================================================

function logMeltdownEvent(eventType, details = {}) {
  if (!AppState.currentProfile) return;
  
  const profile = AppState.profiles.find(p => p.id === AppState.currentProfile);
  if (!profile) return;
  
  // Initialize meltdown log if it doesn't exist
  if (!profile.meltdownLog) {
    profile.meltdownLog = [];
  }
  
  const event = {
    id: Date.now() + Math.random(),
    type: eventType,
    timestamp: new Date().toISOString(),
    timeOfDay: new Date().getHours(),
    dayOfWeek: new Date().getDay(),
    ...details
  };
  
  profile.meltdownLog.push(event);
  
  // Keep only last 100 events
  if (profile.meltdownLog.length > 100) {
    profile.meltdownLog = profile.meltdownLog.slice(-100);
  }
  
  AppState.saveData();
  console.log('Meltdown event logged:', event);
}

function getMeltdownPatterns() {
  if (!AppState.currentProfile) return null;
  
  const profile = AppState.profiles.find(p => p.id === AppState.currentProfile);
  if (!profile || !profile.meltdownLog) return null;
  
  const log = profile.meltdownLog.filter(e => e.type === 'sos_activated');
  
  if (log.length < 3) {
    return { message: 'Not enough data yet to identify patterns' };
  }
  
  // Analyze time of day patterns
  const hourCounts = {};
  log.forEach(event => {
    const hour = event.timeOfDay;
    hourCounts[hour] = (hourCounts[hour] || 0) + 1;
  });
  
  const mostCommonHour = Object.keys(hourCounts).reduce((a, b) => 
    hourCounts[a] > hourCounts[b] ? a : b
  );
  
  // Analyze day of week patterns
  const dayCounts = {};
  log.forEach(event => {
    const day = event.dayOfWeek;
    dayCounts[day] = (dayCounts[day] || 0) + 1;
  });
  
  const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const mostCommonDay = days[Object.keys(dayCounts).reduce((a, b) => 
    dayCounts[a] > dayCounts[b] ? a : b
  )];
  
  // Calculate average duration
  const resolvedEvents = profile.meltdownLog.filter(e => 
    e.type === 'sos_resolved' && e.duration
  );
  const avgDuration = resolvedEvents.length > 0 
    ? Math.round(resolvedEvents.reduce((sum, e) => sum + e.duration, 0) / resolvedEvents.length)
    : null;
  
  // Most effective strategies
  const strategyCounts = {};
  resolvedEvents.forEach(event => {
    if (event.activityUsed) {
      strategyCounts[event.activityUsed] = (strategyCounts[event.activityUsed] || 0) + 1;
    }
  });
  
  const mostEffective = Object.keys(strategyCounts).length > 0
    ? Object.keys(strategyCounts).reduce((a, b) => 
        strategyCounts[a] > strategyCounts[b] ? a : b
      )
    : null;
  
  return {
    totalEvents: log.length,
    mostCommonHour: parseInt(mostCommonHour),
    mostCommonDay: mostCommonDay,
    averageDuration: avgDuration,
    mostEffectiveStrategy: mostEffective,
    last7Days: log.filter(e => {
      const daysDiff = (Date.now() - new Date(e.timestamp)) / (1000 * 60 * 60 * 24);
      return daysDiff <= 7;
    }).length
  };
}

// ============================================================================
// PARENT DASHBOARD ADDITIONS
// ============================================================================

function updateChildStats() {
  const statsDiv = Utils.safeGetElement('childStats');
  if (!statsDiv) return;
  
  if (!AppState.currentProfile) {
    statsDiv.innerHTML = '<p>No child profile selected</p>';
    return;
  }
  
  const profile = AppState.profiles.find(p => p.id === AppState.currentProfile);
  if (!profile) return;
  
  const completedTasks = profile.tasks ? profile.tasks.filter(t => t.completed).length : 0;
  const totalBehaviors = profile.behaviors ? profile.behaviors.length : 0;
  const totalTasks = profile.tasks ? profile.tasks.length : 0;
  
  // Get meltdown patterns
  const patterns = getMeltdownPatterns();
  
  let html = `
    <div style="background: var(--bg-primary); padding: 1rem; border-radius: 8px; border: 1px solid var(--border-color);">
      <h4 style="margin: 0 0 1rem 0; color: var(--accent-primary);">${profile.name} (${profile.age} years old)</h4>
      <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(120px, 1fr)); gap: 1rem;">
        <div style="text-align: center;">
          <div style="font-size: 1.5rem; font-weight: bold; color: var(--accent-primary);">${profile.rewardPoints || 0}</div>
          <div style="font-size: 0.9rem; color: var(--text-secondary);">Total Points</div>
        </div>
        <div style="text-align: center;">
          <div style="font-size: 1.5rem; font-weight: bold; color: var(--accent-primary);">${completedTasks}/${totalTasks}</div>
          <div style="font-size: 0.9rem; color: var(--text-secondary);">Tasks Done</div>
        </div>
        <div style="text-align: center;">
          <div style="font-size: 1.5rem; font-weight: bold; color: var(--accent-primary);">${totalBehaviors}</div>
          <div style="font-size: 0.9rem; color: var(--text-secondary);">Good Behaviors</div>
        </div>
      </div>
    </div>
  `;
  
  // Add meltdown tracking section
  if (patterns) {
    html += `
      <div class="meltdown-log">
        <h4 style="color: #ff6b6b; margin: 1rem 0 0.5rem 0;">Regulation Patterns</h4>
    `;
    
    if (patterns.message) {
      html += `<p style="color: var(--text-secondary);">${patterns.message}</p>`;
    } else {
      html += `
        <div class="pattern-insight">
          <strong>Total SOS activations:</strong> ${patterns.totalEvents}<br>
          <strong>Last 7 days:</strong> ${patterns.last7Days} events<br>
          ${patterns.mostCommonHour ? `<strong>Most common time:</strong> ${formatHour(patterns.mostCommonHour)}<br>` : ''}
          ${patterns.mostCommonDay ? `<strong>Most common day:</strong> ${patterns.mostCommonDay}<br>` : ''}
          ${patterns.averageDuration ? `<strong>Average calming time:</strong> ${patterns.averageDuration} seconds<br>` : ''}
          ${patterns.mostEffectiveStrategy ? `<strong>Most used strategy:</strong> ${patterns.mostEffectiveStrategy}` : ''}
        </div>
        <button onclick="viewDetailedLog()" style="background: #2196F3; color: white; border: none; padding: 0.5rem 1rem; border-radius: 5px; cursor: pointer; margin-top: 0.5rem;">
          View Detailed Log
        </button>
        <button onclick="addWarningSigns()" style="background: #ff9800; color: white; border: none; padding: 0.5rem 1rem; border-radius: 5px; cursor: pointer; margin-top: 0.5rem; margin-left: 0.5rem;">
          Add Warning Signs
        </button>
      `;
    }
    
    html += `</div>`;
  }
  
  statsDiv.innerHTML = html;
}

function formatHour(hour) {
  const period = hour >= 12 ? 'PM' : 'AM';
  const displayHour = hour > 12 ? hour - 12 : (hour === 0 ? 12 : hour);
  return `${displayHour}:00 ${period}`;
}

function viewDetailedLog() {
  if (!AppState.currentProfile) return;
  
  const profile = AppState.profiles.find(p => p.id === AppState.currentProfile);
  if (!profile || !profile.meltdownLog) return;
  
  const log = profile.meltdownLog.filter(e => e.type === 'sos_activated')
    .slice(-20)
    .reverse();
  
  let html = `
    <div class="modal" style="display: block; position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.8); z-index: 10001; overflow-y: auto;">
      <div class="modal-content" style="max-width: 800px; margin: 2rem auto; max-height: 90vh; overflow-y: auto;">
        <h3>Regulation Event Log for ${profile.name}</h3>
        <div style="margin: 1rem 0;">
  `;
  
  if (log.length === 0) {
    html += '<p>No SOS events recorded yet.</p>';
  } else {
    log.forEach(event => {
      const date = new Date(event.timestamp);
      const resolved = profile.meltdownLog.find(e => 
        e.type === 'sos_resolved' && 
        Math.abs(new Date(e.timestamp) - date) < 600000 // Within 10 minutes
      );
      
      html += `
        <div class="meltdown-entry">
          <strong>${date.toLocaleDateString()} ${date.toLocaleTimeString()}</strong><br>
          Time of day: ${formatHour(event.timeOfDay)}<br>
          ${resolved ? `Duration: ${resolved.duration} seconds<br>Strategy used: ${resolved.activityUsed || 'None'}` : 'Not resolved in log'}
        </div>
      `;
    });
  }
  
  html += `
        </div>
        <button onclick="this.closest('.modal').remove()" style="background: var(--accent-primary); color: white; border: none; padding: 0.75rem 1.5rem; border-radius: 5px; cursor: pointer;">
          Close
        </button>
      </div>
    </div>
  `;
  
  document.body.insertAdjacentHTML('beforeend', html);
}

function addWarningSigns() {
  if (!AppState.currentProfile) return;
  
  const profile = AppState.profiles.find(p => p.id === AppState.currentProfile);
  if (!profile) return;
  
  let html = `
    <div class="modal" style="display: block; position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.8); z-index: 10001;">
      <div class="modal-content" style="max-width: 600px; margin: 2rem auto;">
        <h3>Warning Signs for ${profile.name}</h3>
        <p style="color: var(--text-secondary);">What behaviors or signs happen before ${profile.name} needs help?</p>
        
        <div style="margin: 1rem 0;">
          <input type="text" id="newWarningSign" placeholder="e.g., Gets very quiet, fidgets more, says 'I can't'" 
                 style="width: 100%; padding: 0.75rem; border: 2px solid var(--border-color); border-radius: 5px; margin-bottom: 0.5rem;">
          <button onclick="saveWarningSign()" style="background: var(--success); color: white; border: none; padding: 0.75rem 1.5rem; border-radius: 5px; cursor: pointer;">
            Add Warning Sign
          </button>
        </div>
        
        <h4>Current Warning Signs:</h4>
        <ul class="warning-signs-list" id="warningSignsList">
          ${profile.warningSigns ? profile.warningSigns.map((sign, i) => `
            <li>
              ${sign}
              <button onclick="removeWarningSign(${i})" style="float: right; background: var(--error); color: white; border: none; padding: 0.25rem 0.5rem; border-radius: 3px; cursor: pointer; font-size: 0.8rem;">
                Remove
              </button>
            </li>
          `).join('') : '<li>No warning signs added yet</li>'}
        </ul>
        
        <button onclick="this.closest('.modal').remove()" style="background: var(--accent-primary); color: white; border: none; padding: 0.75rem 1.5rem; border-radius: 5px; cursor: pointer; margin-top: 1rem;">
          Close
        </button>
      </div>
    </div>
  `;
  
  document.body.insertAdjacentHTML('beforeend', html);
}

function saveWarningSign() {
  if (!AppState.currentProfile) return;
  
  const profile = AppState.profiles.find(p => p.id === AppState.currentProfile);
  if (!profile) return;
  
  const input = document.getElementById('newWarningSign');
  if (!input || !input.value.trim()) return;
  
  if (!profile.warningSigns) {
    profile.warningSigns = [];
  }
  
  profile.warningSigns.push(input.value.trim());
  AppState.saveData();
  
  input.value = '';
  
  // Refresh the list
  const list = document.getElementById('warningSignsList');
  if (list) {
    list.innerHTML = profile.warningSigns.map((sign, i) => `
      <li>
        ${sign}
        <button onclick="removeWarningSign(${i})" style="float: right; background: var(--error); color: white; border: none; padding: 0.25rem 0.5rem; border-radius: 3px; cursor: pointer; font-size: 0.8rem;">
          Remove
        </button>
      </li>
    `).join('');
  }
  
  showSuccessMessage('Warning sign added');
}

function removeWarningSign(index) {
  if (!AppState.currentProfile) return;
  
  const profile = AppState.profiles.find(p => p.id === AppState.currentProfile);
  if (!profile || !profile.warningSigns) return;
  
  profile.warningSigns.splice(index, 1);
  AppState.saveData();
  
  // Refresh the list
  const list = document.getElementById('warningSignsList');
  if (list) {
    if (profile.warningSigns.length === 0) {
      list.innerHTML = '<li>No warning signs added yet</li>';
    } else {
      list.innerHTML = profile.warningSigns.map((sign, i) => `
        <li>
          ${sign}
          <button onclick="removeWarningSign(${i})" style="float: right; background: var(--error); color: white; border: none; padding: 0.25rem 0.5rem; border-radius: 3px; cursor: pointer; font-size: 0.8rem;">
            Remove
          </button>
        </li>
      `).join('');
    }
  }
  
  showSuccessMessage('Warning sign removed');
}
function selectEmotion(emotion, emoji) {
  // Remove previous selection
  document.querySelectorAll('.emotion-card').forEach(card => {
    card.classList.remove('selected');
  });
  
  // Add selection to clicked card
  event.currentTarget.classList.add('selected');
  
  // Log emotion if profile is selected
  if (AppState.currentProfile) {
    const profile = AppState.profiles.find(p => p.id === AppState.currentProfile);
    if (profile) {
      if (!profile.emotions) profile.emotions = [];
      profile.emotions.push({
        emotion: emotion,
        emoji: emoji,
        timestamp: new Date().toISOString()
      });
      AppState.saveData();
    }
  }
  
  // Show feedback
  const feedback = document.getElementById('emotionFeedback');
  if (feedback) {
    feedback.innerHTML = `You're feeling ${emotion} ${emoji}. That's okay! ${getEmotionResponse(emotion)}`;
    feedback.style.animation = 'slideUp 0.5s ease';
  }
  
  // Voice feedback
  speak(`You're feeling ${emotion}. ${getEmotionResponse(emotion)}`, { context: 'success' });
}

function getEmotionResponse(emotion) {
  const responses = {
    happy: "That's wonderful! Keep doing what makes you happy!",
    sad: "It's okay to feel sad. Would you like to try a calming activity?",
    angry: "Anger is a normal feeling. Let's take some deep breaths together.",
    worried: "Everyone worries sometimes. You're safe and doing great.",
    tired: "Rest is important. Maybe take a break?",
    excited: "That's awesome! Channel that energy into something fun!",
    frustrated: "Frustration happens. You're doing your best!",
    calm: "Being calm is great! You're in a good place.",
    confused: "It's okay to be confused. Take your time.",
    scared: "You're safe. Would you like to talk to a grown-up?"
  };
  return responses[emotion] || "Thank you for sharing how you feel.";
}

function showDashSection(sectionName) {
  // Hide all sections
  document.querySelectorAll('.dash-section').forEach(section => {
    section.classList.remove('active');
    section.style.display = 'none';
  });
  
  // Remove active from all tabs
  document.querySelectorAll('.dash-tab').forEach(tab => {
    tab.classList.remove('active');
    tab.setAttribute('aria-selected', 'false');
  });
  
  // Show selected section
  const selectedSection = document.getElementById(sectionName + '-section');
  if (selectedSection) {
    selectedSection.classList.add('active');
    selectedSection.style.display = 'block';
  }
  
  // Activate clicked tab
  const clickedTab = event.currentTarget;
  if (clickedTab) {
    clickedTab.classList.add('active');
    clickedTab.setAttribute('aria-selected', 'true');
  }
  
  Utils.announceToScreenReader(`Switched to ${sectionName} section`);
}
// Function to save parent settings including emergency contact
function saveParentSettings() {
  const taskPoints = parseInt(document.getElementById('taskPoints').value);
  const behaviorPoints = parseInt(document.getElementById('behaviorPoints').value);
  const emergencyContact = document.getElementById('emergencyContact').value;
  
  const settings = {
    taskPoints: taskPoints,
    behaviorPoints: behaviorPoints,
    emergencyContact: emergencyContact
  };
  
  localStorage.setItem('parentSettings', JSON.stringify(settings));
  alert('Settings saved successfully!');
}

// Function to load parent settings
function loadParentSettings() {
  const settings = JSON.parse(localStorage.getItem('parentSettings')) || {
    taskPoints: 5,
    behaviorPoints: 3,
    emergencyContact: ''
  };
  
  if (document.getElementById('taskPoints')) {
    document.getElementById('taskPoints').value = settings.taskPoints;
    document.getElementById('behaviorPoints').value = settings.behaviorPoints;
    document.getElementById('emergencyContact').value = settings.emergencyContact || '';
  }
}

// Update the callForHelp function in your SOS mode
function callForHelp() {
  const settings = JSON.parse(localStorage.getItem('parentSettings')) || {};
  const phoneNumber = settings.emergencyContact;
  
  const sosActivity = document.getElementById('sosActivity');
  
  if (!phoneNumber || phoneNumber.trim() === '') {
    sosActivity.innerHTML = `
      <div class="sos-help-message">
        <h3>📱 Alert Parent</h3>
        <p style="font-size: 1.2rem; margin: 1rem 0;">
          Ask a parent to set up their phone number in Parent Login → Settings
        </p>
        <p style="margin-top: 2rem;">
          For now, you can:
        </p>
        <button onclick="goFindAdult()" style="margin: 1rem; padding: 1rem 2rem; font-size: 1.1rem;">
          Go Find a Grown-Up 🏃
        </button>
      </div>
    `;
    return;
  }
  
  // Get child's name if available
  const currentProfile = document.getElementById('currentProfile').value;
  const childName = currentProfile || 'Your child';
  
  // Create the SMS message
  const message = encodeURIComponent(`🆘 ${childName} needs help! They pressed the SOS button on their Helper Dashboard.`);
  
  // Clean phone number (remove spaces, dashes, etc.)
  const cleanNumber = phoneNumber.replace(/[\s\-\(\)]/g, '');
  
  sosActivity.innerHTML = `
    <div class="sos-help-message">
      <h3>📱 Alerting Your Grown-Up</h3>
      <p style="font-size: 1.2rem; margin: 1rem 0;">
        Tap the button below to send a message
      </p>
      <a href="sms:${cleanNumber}?body=${message}" class="sos-sms-button">
        📱 Send Help Message
      </a>
      <p style="margin-top: 2rem; font-size: 0.9rem; color: #666;">
        This will open your messaging app. Tap send when it opens.
      </p>
    </div>
  `;
}

// Helper function if no number is set
function goFindAdult() {
  const sosActivity = document.getElementById('sosActivity');
  sosActivity.innerHTML = `
    <div class="sos-help-message">
      <h3>🏃 Go Find Your Grown-Up</h3>
      <p style="font-size: 1.3rem; margin: 2rem 0;">
        Walk to where your parent or caregiver is and let them know you need help.
      </p>
      <p style="font-size: 1.1rem;">
        Take some deep breaths while you walk. 🫁
      </p>
    </div>
  `;
}

// Make sure to call loadParentSettings when opening the parent dashboard
function openParentDashboard() {
  document.getElementById('parentDashboard').style.display = 'block';
  document.getElementById('parentDashboard').setAttribute('aria-hidden', 'false');
  loadParentSettings();
  updateChildStats();
}
}









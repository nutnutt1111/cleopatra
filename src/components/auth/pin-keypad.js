import { isValidPin } from '../../js/auth/pin-crypto.js';

const KEYPAD_LAYOUT = [
  ['1', '2', '3'],
  ['4', '5', '6'],
  ['7', '8', '9'],
  ['', '0', 'delete'],
];

export function createPinKeypad(options = {}) {
  const {
    container,
    dotsContainer,
    onComplete,
    onChange,
    maxLength = 6,
  } = options;

  if (!container || !dotsContainer) {
    throw new Error('Pin keypad requires container and dotsContainer');
  }

  let pin = '';

  function renderDots() {
    dotsContainer.innerHTML = '';

    for (let i = 0; i < maxLength; i += 1) {
      const dot = document.createElement('span');
      dot.className = [
        'inline-block w-3 h-3 sm:w-3.5 sm:h-3.5 rounded-full border-2 transition-all duration-150',
        i < pin.length
          ? 'bg-primary border-primary scale-110 shadow-sm shadow-primary/30'
          : 'bg-transparent border-muted-foreground/35',
      ].join(' ');
      dot.setAttribute('aria-hidden', 'true');
      dotsContainer.appendChild(dot);
    }
  }

  function notifyChange() {
    if (onChange) onChange(pin);
  }

  function appendDigit(digit) {
    if (pin.length >= maxLength) return;
    pin += digit;
    renderDots();
    notifyChange();

    if (pin.length === maxLength) {
      if (!isValidPin(pin)) {
        clearPin();
        return;
      }
      if (onComplete) onComplete(pin);
    }
  }

  function deleteDigit() {
    pin = pin.slice(0, -1);
    renderDots();
    notifyChange();
  }

  function clearPin() {
    pin = '';
    renderDots();
    notifyChange();
  }

  function renderKeypad() {
    container.innerHTML = '';

    KEYPAD_LAYOUT.flat().forEach((key) => {
      const button = document.createElement('button');
      button.type = 'button';

      if (key === '') {
        button.className = 'invisible pointer-events-none h-14 sm:h-16';
        button.setAttribute('aria-hidden', 'true');
      } else if (key === 'delete') {
        button.className = [
          'h-14 sm:h-16 rounded-2xl text-muted-foreground',
          'hover:bg-muted/60 active:scale-95 transition-all duration-150',
          'focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/30',
        ].join(' ');
        button.innerHTML = `
          <svg class="w-6 h-6 sm:w-7 sm:h-7 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.8"
              d="M12 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2M9 7h6a2 2 0 012 2v6a2 2 0 01-2 2H9l-3 3V9a2 2 0 012-2z" />
          </svg>
        `;
        button.setAttribute('aria-label', 'ลบ');
        button.addEventListener('click', deleteDigit);
      } else {
        button.className = [
          'h-14 sm:h-16 rounded-2xl text-2xl font-semibold text-foreground',
          'bg-muted/40 hover:bg-muted active:scale-95 transition-all duration-150',
          'focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/30',
        ].join(' ');
        button.textContent = key;
        button.addEventListener('click', () => appendDigit(key));
      }

      container.appendChild(button);
    });
  }

  renderDots();
  renderKeypad();

  return {
    getPin: () => pin,
    setPin: (value) => {
      pin = isValidPin(value) ? value : value.replace(/\D/g, '').slice(0, maxLength);
      renderDots();
      notifyChange();
    },
    clearPin,
    shakeDots: () => {
      dotsContainer.classList.remove('animate-pin-shake');
      void dotsContainer.offsetWidth;
      dotsContainer.classList.add('animate-pin-shake');
    },
  };
}

export function renderPinSlots(container, value, { masked = true } = {}) {
  if (!container) return;

  container.innerHTML = '';
  const chars = masked ? Array(6).fill('•') : (value || '').padEnd(6, ' ').split('').slice(0, 6);

  for (let i = 0; i < 6; i += 1) {
    const slot = document.createElement('span');
    const filled = !masked && value && value[i];
    slot.className = [
      'inline-flex items-center justify-center w-10 h-12 sm:w-11 sm:h-14',
      'rounded-xl border-2 text-lg font-semibold font-mono transition-all',
      filled || (masked && value)
        ? 'border-primary/30 bg-primary/5 text-foreground'
        : 'border-border bg-muted/20 text-muted-foreground',
    ].join(' ');
    slot.textContent = masked ? '•' : (value[i] || '–');
    container.appendChild(slot);
  }
}

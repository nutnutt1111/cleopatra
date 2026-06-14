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
        'w-3.5 h-3.5 rounded-full border-2 transition-all duration-150',
        i < pin.length
          ? 'bg-primary border-primary scale-110'
          : 'bg-transparent border-muted-foreground/40',
      ].join(' ');
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
      button.className = [
        'h-16 sm:h-[4.5rem] rounded-2xl text-2xl font-medium transition-all duration-150',
        'active:scale-95 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/30',
      ].join(' ');

      if (key === '') {
        button.classList.add('invisible', 'pointer-events-none');
        button.setAttribute('aria-hidden', 'true');
      } else if (key === 'delete') {
        button.className += ' text-muted-foreground hover:bg-muted/60';
        button.innerHTML = `
          <svg class="w-7 h-7 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.8"
              d="M12 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2M3 12h18" />
          </svg>
        `;
        button.setAttribute('aria-label', 'ลบ');
        button.addEventListener('click', deleteDigit);
      } else {
        button.className += ' bg-muted/40 hover:bg-muted text-foreground shadow-sm';
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

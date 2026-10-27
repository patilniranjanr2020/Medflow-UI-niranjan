import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ThemeProvider, THEME_STORAGE_KEY } from '../../providers/ThemeProvider';
import { ThemeSwitcher } from './ThemeSwitcher';

function renderWithTheme(defaultMode: 'light' | 'dark' = 'light') {
  return render(
    <ThemeProvider defaultMode={defaultMode}>
      <ThemeSwitcher />
    </ThemeProvider>
  );
}

describe('ThemeSwitcher', () => {
  beforeEach(() => {
    localStorage.clear();
    document.documentElement.removeAttribute('data-theme');
    vi.restoreAllMocks();
  });

  it('renders a compact trigger button with appropriate accessible label and icon', () => {
    renderWithTheme('light');

    const button = screen.getByRole('button', { name: /Theme: Light/i });
    expect(button).toBeDefined();
    expect(button.getAttribute('aria-haspopup')).toBe('menu');
    expect(button.getAttribute('aria-expanded')).toBe('false');

    // Panel should not be open
    expect(screen.queryByRole('menu')).toBeNull();
  });

  it('opens accessible menu on click with exactly Light and Dark options', () => {
    renderWithTheme('light');

    const trigger = screen.getByRole('button', { name: /Theme: Light/i });
    fireEvent.click(trigger);

    expect(trigger.getAttribute('aria-expanded')).toBe('true');

    const menu = screen.getByRole('menu', { name: /Theme/i });
    expect(menu).toBeDefined();

    const options = screen.getAllByRole('menuitemradio');
    expect(options).toHaveLength(2);

    expect(options[0].textContent).toContain('Light');
    expect(options[1].textContent).toContain('Dark');

    // Light should be checked
    expect(options[0].getAttribute('aria-checked')).toBe('true');
    expect(options[1].getAttribute('aria-checked')).toBe('false');
  });

  it('switches to Dark theme on selection and closes the menu', () => {
    renderWithTheme('light');

    const trigger = screen.getByRole('button', { name: /Theme: Light/i });
    fireEvent.click(trigger);

    const darkOption = screen.getByRole('menuitemradio', { name: /Dark/i });
    fireEvent.click(darkOption);

    // Menu should be closed
    expect(screen.queryByRole('menu')).toBeNull();

    // Trigger should now reflect Dark
    expect(screen.getByRole('button', { name: /Theme: Dark/i })).toBeDefined();
    expect(document.documentElement.getAttribute('data-theme')).toBe('dark');
    expect(localStorage.getItem(THEME_STORAGE_KEY)).toBe('dark');
  });

  it('closes menu on Escape key press and restores focus to trigger button', () => {
    renderWithTheme('light');

    const trigger = screen.getByRole('button', { name: /Theme: Light/i });
    fireEvent.click(trigger);

    expect(screen.getByRole('menu')).toBeDefined();

    fireEvent.keyDown(document, { key: 'Escape' });

    expect(screen.queryByRole('menu')).toBeNull();
    expect(document.activeElement).toBe(trigger);
  });

  it('closes menu when clicking outside', () => {
    renderWithTheme('light');

    const trigger = screen.getByRole('button', { name: /Theme: Light/i });
    fireEvent.click(trigger);
    expect(screen.getByRole('menu')).toBeDefined();

    fireEvent.mouseDown(document.body);
    expect(screen.queryByRole('menu')).toBeNull();
  });

  it('supports keyboard navigation via ArrowDown/ArrowUp between options', () => {
    renderWithTheme('light');

    const trigger = screen.getByRole('button', { name: /Theme: Light/i });
    // Open via keyboard
    fireEvent.keyDown(trigger, { key: 'ArrowDown' });

    expect(screen.getByRole('menu')).toBeDefined();
    const lightOption = screen.getByRole('menuitemradio', { name: /Light/i });
    const darkOption = screen.getByRole('menuitemradio', { name: /Dark/i });

    // Focus starts on current mode (light)
    expect(document.activeElement).toBe(lightOption);

    // Press ArrowDown to move to dark
    fireEvent.keyDown(screen.getByRole('menu'), { key: 'ArrowDown' });
    expect(document.activeElement).toBe(darkOption);

    // Press ArrowUp to move back to light
    fireEvent.keyDown(screen.getByRole('menu'), { key: 'ArrowUp' });
    expect(document.activeElement).toBe(lightOption);
  });
});

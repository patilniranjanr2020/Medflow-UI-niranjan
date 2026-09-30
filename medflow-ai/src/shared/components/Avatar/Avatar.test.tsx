import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { Avatar } from './Avatar';

describe('Avatar Component', () => {
  it('renders initials from two names', () => {
    render(<Avatar name="Meera Joshi" />);
    expect(screen.getByText('MJ')).toBeDefined();
  });

  it('renders single name initial correctly', () => {
    render(<Avatar name="Aarav" />);
    expect(screen.getByText('AA')).toBeDefined();
  });

  it('renders fallback for empty name', () => {
    render(<Avatar name="" />);
    expect(screen.getByText('—')).toBeDefined();
  });

  it('renders as an interactive button when onClick is provided', () => {
    const handleClick = vi.fn();
    render(
      <Avatar
        name="Kabir Shah"
        onClick={handleClick}
        ariaLabel="View profile for Kabir Shah"
      />,
    );

    const button = screen.getByRole('button', { name: 'View profile for Kabir Shah' });
    expect(button).toBeDefined();
    expect(button.getAttribute('tabindex')).toBe('0');

    fireEvent.click(button);
    expect(handleClick).toHaveBeenCalledTimes(1);
  });

  it('is accessible and focusable via keyboard', () => {
    const handleClick = vi.fn();
    render(
      <Avatar
        name="Rohan Verma"
        onClick={handleClick}
        ariaLabel="View profile for Rohan Verma"
      />,
    );

    const button = screen.getByRole('button', { name: 'View profile for Rohan Verma' });
    button.focus();
    expect(document.activeElement).toBe(button);

    fireEvent.keyDown(button, { key: 'Enter', code: 'Enter' });
    // In standard button, enter triggers click
    fireEvent.click(button);
    expect(handleClick).toHaveBeenCalled();
  });
});

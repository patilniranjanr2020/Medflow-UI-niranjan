import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Plus } from 'lucide-react';
import { Button } from './Button';

describe('Button', () => {
  it('keeps a leading icon separate from the visible label', () => {
    render(<Button leftIcon={<Plus size={16} />}>Add prescription</Button>);

    const button = screen.getByRole('button', { name: 'Add prescription' });
    const icon = button.querySelector('.mf-btn__icon');

    expect(icon).not.toBeNull();
    expect(button.querySelector('.mf-btn__label')?.textContent).toBe('Add prescription');
    expect(icon?.querySelector('svg')?.getAttribute('aria-hidden')).toBe('true');
    expect(icon?.querySelector('svg')?.getAttribute('width')).toBe('16');
    expect(button.className).toContain('mf-btn--md');
  });
});

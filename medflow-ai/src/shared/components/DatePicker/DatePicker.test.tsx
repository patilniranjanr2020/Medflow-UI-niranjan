import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { DatePicker } from './DatePicker';

describe('DatePicker', () => {
  it('renders label, placeholder, and opens calendar popover on click', () => {
    render(<DatePicker label="Birth date" placeholder="Choose birth date" />);
    
    expect(screen.getByLabelText('Birth date')).toBeDefined();
    expect(screen.getByText('Choose birth date')).toBeDefined();

    // Click trigger to open popover
    fireEvent.click(screen.getByLabelText('Birth date'));
    expect(screen.getByRole('dialog', { name: 'Choose date' })).toBeDefined();
  });

  it('displays formatted date for string and Date values', () => {
    const { rerender } = render(<DatePicker label="Birth date" value="1995-03-21" />);
    expect(screen.getByText('Mar 21, 1995')).toBeDefined();

    rerender(<DatePicker label="Birth date" value={new Date(2020, 6, 15)} />);
    expect(screen.getByText('Jul 15, 2020')).toBeDefined();
  });

  it('shows year in header and opens independently scrollable year list on click', () => {
    render(
      <DatePicker
        label="Date of birth"
        value="1995-03-21"
        maxDate={new Date(2026, 9, 26)}
      />
    );

    fireEvent.click(screen.getByLabelText('Date of birth'));
    expect(screen.getByText('March')).toBeDefined();

    // The year button in the header shows 1995
    const yearBtn = screen.getByRole('button', { name: /Select year, current year is 1995/i });
    expect(yearBtn).toBeDefined();

    // Click the year button
    fireEvent.click(yearBtn);

    // Year listbox is now open
    const yearList = screen.getByRole('listbox', { name: 'Select year' });
    expect(yearList).toBeDefined();
    expect(screen.getByRole('option', { name: '1995' })).toBeDefined();
    expect(screen.getByRole('option', { name: '1990' })).toBeDefined();

    // Future years past maxDate (e.g. 2027) are not present in the list
    expect(screen.queryByRole('option', { name: '2027' })).toBeNull();
    expect(screen.queryByRole('option', { name: '2030' })).toBeNull();

    // Month header stays in place
    expect(screen.getByText('March')).toBeDefined();

    // Clicking a year (e.g., 1988) updates the year and closes the year list
    fireEvent.click(screen.getByRole('option', { name: '1988' }));
    expect(screen.queryByRole('listbox', { name: 'Select year' })).toBeNull();
    expect(screen.getByRole('button', { name: /Select year, current year is 1988/i })).toBeDefined();
  });

  it('selects a date and fires onChange and onChangeString', () => {
    const onChange = vi.fn();
    const onChangeString = vi.fn();

    render(
      <DatePicker
        label="Date of birth"
        value="1995-03-01"
        onChange={onChange}
        onChangeString={onChangeString}
      />
    );

    fireEvent.click(screen.getByLabelText('Date of birth'));
    
    // Click day 15 in March
    const day15 = screen.getByRole('button', { name: '15' });
    fireEvent.click(day15);

    expect(onChange).toHaveBeenCalled();
    expect(onChangeString).toHaveBeenCalledWith('1995-03-15');
    // Popover closes after date selection
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('closes year list on Escape key without closing the whole popover', () => {
    render(<DatePicker label="Date of birth" value="1995-03-21" />);

    fireEvent.click(screen.getByLabelText('Date of birth'));
    fireEvent.click(screen.getByRole('button', { name: /Select year/i }));
    expect(screen.getByRole('listbox', { name: 'Select year' })).toBeDefined();

    // Press Escape
    fireEvent.keyDown(document, { key: 'Escape' });

    // Year list is closed, but calendar popover is still open
    expect(screen.queryByRole('listbox')).toBeNull();
    expect(screen.getByRole('dialog', { name: 'Choose date' })).toBeDefined();

    // Press Escape again
    fireEvent.keyDown(document, { key: 'Escape' });
    // Now popover is closed
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('renders popover with top modifier class when placement is set to top', () => {
    render(<DatePicker label="Date of birth" value="1995-03-21" placement="top" />);

    fireEvent.click(screen.getByLabelText('Date of birth'));
    const popover = screen.getByRole('dialog', { name: 'Choose date' });
    expect(popover.className).toContain('mf-datepicker__popover--top');
  });

  it('renders popover through a portal into document.body to prevent clipping by parent modals', () => {
    render(<DatePicker label="Date of birth" value="1995-03-21" />);

    fireEvent.click(screen.getByLabelText('Date of birth'));
    const popover = screen.getByRole('dialog', { name: 'Choose date' });
    expect(popover).toBeDefined();
    // Portal renders directly into document.body
    expect(popover.parentElement).toBe(document.body);
  });

  it('automatically places popover on top when space below is restricted', () => {
    const { container } = render(<DatePicker label="Schedule date" value="2026-10-26" />);

    const trigger = container.querySelector('.mf-datepicker__trigger') as HTMLElement;
    // Simulate field near bottom of window: top: 680, bottom: 720 on 768px viewport
    vi.spyOn(trigger, 'getBoundingClientRect').mockReturnValue({
      top: 680,
      bottom: 720,
      left: 100,
      right: 300,
      width: 200,
      height: 40,
      x: 100,
      y: 680,
      toJSON: () => {},
    });

    fireEvent.click(screen.getByLabelText('Schedule date'));
    const popover = screen.getByRole('dialog', { name: 'Choose date' });
    expect(popover.className).toContain('mf-datepicker__popover--top');
  });

  it('clamps horizontal positioning within viewport when field is at extreme right edge', () => {
    const { container } = render(<DatePicker label="Schedule date" value="2026-10-26" />);

    const trigger = container.querySelector('.mf-datepicker__trigger') as HTMLElement;
    // Near right edge of 1024px window: left: 950, right: 1010
    vi.spyOn(trigger, 'getBoundingClientRect').mockReturnValue({
      top: 200,
      bottom: 240,
      left: 950,
      right: 1010,
      width: 60,
      height: 40,
      x: 950,
      y: 200,
      toJSON: () => {},
    });

    fireEvent.click(screen.getByLabelText('Schedule date'));
    const popover = screen.getByRole('dialog', { name: 'Choose date' });
    const leftStyle = parseInt(popover.style.left, 10);
    // Popover width is ~272, window is 1024; left + 272 <= 1024 - 8
    expect(leftStyle).toBeLessThanOrEqual(1024 - 272 - 8);
    expect(leftStyle).toBeGreaterThanOrEqual(8);
  });

  it('preserves popover when clicking inside and closes on outside click', () => {
    render(<DatePicker label="Date of birth" value="1995-03-21" />);

    fireEvent.click(screen.getByLabelText('Date of birth'));
    expect(screen.getByRole('dialog', { name: 'Choose date' })).toBeDefined();

    // Click inside the popover (e.g. month title)
    fireEvent.mouseDown(screen.getByText('March'));
    expect(screen.getByRole('dialog', { name: 'Choose date' })).toBeDefined();

    // Click outside in document.body
    fireEvent.mouseDown(document.body);
    expect(screen.queryByRole('dialog', { name: 'Choose date' })).toBeNull();
  });

  it('isolates mouse wheel events inside year pane to prevent modal/page scroll chaining', () => {
    render(<DatePicker label="Date of birth" value="1995-03-21" />);

    fireEvent.click(screen.getByLabelText('Date of birth'));
    fireEvent.click(screen.getByRole('button', { name: /Select year/i }));

    const yearList = screen.getByRole('listbox', { name: 'Select year' });
    const wheelEvent = new WheelEvent('wheel', { bubbles: true, cancelable: true });
    const stopPropagationSpy = vi.spyOn(wheelEvent, 'stopPropagation');

    fireEvent(yearList, wheelEvent);
    expect(stopPropagationSpy).toHaveBeenCalled();
  });
});

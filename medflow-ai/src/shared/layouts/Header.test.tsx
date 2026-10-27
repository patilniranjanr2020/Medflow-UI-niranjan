import { act, fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { Header } from './Header';
import { ThemeProvider } from '../providers/ThemeProvider';
import { AuthProvider } from '../../core/auth/AuthContext';
import { notificationsApi } from '../../core/api/services';

vi.mock('../../core/api/services', () => ({
  notificationsApi: {
    unreadCount: vi.fn().mockResolvedValue({ unread: 2 }),
  },
  authApi: {
    me: vi.fn(),
  },
}));

function renderHeader() {
  return render(
    <MemoryRouter>
      <ThemeProvider defaultMode="light">
        <AuthProvider>
          <Header onMenuClick={() => {}} />
        </AuthProvider>
      </ThemeProvider>
    </MemoryRouter>
  );
}

describe('Header with ThemeSwitcher', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
    vi.mocked(notificationsApi.unreadCount).mockResolvedValue({ unread: 2 });
  });

  it('renders the theme switcher in the right action section alongside notifications and profile', async () => {
    await act(async () => {
      renderHeader();
    });

    // Theme trigger exists in header
    const themeTrigger = screen.getByRole('button', { name: /Theme: Light/i });
    expect(themeTrigger).toBeDefined();

    // Notifications link exists
    const notifsLink = screen.getByRole('link', { name: /Notifications/i });
    expect(notifsLink).toBeDefined();

    // Profile menu trigger exists
    const profileTrigger = document.querySelector('.mf-profile-menu__trigger');
    expect(profileTrigger).not.toBeNull();
  });

  it('allows opening theme menu and changing mode from the header', async () => {
    await act(async () => {
      renderHeader();
    });

    const themeTrigger = screen.getByRole('button', { name: /Theme: Light/i });
    fireEvent.click(themeTrigger);

    const darkOption = screen.getByRole('menuitemradio', { name: /Dark/i });
    fireEvent.click(darkOption);

    // Theme switches and attribute is applied
    expect(document.documentElement.getAttribute('data-theme')).toBe('dark');
    expect(screen.getByRole('button', { name: /Theme: Dark/i })).toBeDefined();
  });
});

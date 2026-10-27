import { Menu, Bell, Search, LogOut, Settings, User } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { SearchBar } from '../components/SearchBar/SearchBar';
import { Badge } from '../components/Badge/Badge';
import { ProfileMenu } from '../components/ProfileMenu/ProfileMenu';
import { ThemeSwitcher } from '../components/ThemeSwitcher/ThemeSwitcher';
import { useAuth } from '../../core/auth/AuthContext';
import { useApiResource } from '../hooks/useApiResource';
import { notificationsApi } from '../../core/api/services';
import { ROUTES } from '../../core/config/app.config';
import './Header.css';

interface HeaderProps {
  onMenuClick: () => void;
}

export function Header({ onMenuClick }: HeaderProps) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const { data: unread } = useApiResource(() => notificationsApi.unreadCount(), []);

  const userName = user?.fullName ?? 'MedFlow user';
  const unreadCount = unread?.unread ?? 0;

  return (
    <header className="mf-header">
      <div className="mf-header__left">
        <button className="mf-header__menu" onClick={onMenuClick} aria-label="Toggle navigation">
          <Menu size={19} />
        </button>
        <div className="mf-header__welcome">
          <p className="mf-header__eyebrow">Good to see you</p>
          <h2 className="mf-header__title">{userName}</h2>
        </div>
      </div>

      <div className="mf-header__search">
        <SearchBar placeholder="Search patients, doctors, records…" />
      </div>

      <div className="mf-header__right">
        <button className="mf-header__icon-btn mf-header__icon-btn--mobile" aria-label="Search">
          <Search size={18} />
        </button>
        <Link to={ROUTES.notifications} className="mf-header__icon-btn" aria-label="Notifications">
          <Bell size={18} />
          {unreadCount > 0 && (
            <Badge tone="coral" className="mf-header__notif-badge">
              {unreadCount}
            </Badge>
          )}
        </Link>
        <ThemeSwitcher />
        <div className="mf-header__divider" />
        <ProfileMenu
          userName={userName}
          userSubtitle={user?.roleName ?? 'View profile'}
          className="mf-header__profile"
          items={[
            { label: 'My profile', icon: <User size={15} />, to: ROUTES.settings },
            { label: 'Settings', icon: <Settings size={15} />, to: ROUTES.settings },
            {
              label: 'Sign out',
              icon: <LogOut size={15} />,
              danger: true,
              onSelect: () => {
                logout();
                navigate(ROUTES.login, { replace: true });
              },
            },
          ]}
        />
      </div>
    </header>
  );
}

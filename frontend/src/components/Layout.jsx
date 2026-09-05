import { useState, Fragment } from 'react';
import { NavLink, Outlet, useLocation } from 'react-router-dom';
import { Menu, Transition } from '@headlessui/react';
import {
  HomeIcon,
  BuildingOfficeIcon,
  UsersIcon,
  CubeTransparentIcon,
  CheckBadgeIcon,
  BoltIcon,
  DocumentTextIcon,
  ChartBarIcon,
  Cog6ToothIcon,
  UserCircleIcon,
  ArrowRightOnRectangleIcon,
  Bars3Icon,
  XMarkIcon,
} from '@heroicons/react/24/outline';
import { useAuth } from '../contexts/AuthContext';

const navigation = [
  { name: 'Dashboard', href: '/', icon: HomeIcon },
  { name: 'Sites', href: '/sites', icon: BuildingOfficeIcon },
  { name: 'Teams', href: '/teams', icon: UsersIcon },
  { name: 'Materials', href: '/materials', icon: CubeTransparentIcon },
  { name: 'Validations', href: '/validations', icon: CheckBadgeIcon },
  { name: 'PLN Upgrades', href: '/upgrades', icon: BoltIcon },
  { name: 'Work Orders', href: '/work-orders', icon: DocumentTextIcon },
  { name: 'KPI Analytics', href: '/kpi', icon: ChartBarIcon },
  { name: 'Settings', href: '/settings', icon: Cog6ToothIcon },
];

const itemBase =
  'flex items-center gap-3 px-3 py-2 rounded-lg text-body-sm font-medium transition-colors';
const itemActive =
  'bg-gradient-to-r from-alien-500/25 to-alien-600/10 text-alien-100 border border-alien-500/30 shadow-glow-sm';
const itemIdle =
  'text-alien-400 hover:bg-alien-700/30 hover:text-alien-100 hover:shadow-glow-sm';

function NavItems({ onNavigate, email }) {
  return (
    <>
      <nav className="flex-1 space-y-1">
        {navigation.map((item) => (
          <NavLink
            key={item.name}
            to={item.href}
            onClick={onNavigate}
            className={({ isActive }) => `${itemBase} ${isActive ? itemActive : itemIdle}`}
          >
            <item.icon className="w-5 h-5 shrink-0" aria-hidden="true" />
            <span className="truncate">{item.name}</span>
          </NavLink>
        ))}
      </nav>
      <div className="border-t border-alien-500/20 pt-3 mt-3">
        <Menu as="div" className="relative">
          <Menu.Button className="flex w-full items-center gap-3 px-3 py-2 rounded-lg text-body-sm font-medium text-alien-400 hover:bg-alien-700/30 hover:text-alien-100">
            <UserCircleIcon className="w-5 h-5" aria-hidden="true" />
            <span className="truncate">{email || 'Account'}</span>
          </Menu.Button>
          <Transition
            as={Fragment}
            enter="transition ease-out duration-100"
            enterFrom="transform opacity-0 scale-95"
            enterTo="transform opacity-100 scale-100"
          >
            <Menu.Items className="absolute right-0 mt-2 w-48 origin-top-right rounded-lg bg-alien-900 border border-alien-500/20 shadow-glow-lg py-1 focus:outline-none">
              <Menu.Item>
                {({ active }) => <MenuItemSignOut active={active} />}
              </Menu.Item>
            </Menu.Items>
          </Transition>
        </Menu>
      </div>
    </>
  );
}

function MenuItemSignOut({ active }) {
  const { logout } = useAuth();
  return (
    <button
      onClick={logout}
      className={`flex w-full items-center gap-2 px-3 py-2 text-body-sm text-alien-200 ${active ? 'bg-alien-700/40' : 'hover:bg-alien-700/20'}`}
    >
      <ArrowRightOnRectangleIcon className="w-4 h-4" aria-hidden="true" />
      Sign out
    </button>
  );
}

function Logo() {
  return (
    <div className="flex items-center gap-2 px-2">
      <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-alien-500 to-electric-500 flex items-center justify-center shadow-glow-sm">
        <span className="text-body-sm font-bold text-white">YT</span>
      </div>
      <div>
        <div className="text-body-md font-bold text-alien-100 leading-tight">YPTT TI</div>
        <div className="text-caption text-alien-500 tracking-wide">TRACKER</div>
      </div>
    </div>
  );
}

function Layout() {
  const { user } = useAuth();
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);

  const title = navigation.find((n) => n.href === location.pathname)?.name || 'Dashboard';

  return (
    <div className="min-h-screen bg-alien-950">
      {/* Mobile top bar */}
      <header className="lg:hidden sticky top-0 z-30 flex h-14 items-center gap-3 bg-alien-900/90 backdrop-blur-xl border-b border-alien-500/20 px-4">
        <button
          type="button"
          onClick={() => setMobileOpen((v) => !v)}
          className="p-2 text-alien-400 hover:bg-alien-700/30 hover:text-alien-100 rounded-md"
          aria-label="Toggle menu"
        >
          {mobileOpen ? <XMarkIcon className="w-5 h-5" /> : <Bars3Icon className="w-5 h-5" />}
        </button>
        <span className="text-body-md font-semibold text-alien-100">YPTT TI Tracker</span>
        <span className="ml-auto text-body-xs text-alien-500">{user?.email}</span>
      </header>

      {/* Mobile drawer */}
      {mobileOpen && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div className="absolute inset-0 bg-black/40" onClick={() => setMobileOpen(false)} />
          <aside className="absolute inset-y-0 left-0 w-64 bg-alien-900/95 backdrop-blur-xl border-r border-alien-500/20 p-4 flex flex-col">
            <Logo />
            <div className="mt-6 flex-1 flex flex-col">
              <NavItems onNavigate={() => setMobileOpen(false)} email={user?.email} />
            </div>
          </aside>
        </div>
      )}

      {/* Desktop sidebar */}
      <aside className="hidden lg:fixed lg:inset-y-0 lg:z-20 lg:flex lg:w-60 lg:flex-col lg:bg-alien-900/90 lg:backdrop-blur-xl lg:border-r lg:border-alien-500/20 lg:p-4">
        <Logo />
        <div className="mt-6 flex-1 flex flex-col">
          <NavItems email={user?.email} />
        </div>
        <div className="mt-4 text-caption text-alien-500 px-2 pt-4 border-t border-alien-500/20">
          {title} · {user?.email || 'online'}
        </div>
      </aside>

      {/* Main content */}
      <div className="lg:pl-60">
        <main className="p-4 lg:p-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
}

export default Layout;
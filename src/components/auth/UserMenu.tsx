'use client';

import { signOut, useSession } from 'next-auth/react';
import Link from 'next/link';
import { useState, useRef, useEffect } from 'react';
import { User, LogOut } from 'lucide-react';

export function UserMenu() {
  const { data: session } = useSession();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  if (!session?.user) {
    return null;
  }

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 hover:opacity-80 transition-opacity"
      >
        {session.user.image ? (
          <img
            src={session.user.image}
            alt={session.user.name || 'User'}
            className="w-8 h-8 rounded-full"
          />
        ) : (
          <div className="w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center text-white">
            {session.user.name?.[0]?.toUpperCase() || 'U'}
          </div>
        )}
        <span className="text-sm font-medium text-gray-700">
          {session.user.name}
        </span>
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-50">
          <Link
            href="/profile"
            className="flex items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
            onClick={() => setIsOpen(false)}
          >
            <User className="w-4 h-4" />
            Profile
          </Link>
          <button
            onClick={() => signOut({ callbackUrl: '/login' })}
            className="flex items-center gap-2 w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
          >
            <LogOut className="w-4 h-4" />
            Sign out
          </button>
        </div>
      )}
    </div>
  );
}

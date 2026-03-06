import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { SearchFilter } from '@/components/dashboard/SearchFilter';

// Mock next/navigation
const mockPush = vi.fn();
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush }),
  usePathname: () => '/jobs',
  useSearchParams: () => new URLSearchParams(),
}));

describe('SearchFilter', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers({ shouldAdvanceTime: true });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('renders search input', () => {
    render(<SearchFilter />);
    expect(screen.getByPlaceholderText('Search by job title or company...')).toBeTruthy();
  });

  it('calls onFilterChange when search input changes (debounced)', async () => {
    const onFilterChange = vi.fn();
    render(<SearchFilter onFilterChange={onFilterChange} />);

    const input = screen.getByPlaceholderText('Search by job title or company...');

    await act(async () => {
      fireEvent.change(input, { target: { value: 'engineer' } });
    });

    // Before debounce, onFilterChange was called with initial empty state from the mount effect
    // but not yet with 'engineer'
    const callsWithEngineer = onFilterChange.mock.calls.filter(
      (call: any) => call[0]?.search === 'engineer'
    );
    expect(callsWithEngineer.length).toBe(0);

    // Advance past debounce
    await act(async () => {
      vi.advanceTimersByTime(350);
    });

    const callsAfter = onFilterChange.mock.calls.filter(
      (call: any) => call[0]?.search === 'engineer'
    );
    expect(callsAfter.length).toBeGreaterThanOrEqual(1);
    expect(callsAfter[0][0]).toMatchObject({ search: 'engineer' });
  });

  it('calls onFilterChange when status filter changes', async () => {
    const onFilterChange = vi.fn();
    render(<SearchFilter onFilterChange={onFilterChange} />);

    // Wait for initial mount effect
    await act(async () => {
      vi.advanceTimersByTime(350);
    });

    onFilterChange.mockClear();

    await act(async () => {
      fireEvent.click(screen.getByText('Applied'));
    });

    // Status change triggers useEffect immediately (no debounce on status)
    await act(async () => {
      vi.advanceTimersByTime(50);
    });

    const callsWithApplied = onFilterChange.mock.calls.filter(
      (call: any) => call[0]?.status?.includes('applied')
    );
    expect(callsWithApplied.length).toBeGreaterThanOrEqual(1);
  });

  it('calls onFilterChange with empty/reset state when cleared', async () => {
    const onFilterChange = vi.fn();
    render(<SearchFilter onFilterChange={onFilterChange} />);

    // Type something to enable "Clear all filters"
    await act(async () => {
      fireEvent.change(
        screen.getByPlaceholderText('Search by job title or company...'),
        { target: { value: 'test' } }
      );
    });

    await act(async () => {
      vi.advanceTimersByTime(350);
    });

    // Now "Clear all filters" should appear
    const clearButton = screen.getByText('Clear all filters');
    expect(clearButton).toBeTruthy();

    onFilterChange.mockClear();

    await act(async () => {
      fireEvent.click(clearButton);
    });

    await act(async () => {
      vi.advanceTimersByTime(350);
    });

    // Should have been called with empty state
    const clearCalls = onFilterChange.mock.calls.filter(
      (call: any) => call[0]?.search === '' && call[0]?.status?.length === 0
    );
    expect(clearCalls.length).toBeGreaterThanOrEqual(1);
  });
});

import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { DashboardStats } from '@/components/dashboard/DashboardStats';

const mockStatsData = {
  jobsInQueue: 5,
  totalActive: 12,
  interviewed: 3,
  staleJobs: 2,
  totalApplied: 20,
  totalResponses: 8,
  responseRate: 40,
  interviewRate: 15,
};

describe('DashboardStats', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn());
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('shows loading skeleton while fetching', () => {
    // fetch never resolves
    vi.mocked(fetch).mockReturnValue(new Promise(() => {}));

    render(<DashboardStats />);

    const skeletons = document.querySelectorAll('.animate-pulse');
    expect(skeletons.length).toBe(8);
  });

  it('shows error message when fetch fails', async () => {
    vi.mocked(fetch).mockRejectedValue(new Error('Network error'));

    render(<DashboardStats />);

    await waitFor(() => {
      expect(screen.getByText(/Failed to load stats|Network error/)).toBeTruthy();
    });
  });

  it('shows error message when response is not ok', async () => {
    vi.mocked(fetch).mockResolvedValue({
      ok: false,
      status: 500,
    } as Response);

    render(<DashboardStats />);

    await waitFor(() => {
      expect(screen.getByText('Failed to fetch stats')).toBeTruthy();
    });
  });

  it('renders all 8 stat cards when data loads successfully', async () => {
    vi.mocked(fetch).mockResolvedValue({
      ok: true,
      json: async () => mockStatsData,
    } as Response);

    render(<DashboardStats />);

    await waitFor(() => {
      expect(screen.getByText('Jobs in Queue')).toBeTruthy();
      expect(screen.getByText('Total Active')).toBeTruthy();
      expect(screen.getByText('Total Applied')).toBeTruthy();
      expect(screen.getByText('Interviews')).toBeTruthy();
      expect(screen.getByText('Responses')).toBeTruthy();
      expect(screen.getByText('Response Rate')).toBeTruthy();
      expect(screen.getByText('Interview Rate')).toBeTruthy();
      expect(screen.getByText('Stale Jobs')).toBeTruthy();
    });
  });

  it('displays correct values', async () => {
    vi.mocked(fetch).mockResolvedValue({
      ok: true,
      json: async () => mockStatsData,
    } as Response);

    render(<DashboardStats />);

    await waitFor(() => {
      expect(screen.getByText('5')).toBeTruthy(); // jobsInQueue
      expect(screen.getByText('12')).toBeTruthy(); // totalActive
      expect(screen.getByText('20')).toBeTruthy(); // totalApplied
      expect(screen.getByText('3')).toBeTruthy(); // interviewed
      expect(screen.getByText('8')).toBeTruthy(); // totalResponses
      expect(screen.getByText('40%')).toBeTruthy(); // responseRate
      expect(screen.getByText('15%')).toBeTruthy(); // interviewRate
      expect(screen.getByText('2')).toBeTruthy(); // staleJobs
    });
  });

  it('stale jobs card shows red styling when staleJobs > 0', async () => {
    vi.mocked(fetch).mockResolvedValue({
      ok: true,
      json: async () => ({ ...mockStatsData, staleJobs: 3 }),
    } as Response);

    render(<DashboardStats />);

    await waitFor(() => {
      const staleLabel = screen.getByText('Stale Jobs');
      const card = staleLabel.closest('div[class*="bg-white"]')!;
      const iconContainer = card.querySelector('div[class*="bg-red"]');
      expect(iconContainer).toBeTruthy();
    });
  });

  it('stale jobs card shows gray styling when staleJobs === 0', async () => {
    vi.mocked(fetch).mockResolvedValue({
      ok: true,
      json: async () => ({ ...mockStatsData, staleJobs: 0 }),
    } as Response);

    render(<DashboardStats />);

    await waitFor(() => {
      const staleLabel = screen.getByText('Stale Jobs');
      const card = staleLabel.closest('div[class*="bg-white"]')!;
      const iconContainer = card.querySelector('div[class*="bg-gray"]');
      expect(iconContainer).toBeTruthy();
    });
  });
});

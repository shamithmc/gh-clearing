import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import DisputeDetailModal from '../DisputeDetailModal';
import type { DisputeItem } from '../DisputeDetailModal';

// Mock antd message to avoid side effects
vi.mock('antd', async () => {
  const actual = await vi.importActual<typeof import('antd')>('antd');
  return {
    ...actual,
    message: {
      success: vi.fn(),
      error: vi.fn(),
      warning: vi.fn(),
    },
  };
});

const mockDispute: DisputeItem = {
  id: 'disp-001',
  disputeNumber: 'DISP-2026-0001',
  invoiceId: 'inv-001',
  invoiceNumber: 'INV-2026-0001',
  airlineId: 'EK',
  supplierId: 'SWISSPORT',
  airportCode: 'DXB',
  status: 'OPEN',
  category: 'OPERATIONAL_DATA_MISMATCH',
  disputedAmount: 1500.00,
  creditNoteAmount: 0,
  initiatorComment: 'Billed quantity exceeds flight manifest.',
  createdAt: '2026-07-01T10:00:00Z',
  updatedAt: '2026-07-01T10:00:00Z',
  messages: [],
};

describe('DisputeDetailModal', () => {
  const onClose = vi.fn();
  const onRefresh = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    // Set default Ground Handler tenant
    localStorage.setItem('simTenantType', 'GROUND_HANDLER');
    localStorage.setItem('simTenantId', 'SWISSPORT');
  });

  it('renders dispute number and status tag', () => {
    render(
      <DisputeDetailModal
        visible={true}
        dispute={mockDispute}
        onClose={onClose}
        onRefresh={onRefresh}
      />,
    );

    expect(screen.getByText('DISP-2026-0001')).toBeInTheDocument();
    expect(screen.getByText('OPEN')).toBeInTheDocument();
  });

  it('displays disputed amount and category', () => {
    render(
      <DisputeDetailModal
        visible={true}
        dispute={mockDispute}
        onClose={onClose}
        onRefresh={onRefresh}
      />,
    );

    expect(screen.getByText(/\$1,500\.00/)).toBeInTheDocument();
    expect(screen.getByText('OPERATIONAL DATA MISMATCH')).toBeInTheDocument();
  });

  it('displays initiator comment', () => {
    render(
      <DisputeDetailModal
        visible={true}
        dispute={mockDispute}
        onClose={onClose}
        onRefresh={onRefresh}
      />,
    );

    expect(screen.getByText('Billed quantity exceeds flight manifest.')).toBeInTheDocument();
  });

  it('shows "No messages exchanged yet." when messages array is empty', () => {
    render(
      <DisputeDetailModal
        visible={true}
        dispute={mockDispute}
        onClose={onClose}
        onRefresh={onRefresh}
      />,
    );

    expect(screen.getByText('No messages exchanged yet.')).toBeInTheDocument();
  });

  it('shows Accept & Issue Credit Note button for GROUND_HANDLER tenant', () => {
    localStorage.setItem('simTenantType', 'GROUND_HANDLER');

    render(
      <DisputeDetailModal
        visible={true}
        dispute={mockDispute}
        onClose={onClose}
        onRefresh={onRefresh}
      />,
    );

    expect(screen.getByRole('button', { name: /Accept & Issue Credit Note/i })).toBeInTheDocument();
  });

  it('shows Reject Dispute button for AIRLINE tenant', () => {
    localStorage.setItem('simTenantType', 'AIRLINE');
    localStorage.setItem('simTenantId', 'EK');

    render(
      <DisputeDetailModal
        visible={true}
        dispute={mockDispute}
        onClose={onClose}
        onRefresh={onRefresh}
      />,
    );

    expect(screen.getByRole('button', { name: /Reject Dispute/i })).toBeInTheDocument();
  });

  it('hides action panel when dispute is ACCEPTED', () => {
    const resolvedDispute: DisputeItem = { ...mockDispute, status: 'ACCEPTED' };

    render(
      <DisputeDetailModal
        visible={true}
        dispute={resolvedDispute}
        onClose={onClose}
        onRefresh={onRefresh}
      />,
    );

    expect(screen.queryByText('Submit Response or Decision')).not.toBeInTheDocument();
  });

  it('returns null when dispute is null', () => {
    const { container } = render(
      <DisputeDetailModal
        visible={true}
        dispute={null}
        onClose={onClose}
        onRefresh={onRefresh}
      />,
    );

    expect(container.innerHTML).toBe('');
  });

  it('renders message thread when messages exist', () => {
    const disputeWithMessages: DisputeItem = {
      ...mockDispute,
      messages: [
        {
          id: 'msg-1',
          senderTenantId: 'SWISSPORT',
          senderTenantType: 'GROUND_HANDLER',
          senderUserId: 'dev-SWISSPORT',
          message: 'We are reviewing the disputed amount.',
          action: 'RESPOND',
          createdAt: '2026-07-02T08:00:00Z',
        },
      ],
    };

    render(
      <DisputeDetailModal
        visible={true}
        dispute={disputeWithMessages}
        onClose={onClose}
        onRefresh={onRefresh}
      />,
    );

    expect(screen.getByText('We are reviewing the disputed amount.')).toBeInTheDocument();
    expect(screen.getByText(/SWISSPORT \(GROUND_HANDLER\)/)).toBeInTheDocument();
  });
});

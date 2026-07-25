import React, { useState } from 'react';
import { Modal, Tag, Input, Button, Divider, message as antMessage } from 'antd';
import { 
  Scale, 
  MessageSquare, 
  CheckCircle2, 
  XCircle, 
  AlertTriangle, 
  Send, 
  User
} from 'lucide-react';

const { TextArea } = Input;

export interface DisputeMessageItem {
  id: string;
  senderTenantId: string;
  senderTenantType: string;
  senderUserId: string;
  message: string;
  action?: string;
  createdAt: string;
}

export interface DisputeItem {
  id: string;
  disputeNumber: string;
  invoiceId: string;
  invoiceNumber: string;
  airlineId: string;
  supplierId: string;
  airportCode: string;
  status: string;
  category: string;
  disputedAmount: number;
  creditNoteAmount?: number;
  initiatorComment?: string;
  latestResponse?: string;
  createdAt: string;
  updatedAt: string;
  messages?: DisputeMessageItem[];
}

interface DisputeDetailModalProps {
  visible: boolean;
  dispute: DisputeItem | null;
  onClose: () => void;
  onRefresh: () => void;
}

const DisputeDetailModal: React.FC<DisputeDetailModalProps> = ({
  visible,
  dispute,
  onClose,
  onRefresh
}) => {
  const [responseMsg, setResponseMsg] = useState('');
  const [loadingAction, setLoadingAction] = useState<string | null>(null);

  if (!dispute) return null;

  const currentTenantType = localStorage.getItem('simTenantType') || 'GROUND_HANDLER';
  const currentTenantId = localStorage.getItem('simTenantId') || 'SWISSPORT';

  const handleAction = async (actionType: 'RESPOND' | 'ACCEPT' | 'REJECT' | 'ESCALATE') => {
    if (!responseMsg.trim() && actionType === 'RESPOND') {
      antMessage.warning('Please enter a response message.');
      return;
    }

    setLoadingAction(actionType);
    try {
      const res = await fetch(`/api/disputes/${dispute.id}/respond`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-mock-tenant-id': currentTenantId,
          'x-mock-tenant-type': currentTenantType,
          'x-mock-user-id': `${currentTenantId}-user`
        },
        body: JSON.stringify({
          message: responseMsg.trim() || `Dispute ${actionType.toLowerCase()}ed`,
          action: actionType
        })
      });

      if (!res.ok) {
        throw new Error('Failed to update dispute status');
      }

      antMessage.success(`Dispute updated (${actionType})`);
      setResponseMsg('');
      onRefresh();
      onClose();
    } catch (err: any) {
      antMessage.error(err.message || 'Error executing action');
    } finally {
      setLoadingAction(null);
    }
  };

  const getStatusTag = (status: string) => {
    switch (status) {
      case 'OPEN': return <Tag color="orange" className="font-semibold">OPEN</Tag>;
      case 'UNDER_REVIEW': return <Tag color="blue" className="font-semibold">UNDER REVIEW</Tag>;
      case 'RESPONDED': return <Tag color="purple" className="font-semibold">RESPONDED</Tag>;
      case 'ACCEPTED':
      case 'RESOLVED': return <Tag color="green" className="font-semibold">ACCEPTED / RESOLVED</Tag>;
      case 'REJECTED': return <Tag color="red" className="font-semibold">REJECTED</Tag>;
      case 'ESCALATED': return <Tag color="magenta" className="font-semibold">ESCALATED</Tag>;
      default: return <Tag>{status}</Tag>;
    }
  };

  return (
    <Modal
      open={visible}
      onCancel={onClose}
      footer={null}
      width={720}
      title={
        <div className="flex items-center gap-3 pr-6 border-b border-slate-200 pb-3">
          <div className="p-2 bg-slate-900 text-amber-400 rounded-xl">
            <Scale className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-mono text-base font-extrabold text-slate-900">{dispute.disputeNumber}</span>
              {getStatusTag(dispute.status)}
            </div>
            <span className="text-xs text-slate-500 font-medium block">
              Invoice #{dispute.invoiceNumber} • {dispute.airlineId} / {dispute.supplierId} ({dispute.airportCode})
            </span>
          </div>
        </div>
      }
    >
      <div className="space-y-6 pt-3">
        {/* Summary Card */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 bg-slate-50 p-4 rounded-xl border border-slate-200 text-xs">
          <div>
            <span className="text-slate-500 block font-medium">Disputed Amount:</span>
            <span className="text-sm font-bold font-mono text-red-600">
              ${dispute.disputedAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
            </span>
          </div>
          <div>
            <span className="text-slate-500 block font-medium">Credit Note Value:</span>
            <span className="text-sm font-bold font-mono text-emerald-600">
              ${(dispute.creditNoteAmount || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
            </span>
          </div>
          <div>
            <span className="text-slate-500 block font-medium">Category:</span>
            <span className="font-semibold text-slate-800">{dispute.category.replace(/_/g, ' ')}</span>
          </div>
        </div>

        {/* Initiator Comment */}
        <div className="bg-amber-50/60 border border-amber-200/80 p-3.5 rounded-xl text-xs space-y-1">
          <div className="flex items-center gap-1.5 text-amber-800 font-bold">
            <AlertTriangle className="w-4 h-4 text-amber-600" />
            <span>Dispute Reason / Initiator Statement</span>
          </div>
          <p className="text-slate-700 m-0 leading-relaxed font-normal">
            {dispute.initiatorComment || 'No comment specified.'}
          </p>
        </div>

        {/* Thread History */}
        <div className="space-y-3">
          <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5 m-0">
            <MessageSquare className="w-4 h-4 text-blue-600" />
            <span>Resolution Activity Thread</span>
          </h4>

          <div className="space-y-2.5 max-h-56 overflow-y-auto pr-1">
            {dispute.messages && dispute.messages.length > 0 ? (
              dispute.messages.map((msg) => (
                <div 
                  key={msg.id}
                  className={`p-3 rounded-xl border text-xs space-y-1 ${
                    msg.senderTenantType === 'AIRLINE' 
                      ? 'bg-blue-50/60 border-blue-200/80 ml-4' 
                      : 'bg-slate-50 border-slate-200 mr-4'
                  }`}
                >
                  <div className="flex items-center justify-between text-[11px] font-semibold text-slate-600">
                    <span className="flex items-center gap-1">
                      <User className="w-3 h-3 text-slate-400" />
                      {msg.senderTenantId} ({msg.senderTenantType})
                    </span>
                    {msg.action && (
                      <Tag color="blue" className="text-[10px] m-0">{msg.action}</Tag>
                    )}
                  </div>
                  <p className="text-slate-800 m-0 leading-relaxed">{msg.message}</p>
                </div>
              ))
            ) : (
              <p className="text-xs text-slate-500 italic">No messages exchanged yet.</p>
            )}
          </div>
        </div>

        <Divider className="my-2" />

        {/* Action Panel */}
        {dispute.status !== 'ACCEPTED' && dispute.status !== 'RESOLVED' && dispute.status !== 'REJECTED' && (
          <div className="space-y-3">
            <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider m-0">
              Submit Response or Decision
            </h4>

            <TextArea
              rows={3}
              placeholder="Enter response, justification, or resolution comments..."
              value={responseMsg}
              onChange={(e) => setResponseMsg(e.target.value)}
              className="text-xs"
            />

            <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
              <div className="flex items-center gap-2">
                <Button 
                  type="primary"
                  icon={<Send className="w-3.5 h-3.5" />}
                  onClick={() => handleAction('RESPOND')}
                  loading={loadingAction === 'RESPOND'}
                  className="bg-blue-600 text-xs font-semibold rounded-xl"
                >
                  Send Response
                </Button>
              </div>

              <div className="flex items-center gap-2">
                {currentTenantType === 'GROUND_HANDLER' ? (
                  <Button
                    type="primary"
                    danger
                    icon={<CheckCircle2 className="w-3.5 h-3.5" />}
                    onClick={() => handleAction('ACCEPT')}
                    loading={loadingAction === 'ACCEPT'}
                    className="!bg-emerald-600 hover:!bg-emerald-700 border-0 text-xs font-semibold rounded-xl"
                  >
                    Accept & Issue Credit Note
                  </Button>
                ) : (
                  <Button
                    type="primary"
                    danger
                    icon={<XCircle className="w-3.5 h-3.5" />}
                    onClick={() => handleAction('REJECT')}
                    loading={loadingAction === 'REJECT'}
                    className="text-xs font-semibold rounded-xl"
                  >
                    Reject Dispute
                  </Button>
                )}

                <Button
                  icon={<AlertTriangle className="w-3.5 h-3.5 text-amber-500" />}
                  onClick={() => handleAction('ESCALATE')}
                  loading={loadingAction === 'ESCALATE'}
                  className="text-xs font-semibold rounded-xl"
                >
                  Escalate
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
};

export default DisputeDetailModal;

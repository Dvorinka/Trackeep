import { createSignal } from 'solid-js';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { ModalPortal } from '@/components/ui/ModalPortal';
import { IconX } from '@tabler/icons-solidjs';

interface Member {
  id?: string;
  name: string;
  email: string;
  role: 'Admin' | 'Member';
  avatar?: string;
  joinedAt?: string;
}

interface MemberModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (member: Omit<Member, 'id' | 'avatar' | 'joinedAt'>) => void;
  member?: Member | null;
  isEdit?: boolean;
}

export const MemberModal = (props: MemberModalProps) => {
  const [memberData, setMemberData] = createSignal<Omit<Member, 'id' | 'avatar' | 'joinedAt'>>({
    name: '',
    email: '',
    role: 'Member'
  });

  // Reset form when modal opens/closes or member changes
  const resetForm = () => {
    if (props.member && props.isEdit) {
      setMemberData({
        name: props.member.name,
        email: props.member.email,
        role: props.member.role as 'Admin' | 'Member'
      });
    } else {
      setMemberData({
        name: '',
        email: '',
        role: 'Member'
      });
    }
  };

  // Call resetForm when member changes
  if (props.isOpen) {
    resetForm();
  }

  const handleSubmit = () => {
    if (!memberData().name.trim() || !memberData().email.trim()) return;
    props.onSubmit(memberData());
  };

  return (
    <ModalPortal>
      <>
        {/* Backdrop */}
        {props.isOpen && (
          <div class="fixed inset-0 bg-black/50 z-40" onClick={props.onClose} />
        )}

        {/* Modal */}
        <div class={`fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-card border border-border rounded-lg shadow-xl transition-all duration-300 z-50 ${
          props.isOpen ? 'opacity-100 scale-100' : 'opacity-0 scale-95 pointer-events-none'
        }`} style="width: 500px; max-width: 90vw;">
          {/* Header */}
          <div class="flex items-center justify-between p-6 border-b border-border">
            <h3 class="text-lg font-semibold">
              {props.isEdit ? 'Edit Member' : 'Add New Member'}
            </h3>
            <button
              onClick={props.onClose}
              class="inline-flex items-center justify-center rounded-md text-sm font-medium transition-shadow focus-visible:outline-none focus-visible:ring-1.5 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 bg-inherit hover:bg-accent/50 hover:text-accent-foreground h-8 w-8"
            >
              <IconX class="size-4" />
            </button>
          </div>

          {/* Content */}
          <div class="p-6 space-y-4">
            <Input
              type="text"
              placeholder="Member name *"
              value={memberData().name}
              onInput={(e) => {
                const target = e.currentTarget as HTMLInputElement;
                if (target) setMemberData(prev => ({ ...prev, name: target.value }));
              }}
              required
            />
            <Input
              type="email"
              placeholder="Email address *"
              value={memberData().email}
              onInput={(e) => {
                const target = e.currentTarget as HTMLInputElement;
                if (target) setMemberData(prev => ({ ...prev, email: target.value }));
              }}
              required
            />
            <div class="space-y-2">
              <label class="text-sm font-medium text-foreground">Role</label>
              <select
                value={memberData().role}
                onChange={(e) => setMemberData(prev => ({ ...prev, role: e.target.value as 'Admin' | 'Member' }))}
                class="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground focus-visible:outline-none focus-visible:ring-1.5 focus-visible:ring-ring"
              >
                <option value="Member">Member</option>
                <option value="Admin">Admin</option>
              </select>
            </div>
          </div>

          {/* Footer */}
          <div class="flex justify-end gap-2 p-6 border-t border-border">
            <Button variant="outline" onClick={props.onClose}>
              Cancel
            </Button>
            <Button onClick={handleSubmit} disabled={!memberData().name.trim() || !memberData().email.trim()}>
              {props.isEdit ? 'Save Changes' : 'Add Member'}
            </Button>
          </div>
        </div>
      </>
    </ModalPortal>
  );
};

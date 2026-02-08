import { createSignal, onMount } from 'solid-js';
import { IconPlus, IconDotsVertical, IconEdit, IconTrash, IconShield, IconShieldCheck } from '@tabler/icons-solidjs';
import { DropdownMenu, DropdownMenuItem } from '@/components/ui/DropdownMenu';
import { MemberModal } from '@/components/ui/MemberModal';
import { ConfirmModal } from '@/components/ui/ConfirmModal';

interface Member {
  id: string;
  name: string;
  email: string;
  role: 'Admin' | 'Member';
  avatar: string;
  joinedAt: string;
}

export const Members = () => {
  const [members, setMembers] = createSignal<Member[]>([]);
  const [showAddModal, setShowAddModal] = createSignal(false);
  const [showEditModal, setShowEditModal] = createSignal(false);
  const [showDeleteModal, setShowDeleteModal] = createSignal(false);
  const [editingMember, setEditingMember] = createSignal<Member | null>(null);
  const [deletingMember, setDeletingMember] = createSignal<Member | null>(null);

  const handleAddMember = (memberData: Omit<Member, 'id' | 'avatar' | 'joinedAt'>) => {
    const newMember: Member = {
      ...memberData,
      id: Date.now().toString(),
      avatar: memberData.name.split(' ').map(n => n[0]).join('').toUpperCase(),
      joinedAt: 'Just now'
    };
    setMembers(prev => [...prev, newMember]);
    setShowAddModal(false);
  };

  const handleEditMember = (memberData: Omit<Member, 'id' | 'avatar' | 'joinedAt'>) => {
    if (!editingMember()) return;
    
    setMembers(prev => 
      prev.map(m => 
        m.id === editingMember()!.id 
          ? { 
              ...m, 
              ...memberData,
              avatar: memberData.name.split(' ').map(n => n[0]).join('').toUpperCase()
            } 
          : m
      )
    );
    setShowEditModal(false);
    setEditingMember(null);
  };

  const openEditModal = (member: Member) => {
    setEditingMember(member);
    setShowEditModal(true);
  };

  const openDeleteModal = (member: Member) => {
    setDeletingMember(member);
    setShowDeleteModal(true);
  };

  const handleDeleteMember = () => {
    if (!deletingMember()) return;
    
    setMembers(prev => prev.filter(m => m.id !== deletingMember()!.id));
    setShowDeleteModal(false);
    setDeletingMember(null);
  };

  const handleToggleRole = (member: Member) => {
    const newRole = member.role === 'Admin' ? 'Member' : 'Admin';
    setMembers(prev => 
      prev.map(m => 
        m.id === member.id ? { ...m, role: newRole } : m
      )
    );
  };

  onMount(() => {
    // Mock data
    setMembers([
      {
        id: '1',
        name: 'John Doe',
        email: 'john@example.com',
        role: 'Admin',
        avatar: 'JD',
        joinedAt: '2 weeks ago'
      },
      {
        id: '2',
        name: 'Jane Smith',
        email: 'jane@example.com',
        role: 'Member',
        avatar: 'JS',
        joinedAt: '1 month ago'
      },
      {
        id: '3',
        name: 'Bob Johnson',
        email: 'bob@example.com',
        role: 'Member',
        avatar: 'BJ',
        joinedAt: '3 months ago'
      }
    ]);
  });

  return (
    <div class="p-6 mt-4 pb-32 max-w-5xl mx-auto">
      <div class="flex justify-between items-center mb-6">
        <h1 class="text-3xl font-bold text-foreground">Members</h1>
        <button type="button" class="inline-flex justify-center rounded-md text-sm font-medium transition-shadow focus-visible:outline-none focus-visible:ring-1.5 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 bg-primary text-primary-foreground shadow hover:bg-primary/90 h-auto items-center gap-2 py-2 px-4" onClick={() => setShowAddModal(true)}>
          <IconPlus class="size-4" />
          Add Member
        </button>
      </div>

      <div class="w-full overflow-auto">
        <table class="w-full caption-bottom text-sm">
          <thead class="[&_tr]:border-b">
            <tr class="border-b transition-colors data-[state=selected]:bg-muted">
              <th class="h-10 px-2 text-left align-middle font-medium text-muted-foreground">Member</th>
              <th class="h-10 px-2 text-left align-middle font-medium text-muted-foreground">Role</th>
              <th class="h-10 px-2 text-left align-middle font-medium text-muted-foreground">Joined</th>
              <th class="h-10 px-2 text-left align-middle font-medium text-muted-foreground text-right">Actions</th>
            </tr>
          </thead>
          <tbody class="[&_tr:last-child]:border-0">
            {members().map((member) => (
              <tr class="border-b transition-colors data-[state=selected]:bg-muted">
                <td class="p-2 align-middle">
                  <div class="flex items-center gap-3">
                    <div class="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-medium">
                      {member.avatar}
                    </div>
                    <div>
                      <div class="font-medium">{member.name}</div>
                      <div class="text-sm text-muted-foreground">{member.email}</div>
                    </div>
                  </div>
                </td>
                <td class="p-2 align-middle">
                  <span class="inline-flex items-center rounded-md border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2">
                    {member.role}
                  </span>
                </td>
                <td class="p-2 align-middle text-muted-foreground">
                  {member.joinedAt}
                </td>
                <td class="p-2 align-middle">
                  <div class="flex items-center justify-end">
                    <DropdownMenu
                      trigger={
                        <button type="button" class="inline-flex items-center justify-center rounded-md text-sm font-medium transition-shadow focus-visible:outline-none focus-visible:ring-1.5 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 bg-inherit hover:bg-accent/50 hover:text-accent-foreground h-9 w-9">
                          <IconDotsVertical class="size-4" />
                        </button>
                      }
                    >
                      <DropdownMenuItem onClick={() => openEditModal(member)} icon={IconEdit}>
                        Edit
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => handleToggleRole(member)} icon={member.role === 'Admin' ? IconShieldCheck : IconShield}>
                        {member.role === 'Admin' ? 'Make Member' : 'Make Admin'}
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => openDeleteModal(member)} icon={IconTrash} variant="destructive">
                        Remove
                      </DropdownMenuItem>
                    </DropdownMenu>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Modals */}
      <MemberModal
        isOpen={showAddModal()}
        onClose={() => setShowAddModal(false)}
        onSubmit={handleAddMember}
      />

      <MemberModal
        isOpen={showEditModal()}
        onClose={() => {
          setShowEditModal(false);
          setEditingMember(null);
        }}
        onSubmit={handleEditMember}
        member={editingMember()}
        isEdit={true}
      />

      <ConfirmModal
        isOpen={showDeleteModal()}
        onClose={() => {
          setShowDeleteModal(false);
          setDeletingMember(null);
        }}
        onConfirm={handleDeleteMember}
        title="Remove Member"
        message={`Are you sure you want to remove ${deletingMember()?.name} from the team?`}
        confirmText="Remove"
        type="danger"
      />
    </div>
  );
};

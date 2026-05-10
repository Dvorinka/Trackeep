import { createSignal, onCleanup, onMount } from 'solid-js';
import { IconPlus, IconDotsVertical, IconTrash } from '@tabler/icons-solidjs';
import { DropdownMenu, DropdownMenuItem } from '@/components/ui/DropdownMenu';
import { MemberModal } from '@/components/ui/MemberModal';
import { ConfirmModal } from '@/components/ui/ConfirmModal';
import { getApiV1BaseUrl } from '@/lib/api-url';

const API_BASE_URL = getApiV1BaseUrl();

interface Member {
  id: string;
  name: string;
  email: string;
  role: string;
  avatar: string;
  joinedAt: string;
}

export const Members = () => {
  const [members, setMembers] = createSignal<Member[]>([]);
  const [showAddModal, setShowAddModal] = createSignal(false);
  const [showDeleteModal, setShowDeleteModal] = createSignal(false);
  const [deletingMember, setDeletingMember] = createSignal<Member | null>(null);
  const [workspaceId, setWorkspaceId] = createSignal('');
  const [isLoading, setIsLoading] = createSignal(true);

  const getToken = () => localStorage.getItem('trackeep_token') || localStorage.getItem('token') || '';

  const toRoleLabel = (role: string) => {
    if (role === 'owner') return 'Owner';
    if (role === 'admin') return 'Admin';
    if (role === 'viewer') return 'Viewer';
    return 'Member';
  };

  const toInitials = (name: string) => {
    return name
      .split(' ')
      .map((part) => part[0] || '')
      .join('')
      .slice(0, 2)
      .toUpperCase();
  };

  const resolveWorkspaceId = async (): Promise<string> => {
    const storedWorkspaceId = localStorage.getItem('trackeep_workspace_id') || '';
    if (storedWorkspaceId) {
      return storedWorkspaceId;
    }

    const token = getToken();
    if (!token) {
      return '';
    }

    const teamsResponse = await fetch(`${API_BASE_URL}/teams`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    if (!teamsResponse.ok) {
      return '';
    }

    const teamsData = await teamsResponse.json();
    const teams = Array.isArray(teamsData?.teams) ? teamsData.teams : [];
    if (teams.length === 0) {
      return '';
    }

    const firstTeamId = String(teams[0].id);
    localStorage.setItem('trackeep_workspace_id', firstTeamId);
    localStorage.setItem('trackeep_workspace_name', teams[0].name || 'Trackeep Workspace');
    return firstTeamId;
  };

  const loadMembers = async () => {
    setIsLoading(true);
    try {
      const token = getToken();
      if (!token) {
        setMembers([]);
        setWorkspaceId('');
        return;
      }

      const currentWorkspaceId = await resolveWorkspaceId();
      setWorkspaceId(currentWorkspaceId);

      if (!currentWorkspaceId) {
        setMembers([]);
        return;
      }

      const response = await fetch(`${API_BASE_URL}/teams/${currentWorkspaceId}/members`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch members: ${response.status}`);
      }

      const data = await response.json();
      const membersPayload = Array.isArray(data?.members) ? data.members : [];

      const mappedMembers: Member[] = membersPayload.map((member: any, index: number) => {
        const user = member.user || {};
        const name = user.full_name || user.username || user.email || `User ${index + 1}`;
        const email = user.email || '';
        return {
          id: String(member.user_id || user.id || member.id || index + 1),
          name,
          email,
          role: toRoleLabel(member.role || 'member'),
          avatar: toInitials(name),
          joinedAt: member.joined_at ? new Date(member.joined_at).toLocaleDateString() : '',
        };
      });

      setMembers(mappedMembers);
    } catch (error) {
      console.error('Failed to load members:', error);
      setMembers([]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddMember = async (memberData: { name: string; email: string; role: 'Admin' | 'Member' }) => {
    const token = getToken();
    const currentWorkspaceId = workspaceId();
    if (!token || !currentWorkspaceId) {
      return;
    }

    try {
      const response = await fetch(`${API_BASE_URL}/teams/${currentWorkspaceId}/invite`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          email: memberData.email,
          role: memberData.role === 'Admin' ? 'admin' : 'member',
        }),
      });

      if (!response.ok) {
        throw new Error(`Failed to invite member: ${response.status}`);
      }

      setShowAddModal(false);
      alert('Invitation sent successfully.');
    } catch (error) {
      console.error('Failed to invite member:', error);
      alert('Failed to invite member.');
    }
  };

  const openDeleteModal = (member: Member) => {
    setDeletingMember(member);
    setShowDeleteModal(true);
  };

  const handleDeleteMember = async () => {
    const member = deletingMember();
    const token = getToken();
    const currentWorkspaceId = workspaceId();
    if (!member || !token || !currentWorkspaceId) {
      return;
    }

    try {
      const response = await fetch(`${API_BASE_URL}/teams/${currentWorkspaceId}/members/${member.id}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to remove member: ${response.status}`);
      }

      setMembers((prev) => prev.filter((entry) => entry.id !== member.id));
      setShowDeleteModal(false);
      setDeletingMember(null);
    } catch (error) {
      console.error('Failed to remove member:', error);
      alert('Failed to remove member.');
    }
  };

  onMount(() => {
    void loadMembers();

    const onWorkspaceChanged = () => {
      void loadMembers();
    };

    window.addEventListener('trackeep:workspace-changed', onWorkspaceChanged);
    onCleanup(() => window.removeEventListener('trackeep:workspace-changed', onWorkspaceChanged));
  });

  return (
    <div class="p-6 mt-4 pb-32 max-w-5xl mx-auto">
      <div class="flex justify-between items-center mb-6">
        <h1 class="text-3xl font-bold text-foreground">Members</h1>
        <button
          type="button"
          class="inline-flex justify-center rounded-md text-sm font-medium transition-shadow focus-visible:outline-none focus-visible:ring-1.5 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 bg-primary text-primary-foreground shadow hover:bg-primary/90 h-auto items-center gap-2 py-2 px-4"
          onClick={() => setShowAddModal(true)}
          disabled={!workspaceId()}
        >
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
            {isLoading() ? (
              <tr class="border-b">
                <td class="p-4 text-muted-foreground" colSpan={4}>
                  Loading members...
                </td>
              </tr>
            ) : members().length === 0 ? (
              <tr class="border-b">
                <td class="p-4 text-muted-foreground" colSpan={4}>
                  No members yet.
                </td>
              </tr>
            ) : (
              members().map((member) => (
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
                    {member.joinedAt || 'Unknown'}
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
                        <DropdownMenuItem onClick={() => openDeleteModal(member)} icon={IconTrash} variant="destructive">
                          Remove
                        </DropdownMenuItem>
                      </DropdownMenu>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <MemberModal
        isOpen={showAddModal()}
        onClose={() => setShowAddModal(false)}
        onSubmit={handleAddMember}
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

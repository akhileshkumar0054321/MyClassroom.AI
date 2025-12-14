
import React, { useState } from 'react';
import { User, UserRole } from '../types';
import { UserPlus, Users, Mail, CheckCircle, XCircle, AlertTriangle, Send } from 'lucide-react';

interface SocialManagerProps {
  user: User;
  sendRequest: (toUid: string) => { success: boolean; message: string };
  // Mock data needed for demo visualization
  friends: string[];
}

const SocialManager: React.FC<SocialManagerProps> = ({ user, sendRequest, friends }) => {
  const [activeTab, setActiveTab] = useState<'INVITE' | 'CONNECTIONS'>('INVITE');
  const [uidInput, setUidInput] = useState('');
  const [inviteStatus, setInviteStatus] = useState<{ type: 'success' | 'error' | 'none'; msg: string }>({ type: 'none', msg: '' });

  const handleInvite = () => {
    // 1. Validation Logic
    if (!uidInput.startsWith('MC-')) {
        setInviteStatus({ type: 'error', msg: '❌ UID must start with "MC-"' });
        return;
    }
    const parts = uidInput.split('-');
    if (parts.length !== 4) {
        setInviteStatus({ type: 'error', msg: '❌ Invalid format. Use MC-XXXX-XXXX-XXXX' });
        return;
    }
    
    // 2. Send Request
    const result = sendRequest(uidInput);
    setInviteStatus({ 
        type: result.success ? 'success' : 'error', 
        msg: result.success ? `✅ ${result.message}` : `❌ ${result.message}`
    });

    if (result.success) {
        setUidInput('');
    }
  };

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="flex items-center gap-4 mb-8">
         <div className="p-3 bg-pink-100 rounded-full text-pink-600">
             <Users className="w-8 h-8" />
         </div>
         <h2 className="text-3xl font-bold dark:text-white">
            {user.role === UserRole.TEACHER ? 'Invite Students' : 'Connect with Friends'}
         </h2>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 overflow-hidden min-h-[500px]">
         <div className="flex border-b border-gray-200 dark:border-gray-700">
             <button 
                onClick={() => setActiveTab('INVITE')}
                className={`flex-1 py-4 font-bold text-sm ${activeTab === 'INVITE' ? 'bg-pink-50 dark:bg-pink-900/20 text-pink-600 border-b-2 border-pink-600' : 'text-gray-500 hover:bg-gray-50 dark:hover:bg-gray-700'}`}
             >
                SEND INVITATIONS
             </button>
             <button 
                onClick={() => setActiveTab('CONNECTIONS')}
                className={`flex-1 py-4 font-bold text-sm ${activeTab === 'CONNECTIONS' ? 'bg-pink-50 dark:bg-pink-900/20 text-pink-600 border-b-2 border-pink-600' : 'text-gray-500 hover:bg-gray-50 dark:hover:bg-gray-700'}`}
             >
                MY CONNECTIONS ({friends.length})
             </button>
         </div>

         <div className="p-8">
            {activeTab === 'INVITE' && (
                <div className="max-w-xl mx-auto text-center space-y-6 pt-10">
                    <div className="w-20 h-20 bg-gray-100 dark:bg-gray-700 rounded-full mx-auto flex items-center justify-center mb-4">
                        <UserPlus className="w-10 h-10 text-gray-400" />
                    </div>
                    
                    <div>
                        <h3 className="text-xl font-bold dark:text-white mb-2">Enter User ID</h3>
                        <p className="text-gray-500 mb-6">Ask your friend for their unique 12-digit ID (e.g., MC-1234-5678-9123)</p>
                        
                        <div className="relative">
                            <input 
                                value={uidInput}
                                onChange={(e) => {
                                    setUidInput(e.target.value.toUpperCase());
                                    setInviteStatus({ type: 'none', msg: '' });
                                }}
                                placeholder="MC-XXXX-XXXX-XXXX"
                                className="w-full text-center text-2xl font-mono p-4 border-2 border-gray-300 dark:border-gray-600 rounded-xl focus:border-pink-500 focus:ring-0 uppercase dark:bg-gray-900 dark:text-white"
                            />
                        </div>
                    </div>

                    {inviteStatus.type !== 'none' && (
                        <div className={`p-4 rounded-lg flex items-center justify-center gap-2 ${inviteStatus.type === 'success' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                            {inviteStatus.type === 'success' ? <CheckCircle className="w-5 h-5"/> : <AlertTriangle className="w-5 h-5"/>}
                            <span className="font-medium">{inviteStatus.msg}</span>
                        </div>
                    )}

                    <button 
                        onClick={handleInvite}
                        disabled={!uidInput}
                        className="w-full bg-pink-600 hover:bg-pink-700 text-white font-bold py-4 rounded-xl shadow-lg transform transition active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2"
                    >
                        <Send className="w-5 h-5" />
                        Send Request
                    </button>

                    <div className="mt-8 text-left bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg border border-blue-100 dark:border-blue-800">
                        <h4 className="font-bold text-blue-800 dark:text-blue-300 mb-2 flex items-center gap-2">
                            <Mail className="w-4 h-4" /> Demo Test Cases:
                        </h4>
                        <ul className="text-sm text-blue-700 dark:text-blue-200 space-y-1">
                            <li>• Try Valid UID: <code className="bg-white dark:bg-black px-1 rounded select-all">MC-1234-5678-9123</code></li>
                            <li>• Try Invalid UID: <code className="bg-white dark:bg-black px-1 rounded select-all">ABC-123</code></li>
                            <li>• Try Your UID: <code className="bg-white dark:bg-black px-1 rounded select-all">{user.id}</code></li>
                        </ul>
                    </div>
                </div>
            )}

            {activeTab === 'CONNECTIONS' && (
                <div className="grid gap-4">
                    {friends.length === 0 ? (
                        <div className="text-center py-12 text-gray-500">
                            No connections yet. Invite someone!
                        </div>
                    ) : (
                        friends.map((friendId, idx) => (
                            <div key={idx} className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700 rounded-lg border border-gray-200 dark:border-gray-600">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-full bg-pink-100 text-pink-600 flex items-center justify-center font-bold">
                                        {friendId.charAt(3)}
                                    </div>
                                    <div>
                                        <p className="font-bold dark:text-white">Friend #{idx + 1}</p>
                                        <p className="text-xs text-gray-500 font-mono">{friendId}</p>
                                    </div>
                                </div>
                                <span className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-xs font-bold flex items-center gap-1">
                                    <CheckCircle className="w-3 h-3" /> Connected
                                </span>
                            </div>
                        ))
                    )}
                </div>
            )}
         </div>
      </div>
    </div>
  );
};

export default SocialManager;

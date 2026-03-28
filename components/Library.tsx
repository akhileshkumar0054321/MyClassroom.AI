
import React, { useState } from 'react';
import { LibraryItem, ContentType, User, VideoScript, Presentation } from '../types';
import { 
    Video, BookOpen, FileText, Presentation as PresentationIcon, Trash2, Filter, 
    Share2, Download, Eye, User as UserIcon, Globe, Lock, Import, X, PlayCircle
} from 'lucide-react';
import ReactMarkdown from 'react-markdown';

interface LibraryProps {
  items: LibraryItem[]; // All items (User's + Friends')
  user: User;
  friends: string[]; // List of friend IDs
  onUpdateItem: (itemId: string, updates: Partial<LibraryItem>) => void;
  onDeletePermanent: (itemId: string) => void;
  onImport: (item: LibraryItem) => void;
}

const Library: React.FC<LibraryProps> = ({ items, user, friends, onUpdateItem, onDeletePermanent, onImport }) => {
  const [viewMode, setViewMode] = useState<'MY_LIBRARY' | 'FRIENDS'>('MY_LIBRARY');
  const [selectedFriend, setSelectedFriend] = useState<string | null>(null);
  const [filter, setFilter] = useState<ContentType | 'ALL'>('ALL');
  const [previewItem, setPreviewItem] = useState<LibraryItem | null>(null);

  // --- FILTERS ---
  const getDisplayItems = () => {
      let filtered = [];

      if (viewMode === 'MY_LIBRARY') {
          filtered = items.filter(i => i.userId === user.id);
      } else if (viewMode === 'FRIENDS') {
          if (selectedFriend) {
              // Show only SHARED items from selected friend
              filtered = items.filter(i => i.userId === selectedFriend && i.isShared);
          } else {
              return []; // No friend selected yet
          }
      }

      if (filter !== 'ALL') {
          filtered = filtered.filter(i => i.type === filter);
      }
      return filtered.sort((a, b) => new Date(b.dateCreated).getTime() - new Date(a.dateCreated).getTime());
  };

  const displayItems = getDisplayItems();

  const getIcon = (type: ContentType) => {
    switch (type) {
        case ContentType.VIDEO: return Video;
        case ContentType.EBOOK: return BookOpen;
        case ContentType.NOTES: return FileText;
        case ContentType.SMART_NOTE: return FileText;
        case ContentType.PPT: return PresentationIcon;
        default: return FileText;
    }
  };

  // --- ACTIONS ---
  const handleToggleShare = (id: string, current: boolean) => {
      onUpdateItem(id, { isShared: !current });
  };

  const handleViewFriend = (friendId: string) => {
      setSelectedFriend(friendId);
      setFilter('ALL');
  };

  const renderPreviewContent = (item: LibraryItem) => {
      if (!item.data) return <p className="text-gray-500 italic">No content data available.</p>;

      if (item.type === ContentType.VIDEO) {
          const script = item.data as VideoScript;
          return (
              <div className="space-y-4">
                  <div className="bg-gray-900 text-white p-4 rounded-lg flex items-center justify-center h-48">
                      <PlayCircle className="w-16 h-16 opacity-50" />
                  </div>
                  <div className="flex justify-between items-center">
                    <h4 className="font-bold text-lg dark:text-white">{script.topic || item.title}</h4>
                    <span className="text-xs bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded dark:text-white">Duration: {script.totalDuration}</span>
                  </div>
                  <div className="space-y-3">
                    {script.chapters?.map((chap, idx) => (
                        <div key={idx} className="p-3 bg-gray-50 dark:bg-gray-700 rounded border border-gray-100 dark:border-gray-600">
                            <p className="font-bold text-sm text-primary-600 mb-1">{chap.title} <span className="text-gray-400 font-normal text-xs">({chap.duration})</span></p>
                            <p className="text-sm text-gray-700 dark:text-gray-300">{chap.content}</p>
                        </div>
                    ))}
                  </div>
              </div>
          );
      } else if (item.type === ContentType.PPT) {
          const ppt = item.data as Presentation;
          return (
              <div className="space-y-4">
                  <h4 className="font-bold text-lg dark:text-white mb-2">{ppt.topic}</h4>
                  {ppt.slides?.map((slide, idx) => (
                      <div key={idx} className="border p-4 rounded-lg bg-gray-50 dark:bg-gray-700 dark:border-gray-600 shadow-sm">
                           <h5 className="font-bold border-b pb-2 mb-2 dark:border-gray-500 dark:text-white">Slide {idx+1}: {slide.title}</h5>
                           <ul className="list-disc pl-5 text-sm space-y-1 text-gray-700 dark:text-gray-300">
                               {slide.bullets?.map((b, i) => <li key={i}>{b}</li>)}
                           </ul>
                           <p className="mt-3 text-xs text-gray-500 italic">Note: {slide.speakerNotes}</p>
                      </div>
                  ))}
              </div>
          );
      } else {
          // Text content (Ebook, Notes)
          return (
              <div className="prose dark:prose-invert max-w-none">
                  <ReactMarkdown>{typeof item.data === 'string' ? item.data : JSON.stringify(item.data, null, 2)}</ReactMarkdown>
              </div>
          );
      }
  };

  return (
    <div className="p-6 max-w-6xl mx-auto h-full flex flex-col relative">
        {/* VIEW MODAL */}
        {previewItem && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fade-in">
                <div className="bg-white dark:bg-gray-800 w-full max-w-3xl max-h-[85vh] rounded-2xl shadow-2xl overflow-hidden flex flex-col">
                    <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center bg-gray-50 dark:bg-gray-900">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                                {React.createElement(getIcon(previewItem.type), { className: "w-5 h-5 text-blue-600 dark:text-blue-400" })}
                            </div>
                            <div>
                                <h3 className="font-bold text-lg dark:text-white leading-tight">{previewItem.title}</h3>
                                <p className="text-xs text-gray-500">
                                    {new Date(previewItem.dateCreated).toLocaleDateString()} 
                                    {previewItem.userId !== user.id ? ` • Shared by Friend` : ''}
                                </p>
                            </div>
                        </div>
                        <button onClick={() => setPreviewItem(null)} className="p-2 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-full transition-colors">
                            <X className="w-5 h-5 text-gray-500" />
                        </button>
                    </div>
                    
                    <div className="flex-1 overflow-y-auto p-6 bg-white dark:bg-gray-800">
                        {renderPreviewContent(previewItem)}
                    </div>
                    
                    <div className="p-4 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 flex justify-end gap-3">
                        <button 
                            onClick={() => setPreviewItem(null)}
                            className="px-4 py-2 text-gray-600 dark:text-gray-300 font-medium hover:bg-gray-200 dark:hover:bg-gray-700 rounded-lg transition-colors"
                        >
                            Close
                        </button>
                        {previewItem.userId !== user.id && (
                            <button 
                                onClick={() => { onImport(previewItem); setPreviewItem(null); }}
                                className="bg-blue-600 text-white px-6 py-2 rounded-lg font-bold hover:bg-blue-700 flex items-center gap-2 shadow-lg"
                            >
                                <Import className="w-4 h-4" /> Import to Library
                            </button>
                        )}
                    </div>
                </div>
            </div>
        )}

        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
            <div>
                <h2 className="text-3xl font-bold text-gray-800 dark:text-white flex items-center gap-2">
                     {viewMode === 'FRIENDS' ? <Globe className="w-8 h-8 text-blue-500"/> :
                     <BookOpen className="w-8 h-8 text-primary-500" />}
                    
                    {viewMode === 'MY_LIBRARY' ? 'My Library' : 
                     selectedFriend ? `Friend's Library` : 'Friends Libraries'}
                </h2>
                <p className="text-gray-500">
                    {viewMode === 'MY_LIBRARY' ? 'Manage your generated content.' : 'View and import content shared by your connections.'}
                </p>
            </div>

            {/* Main View Tabs */}
            <div className="flex bg-gray-100 dark:bg-gray-700 p-1 rounded-lg">
                <button 
                    onClick={() => { setViewMode('MY_LIBRARY'); setSelectedFriend(null); }}
                    className={`px-4 py-2 rounded-md text-sm font-bold transition-all ${viewMode === 'MY_LIBRARY' ? 'bg-white dark:bg-gray-600 shadow text-primary-600' : 'text-gray-500 dark:text-gray-300'}`}
                >
                    My Files
                </button>
                <button 
                    onClick={() => setViewMode('FRIENDS')}
                    className={`px-4 py-2 rounded-md text-sm font-bold transition-all ${viewMode === 'FRIENDS' ? 'bg-white dark:bg-gray-600 shadow text-blue-600' : 'text-gray-500 dark:text-gray-300'}`}
                >
                    Friends
                </button>
            </div>
        </div>

        {/* Content Type Tabs (Only if not choosing a friend) */}
        {!(viewMode === 'FRIENDS' && !selectedFriend) && (
             <div className="flex overflow-x-auto gap-2 mb-6 border-b border-gray-200 dark:border-gray-700 pb-1 scrollbar-hide">
                {[
                    { id: 'ALL', label: 'All' },
                    { id: ContentType.VIDEO, label: 'Videos' },
                    { id: ContentType.EBOOK, label: 'Ebooks' },
                    { id: ContentType.PPT, label: 'Slides' },
                    { id: ContentType.SMART_NOTE, label: 'Notes' },
                ].map(tab => (
                    <button
                        key={tab.id}
                        onClick={() => setFilter(tab.id as any)}
                        className={`px-4 py-2 rounded-t-lg font-bold text-sm whitespace-nowrap transition-colors ${filter === tab.id ? 'bg-primary-50 dark:bg-primary-900/20 text-primary-600 border-b-2 border-primary-600' : 'text-gray-500 hover:text-gray-700'}`}
                    >
                        {tab.label}
                    </button>
                ))}
            </div>
        )}

        {/* --- FRIEND SELECTOR --- */}
        {viewMode === 'FRIENDS' && !selectedFriend && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 animate-fade-in">
                {friends.length === 0 ? (
                    <div className="col-span-3 text-center py-20 text-gray-500">
                        <UserIcon className="w-16 h-16 mx-auto mb-4 opacity-20"/>
                        <p>No friends connected yet. Go to Social tab to connect!</p>
                    </div>
                ) : (
                    friends.map(fid => (
                        <button 
                            key={fid} 
                            onClick={() => handleViewFriend(fid)}
                            className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow border border-gray-200 dark:border-gray-700 flex items-center gap-4 hover:border-blue-500 transition-colors text-left group"
                        >
                            <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/50 rounded-full flex items-center justify-center text-blue-600 dark:text-blue-400 font-bold group-hover:scale-110 transition-transform">
                                {fid.charAt(3)}
                            </div>
                            <div>
                                <h3 className="font-bold dark:text-white">Friend {fid.split('-')[1]}</h3>
                                <p className="text-xs text-gray-500">{fid}</p>
                            </div>
                            <Globe className="w-5 h-5 text-gray-400 ml-auto group-hover:text-blue-500" />
                        </button>
                    ))
                )}
            </div>
        )}

        {/* --- CONTENT GRID --- */}
        {!(viewMode === 'FRIENDS' && !selectedFriend) && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 animate-fade-in">
                {displayItems.map((item) => {
                    const Icon = getIcon(item.type);
                    return (
                        <div key={item.id} className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 flex flex-col group hover:shadow-md transition-all hover:-translate-y-1 relative overflow-hidden">
                            {/* Imported Badge */}
                            {item.originalOwnerId && (
                                <div className="absolute top-0 right-0 bg-teal-500 text-white text-[10px] px-2 py-1 rounded-bl-lg font-bold shadow-sm">
                                    IMPORTED
                                </div>
                            )}

                            <div className="flex items-start justify-between mb-4">
                                <div className={`p-3 rounded-lg ${
                                    item.type === ContentType.VIDEO ? 'bg-blue-100 text-blue-600' :
                                    item.type === ContentType.PPT ? 'bg-orange-100 text-orange-600' :
                                    item.type === ContentType.SMART_NOTE ? 'bg-green-100 text-green-600' :
                                    'bg-purple-100 text-purple-600'
                                }`}>
                                    <Icon className="w-6 h-6" />
                                </div>
                                
                                {viewMode === 'MY_LIBRARY' && (
                                    <div className="flex items-center gap-1">
                                        <div className="flex items-center gap-1 text-[10px] text-gray-400 bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded-full">
                                            <Eye className="w-3 h-3"/> {item.views || 0}
                                        </div>
                                        <div className="flex items-center gap-1 text-[10px] text-gray-400 bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded-full">
                                            <Download className="w-3 h-3"/> {item.imports || 0}
                                        </div>
                                    </div>
                                )}
                            </div>

                            <h3 className="text-lg font-bold text-gray-800 dark:text-white mb-1 line-clamp-1">{item.title}</h3>
                            <p className="text-xs text-gray-400 mb-4 font-mono flex items-center gap-1">
                                {new Date(item.dateCreated).toLocaleDateString()}
                                {item.originalOwnerName && <span className="text-teal-600">• from {item.originalOwnerName}</span>}
                            </p>

                            <div className="mt-auto pt-4 border-t border-gray-100 dark:border-gray-700 flex gap-2">
                                {viewMode === 'MY_LIBRARY' && (
                                    <>
                                        <button 
                                            onClick={() => handleToggleShare(item.id, item.isShared)}
                                            className={`p-2 rounded-lg transition-colors ${item.isShared ? 'bg-green-100 text-green-600' : 'bg-gray-100 text-gray-400 hover:bg-gray-200 dark:bg-gray-700'}`}
                                            title={item.isShared ? "Public (Click to Hide)" : "Private (Click to Share)"}
                                        >
                                            {item.isShared ? <Globe className="w-4 h-4"/> : <Lock className="w-4 h-4"/>}
                                        </button>
                                        <button 
                                            onClick={() => setPreviewItem(item)}
                                            className="flex-1 py-2 text-sm font-medium bg-gray-900 dark:bg-gray-700 dark:hover:bg-gray-600 text-white rounded-lg hover:bg-black transition-colors"
                                        >
                                            Open
                                        </button>
                                        <button 
                                            onClick={() => onDeletePermanent(item.id)}
                                            className="p-2 text-white bg-red-500 hover:bg-red-600 rounded-lg transition-colors"
                                            title="Delete Permanently"
                                        >
                                            <Trash2 className="w-4 h-4"/>
                                        </button>
                                    </>
                                )}

                                {viewMode === 'FRIENDS' && (
                                    <>
                                        <button 
                                            onClick={() => setPreviewItem(item)}
                                            className="flex-1 py-2 text-sm font-medium bg-gray-900 text-white rounded-lg hover:bg-black transition-colors"
                                        >
                                            View
                                        </button>
                                        <button 
                                            onClick={() => onImport(item)}
                                            className="flex-1 py-2 text-sm font-medium bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center justify-center gap-2"
                                        >
                                            <Import className="w-4 h-4"/> Import
                                        </button>
                                    </>
                                )}
                            </div>
                        </div>
                    );
                })}
                
                {displayItems.length === 0 && (
                    <div className="col-span-3 text-center py-20 bg-gray-50 dark:bg-gray-800/50 rounded-xl border border-dashed border-gray-300 dark:border-gray-700">
                        <div className="mx-auto w-16 h-16 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center mb-4 text-gray-400">
                            <Filter className="w-8 h-8"/>
                        </div>
                        <p className="text-gray-500 font-medium">
                            {viewMode === 'FRIENDS' ? 'This friend has not shared any content yet.' : 'No items found.'}
                        </p>
                    </div>
                )}
            </div>
        )}
        
        {viewMode === 'FRIENDS' && selectedFriend && (
             <div className="mt-6">
                 <button onClick={() => setSelectedFriend(null)} className="text-blue-600 hover:underline text-sm font-bold flex items-center gap-1">
                     ← Back to Friend List
                 </button>
             </div>
        )}
    </div>
  );
};

export default Library;

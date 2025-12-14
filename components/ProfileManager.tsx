
import React, { useState, useEffect } from 'react';
import { User, UserProfile, UserRole } from '../types';
import { Save, User as UserIcon, Award, School, Calendar, PartyPopper, Phone, Globe, Lock, Briefcase } from 'lucide-react';
import confetti from 'canvas-confetti';

interface ProfileManagerProps {
  user: User;
  onUpdate: (user: User) => void;
}

const ProfileManager: React.FC<ProfileManagerProps> = ({ user, onUpdate }) => {
  const [profile, setProfile] = useState<UserProfile>(user.profile);
  const [name, setName] = useState(user.name);
  const [completion, setCompletion] = useState(0);
  const [showCelebration, setShowCelebration] = useState(false);
  const [countryCode, setCountryCode] = useState("+1");

  useEffect(() => {
    calculateCompletion(profile);
  }, [profile]);

  const calculateCompletion = (p: UserProfile) => {
    // Specific logic: DOB (+25%), Gender (+25%), School (+25%), Phone (+25%)
    let score = 0;
    if (p.dob) score += 25;
    if (p.gender) score += 25;
    if (p.school) score += 25;
    if (p.phone) score += 25;

    setCompletion(score);
    
    if (score === 100 && completion < 100) {
        triggerCelebration();
    }
  };

  const triggerCelebration = () => {
    setShowCelebration(true);
    confetti({
      particleCount: 150,
      spread: 70,
      origin: { y: 0.6 }
    });
    setTimeout(() => setShowCelebration(false), 5000);
  };

  const handleSave = () => {
    onUpdate({ ...user, name, profile });
    // Force re-check
    calculateCompletion(profile);
  };

  const togglePrivacy = () => {
      setProfile({ ...profile, isPublic: !profile.isPublic });
  };

  const getProgressColor = () => {
    if (completion < 50) return 'bg-red-500';
    if (completion < 90) return 'bg-yellow-500';
    return 'bg-green-500';
  };

  const getMessage = () => {
    if (completion < 100) return "Complete all fields to unlock premium features!";
    return "🎊 Profile Complete! You've unlocked premium features!";
  };

  return (
    <div className="p-6 max-w-4xl mx-auto relative">
      {showCelebration && (
        <div className="absolute inset-0 z-50 flex items-center justify-center pointer-events-none">
            <div className="bg-white/90 p-8 rounded-2xl shadow-2xl text-center animate-bounce">
                <PartyPopper className="w-16 h-16 text-yellow-500 mx-auto mb-4" />
                <h2 className="text-3xl font-bold text-primary-600">Congratulations!</h2>
                <p className="text-gray-600">Profile Completed Successfully!</p>
            </div>
        </div>
      )}

      <div className="flex items-center gap-4 mb-8">
        <div className="p-4 bg-gray-100 dark:bg-gray-700 rounded-full">
            <UserIcon className="w-8 h-8 text-gray-600 dark:text-gray-300" />
        </div>
        <div>
            <h2 className="text-3xl font-bold dark:text-white">My Profile</h2>
            <p className="text-gray-500">{user.email} • ID: {user.id}</p>
        </div>
      </div>

      {/* Progress Section */}
      <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-md mb-8 border border-gray-200 dark:border-gray-700">
        <div className="flex justify-between items-end mb-2">
            <span className="font-bold text-gray-700 dark:text-gray-200">Profile Completion</span>
            <span className={`font-bold ${completion === 100 ? 'text-green-600' : 'text-primary-600'}`}>{completion}%</span>
        </div>
        <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-4 mb-3">
            <div 
                className={`h-4 rounded-full transition-all duration-1000 ${getProgressColor()}`} 
                style={{ width: `${completion}%` }}
            ></div>
        </div>
        <p className="text-sm font-medium text-gray-600 dark:text-gray-400 flex items-center gap-2">
            {completion === 100 ? <Award className="w-4 h-4 text-green-500" /> : <Award className="w-4 h-4" />}
            {getMessage()}
        </p>
      </div>

      {/* Form Section */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-8 border border-gray-200 dark:border-gray-700">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="md:col-span-2">
                <label className="block text-sm font-medium mb-2 dark:text-gray-300">Full Name</label>
                <input 
                    value={name} 
                    onChange={(e) => setName(e.target.value)}
                    className="w-full p-3 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500"
                    placeholder="Enter your full name"
                />
            </div>
            
            <div>
                <label className="block text-sm font-medium mb-2 dark:text-gray-300">Date of Birth</label>
                <div className="relative">
                    <Calendar className="absolute left-3 top-3.5 w-5 h-5 text-gray-400" />
                    <input 
                        type="date"
                        value={profile.dob}
                        onChange={e => setProfile({...profile, dob: e.target.value})}
                        className="w-full pl-10 p-3 border border-gray-200 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary-500 dark:bg-gray-900 dark:text-white"
                    />
                </div>
            </div>

            <div>
                <label className="block text-sm font-medium mb-2 dark:text-gray-300">Gender</label>
                <select 
                    value={profile.gender}
                    onChange={e => setProfile({...profile, gender: e.target.value})}
                    className="w-full p-3 border border-gray-200 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary-500 dark:bg-gray-900 dark:text-white"
                >
                    <option value="">Select Gender</option>
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                    <option value="Other">Other</option>
                </select>
            </div>

            <div>
                <label className="block text-sm font-medium mb-2 dark:text-gray-300">
                    {user.role === UserRole.TEACHER ? 'Institution Name' : 'School / College'}
                </label>
                <div className="relative">
                    {user.role === UserRole.TEACHER ? <Briefcase className="absolute left-3 top-3.5 w-5 h-5 text-gray-400" /> : <School className="absolute left-3 top-3.5 w-5 h-5 text-gray-400" />}
                    <input 
                        type="text"
                        value={profile.school}
                        onChange={e => setProfile({...profile, school: e.target.value})}
                        placeholder={user.role === UserRole.TEACHER ? "Enter Institution" : "Enter School Name"}
                        className="w-full pl-10 p-3 border border-gray-200 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary-500 dark:bg-gray-900 dark:text-white"
                    />
                </div>
            </div>

            <div>
                <label className="block text-sm font-medium mb-2 dark:text-gray-300">Phone Number</label>
                <div className="flex gap-2">
                    <select 
                        value={countryCode}
                        onChange={(e) => setCountryCode(e.target.value)}
                        className="p-3 border border-gray-200 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500"
                    >
                        <option value="+1">🇺🇸 +1</option>
                        <option value="+91">🇮🇳 +91</option>
                        <option value="+44">🇬🇧 +44</option>
                        <option value="+61">🇦🇺 +61</option>
                        <option value="+86">🇨🇳 +86</option>
                        <option value="+81">🇯🇵 +81</option>
                    </select>
                    <div className="relative flex-1">
                        <Phone className="absolute left-3 top-3.5 w-5 h-5 text-gray-400" />
                        <input 
                            type="tel"
                            value={profile.phone}
                            onChange={e => setProfile({...profile, phone: e.target.value})}
                            placeholder="Enter Phone Number"
                            className="w-full pl-10 p-3 border border-gray-200 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary-500 dark:bg-gray-900 dark:text-white"
                        />
                    </div>
                </div>
            </div>

            <div className="md:col-span-2 mt-4 pt-4 border-t border-gray-100 dark:border-gray-700">
                 <div className="flex items-center justify-between">
                     <div>
                         <h3 className="font-bold text-gray-800 dark:text-white flex items-center gap-2">
                             {profile.isPublic ? <Globe className="w-5 h-5 text-blue-500" /> : <Lock className="w-5 h-5 text-gray-500" />}
                             Profile Privacy
                         </h3>
                         <p className="text-sm text-gray-500">
                             {profile.isPublic ? 'Public: Your friends can see your profile.' : 'Private: Only you can see your profile.'}
                         </p>
                     </div>
                     <button 
                        onClick={togglePrivacy}
                        className={`relative inline-flex h-8 w-14 items-center rounded-full transition-colors ${profile.isPublic ? 'bg-blue-600' : 'bg-gray-300'}`}
                     >
                         <span className={`inline-block h-6 w-6 transform rounded-full bg-white transition-transform ${profile.isPublic ? 'translate-x-7' : 'translate-x-1'}`} />
                     </button>
                 </div>
            </div>
        </div>

        <div className="mt-8 flex justify-end">
            <button 
                onClick={handleSave}
                className="bg-primary-600 hover:bg-primary-700 text-white px-8 py-3 rounded-lg font-bold shadow-lg flex items-center gap-2 transform transition active:scale-95"
            >
                <Save className="w-5 h-5" />
                Save Profile
            </button>
        </div>
      </div>
    </div>
  );
};

export default ProfileManager;

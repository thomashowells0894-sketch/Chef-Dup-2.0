
import React, { useState } from 'react';
import { Heart, MessageCircle, Share2, ChefHat, User } from 'lucide-react';

interface Post {
    id: string;
    username: string;
    avatarColor: string;
    image: string;
    title: string;
    description: string;
    likes: number;
    comments: number;
    savedAmount?: number;
    timestamp: string;
    isLiked?: boolean;
}

const MOCK_FEED: Post[] = [
    {
        id: '1',
        username: 'Sarah K.',
        avatarColor: 'bg-indigo-500',
        image: 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=800&q=80',
        title: 'Zero Waste Salad',
        description: 'Used up the last of my spinach and tomatoes! Super fresh.',
        likes: 24,
        comments: 3,
        savedAmount: 4.50,
        timestamp: '2h ago'
    },
    {
        id: '2',
        username: 'Mike Ross',
        avatarColor: 'bg-emerald-500',
        image: 'https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?auto=format&fit=crop&w=800&q=80',
        title: 'Deep Dish Pizza',
        description: 'Cheat day done right. The crust turned out perfect!',
        likes: 156,
        comments: 12,
        timestamp: '5h ago'
    },
    {
        id: '3',
        username: 'Jenny T.',
        avatarColor: 'bg-rose-500',
        image: 'https://images.unsplash.com/photo-1482049016688-2d3e1b311543?auto=format&fit=crop&w=800&q=80',
        title: 'Morning Avocado Toast',
        description: 'Simple, healthy, and delicious. Poached egg on top is a must.',
        likes: 42,
        comments: 5,
        savedAmount: 2.20,
        timestamp: '1d ago'
    }
];

interface CommunityScreenProps {
    onBack: () => void;
}

const CommunityScreen: React.FC<CommunityScreenProps> = ({ onBack }) => {
    const [posts, setPosts] = useState<Post[]>(MOCK_FEED);

    const handleLike = (id: string) => {
        setPosts(prev => prev.map(p => {
            if (p.id === id) {
                return {
                    ...p,
                    likes: p.isLiked ? p.likes - 1 : p.likes + 1,
                    isLiked: !p.isLiked
                };
            }
            return p;
        }));
    };

    return (
        <div className="flex flex-col h-screen bg-slate-50">
            {/* Header */}
            <div className="bg-white p-6 shadow-sm z-10 sticky top-0">
                <div className="flex justify-between items-center">
                    <h1 className="text-2xl font-black text-slate-900 tracking-tight">Community</h1>
                    <div className="w-10 h-10 bg-slate-100 rounded-full flex items-center justify-center">
                        <User size={20} className="text-slate-600" />
                    </div>
                </div>
                <div className="flex gap-4 mt-4">
                    <button className="text-sm font-bold text-slate-900 border-b-2 border-slate-900 pb-1">Trending</button>
                    <button className="text-sm font-bold text-slate-400 hover:text-slate-600 transition-colors">Following</button>
                    <button className="text-sm font-bold text-slate-400 hover:text-slate-600 transition-colors">Challenges</button>
                </div>
            </div>

            {/* Feed */}
            <div className="flex-1 overflow-y-auto p-4 space-y-6">
                {posts.map(post => (
                    <div key={post.id} className="bg-white rounded-3xl overflow-hidden shadow-sm border border-slate-100">
                        {/* Post Header */}
                        <div className="p-4 flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className={`w-10 h-10 rounded-full ${post.avatarColor} flex items-center justify-center text-white font-bold`}>
                                    {post.username[0]}
                                </div>
                                <div>
                                    <div className="font-bold text-sm text-slate-900">{post.username}</div>
                                    <div className="text-xs text-slate-400">{post.timestamp}</div>
                                </div>
                            </div>
                            {post.savedAmount && (
                                <div className="bg-emerald-50 text-emerald-600 px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1">
                                    <ChefHat size={12} /> Saved ${post.savedAmount.toFixed(2)}
                                </div>
                            )}
                        </div>

                        {/* Image */}
                        <div className="relative aspect-square sm:aspect-video bg-slate-100">
                            <img src={post.image} alt={post.title} className="w-full h-full object-cover" />
                        </div>

                        {/* Actions */}
                        <div className="p-4">
                            <div className="flex gap-4 mb-4">
                                <button 
                                    onClick={() => handleLike(post.id)}
                                    className={`flex items-center gap-1.5 text-sm font-bold transition-colors ${post.isLiked ? 'text-red-500' : 'text-slate-600 hover:text-slate-900'}`}
                                >
                                    <Heart size={20} className={post.isLiked ? 'fill-current' : ''} />
                                    {post.likes}
                                </button>
                                <button className="flex items-center gap-1.5 text-sm font-bold text-slate-600 hover:text-slate-900 transition-colors">
                                    <MessageCircle size={20} />
                                    {post.comments}
                                </button>
                                <button className="flex items-center gap-1.5 text-sm font-bold text-slate-600 hover:text-slate-900 transition-colors ml-auto">
                                    <Share2 size={20} />
                                </button>
                            </div>

                            <h3 className="font-bold text-slate-900 mb-1">{post.title}</h3>
                            <p className="text-sm text-slate-600 leading-relaxed">{post.description}</p>
                        </div>
                    </div>
                ))}
                
                <div className="text-center py-8 text-slate-400 text-sm">
                    You're all caught up!
                </div>
            </div>
        </div>
    );
};

export default CommunityScreen;
